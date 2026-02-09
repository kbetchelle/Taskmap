import { useState } from 'react'
import { supabase, setStayLoggedIn, getStayLoggedInPreference } from '../lib/supabase'
import { Button } from '../components/ui/Button'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [stayLoggedIn, setStayLoggedInState] = useState(getStayLoggedInPreference)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  function handleStayLoggedInChange(checked: boolean) {
    setStayLoggedInState(checked)
    setStayLoggedIn(checked)
  }

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

  async function handleSignInWithGoogle() {
    setGoogleLoading(true)
    setMessage(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) {
      setMessage({ type: 'error', text: error.message })
      setGoogleLoading(false)
    }
    // On success Supabase redirects; no need to reset loading
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-100">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-base font-medium text-neutral-900 mb-4">Taskmap</h1>
        <Button
          type="button"
          variant="secondary"
          onClick={handleSignInWithGoogle}
          disabled={loading || googleLoading}
          className="w-full"
        >
          {googleLoading ? 'Redirecting…' : 'Sign in with Google'}
        </Button>
        <div className="relative my-4">
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-neutral-500">
            or
          </span>
          <hr className="border-neutral-200" />
        </div>
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
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 pr-10 text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-neutral-500 hover:text-neutral-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={stayLoggedIn}
              onChange={(e) => handleStayLoggedInChange(e.target.checked)}
              className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
            />
            <span className="text-sm text-neutral-700">Stay logged in</span>
          </label>
          {message && (
            <p
              className={`text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}
            >
              {message.text}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" onClick={handleSignIn} disabled={loading || googleLoading}>
              Sign in
            </Button>
            <Button type="button" variant="secondary" onClick={handleSignUp} disabled={loading || googleLoading}>
              Sign up
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
