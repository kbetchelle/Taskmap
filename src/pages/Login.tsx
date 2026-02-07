import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'

export function Login() {
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/ebc00a6d-3ac2-45ad-a3bd-a7d852883501',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Login.tsx:mount',message:'Login rendering',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) setMessage({ type: 'error', text: error.message })
    else setMessage({ type: 'success', text: 'Check your email for the confirmation link.' })
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setMessage({ type: 'error', text: error.message })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-base font-medium text-neutral-900 mb-4">Taskmap</h1>
        <form className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-neutral-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-neutral-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              required
            />
          </div>
          {message && (
            <p
              className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}
            >
              {message.text}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" onClick={handleSignIn} disabled={loading}>
              Sign in
            </Button>
            <Button type="button" variant="secondary" onClick={handleSignUp} disabled={loading}>
              Sign up
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
