import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: workspaceId } = await supabase.rpc('get_user_workspace_id')
    if (!workspaceId) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })

    const { data, error } = await supabase
      .from('departments')
      .select('*, employees(id)')
      .eq('workspace_id', workspaceId)
      .order('sort_order')

    if (error) throw error

    // Attach employee count
    const departments = (data ?? []).map(d => ({
      ...d,
      employee_count: Array.isArray(d.employees) ? d.employees.length : 0,
      employees: undefined,
    }))

    return NextResponse.json({ departments })
  } catch (err) {
    console.error('GET /api/departments error:', err)
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
    const { name, color, sort_order } = body
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    const { data, error } = await supabase
      .from('departments')
      .insert({ workspace_id: workspaceId, name, color: color ?? '#6366f1', sort_order: sort_order ?? 0 })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ department: { ...data, employee_count: 0 } }, { status: 201 })
  } catch (err) {
    console.error('POST /api/departments error:', err)
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
      .from('departments')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ department: data })
  } catch (err) {
    console.error('PATCH /api/departments error:', err)
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
      .from('departments')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/departments error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
