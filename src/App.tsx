import { useAuth } from './hooks/useAuth'
import { useAuthSyncStores } from './hooks/useAuth'
import { useRealtimeSubscriptions } from './hooks/useRealtime'
import { useMidnightRefresh } from './hooks/useMidnightRefresh'
import { AppContextProvider } from './contexts/AppContext'
import { ViewContextProvider } from './contexts/ViewContext'
import { AppContainer } from './components/AppContainer'
import { Login } from './pages/Login'

function AppContent() {
  const { session } = useAuth()
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/ebc00a6d-3ac2-45ad-a3bd-a7d852883501',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:AppContent',message:'branch',data:{hasSession:!!session,showingLogin:!session},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  if (!session) {
    return <Login />
  }

  return (
    <AppContextProvider>
      <ViewContextProvider>
        <AppContainer />
      </ViewContextProvider>
    </AppContextProvider>
  )
}

function App() {
  useAuth()
  useAuthSyncStores()
  useRealtimeSubscriptions()
  useMidnightRefresh()

  return <AppContent />
}

export default App
