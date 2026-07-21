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
    const weekStart = searchParams.get('weekStart')

    let query = supabase
      .from('schedule_periods')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('start_date', { ascending: false })

    if (weekStart) {
      // Find period that contains this week start date (or matches it exactly)
      query = query.eq('start_date', weekStart)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ periods: data ?? [] })
  } catch (err) {
    console.error('GET /api/schedule-periods error:', err)
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
    const { start_date, end_date } = body
    if (!start_date || !end_date) {
      return NextResponse.json({ error: 'start_date and end_date are required' }, { status: 400 })
    }

    // Check if period already exists for this week
    const { data: existing } = await supabase
      .from('schedule_periods')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('start_date', start_date)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ period: existing })
    }

    const { data, error } = await supabase
      .from('schedule_periods')
      .insert({ workspace_id: workspaceId, start_date, end_date, status: 'draft' })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ period: data }, { status: 201 })
  } catch (err) {
    console.error('POST /api/schedule-periods error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
