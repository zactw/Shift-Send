import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { twilioClient, TWILIO_PHONE, buildShiftSmsMessage } from '@/lib/twilio'

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
    const { shiftId } = body

    if (!shiftId) {
      return NextResponse.json({ error: 'shiftId is required' }, { status: 400 })
    }

    // Get shift details
    const { data: shift, error: shiftError } = await supabase
      .from('shifts')
      .select('*')
      .eq('id', shiftId)
      .eq('workspace_id', workspaceId.data)
      .single()

    if (shiftError || !shift) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
    }

    if (shift.status === 'filled' || shift.status === 'cancelled') {
      return NextResponse.json({ error: `Shift is ${shift.status}` }, { status: 400 })
    }

    // Get workspace name
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('name')
      .eq('id', workspaceId.data)
      .single()

    // Check subscription
    if (workspace && !['active', 'trialing'].includes(
      (await supabase.from('workspaces').select('subscription_status').eq('id', workspaceId.data).single()).data?.subscription_status || ''
    )) {
      return NextResponse.json({ error: 'Active subscription required' }, { status: 402 })
    }

    // How many confirmed do we already have?
    const { data: confirmedAssignments } = await supabase
      .from('shift_assignments')
      .select('id')
      .eq('shift_id', shiftId)
      .eq('status', 'confirmed')

    const confirmedCount = confirmedAssignments?.length || 0
    const needed = shift.required_staff - confirmedCount

    if (needed <= 0) {
      return NextResponse.json({ error: 'Shift is already filled' }, { status: 400 })
    }

    // Get employees already notified for this shift
    const { data: existingAssignments } = await supabase
      .from('shift_assignments')
      .select('employee_id')
      .eq('shift_id', shiftId)

    const notifiedIds = existingAssignments?.map(a => a.employee_id) || []

    // Find eligible employees (active, in workspace, not already notified)
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('workspace_id', workspaceId.data)
      .eq('active', true)
      .not('id', 'in', notifiedIds.length > 0 ? `(${notifiedIds.join(',')})` : '(null)')

    if (empError) throw empError

    if (!employees || employees.length === 0) {
      return NextResponse.json({ error: 'No eligible employees to notify' }, { status: 404 })
    }

    // Filter by availability if possible
    const shiftDayOfWeek = new Date(shift.date + 'T00:00:00').getUTCDay()
    const { data: availableEmployeeIds } = await supabase
      .from('availability')
      .select('employee_id')
      .eq('workspace_id', workspaceId.data)
      .eq('day_of_week', shiftDayOfWeek)
      .lte('start_time', shift.start_time)
      .gte('end_time', shift.end_time)

    const availableIds = availableEmployeeIds?.map(a => a.employee_id) || []
    // Prefer available employees, fall back to all if none available
    const eligibleEmployees = availableIds.length > 0
      ? employees.filter(e => availableIds.includes(e.id))
      : employees

    const toNotify = eligibleEmployees.slice(0, Math.min(needed * 2, eligibleEmployees.length))

    const results = []
    for (const employee of toNotify) {
      try {
        const message = buildShiftSmsMessage(
          employee.full_name,
          shift.name,
          shift.date,
          shift.start_time,
          shift.end_time,
          workspace?.name || 'ShiftSend'
        )

        await twilioClient.messages.create({
          body: message,
          from: TWILIO_PHONE,
          to: employee.phone,
        })

        // Create pending assignment
        await supabase.from('shift_assignments').insert({
          workspace_id: workspaceId.data,
          shift_id: shiftId,
          employee_id: employee.id,
          status: 'pending',
          sms_sent_at: new Date().toISOString(),
        })

        results.push({ employeeId: employee.id, name: employee.full_name, status: 'sent' })
      } catch (smsErr) {
        console.error(`SMS failed for employee ${employee.id}:`, smsErr)
        results.push({ employeeId: employee.id, name: employee.full_name, status: 'failed' })
      }
    }

    // Update shift status to filling
    await supabase
      .from('shifts')
      .update({ status: 'filling' })
      .eq('id', shiftId)

    return NextResponse.json({ results, notified: results.filter(r => r.status === 'sent').length })
  } catch (err) {
    console.error('POST /api/sms/send error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
