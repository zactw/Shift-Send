export function parseResponse(body: string): 'confirmed' | 'declined' | 'unknown' {
  const text = body.trim().toLowerCase()
  const yes = ['yes', 'y', 'confirm', 'confirmed', 'yep', 'yup', 'sure', 'ok', 'okay']
  const no = ['no', 'n', 'nope', 'cant', "can't", 'decline', 'pass', 'nah']
  if (yes.some((w) => text.includes(w))) return 'confirmed'
  if (no.some((w) => text.includes(w))) return 'declined'
  return 'unknown'
}
