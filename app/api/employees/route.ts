import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = await supabase.rpc('get_user_workspace_id')
    if (!workspaceId.data) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .eq('workspace_id', workspaceId.data)
      .order('full_name')

    if (error) throw error
    return NextResponse.json({ employees: data })
  } catch (err) {
    console.error('GET /api/employees error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = await supabase.rpc('get_user_workspace_id')
    if (!workspaceId.data) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    const body = await req.json()
    const { full_name, phone, email, position } = body

    if (!full_name || !phone) {
      return NextResponse.json({ error: 'full_name and phone are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('employees')
      .insert({
        workspace_id: workspaceId.data,
        full_name,
        phone,
        email: email || null,
        position: position || null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Employee with this phone already exists' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ employee: data }, { status: 201 })
  } catch (err) {
    console.error('POST /api/employees error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = await supabase.rpc('get_user_workspace_id')
    if (!workspaceId.data) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    const body = await req.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('employees')
      .update({ ...updates })
      .eq('id', id)
      .eq('workspace_id', workspaceId.data)
      .select()
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

    return NextResponse.json({ employee: data })
  } catch (err) {
    console.error('PATCH /api/employees error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = await supabase.rpc('get_user_workspace_id')
    if (!workspaceId.data) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId.data)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/employees error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
