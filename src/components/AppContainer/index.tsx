import { type ReactNode } from 'react'
import { useAppStore } from '../../stores/appStore'
import { ColumnsView } from '../ColumnsView'
import { Footer } from '../Footer'
import { SettingsPanel } from '../SettingsPanel'
import { ShortcutSheet } from '../ShortcutSheet'
import { SearchBarOverlay } from '../SearchBar/SearchBarOverlay'
import { OnboardingFlow } from '../OnboardingFlow'
import { FeedbackToast } from '../FeedbackToast'
import { CommandPalette } from '../CommandPalette'

interface AppContainerProps {
  children?: ReactNode
}

export function AppContainer({ children }: AppContainerProps) {
  const currentView = useAppStore((s) => s.currentView)
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/ebc00a6d-3ac2-45ad-a3bd-a7d852883501',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AppContainer/index.tsx:render',message:'AppContainer render',data:{currentView},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  const previousView = useAppStore((s) => s.previousView)
  const navigationPath = useAppStore((s) => s.navigationPath)
  const colorMode = useAppStore((s) => s.colorMode)
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const setPreviousView = useAppStore((s) => s.setPreviousView)
  const searchBarOpen = useAppStore((s) => s.searchBarOpen)
  const onboardingOpen = useAppStore((s) => s.onboardingOpen)

  const handleCloseSettings = () => {
    setCurrentView(previousView ?? 'main_db')
    setPreviousView(null)
  }

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-flow-background">
      <header className="flex-shrink-0 h-12 border-b border-flow-columnBorder flex items-center px-4">
        <h1 className="text-flow-dir font-flow-semibold text-flow-textPrimary">Flow</h1>
      </header>
      <main className="flex-1 min-h-0 flex flex-col relative">
        {currentView === 'settings' ? (
          <div className="flex-1 min-h-0 flex flex-row">
            <div className="flex-shrink-0 w-[320px] border-r border-flow-columnBorder">
              <SettingsPanel onClose={handleCloseSettings} />
            </div>
            <div className="flex-1 min-h-0 min-w-0">
              <ColumnsView
                viewMode={previousView === 'upcoming' ? 'upcoming' : 'main_db'}
                navigationPath={navigationPath}
                colorMode={colorMode}
              />
            </div>
          </div>
        ) : (
          <ColumnsView
            viewMode={currentView === 'upcoming' ? 'upcoming' : 'main_db'}
            navigationPath={navigationPath}
            colorMode={colorMode}
          />
        )}
        {searchBarOpen && currentView !== 'settings' && (
          <SearchBarOverlay onClose={() => useAppStore.getState().setSearchBarOpen(false)} />
        )}
        {children}
      </main>
      <footer className="flex-shrink-0 border-t border-flow-columnBorder">
        <Footer />
      </footer>
      <ShortcutSheet />
      <CommandPalette />
      {onboardingOpen && <OnboardingFlow />}
      <FeedbackToast />
    </div>
  )
}
