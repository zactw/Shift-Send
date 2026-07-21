'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type ShiftTemplate = {
  id: string
  name: string
  start_time: string
  end_time: string
  days_of_week: number[]
}

type AvailabilityMap = Record<string, boolean> // key: `${templateId}-${day}`

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function AvailabilityGrid() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') // employee user id for MVP
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any

  const [templates, setTemplates] = useState<ShiftTemplate[]>([])
  const [availability, setAvailability] = useState<AvailabilityMap>({})
  const [employeeName, setEmployeeName] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) { setError('Invalid link.'); setLoading(false); return }

    // Lookup user by token (user id for MVP)
    const { data: userData, error: userErr } = await supabase
      .from('users')
      .select('id, name, workspace_id, workspaces(name)')
      .eq('id', token)
      .single()

    if (userErr || !userData) { setError('Invalid or expired link.'); setLoading(false); return }

    setEmployeeName(userData.name)
    const ws = userData.workspaces as { name: string } | null
    setWorkspaceName(ws?.name ?? '')

    // Load shift templates
    const { data: tmplData } = await supabase
      .from('shift_templates')
      .select('id, name, start_time, end_time, days_of_week')
      .eq('workspace_id', userData.workspace_id)
      .eq('is_active', true)
      .order('sort_order')
    setTemplates(tmplData ?? [])

    // Load existing availability
    const { data: availData } = await supabase
      .from('availability')
      .select('shift_template_id, available')
      .eq('user_id', token)

    const map: AvailabilityMap = {}
    for (const row of availData ?? []) {
      map[row.shift_template_id] = row.available
    }
    setAvailability(map)
    setLoading(false)
  }, [token, supabase])

  useEffect(() => { load() }, [load])

  async function handleToggle(templateId: string, available: boolean) {
    if (!token) return
    setSaving(templateId)
    try {
      const { error } = await supabase
        .from('availability')
        .upsert(
          { user_id: token, shift_template_id: templateId, available, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,shift_template_id' }
        )
      if (error) throw error
      setAvailability(prev => ({ ...prev, [templateId]: available }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-6 py-4 max-w-sm w-full text-center">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-semibold text-gray-900">{workspaceName}</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Hi, {employeeName}!</h1>
          <p className="text-sm text-gray-500 mt-1">Toggle the shifts you&apos;re available to work.</p>
        </div>

        {templates.length === 0 ? (
          <div className="text-center text-gray-400 py-12">No shifts available yet.</div>
        ) : (
          <div className="space-y-3">
            {templates.map(template => {
              const isAvailable = availability[template.id] ?? false
              const isSaving = saving === template.id

              return (
                <div key={template.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="font-medium text-gray-900 text-sm">{template.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {template.start_time}–{template.end_time}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {template.days_of_week.map(d => DAYS[d]).join(', ')}
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle(template.id, !isAvailable)}
                      disabled={isSaving}
                      className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                        isAvailable ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition duration-200 ${
                          isAvailable ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  {isSaving && <div className="text-xs text-indigo-400 mt-2">Saving...</div>}
                </div>
              )
            })}
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-8">Changes save automatically.</p>
      </div>
    </div>
  )
}

export default function AvailabilityPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    }>
      <AvailabilityGrid />
    </Suspense>
  )
}
