import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    const { startDate, endDate } = body

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 })
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start > end) {
      return NextResponse.json({ error: 'startDate must be before endDate' }, { status: 400 })
    }

    // Create schedule period
    const { data: period, error: periodError } = await supabase
      .from('schedule_periods')
      .insert({
        workspace_id: workspaceId.data,
        start_date: startDate,
        end_date: endDate,
        status: 'draft',
      })
      .select()
      .single()

    if (periodError) throw periodError

    // Fetch active templates for this workspace
    const { data: templates, error: templatesError } = await supabase
      .from('shift_templates')
      .select('*')
      .eq('workspace_id', workspaceId.data)
      .eq('active', true)

    if (templatesError) throw templatesError
    if (!templates || templates.length === 0) {
      return NextResponse.json({ period, shifts: [], message: 'No active templates found' })
    }

    // Expand templates into shifts for each day in range
    const shiftsToInsert = []
    const current = new Date(start)
    current.setUTCHours(0, 0, 0, 0)
    const endDay = new Date(end)
    endDay.setUTCHours(0, 0, 0, 0)

    while (current <= endDay) {
      const dayOfWeek = current.getUTCDay() // 0=Sunday
      const matchingTemplates = templates.filter(t => t.day_of_week === dayOfWeek)

      for (const template of matchingTemplates) {
        shiftsToInsert.push({
          workspace_id: workspaceId.data,
          period_id: period.id,
          template_id: template.id,
          name: template.name,
          date: current.toISOString().split('T')[0],
          start_time: template.start_time,
          end_time: template.end_time,
          required_staff: template.required_staff,
          position: template.position,
          status: 'open' as const,
        })
      }

      current.setUTCDate(current.getUTCDate() + 1)
    }

    let shifts: typeof shiftsToInsert = []
    if (shiftsToInsert.length > 0) {
      const { data: insertedShifts, error: shiftsError } = await supabase
        .from('shifts')
        .insert(shiftsToInsert)
        .select()

      if (shiftsError) throw shiftsError
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      shifts = (insertedShifts || []) as any
    }

    return NextResponse.json({ period, shifts, count: shifts.length }, { status: 201 })
  } catch (err) {
    console.error('POST /api/schedule/generate error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
