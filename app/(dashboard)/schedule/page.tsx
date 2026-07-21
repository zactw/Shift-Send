'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import EmployeeGrid from '@/components/schedule/EmployeeGrid'
import VisualGrid from '@/components/schedule/VisualGrid'
import {
  getMonday,
  getWeekDates,
  formatDate,
  WEEK_DAYS,
  type Department,
  type EmployeeRow,
  type ScheduleEntry,
  type SchedulePeriod,
} from '@/components/schedule/utils'

type Tab = 'employee' | 'visual'

export default function SchedulePage() {
  const [tab, setTab] = useState<Tab>('employee')
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()))
  const [period, setPeriod] = useState<SchedulePeriod | null>(null)
  const [entries, setEntries] = useState<ScheduleEntry[]>([])
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const weekDates = getWeekDates(weekStart)
  const startDate = formatDate(weekDates[0])
  const endDate = formatDate(weekDates[6])

  // Load employees + departments (static-ish data, load once then cache)
  const loadStatic = useCallback(async () => {
    const [empRes, deptRes] = await Promise.all([
      fetch('/api/employees'),
      fetch('/api/departments'),
    ])
    const empJson = await empRes.json()
    const deptJson = await deptRes.json()
    setEmployees(empJson.employees ?? [])
    setDepartments(deptJson.departments ?? [])
  }, [])

  // Load schedule period + entries for current week
  const loadPeriod = useCallback(async () => {
    const res = await fetch(`/api/schedule-periods?weekStart=${startDate}`)
    const json = await res.json()
    const periods: SchedulePeriod[] = json.periods ?? []
    const p = periods[0] ?? null
    setPeriod(p)

    if (p) {
      const eRes = await fetch(`/api/schedule-entries?periodId=${p.id}`)
      const eJson = await eRes.json()
      setEntries(eJson.entries ?? [])
    } else {
      setEntries([])
    }
  }, [startDate])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([loadStatic(), loadPeriod()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule')
    } finally {
      setLoading(false)
    }
  }, [loadStatic, loadPeriod])

  useEffect(() => { loadAll() }, [loadAll])

  // Reload period when week changes (keep static data)
  useEffect(() => {
    if (!loading) {
      setLoading(true)
      loadPeriod().finally(() => setLoading(false))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate])

  // ──────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────

  async function ensurePeriod(): Promise<SchedulePeriod> {
    if (period) return period
    const res = await fetch('/api/schedule-periods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_date: startDate, end_date: endDate }),
    })
    const json = await res.json()
    const p: SchedulePeriod = json.period
    setPeriod(p)
    return p
  }

  async function handleUpsertEntry(
    employeeId: string,
    date: string,
    data: {
      start_time?: string | null
      end_time?: string | null
      is_off?: boolean
      department_id?: string | null
    }
  ) {
    const p = await ensurePeriod()
    const res = await fetch('/api/schedule-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: employeeId, date, period_id: p.id, ...data }),
    })
    if (!res.ok) throw new Error((await res.json()).error)
    const json = await res.json()
    const updated: ScheduleEntry = json.entry
    setEntries(prev => {
      const filtered = prev.filter(e => !(e.employee_id === employeeId && e.date === date))
      return [...filtered, updated]
    })
  }

  async function handleDeleteEntry(entryId: string) {
    const res = await fetch(`/api/schedule-entries?id=${entryId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error((await res.json()).error)
    setEntries(prev => prev.filter(e => e.id !== entryId))
  }

  async function handleSetCoverage(
    entryId: string,
    data: {
      needs_coverage: boolean
      coverage_note?: string | null
      covered_by_employee_id?: string | null
    }
  ) {
    const res = await fetch(`/api/schedule-entries/${entryId}/coverage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error((await res.json()).error)
    const json = await res.json()
    const updated: ScheduleEntry = json.entry
    setEntries(prev => prev.map(e => e.id === entryId ? updated : e))
  }

  async function handleMoveEntry(
    entryId: string,
    newDate: string,
    newStartTime: string,
    newEndTime: string
  ) {
    const res = await fetch('/api/schedule-entries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entryId, date: newDate, start_time: newStartTime, end_time: newEndTime }),
    })
    if (!res.ok) throw new Error((await res.json()).error)
    const json = await res.json()
    const updated: ScheduleEntry = json.entry
    setEntries(prev => prev.map(e => e.id === entryId ? updated : e))
  }

  async function handleCreatePeriod() {
    await ensurePeriod()
  }

  // ──────────────────────────────────────────
  // Week nav label
  // ──────────────────────────────────────────

  const weekLabel = (() => {
    const start = weekDates[0]
    const end = weekDates[6]
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${WEEK_DAYS[0]} ${fmt(start)} – ${WEEK_DAYS[6]} ${fmt(end)}, ${end.getFullYear()}`
  })()

  const needsCoverage = entries.filter(e => e.needs_coverage).length

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-200 bg-white">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Schedule</h1>
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-2">
            {weekLabel}
            {needsCoverage > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
                ⚠ {needsCoverage} shift{needsCoverage !== 1 ? 's' : ''} need{needsCoverage === 1 ? 's' : ''} coverage
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← Prev
          </button>
          <button
            onClick={() => setWeekStart(getMonday(new Date()))}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Today
          </button>
          <button
            onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200 bg-white px-6">
        {(['employee', 'visual'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t === 'employee' ? '📋 Employee Grid' : '📊 Visual Grid'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading…</div>
        ) : employees.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg mb-2">No employees yet.</p>
            <a href="/employees" className="text-indigo-600 text-sm hover:underline">Add employees →</a>
          </div>
        ) : tab === 'employee' ? (
          <EmployeeGrid
            weekDates={weekDates}
            employees={employees}
            departments={departments}
            entries={entries}
            period={period}
            onUpsertEntry={handleUpsertEntry}
            onDeleteEntry={handleDeleteEntry}
            onSetCoverage={handleSetCoverage}
            onCreatePeriod={handleCreatePeriod}
          />
        ) : (
          <VisualGrid
            weekDates={weekDates}
            employees={employees}
            departments={departments}
            entries={entries}
            onMoveEntry={handleMoveEntry}
            onSetCoverage={handleSetCoverage}
          />
        )}
      </div>
    </div>
  )
}
