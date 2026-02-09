import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import { ErrorBoundary } from './components/ErrorBoundary'
import { installShortcutPrevention } from './lib/shortcutPrevention'

installShortcutPrevention()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      gcTime: 300000,
    },
  },
})

const rootEl = document.getElementById('root')

async function bootstrap() {
  try {
    // Handle OAuth callback: exchange code for session before rendering
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      const { supabase } = await import('./lib/supabase')
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        window.history.replaceState({}, '', window.location.pathname)
      }
    }

    const { default: App } = await import('./App.tsx')
    createRoot(rootEl!).render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </QueryClientProvider>
      </StrictMode>,
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    createRoot(rootEl!).render(
      <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 480 }}>
        <h2 style={{ margin: '0 0 8px 0', color: '#1a1a1a' }}>Configuration required</h2>
        <p style={{ margin: '0 0 16px', color: '#555', lineHeight: 1.5 }}>{msg}</p>
        <p style={{ margin: 0, color: '#666', fontSize: 14 }}>
          Copy <code>.env.local.example</code> to <code>.env.local</code> and add your Supabase URL and anon key.
          Then run <code>npm run build</code> and <code>npm run preview</code> again.
        </p>
      </div>,
    )
  }
}
bootstrap()
