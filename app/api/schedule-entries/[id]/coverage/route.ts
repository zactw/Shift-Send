import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: workspaceId } = await supabase.rpc('get_user_workspace_id')
    if (!workspaceId) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

    const body = await req.json()
    const { needs_coverage, coverage_note, covered_by_employee_id } = body

    const { data, error } = await supabase
      .from('schedule_entries')
      .update({
        needs_coverage: needs_coverage ?? false,
        coverage_note: coverage_note ?? null,
        covered_by_employee_id: covered_by_employee_id ?? null,
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select(`
        *,
        employees!schedule_entries_employee_id_fkey(id, full_name, phone, department_id),
        departments(id, name, color),
        covered_by:employees!schedule_entries_covered_by_employee_id_fkey(id, full_name)
      `)
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ entry: data })
  } catch (err) {
    console.error('PATCH /api/schedule-entries/[id]/coverage error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
