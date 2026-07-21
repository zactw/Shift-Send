import Stripe from 'stripe'

// Lazy singleton — only instantiated when first accessed (not at module load time)
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
    _stripe = new Stripe(key, {
      apiVersion: '2026-03-25.dahlia',
    })
  }
  return _stripe
}

// Keep named export for backwards compat — lazy proxy
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
