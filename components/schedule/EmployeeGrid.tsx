'use client'

import { useState } from 'react'
import {
  formatTimeRange,
  formatTime,
  WEEK_DAYS,
  type Department,
  type EmployeeRow,
  type ScheduleEntry,
  type SchedulePeriod,
} from './utils'

type Props = {
  weekDates: Date[]
  employees: EmployeeRow[]
  departments: Department[]
  entries: ScheduleEntry[]
  period: SchedulePeriod | null
  onUpsertEntry: (employeeId: string, date: string, data: {
    start_time?: string | null
    end_time?: string | null
    is_off?: boolean
    department_id?: string | null
  }) => Promise<void>
  onDeleteEntry: (entryId: string) => Promise<void>
  onSetCoverage: (entryId: string, data: {
    needs_coverage: boolean
    coverage_note?: string | null
    covered_by_employee_id?: string | null
  }) => Promise<void>
  onCreatePeriod: () => Promise<void>
}

type CellEditState = {
  employeeId: string
  date: string
  entry: ScheduleEntry | null
}

type CoverageFormState = {
  entryId: string
  needs_coverage: boolean
  coverage_note: string
  covered_by_employee_id: string
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function EmployeeGrid({
  weekDates,
  employees,
  departments,
  entries,
  period,
  onUpsertEntry,
  onDeleteEntry,
  onSetCoverage,
  onCreatePeriod,
}: Props) {
  const [editing, setEditing] = useState<CellEditState | null>(null)
  const [editForm, setEditForm] = useState({ start_time: '', end_time: '', is_off: false })
  const [coverageForm, setCoverageForm] = useState<CoverageFormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [creatingPeriod, setCreatingPeriod] = useState(false)

  // Build lookup: employeeId + date -> entry
  const entryMap = new Map<string, ScheduleEntry>()
  for (const e of entries) {
    entryMap.set(`${e.employee_id}:${e.date}`, e)
  }

  // Group active employees by department
  const deptMap = new Map(departments.map(d => [d.id, d]))
  const activeEmployees = employees.filter(e => e.active)

  const grouped: { dept: Department | null; emps: EmployeeRow[] }[] = []
  const byDept = new Map<string | null, EmployeeRow[]>()
  for (const emp of activeEmployees) {
    const key = emp.department_id ?? null
    if (!byDept.has(key)) byDept.set(key, [])
    byDept.get(key)!.push(emp)
  }
  for (const dept of departments) {
    const emps = byDept.get(dept.id) ?? []
    if (emps.length) grouped.push({ dept, emps })
  }
  const unassigned = byDept.get(null) ?? []
  if (unassigned.length) grouped.push({ dept: null, emps: unassigned })

  function openCell(employeeId: string, date: string) {
    const entry = entryMap.get(`${employeeId}:${date}`) ?? null
    setEditing({ employeeId, date, entry })
    setEditForm({
      start_time: entry?.start_time?.slice(0, 5) ?? '',
      end_time: entry?.end_time?.slice(0, 5) ?? '',
      is_off: entry?.is_off ?? false,
    })
    setCoverageForm(null)
  }

  function closeCell() {
    setEditing(null)
    setCoverageForm(null)
  }

  async function ensurePeriod() {
    if (!period) {
      setCreatingPeriod(true)
      try {
        await onCreatePeriod()
      } finally {
        setCreatingPeriod(false)
      }
    }
  }

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    try {
      await ensurePeriod()
      const emp = activeEmployees.find(e => e.id === editing.employeeId)
      await onUpsertEntry(editing.employeeId, editing.date, {
        start_time: editForm.is_off ? null : editForm.start_time || null,
        end_time: editForm.is_off ? null : editForm.end_time || null,
        is_off: editForm.is_off,
        department_id: emp?.department_id ?? null,
      })
      closeCell()
    } finally {
      setSaving(false)
    }
  }

  async function handleClear() {
    if (!editing?.entry) { closeCell(); return }
    setSaving(true)
    try {
      await onDeleteEntry(editing.entry.id)
      closeCell()
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveCoverage() {
    if (!coverageForm) return
    setSaving(true)
    try {
      await onSetCoverage(coverageForm.entryId, {
        needs_coverage: coverageForm.needs_coverage,
        coverage_note: coverageForm.coverage_note || null,
        covered_by_employee_id: coverageForm.covered_by_employee_id || null,
      })
      setCoverageForm(null)
      closeCell()
    } finally {
      setSaving(false)
    }
  }

  function openCoverage(entry: ScheduleEntry) {
    setCoverageForm({
      entryId: entry.id,
      needs_coverage: entry.needs_coverage,
      coverage_note: entry.coverage_note ?? '',
      covered_by_employee_id: entry.covered_by_employee_id ?? '',
    })
  }

  function cellStyle(entry: ScheduleEntry | undefined): string {
    if (!entry) return 'bg-gray-50 hover:bg-gray-100 cursor-pointer border-dashed border-gray-200 text-gray-300'
    if (entry.is_off) return 'bg-gray-100 border-gray-200 cursor-pointer'
    if (entry.needs_coverage && !entry.covered_by_employee_id && !entry.coverage_note)
      return 'bg-yellow-50 border-yellow-300 cursor-pointer'
    if (entry.needs_coverage)
      return 'bg-amber-50 border-amber-300 cursor-pointer'
    return 'bg-white border-gray-200 cursor-pointer hover:border-indigo-300'
  }

  function cellContent(entry: ScheduleEntry | undefined) {
    if (!entry) return <span className="text-xs text-gray-300 select-none">+</span>
    if (entry.is_off) return <span className="text-xs text-gray-400 line-through">OFF</span>
    const timeStr = formatTimeRange(entry.start_time, entry.end_time)
    return (
      <div className="text-center">
        <div className="text-xs font-medium text-gray-800 leading-tight">{timeStr || '—'}</div>
        {entry.needs_coverage && (
          <div className="text-xs text-yellow-700 mt-0.5 leading-tight truncate max-w-[90px]">
            ⚠ {entry.coverage_note
              ? entry.coverage_note
              : entry.covered_by?.full_name
                ? `→ ${entry.covered_by.full_name}`
                : 'Needs coverage'}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      {!period && (
        <div className="mb-3 bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg px-4 py-2 flex items-center justify-between">
          <span>No schedule exists for this week yet. Click any cell to create one automatically.</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="border-collapse min-w-full">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white border-b border-r border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2 w-36 min-w-36">
                Employee
              </th>
              {weekDates.map((d, i) => (
                <th key={i} className="border-b border-gray-200 text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-2 min-w-[100px]">
                  <div>{WEEK_DAYS[i]}</div>
                  <div className="text-gray-900 font-semibold normal-case">{d.getMonth() + 1}/{d.getDate()}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouped.map(({ dept, emps }) => (
              <>
                {/* Department header row */}
                <tr key={`dept-${dept?.id ?? 'none'}`}>
                  <td
                    colSpan={8}
                    className="sticky left-0 z-10 px-3 py-1.5 border-b border-gray-200"
                    style={{ backgroundColor: dept ? `${dept.color}18` : '#f9fafb' }}
                  >
                    <div className="flex items-center gap-2">
                      {dept && (
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dept.color }} />
                      )}
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: dept?.color ?? '#9ca3af' }}>
                        {dept?.name ?? 'No Department'}
                      </span>
                    </div>
                  </td>
                </tr>

                {emps.map(emp => {
                  const dept_ = emp.department_id ? deptMap.get(emp.department_id) : null
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50 group">
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50 border-b border-r border-gray-200 px-3 py-2 w-36 min-w-36">
                        <div className="text-xs font-medium text-gray-900 leading-tight">{emp.full_name}</div>
                        {emp.phone && <div className="text-xs text-gray-400 leading-tight">{emp.phone}</div>}
                        {dept_ && (
                          <div
                            className="inline-block mt-0.5 text-xs px-1.5 py-0 rounded-full font-medium leading-tight"
                            style={{ backgroundColor: `${dept_.color}22`, color: dept_.color }}
                          >
                            {dept_.name}
                          </div>
                        )}
                      </td>
                      {weekDates.map((d, i) => {
                        const dk = dateKey(d)
                        const entry = entryMap.get(`${emp.id}:${dk}`)
                        return (
                          <td key={i} className="border-b border-gray-100 p-1">
                            <div
                              className={`min-h-[48px] border rounded-md p-1.5 flex items-center justify-center transition-all ${cellStyle(entry)}`}
                              onClick={() => openCell(emp.id, dk)}
                            >
                              {cellContent(entry)}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={closeCell}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl p-6 w-80"
            onClick={e => e.stopPropagation()}
          >
            {(() => {
              const emp = activeEmployees.find(e => e.id === editing.employeeId)
              const d = weekDates.find(d => dateKey(d) === editing.date)
              const dayLabel = d
                ? `${WEEK_DAYS[weekDates.indexOf(d)]} ${d.getMonth() + 1}/${d.getDate()}`
                : editing.date
              return (
                <div className="mb-4">
                  <div className="font-semibold text-gray-900">{emp?.full_name}</div>
                  <div className="text-sm text-gray-500">{dayLabel}</div>
                </div>
              )
            })()}

            {coverageForm ? (
              /* Coverage sub-form */
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-800">Coverage Details</div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={coverageForm.needs_coverage}
                      onChange={e => setCoverageForm(f => f ? { ...f, needs_coverage: e.target.checked } : f)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">Needs Coverage</span>
                  </label>
                </div>

                {coverageForm.needs_coverage && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Coverage Note</label>
                      <input
                        type="text"
                        value={coverageForm.coverage_note}
                        onChange={e => setCoverageForm(f => f ? { ...f, coverage_note: e.target.value } : f)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g. Selah covering"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Covered By</label>
                      <select
                        value={coverageForm.covered_by_employee_id}
                        onChange={e => setCoverageForm(f => f ? { ...f, covered_by_employee_id: e.target.value } : f)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select employee…</option>
                        {employees.filter(e => e.id !== editing.employeeId && e.active).map(e => (
                          <option key={e.id} value={e.id}>{e.full_name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSaveCoverage}
                    disabled={saving}
                    className="flex-1 py-2 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600 disabled:opacity-50"
                  >
                    {saving ? '…' : 'Save'}
                  </button>
                  <button
                    onClick={() => setCoverageForm(null)}
                    className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : (
              /* Main shift edit form */
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.is_off}
                    onChange={e => setEditForm(f => ({ ...f, is_off: e.target.checked }))}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700">Mark as Off / Day Off</span>
                </label>

                {!editForm.is_off && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Start</label>
                      <input
                        type="time"
                        value={editForm.start_time}
                        onChange={e => setEditForm(f => ({ ...f, start_time: e.target.value }))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">End</label>
                      <input
                        type="time"
                        value={editForm.end_time}
                        onChange={e => setEditForm(f => ({ ...f, end_time: e.target.value }))}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}

                {!editForm.is_off && editForm.start_time && editForm.end_time && (
                  <div className="text-center text-sm text-indigo-600 font-medium">
                    {formatTime(editForm.start_time + ':00')} – {formatTime(editForm.end_time + ':00')}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSave}
                    disabled={saving || creatingPeriod || (!editForm.is_off && (!editForm.start_time || !editForm.end_time))}
                    className="flex-1 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving || creatingPeriod ? '…' : 'Save'}
                  </button>
                  {editing.entry && !editing.entry.is_off && (
                    <button
                      onClick={() => openCoverage(editing.entry!)}
                      className="px-3 py-2 bg-yellow-50 border border-yellow-300 text-yellow-700 text-sm rounded-lg hover:bg-yellow-100"
                      title="Flag coverage"
                    >
                      ⚠
                    </button>
                  )}
                  {editing.entry && (
                    <button
                      onClick={handleClear}
                      disabled={saving}
                      className="px-3 py-2 border border-gray-300 text-red-500 text-sm rounded-lg hover:bg-red-50 disabled:opacity-50"
                      title="Clear shift"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <button
                  onClick={closeCell}
                  className="w-full py-1.5 text-sm text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
