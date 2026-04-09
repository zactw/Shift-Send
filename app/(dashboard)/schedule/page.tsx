'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type ShiftTemplate = {
  id: string
  name: string
  start_time: string
  end_time: string
  days_of_week: number[]
  slots_required: number
  sort_order: number
}

type Shift = {
  id: string
  date: string
  shift_template_id: string
  slots_required: number
  status: 'open' | 'partial' | 'filled' | 'cancelled'
}

type Assignment = {
  id: string
  shift_id: string
  status: 'pending' | 'confirmed' | 'declined'
  users: { name: string } | null
}

type SchedulePeriod = {
  id: string
  start_date: string
  end_date: string
  status: string
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })
}

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

export default function SchedulePage() {
  const supabase = createClient()
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()))
  const [templates, setTemplates] = useState<ShiftTemplate[]>([])
  const [period, setPeriod] = useState<SchedulePeriod | null>(null)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [sendingShift, setSendingShift] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const weekDates = getWeekDates(weekStart)
  const startDate = formatDate(weekDates[0])
  const endDate = formatDate(weekDates[6])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('workspace_id')
        .eq('id', user.id)
        .single()
      if (!userData) return

      // Load templates
      const { data: tmplData } = await supabase
        .from('shift_templates')
        .select('*')
        .eq('workspace_id', userData.workspace_id)
        .eq('is_active', true)
        .order('sort_order')
      setTemplates(tmplData ?? [])

      // Load period for this week
      const { data: periodData } = await supabase
        .from('schedule_periods')
        .select('*')
        .eq('workspace_id', userData.workspace_id)
        .eq('start_date', startDate)
        .eq('end_date', endDate)
        .maybeSingle()
      setPeriod(periodData ?? null)

      if (periodData) {
        const { data: shiftData } = await supabase
          .from('shifts')
          .select('*')
          .eq('period_id', periodData.id)
        setShifts(shiftData ?? [])

        if (shiftData?.length) {
          const { data: assignData } = await supabase
            .from('shift_assignments')
            .select('id, shift_id, status, users(name)')
            .in('shift_id', shiftData.map(s => s.id))
          setAssignments((assignData ?? []) as Assignment[])
        } else {
          setAssignments([])
        }
      } else {
        setShifts([])
        setAssignments([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule')
    } finally {
      setLoading(false)
    }
  }, [supabase, startDate, endDate])

  useEffect(() => { loadData() }, [loadData])

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to generate')
      }
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate schedule')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSendSMS(shiftId: string) {
    setSendingShift(shiftId)
    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shiftId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to send SMS')
      }
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send SMS')
    } finally {
      setSendingShift(null)
    }
  }

  function getShift(templateId: string, date: string): Shift | undefined {
    return shifts.find(s => s.shift_template_id === templateId && s.date === date)
  }

  function getConfirmed(shiftId: string): Assignment[] {
    return assignments.filter(a => a.shift_id === shiftId && a.status === 'confirmed')
  }

  function cellColor(shift: Shift | undefined): string {
    if (!shift || shift.status === 'open') return 'bg-red-50 border-red-200'
    if (shift.status === 'partial') return 'bg-yellow-50 border-yellow-200'
    if (shift.status === 'filled') return 'bg-green-50 border-green-200'
    return 'bg-gray-50 border-gray-200'
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Week of {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
            {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >← Prev</button>
          <button
            onClick={() => setWeekStart(getMonday(new Date()))}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >Today</button>
          <button
            onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >Next →</button>

          {!period && (
            <button
              onClick={handleGenerate}
              disabled={generating || templates.length === 0}
              className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Generate Schedule'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg mb-2">No shift templates yet.</p>
          <a href="/grid-builder" className="text-indigo-600 text-sm hover:underline">Set up your shift grid →</a>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2 pr-4 w-32">Shift</th>
                {weekDates.map((d, i) => (
                  <th key={i} className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider py-2 px-2 min-w-[100px]">
                    <div>{DAY_NAMES[d.getDay()]}</div>
                    <div className="text-gray-900 font-semibold">{d.getDate()}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {templates.map(template => (
                <tr key={template.id}>
                  <td className="pr-4 py-2">
                    <div className="text-sm font-medium text-gray-900">{template.name}</div>
                    <div className="text-xs text-gray-400">{template.start_time}–{template.end_time}</div>
                  </td>
                  {weekDates.map((d, i) => {
                    const dow = d.getDay()
                    const dateStr = formatDate(d)
                    const active = template.days_of_week.includes(dow)
                    const shift = getShift(template.id, dateStr)
                    const confirmed = shift ? getConfirmed(shift.id) : []

                    return (
                      <td key={i} className="px-2 py-2">
                        {active ? (
                          <div className={`border rounded-lg p-2 text-xs ${cellColor(shift)}`}>
                            {shift ? (
                              <>
                                <div className="font-medium text-gray-700 mb-1">
                                  {confirmed.length}/{shift.slots_required} filled
                                </div>
                                {confirmed.map(a => (
                                  <div key={a.id} className="text-gray-600 truncate">{a.users?.name}</div>
                                ))}
                                {shift.status !== 'filled' && (
                                  <button
                                    onClick={() => handleSendSMS(shift.id)}
                                    disabled={sendingShift === shift.id}
                                    className="mt-1 w-full text-center py-0.5 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 disabled:opacity-50"
                                  >
                                    {sendingShift === shift.id ? '...' : 'Send SMS'}
                                  </button>
                                )}
                              </>
                            ) : (
                              <div className="text-gray-400 italic">No shift</div>
                            )}
                          </div>
                        ) : (
                          <div className="border border-gray-100 rounded-lg p-2 bg-gray-50 text-xs text-gray-300 text-center">—</div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
