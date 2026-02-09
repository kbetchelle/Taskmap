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
