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

// #region agent log
const rootEl = document.getElementById('root')
fetch('http://127.0.0.1:7244/ingest/ebc00a6d-3ac2-45ad-a3bd-a7d852883501',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:root',message:'root element',data:{rootFound:!!rootEl},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
// #endregion

async function bootstrap() {
  try {
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
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/ebc00a6d-3ac2-45ad-a3bd-a7d852883501',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:render',message:'render called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
  } catch (e) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/ebc00a6d-3ac2-45ad-a3bd-a7d852883501',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'main.tsx:catch',message:'config error caught',data:{error:String(e)},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
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
