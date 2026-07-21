'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { type Department, type EmployeeRow } from '@/components/schedule/utils'

const EMPTY_FORM = { full_name: '', phone: '', email: '', department_id: '' }

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [empRes, deptRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/departments'),
      ])
      const empJson = await empRes.json()
      const deptJson = await deptRes.json()
      setEmployees(empJson.employees ?? [])
      setDepartments(deptJson.departments ?? [])
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function startAdd() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
    setError(null)
  }

  function startEdit(emp: EmployeeRow) {
    setEditingId(emp.id)
    setForm({
      full_name: emp.full_name,
      phone: emp.phone ?? '',
      email: emp.email ?? '',
      department_id: emp.department_id ?? '',
    })
    setShowForm(true)
    setError(null)
  }

  async function handleSave() {
    if (!form.full_name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        full_name: form.full_name,
        phone: form.phone || null,
        email: form.email || null,
        department_id: form.department_id || null,
      }
      if (editingId) {
        const res = await fetch('/api/employees', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...payload }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
      } else {
        const res = await fetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error((await res.json()).error)
      }
      setShowForm(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(emp: EmployeeRow) {
    await fetch('/api/employees', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: emp.id, active: !emp.active }),
    })
    await load()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/employees?id=${id}`, { method: 'DELETE' })
    await load()
  }

  // Group employees by department
  const deptMap = new Map(departments.map(d => [d.id, d]))
  const grouped: { dept: Department | null; emps: EmployeeRow[] }[] = []
  const byDept = new Map<string | null, EmployeeRow[]>()

  for (const emp of employees) {
    const key = emp.department_id ?? null
    if (!byDept.has(key)) byDept.set(key, [])
    byDept.get(key)!.push(emp)
  }

  // Departments in order
  for (const dept of departments) {
    const emps = byDept.get(dept.id) ?? []
    grouped.push({ dept, emps })
  }
  // Unassigned
  const unassigned = byDept.get(null) ?? []
  if (unassigned.length > 0) grouped.push({ dept: null, emps: unassigned })

  const totalActive = employees.filter(e => e.active).length

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {employees.length} total · {totalActive} active
          </p>
        </div>
        <button
          onClick={startAdd}
          className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
        >
          + Add Employee
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Employee' : 'New Employee'}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Jane Smith"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="+16025551234"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="jane@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={form.department_id}
                onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">No department</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Employee'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditingId(null); setError(null) }}
              className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : employees.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg mb-1">No employees yet.</p>
          <p className="text-sm">Add employees to start building schedules.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ dept, emps }) => (
            <div key={dept?.id ?? 'unassigned'}>
              {/* Department header */}
              <div className="flex items-center gap-2 mb-2">
                {dept ? (
                  <>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }} />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {dept.name}
                    </span>
                  </>
                ) : (
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    No Department
                  </span>
                )}
                <span className="text-xs text-gray-400">({emps.length})</span>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Name</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Phone</th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5 w-32" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {emps.map(emp => (
                      <tr key={emp.id} className={emp.active ? '' : 'opacity-50'}>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">{emp.full_name}</div>
                          {emp.email && <div className="text-xs text-gray-400">{emp.email}</div>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{emp.phone || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            emp.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {emp.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => startEdit(emp)}
                              className="text-xs text-gray-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-gray-50"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleActive(emp)}
                              className="text-xs text-gray-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-gray-50"
                            >
                              {emp.active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDelete(emp.id)}
                              className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
