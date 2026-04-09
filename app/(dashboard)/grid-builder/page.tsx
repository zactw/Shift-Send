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
  is_active: boolean
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const emptyForm = {
  name: '',
  start_time: '09:00',
  end_time: '17:00',
  days_of_week: [1, 2, 3, 4, 5] as number[],
  slots_required: 1,
}

export default function GridBuilderPage() {
  const supabase = createClient()
  const [templates, setTemplates] = useState<ShiftTemplate[]>([])
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)

  const loadTemplates = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: userData } = await supabase.from('users').select('workspace_id').eq('id', user.id).single()
    if (!userData) return
    setWorkspaceId(userData.workspace_id)
    const { data } = await supabase
      .from('shift_templates')
      .select('*')
      .eq('workspace_id', userData.workspace_id)
      .order('sort_order')
    setTemplates(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadTemplates() }, [loadTemplates])

  function toggleDay(day: number) {
    setForm(f => ({
      ...f,
      days_of_week: f.days_of_week.includes(day)
        ? f.days_of_week.filter(d => d !== day)
        : [...f.days_of_week, day].sort(),
    }))
  }

  async function handleSave() {
    if (!workspaceId) return
    setSaving(true)
    setError(null)
    try {
      if (editing) {
        const { error } = await supabase.from('shift_templates').update(form).eq('id', editing)
        if (error) throw error
      } else {
        const { error } = await supabase.from('shift_templates').insert({
          ...form,
          workspace_id: workspaceId,
          sort_order: templates.length,
          is_active: true,
        })
        if (error) throw error
      }
      setForm(emptyForm)
      setEditing(null)
      setShowForm(false)
      await loadTemplates()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(id: string, current: boolean) {
    await supabase.from('shift_templates').update({ is_active: !current }).eq('id', id)
    await loadTemplates()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this shift template?')) return
    await supabase.from('shift_templates').delete().eq('id', id)
    await loadTemplates()
  }

  async function handleMoveUp(index: number) {
    if (index === 0) return
    const updated = [...templates]
    const [item] = updated.splice(index, 1)
    updated.splice(index - 1, 0, item)
    const updates = updated.map((t, i) => supabase.from('shift_templates').update({ sort_order: i }).eq('id', t.id))
    await Promise.all(updates)
    await loadTemplates()
  }

  function startEdit(t: ShiftTemplate) {
    setForm({
      name: t.name,
      start_time: t.start_time,
      end_time: t.end_time,
      days_of_week: t.days_of_week,
      slots_required: t.slots_required,
    })
    setEditing(t.id)
    setShowForm(true)
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grid Builder</h1>
          <p className="text-sm text-gray-500 mt-0.5">Define your shift structure.</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setEditing(null); setShowForm(true) }}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
        >
          + Add Shift
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            {editing ? 'Edit Shift' : 'New Shift'}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Morning"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={form.start_time}
                onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                value={form.end_time}
                onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slots Required</label>
              <input
                type="number"
                min={1}
                value={form.slots_required}
                onChange={e => setForm(f => ({ ...f, slots_required: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Active Days</label>
              <div className="flex gap-2 flex-wrap">
                {DAYS.map((day, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      form.days_of_week.includes(i)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-300'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
          )}

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={saving || !form.name}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditing(null); setForm(emptyForm) }}
              className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Template list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No shifts yet. Add one above.</div>
      ) : (
        <div className="space-y-2">
          {templates.map((t, index) => (
            <div key={t.id} className={`bg-white border rounded-xl p-4 flex items-center gap-4 ${t.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
              <div className="flex flex-col gap-1">
                <button onClick={() => handleMoveUp(index)} disabled={index === 0} className="text-gray-300 hover:text-gray-500 disabled:opacity-20 text-xs">▲</button>
                <button onClick={() => handleMoveUp(index + 1)} disabled={index === templates.length - 1} className="text-gray-300 hover:text-gray-500 disabled:opacity-20 text-xs">▼</button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 text-sm">{t.name}</span>
                  {!t.is_active && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">inactive</span>}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {t.start_time}–{t.end_time} · {t.slots_required} slot{t.slots_required !== 1 ? 's' : ''} ·{' '}
                  {t.days_of_week.map(d => DAYS[d]).join(', ')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => startEdit(t)} className="text-xs text-gray-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-gray-50">Edit</button>
                <button onClick={() => handleToggleActive(t.id, t.is_active)} className="text-xs text-gray-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-gray-50">
                  {t.is_active ? 'Disable' : 'Enable'}
                </button>
                <button onClick={() => handleDelete(t.id)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
