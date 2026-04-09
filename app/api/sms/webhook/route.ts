import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { validateTwilioSignature } from '@/lib/twilio'
import { parseResponse } from '@/lib/parse-response'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const params = Object.fromEntries(new URLSearchParams(body))

    // Validate Twilio signature
    const signature = req.headers.get('x-twilio-signature') || ''
    const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/webhook`

    if (process.env.NODE_ENV === 'production') {
      const isValid = validateTwilioSignature(signature, url, params)
      if (!isValid) {
        return new NextResponse('Forbidden', { status: 403 })
      }
    }

    const fromPhone = params['From']
    const messageBody = params['Body'] || ''

    if (!fromPhone) {
      return twimlResponse('Message received.')
    }

    const supabase = await createServiceClient()

    // Find employee by phone number
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('id, workspace_id, full_name')
      .eq('phone', fromPhone)
      .single()

    if (empError || !employee) {
      return twimlResponse("We couldn't find your account. Please contact your manager.")
    }

    // Find the most recent pending assignment for this employee
    const { data: assignment, error: assignError } = await supabase
      .from('shift_assignments')
      .select('*, shifts(name, date, start_time, end_time)')
      .eq('employee_id', employee.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (assignError || !assignment) {
      return twimlResponse("We don't have any pending shift requests for you.")
    }

    const response = parseResponse(messageBody)

    if (response === 'unknown') {
      return twimlResponse(
        `Hi ${employee.full_name}! We didn't understand your response. Please reply YES to confirm or NO to decline.`
      )
    }

    const newStatus = response === 'confirmed' ? 'confirmed' : 'declined'

    // Update assignment
    await supabase
      .from('shift_assignments')
      .update({
        status: newStatus,
        responded_at: new Date().toISOString(),
      })
      .eq('id', assignment.id)

    // Update shift status if confirmed
    if (newStatus === 'confirmed') {
      // Count confirmed assignments for this shift
      const { data: confirmedAssignments } = await supabase
        .from('shift_assignments')
        .select('id')
        .eq('shift_id', assignment.shift_id)
        .eq('status', 'confirmed')

      const { data: shift } = await supabase
        .from('shifts')
        .select('required_staff')
        .eq('id', assignment.shift_id)
        .single()

      if (shift && confirmedAssignments && confirmedAssignments.length >= shift.required_staff) {
        await supabase
          .from('shifts')
          .update({ status: 'filled' })
          .eq('id', assignment.shift_id)

        // Cancel remaining pending assignments
        await supabase
          .from('shift_assignments')
          .update({ status: 'cancelled' })
          .eq('shift_id', assignment.shift_id)
          .eq('status', 'pending')
          .neq('id', assignment.id)
      }

      const shiftData = assignment.shifts as { name: string; date: string; start_time: string; end_time: string } | null
      return twimlResponse(
        `Great, ${employee.full_name}! You're confirmed for ${shiftData?.name || 'the shift'} on ${shiftData?.date || ''}. See you then!`
      )
    } else {
      return twimlResponse(
        `Got it, ${employee.full_name}. You've been removed from the shift. Thanks for letting us know!`
      )
    }
  } catch (err) {
    console.error('POST /api/sms/webhook error:', err)
    return twimlResponse('An error occurred. Please contact your manager.')
  }
}

function twimlResponse(message: string): NextResponse {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`

  return new NextResponse(twiml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
