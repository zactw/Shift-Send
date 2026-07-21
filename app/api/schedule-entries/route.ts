import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: workspaceId } = await supabase.rpc('get_user_workspace_id')
    if (!workspaceId) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const periodId = searchParams.get('periodId')

    if (!periodId) {
      return NextResponse.json({ error: 'periodId is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('schedule_entries')
      .select(`
        *,
        employees!schedule_entries_employee_id_fkey(id, full_name, phone, department_id),
        departments(id, name, color),
        covered_by:employees!schedule_entries_covered_by_employee_id_fkey(id, full_name)
      `)
      .eq('workspace_id', workspaceId)
      .eq('period_id', periodId)
      .order('date')

    if (error) throw error
    return NextResponse.json({ entries: data ?? [] })
  } catch (err) {
    console.error('GET /api/schedule-entries error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: workspaceId } = await supabase.rpc('get_user_workspace_id')
    if (!workspaceId) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

    const body = await req.json()
    const { employee_id, date, period_id, start_time, end_time, is_off, department_id } = body

    if (!employee_id || !date || !period_id) {
      return NextResponse.json({ error: 'employee_id, date, and period_id are required' }, { status: 400 })
    }

    const payload = {
      workspace_id: workspaceId,
      period_id,
      employee_id,
      department_id: department_id ?? null,
      date,
      start_time: start_time ?? null,
      end_time: end_time ?? null,
      is_off: is_off ?? false,
      needs_coverage: false,
      coverage_note: null,
      covered_by_employee_id: null,
    }

    const { data, error } = await supabase
      .from('schedule_entries')
      .upsert(payload, { onConflict: 'employee_id,date' })
      .select(`
        *,
        employees!schedule_entries_employee_id_fkey(id, full_name, phone, department_id),
        departments(id, name, color),
        covered_by:employees!schedule_entries_covered_by_employee_id_fkey(id, full_name)
      `)
      .single()

    if (error) throw error
    return NextResponse.json({ entry: data }, { status: 201 })
  } catch (err) {
    console.error('POST /api/schedule-entries error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: workspaceId } = await supabase.rpc('get_user_workspace_id')
    if (!workspaceId) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

    const body = await req.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const { data, error } = await supabase
      .from('schedule_entries')
      .update(updates)
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
    console.error('PATCH /api/schedule-entries error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: workspaceId } = await supabase.rpc('get_user_workspace_id')
    if (!workspaceId) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const { error } = await supabase
      .from('schedule_entries')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/schedule-entries error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
