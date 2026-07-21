'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { DEPT_COLORS, type Department } from '@/components/schedule/utils'

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', color: '#6366f1' })
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/departments')
      const json = await res.json()
      setDepartments(json.departments ?? [])
    } catch {
      setError('Failed to load departments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function startAdd() {
    setEditingId(null)
    setForm({ name: '', color: '#6366f1' })
    setShowForm(true)
    setError(null)
  }

  function startEdit(dept: Department) {
    setEditingId(dept.id)
    setForm({ name: dept.name, color: dept.color })
    setShowForm(true)
    setError(null)
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)
    try {
      if (editingId) {
        const res = await fetch('/api/departments', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, name: form.name, color: form.color }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
      } else {
        const res = await fetch('/api/departments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name, color: form.color, sort_order: departments.length }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
      }
      setShowForm(false)
      setEditingId(null)
      setForm({ name: '', color: '#6366f1' })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    setError(null)
    try {
      const res = await fetch(`/api/departments?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      setConfirmDeleteId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleMoveUp(index: number) {
    if (index === 0) return
    const a = departments[index - 1]
    const b = departments[index]
    await Promise.all([
      fetch('/api/departments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: a.id, sort_order: b.sort_order }) }),
      fetch('/api/departments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: b.id, sort_order: a.sort_order }) }),
    ])
    await load()
  }

  async function handleMoveDown(index: number) {
    if (index >= departments.length - 1) return
    await handleMoveUp(index + 1)
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {departments.length} department{departments.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={startAdd}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
        >
          + Add Department
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Department' : 'New Department'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Front Desk"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <div className="flex gap-2 flex-wrap">
                {DEPT_COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, color: c.value }))}
                    title={c.label}
                    style={{ backgroundColor: c.value }}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      form.color === c.value ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create'}
              </button>
              <button
                onClick={() => { setShowForm(false); setEditingId(null); setError(null) }}
                className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : departments.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg mb-1">No departments yet.</p>
          <p className="text-sm">Add departments like "Front Desk" or "Member Services".</p>
        </div>
      ) : (
        <div className="space-y-2">
          {departments.map((dept, index) => (
            <div
              key={dept.id}
              className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4"
            >
              {/* Reorder */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="text-gray-300 hover:text-gray-500 disabled:opacity-20 text-xs leading-none"
                >
                  ▲
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={index === departments.length - 1}
                  className="text-gray-300 hover:text-gray-500 disabled:opacity-20 text-xs leading-none"
                >
                  ▼
                </button>
              </div>

              {/* Color swatch */}
              <div
                className="w-4 h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: dept.color }}
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm">{dept.name}</div>
                <div className="text-xs text-gray-400">
                  {dept.employee_count ?? 0} employee{(dept.employee_count ?? 0) !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startEdit(dept)}
                  className="text-xs text-gray-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-gray-50"
                >
                  Edit
                </button>
                {confirmDeleteId === dept.id ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-red-500">Delete?</span>
                    <button
                      onClick={() => handleDelete(dept.id)}
                      disabled={deletingId === dept.id}
                      className="text-xs text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === dept.id ? '…' : 'Yes'}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(dept.id)}
                    className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
