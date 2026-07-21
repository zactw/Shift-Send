'use client'

import { useState, useRef } from 'react'
import {
  formatTimeRange,
  WEEK_DAYS,
  type Department,
  type EmployeeRow,
  type ScheduleEntry,
} from './utils'

type Props = {
  weekDates: Date[]
  employees: EmployeeRow[]
  departments: Department[]
  entries: ScheduleEntry[]
  onMoveEntry: (entryId: string, newDate: string, newStartTime: string, newEndTime: string) => Promise<void>
  onSetCoverage: (entryId: string, data: {
    needs_coverage: boolean
    coverage_note?: string | null
    covered_by_employee_id?: string | null
  }) => Promise<void>
}

type TimeSlot = {
  start_time: string
  end_time: string
  label: string
}

type DragPayload = {
  entryId: string
  employeeName: string
  sourceDate: string
  sourceStart: string
  sourceEnd: string
}

type CoverageModal = {
  entry: ScheduleEntry
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function VisualGrid({
  weekDates,
  employees,
  departments,
  entries,
  onMoveEntry,
  onSetCoverage,
}: Props) {
  const [dragging, setDragging] = useState<DragPayload | null>(null)
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)
  const [coverageModal, setCoverageModal] = useState<CoverageModal | null>(null)
  const [coverageForm, setCoverageForm] = useState({
    needs_coverage: false,
    coverage_note: '',
    covered_by_employee_id: '',
  })
  const [savingCoverage, setSavingCoverage] = useState(false)
  const [movingKey, setMovingKey] = useState<string | null>(null)
  const dragRef = useRef<DragPayload | null>(null)

  const empMap = new Map(employees.map(e => [e.id, e]))
  const deptMap = new Map(departments.map(d => [d.id, d]))

  // Filter to non-off entries with times
  const scheduledEntries = entries.filter(e => !e.is_off && e.start_time && e.end_time)

  // Group entries by department
  type DeptGroup = {
    dept: Department | null
    slots: TimeSlot[]
    // date -> (slot key -> entry)
    cellMap: Map<string, Map<string, ScheduleEntry>>
  }

  // Collect time slots per department
  const deptSlots = new Map<string | null, Map<string, TimeSlot>>()

  for (const entry of scheduledEntries) {
    const emp = empMap.get(entry.employee_id)
    const deptId = entry.department_id ?? emp?.department_id ?? null
    if (!deptSlots.has(deptId)) deptSlots.set(deptId, new Map())
    const slotKey = `${entry.start_time}|${entry.end_time}`
    if (!deptSlots.get(deptId)!.has(slotKey)) {
      deptSlots.get(deptId)!.set(slotKey, {
        start_time: entry.start_time!,
        end_time: entry.end_time!,
        label: formatTimeRange(entry.start_time, entry.end_time),
      })
    }
  }

  // Build deptGroups in department order
  const deptGroups: DeptGroup[] = []
  const processedDepts = new Set<string | null>()

  // Ordered departments first
  for (const dept of departments) {
    if (!deptSlots.has(dept.id)) continue
    processedDepts.add(dept.id)
    const slots = Array.from(deptSlots.get(dept.id)!.values()).sort((a, b) =>
      a.start_time.localeCompare(b.start_time)
    )
    const cellMap = buildCellMap(scheduledEntries, dept.id, slots, empMap)
    deptGroups.push({ dept, slots, cellMap })
  }

  // Unassigned dept
  if (deptSlots.has(null)) {
    const slots = Array.from(deptSlots.get(null)!.values()).sort((a, b) =>
      a.start_time.localeCompare(b.start_time)
    )
    const cellMap = buildCellMap(scheduledEntries, null, slots, empMap)
    deptGroups.push({ dept: null, slots, cellMap })
  }

  function buildCellMap(
    allEntries: ScheduleEntry[],
    deptId: string | null,
    slots: TimeSlot[],
    empMap: Map<string, EmployeeRow>
  ): Map<string, Map<string, ScheduleEntry>> {
    // cellMap: date -> slotKey -> entry
    const map = new Map<string, Map<string, ScheduleEntry>>()
    for (const entry of allEntries) {
      const emp = empMap.get(entry.employee_id)
      const eDeptId = entry.department_id ?? emp?.department_id ?? null
      if (eDeptId !== deptId) continue
      const slotKey = `${entry.start_time}|${entry.end_time}`
      // Only include if this slot exists in this dept
      if (!slots.some(s => `${s.start_time}|${s.end_time}` === slotKey)) continue
      if (!map.has(entry.date)) map.set(entry.date, new Map())
      map.get(entry.date)!.set(slotKey, entry)
    }
    return map
  }

  // DnD handlers
  function handleDragStart(entry: ScheduleEntry) {
    const emp = empMap.get(entry.employee_id)
    const payload: DragPayload = {
      entryId: entry.id,
      employeeName: emp?.full_name ?? '?',
      sourceDate: entry.date,
      sourceStart: entry.start_time!,
      sourceEnd: entry.end_time!,
    }
    dragRef.current = payload
    setDragging(payload)
  }

  function handleDragEnd() {
    dragRef.current = null
    setDragging(null)
    setDragOverKey(null)
  }

  function handleDragOver(e: React.DragEvent, targetKey: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverKey(targetKey)
  }

  function handleDragLeave() {
    setDragOverKey(null)
  }

  async function handleDrop(e: React.DragEvent, targetDate: string, slot: TimeSlot, targetKey: string) {
    e.preventDefault()
    setDragOverKey(null)
    const payload = dragRef.current
    if (!payload) return
    // No-op if dropped on same cell
    if (payload.sourceDate === targetDate && payload.sourceStart === slot.start_time && payload.sourceEnd === slot.end_time) return

    setMovingKey(targetKey)
    try {
      await onMoveEntry(payload.entryId, targetDate, slot.start_time, slot.end_time)
    } finally {
      setMovingKey(null)
      setDragging(null)
      dragRef.current = null
    }
  }

  function openCoverageModal(entry: ScheduleEntry) {
    setCoverageModal({ entry })
    setCoverageForm({
      needs_coverage: entry.needs_coverage,
      coverage_note: entry.coverage_note ?? '',
      covered_by_employee_id: entry.covered_by_employee_id ?? '',
    })
  }

  async function handleSaveCoverage() {
    if (!coverageModal) return
    setSavingCoverage(true)
    try {
      await onSetCoverage(coverageModal.entry.id, {
        needs_coverage: coverageForm.needs_coverage,
        coverage_note: coverageForm.coverage_note || null,
        covered_by_employee_id: coverageForm.covered_by_employee_id || null,
      })
      setCoverageModal(null)
    } finally {
      setSavingCoverage(false)
    }
  }

  if (scheduledEntries.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg mb-1">No shifts scheduled yet.</p>
        <p className="text-sm">Use the Employee Grid tab to add shifts — they will appear here.</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {dragging && (
        <div className="mb-3 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs rounded-lg px-3 py-2">
          Dragging <strong>{dragging.employeeName}</strong> — drop on any cell to reassign
        </div>
      )}

      <div className="space-y-8">
        {deptGroups.map(({ dept, slots, cellMap }) => (
          <div key={dept?.id ?? 'unassigned'}>
            {/* Department header */}
            <div className="flex items-center gap-2 mb-3">
              {dept ? (
                <>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }} />
                  <span className="text-sm font-bold uppercase tracking-wider" style={{ color: dept.color }}>
                    {dept.name}
                  </span>
                </>
              ) : (
                <span className="text-sm font-bold uppercase tracking-wider text-gray-400">
                  Unassigned
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="border-collapse min-w-full">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2 w-28 border-b border-gray-200">
                      Shift
                    </th>
                    {weekDates.map((d, i) => (
                      <th key={i} className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-2 min-w-[110px] border-b border-gray-200">
                        <div>{WEEK_DAYS[i]}</div>
                        <div className="text-gray-900 font-semibold normal-case">{d.getMonth() + 1}/{d.getDate()}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slots.map(slot => {
                    const slotKey = `${slot.start_time}|${slot.end_time}`
                    return (
                      <tr key={slotKey}>
                        <td className="px-3 py-2 border-b border-gray-100">
                          <div className="text-xs font-semibold text-gray-700">{slot.label}</div>
                        </td>
                        {weekDates.map((d, i) => {
                          const dk = dateKey(d)
                          const entry = cellMap.get(dk)?.get(slotKey)
                          const emp = entry ? empMap.get(entry.employee_id) : null
                          const dept_ = dept ?? (emp?.department_id ? deptMap.get(emp.department_id) : null)
                          const dropKey = `${dk}:${slotKey}`
                          const isOver = dragOverKey === dropKey
                          const isMoving = movingKey === dropKey

                          return (
                            <td
                              key={i}
                              className="px-1 py-1 border-b border-gray-100"
                              onDragOver={e => handleDragOver(e, dropKey)}
                              onDragLeave={handleDragLeave}
                              onDrop={e => handleDrop(e, dk, slot, dropKey)}
                            >
                              {isMoving ? (
                                <div className="min-h-[48px] border-2 border-indigo-300 border-dashed rounded-lg flex items-center justify-center bg-indigo-50">
                                  <span className="text-xs text-indigo-500">Moving…</span>
                                </div>
                              ) : entry && emp ? (
                                /* Filled cell */
                                <div
                                  className={`min-h-[48px] border rounded-lg p-1.5 relative group transition-all ${
                                    entry.needs_coverage
                                      ? entry.covered_by_employee_id || entry.coverage_note
                                        ? 'bg-amber-50 border-amber-300'
                                        : 'bg-yellow-50 border-yellow-400'
                                      : isOver
                                        ? 'bg-indigo-50 border-indigo-400 border-dashed'
                                        : 'bg-white border-gray-200'
                                  }`}
                                >
                                  {/* Draggable employee chip */}
                                  <div
                                    draggable
                                    onDragStart={() => handleDragStart(entry)}
                                    onDragEnd={handleDragEnd}
                                    className="cursor-grab active:cursor-grabbing"
                                  >
                                    <div
                                      className="text-xs font-semibold px-1.5 py-0.5 rounded-md inline-block leading-tight"
                                      style={{
                                        backgroundColor: dept_ ? `${dept_.color}22` : '#f3f4f6',
                                        color: dept_?.color ?? '#374151',
                                      }}
                                    >
                                      {emp.full_name}
                                    </div>
                                  </div>

                                  {entry.needs_coverage && (
                                    <div className="text-xs text-yellow-700 mt-0.5 leading-tight">
                                      ⚠{' '}
                                      {entry.coverage_note
                                        ? entry.coverage_note
                                        : entry.covered_by?.full_name
                                          ? `→ ${entry.covered_by.full_name}`
                                          : 'Needs coverage'}
                                    </div>
                                  )}

                                  {/* Coverage flag button */}
                                  <button
                                    onClick={() => openCoverageModal(entry)}
                                    title="Set coverage"
                                    className="absolute top-1 right-1 text-gray-300 hover:text-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs leading-none"
                                  >
                                    ⚠
                                  </button>
                                </div>
                              ) : (
                                /* Empty drop target */
                                <div
                                  className={`min-h-[48px] border rounded-lg flex items-center justify-center transition-all ${
                                    isOver && dragging
                                      ? 'bg-indigo-50 border-indigo-400 border-dashed'
                                      : 'border-dashed border-gray-200 bg-gray-50'
                                  }`}
                                >
                                  {isOver && dragging ? (
                                    <span className="text-xs text-indigo-500">Drop here</span>
                                  ) : (
                                    <span className="text-xs text-gray-300">—</span>
                                  )}
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Coverage Modal */}
      {coverageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setCoverageModal(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl p-6 w-80"
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4">
              <div className="font-semibold text-gray-900">Coverage Flag</div>
              <div className="text-sm text-gray-500">
                {empMap.get(coverageModal.entry.employee_id)?.full_name} · {formatTimeRange(coverageModal.entry.start_time, coverageModal.entry.end_time)}
              </div>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={coverageForm.needs_coverage}
                  onChange={e => setCoverageForm(f => ({ ...f, needs_coverage: e.target.checked }))}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Needs Coverage</span>
              </label>

              {coverageForm.needs_coverage && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Coverage Note</label>
                    <input
                      type="text"
                      value={coverageForm.coverage_note}
                      onChange={e => setCoverageForm(f => ({ ...f, coverage_note: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. Selah covering"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Covered By</label>
                    <select
                      value={coverageForm.covered_by_employee_id}
                      onChange={e => setCoverageForm(f => ({ ...f, covered_by_employee_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select employee…</option>
                      {employees
                        .filter(e => e.id !== coverageModal.entry.employee_id && e.active)
                        .map(e => (
                          <option key={e.id} value={e.id}>{e.full_name}</option>
                        ))}
                    </select>
                  </div>
                </>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSaveCoverage}
                  disabled={savingCoverage}
                  className="flex-1 py-2 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600 disabled:opacity-50"
                >
                  {savingCoverage ? '…' : 'Save Coverage'}
                </button>
                <button
                  onClick={() => setCoverageModal(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
