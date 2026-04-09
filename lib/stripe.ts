import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
  typescript: true,
})

export const STRIPE_PLANS = {
  starter: {
    name: 'Starter',
    priceId: process.env.STRIPE_STARTER_PRICE_ID || '',
    features: ['Up to 10 employees', 'SMS shift scheduling', 'Basic reporting'],
    price: 29,
  },
  pro: {
    name: 'Pro',
    priceId: process.env.STRIPE_PRO_PRICE_ID || '',
    features: [
      'Unlimited employees',
      'SMS shift scheduling',
      'Advanced reporting',
      'Priority support',
    ],
    price: 79,
  },
} as const
