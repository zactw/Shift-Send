'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [workspaceName, setWorkspaceName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreateWorkspace(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Create workspace
      const slug = workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') +
        '-' + Math.random().toString(36).slice(2, 7)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as any
      const { data: workspace, error: wsError } = await sb
        .from('workspaces')
        .insert({ name: workspaceName, slug })
        .select()
        .single()

      if (wsError) throw wsError

      // Create user record
      const { error: userError } = await sb
        .from('users')
        .insert({
          id: user.id,
          workspace_id: workspace.id,
          email: user.email ?? '',
          full_name: user.email?.split('@')[0] ?? 'Manager',
          role: 'manager',
        })

      if (userError) throw userError

      setStep(2)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleStartTrial() {
    router.push('/schedule')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">ShiftSend</span>
          </div>
          <p className="mt-2 text-gray-500 text-sm">Let&apos;s get you set up.</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${
                s <= step ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {s}
              </div>
              <span className={`text-sm ${s <= step ? 'text-gray-900' : 'text-gray-400'}`}>
                {s === 1 ? 'Workspace' : 'Billing'}
              </span>
              {s < 2 && <div className={`h-px flex-1 ${s < step ? 'bg-indigo-400' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {step === 1 && (
            <>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">Name your workspace</h1>
              <p className="text-sm text-gray-500 mb-6">This is typically your business name.</p>

              <form onSubmit={handleCreateWorkspace} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business name</label>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={e => setWorkspaceName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Sunrise Café"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
                >
                  {loading ? 'Creating...' : 'Continue'}
                </button>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">Start your free trial</h1>
              <p className="text-sm text-gray-500 mb-6">
                14 days free, then $29/month. Up to 25 employees, unlimited shifts.
              </p>

              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-700">ShiftSend Pro</span>
                  <span className="font-semibold text-gray-900">$29/mo</span>
                </div>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>✓ Up to 25 employees</li>
                  <li>✓ Unlimited shift schedules</li>
                  <li>✓ Two-way SMS automation</li>
                  <li>✓ 14-day free trial</li>
                </ul>
              </div>

              <button
                onClick={handleStartTrial}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors mb-3"
              >
                Start free trial
              </button>
              <p className="text-xs text-center text-gray-400">No credit card required to start</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
