import twilio from 'twilio'

export const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

export const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER!

export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  return twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    signature,
    url,
    params
  )
}

export function buildShiftSmsMessage(
  employeeName: string,
  shiftName: string,
  date: string,
  startTime: string,
  endTime: string,
  workspaceName: string
): string {
  const dayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`
  }

  return (
    `Hi ${employeeName}! Can you work ${shiftName} on ${dayDate} ` +
    `(${formatTime(startTime)}-${formatTime(endTime)})?\n` +
    `Reply YES to confirm or NO to decline.\n` +
    `— ${workspaceName}`
  )
}
