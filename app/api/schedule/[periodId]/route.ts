import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ periodId: string }> }
) {
  try {
    const { periodId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspaceId = await supabase.rpc('get_user_workspace_id')
    if (!workspaceId.data) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    const { data: period, error: periodError } = await supabase
      .from('schedule_periods')
      .select('*')
      .eq('id', periodId)
      .eq('workspace_id', workspaceId.data)
      .single()

    if (periodError || !period) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 })
    }

    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select('*, shift_assignments(*, employees(full_name, phone, position))')
      .eq('period_id', periodId)
      .eq('workspace_id', workspaceId.data)
      .order('date')
      .order('start_time')

    if (shiftsError) throw shiftsError

    return NextResponse.json({ period, shifts: shifts || [] })
  } catch (err) {
    console.error('GET /api/schedule/[periodId] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ periodId: string }> }
) {
  try {
    const { periodId } = await params
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
    const { status } = body

    const { data, error } = await supabase
      .from('schedule_periods')
      .update({ status })
      .eq('id', periodId)
      .eq('workspace_id', workspaceId.data)
      .select()
      .single()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Period not found' }, { status: 404 })

    return NextResponse.json({ period: data })
  } catch (err) {
    console.error('PATCH /api/schedule/[periodId] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
