'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

type Workspace = {
  id: string
  name: string
  twilio_phone: string | null
  subscription_status: string | null
}

export default function SettingsPage() {
  const supabase = createClient()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', twilio_phone: '' })

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: userData } = await supabase
      .from('users')
      .select('workspace_id, workspaces(*)')
      .eq('id', user.id)
      .single()
    if (!userData) return
    const ws = userData.workspaces as Workspace | null
    if (ws) {
      setWorkspace(ws)
      setForm({ name: ws.name, twilio_phone: ws.twilio_phone ?? '' })
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!workspace) return
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({ name: form.name, twilio_phone: form.twilio_phone || null })
        .eq('id', workspace.id)
      if (error) throw error
      setSuccess(true)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your workspace configuration.</p>
      </div>

      {/* Workspace settings */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Workspace</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Twilio Phone Number</label>
            <input
              type="tel"
              value={form.twilio_phone}
              onChange={e => setForm(f => ({ ...f, twilio_phone: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="+16025551234"
            />
            <p className="text-xs text-gray-400 mt-1">Must be in E.164 format. Used for outbound SMS.</p>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
          {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">Settings saved.</div>}

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Billing */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Billing</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-600">
              Status:{' '}
              <span className={`font-medium ${
                workspace?.subscription_status === 'active' ? 'text-green-600' :
                workspace?.subscription_status === 'trialing' ? 'text-blue-600' :
                'text-red-600'
              }`}>
                {workspace?.subscription_status ?? 'Unknown'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">$29/month · Up to 25 employees</p>
          </div>
          <a
            href="/api/billing/portal"
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
          >
            Manage Billing
          </a>
        </div>
      </div>
    </div>
  )
}
