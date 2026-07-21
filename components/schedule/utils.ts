export function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })
}

export function formatDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatTime(time: string | null | undefined): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  const min = m > 0 ? `:${String(m).padStart(2, '0')}` : ''
  return `${hour}${min}${period}`
}

export function formatTimeRange(
  start: string | null | undefined,
  end: string | null | undefined
): string {
  if (!start || !end) return ''
  return `${formatTime(start)}–${formatTime(end)}`
}

export const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const DEPT_COLORS = [
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Green', value: '#10b981' },
  { label: 'Teal', value: '#14b8a6' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Purple', value: '#8b5cf6' },
]

export type Department = {
  id: string
  workspace_id: string
  name: string
  color: string
  sort_order: number
  employee_count?: number
  created_at: string
  updated_at: string
}

export type EmployeeRow = {
  id: string
  full_name: string
  phone: string
  email: string | null
  position: string | null
  active: boolean
  department_id: string | null
  created_at: string
}

export type ScheduleEntry = {
  id: string
  workspace_id: string
  period_id: string
  employee_id: string
  department_id: string | null
  date: string
  start_time: string | null
  end_time: string | null
  is_off: boolean
  needs_coverage: boolean
  coverage_note: string | null
  covered_by_employee_id: string | null
  created_at: string
  updated_at: string
  // joined
  employees?: { id: string; full_name: string; phone: string; department_id: string | null } | null
  departments?: { id: string; name: string; color: string } | null
  covered_by?: { id: string; full_name: string } | null
}

export type SchedulePeriod = {
  id: string
  workspace_id: string
  start_date: string
  end_date: string
  status: 'draft' | 'active' | 'completed'
  created_at: string
  updated_at: string
}
