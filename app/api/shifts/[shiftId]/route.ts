import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ shiftId: string }> }
) {
  try {
    const { shiftId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = await supabase.rpc('get_user_workspace_id')
    if (!workspaceId.data) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    const { data: shift, error } = await supabase
      .from('shifts')
      .select('*, shift_assignments(*, employees(full_name, phone, position, email))')
      .eq('id', shiftId)
      .eq('workspace_id', workspaceId.data)
      .single()

    if (error || !shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    return NextResponse.json({ shift })
  } catch (err) {
    console.error('GET /api/shifts/[shiftId] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ shiftId: string }> }
) {
  try {
    const { shiftId } = await params
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

    const { data, error } = await supabase
      .from('shifts')
      .update(body)
      .eq('id', shiftId)
      .eq('workspace_id', workspaceId.data)
      .select()
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Shift not found' }, { status: 404 })

    return NextResponse.json({ shift: data })
  } catch (err) {
    console.error('PATCH /api/shifts/[shiftId] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
