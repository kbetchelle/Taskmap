import { type ReactNode } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useUIStore } from '../../stores/uiStore'
import { useConflictStore } from '../../stores/conflictStore'
import { useMobileMode } from '../../hooks/useMobileMode'
import { ColumnsView } from '../ColumnsView'
import { MobileColumnsView } from '../MobileColumnsView'
import { Footer } from '../Footer'
import { SettingsPanel } from '../SettingsPanel'
import { ShortcutSheet } from '../ShortcutSheet'
import { HelpSheet } from '../HelpSheet'
import { SearchBarOverlay } from '../SearchBar/SearchBarOverlay'
import { OnboardingFlow } from '../OnboardingFlow'
import { FeedbackToast } from '../FeedbackToast'
import { CommandPalette } from '../CommandPalette'
import { ConflictDialog } from '../ConflictDialog'
import { ArchiveView } from '../ArchiveView'
import { MobileMenu } from '../MobileMenu'

interface AppContainerProps {
  children?: ReactNode
}

export function AppContainer({ children }: AppContainerProps) {
  useMobileMode()
  const currentView = useAppStore((s) => s.currentView)
  const isMobile = useUIStore((s) => s.mobileMode)
  const previousView = useAppStore((s) => s.previousView)
  const navigationPath = useAppStore((s) => s.navigationPath)
  const colorMode = useAppStore((s) => s.colorMode)
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const setPreviousView = useAppStore((s) => s.setPreviousView)
  const searchBarOpen = useAppStore((s) => s.searchBarOpen)
  const onboardingOpen = useAppStore((s) => s.onboardingOpen)
  const setHelpOpen = useAppStore((s) => s.setHelpOpen)
  const pendingConflict = useConflictStore((s) => s.pendingConflict)
  const resolveConflict = useConflictStore((s) => s.resolveConflict)
  const cancelConflict = useConflictStore((s) => s.cancelConflict)

  const handleCloseSettings = () => {
    setCurrentView(previousView ?? 'main_db')
    setPreviousView(null)
  }

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-flow-background">
      <header className="flex-shrink-0 h-12 border-b border-flow-columnBorder flex items-center justify-between px-4">
        <h1 className="text-flow-dir font-flow-semibold text-flow-textPrimary">Flow</h1>
        <button
          type="button"
          className="w-9 h-9 flex items-center justify-center rounded-full text-flow-textSecondary hover:text-flow-textPrimary hover:bg-flow-columnBorder/30 transition-colors font-medium text-lg"
          aria-label="Help – keyboard shortcuts and getting started"
          onClick={() => setHelpOpen(true)}
        >
          ?
        </button>
      </header>
      <main className="flex-1 min-h-0 flex flex-col relative">
        {currentView === 'settings' ? (
          <div className="flex-1 min-h-0 flex flex-row">
            <div
              className={`flex-shrink-0 border-r border-flow-columnBorder ${
                isMobile ? 'w-full' : 'w-[320px]'
              }`}
            >
              <SettingsPanel onClose={handleCloseSettings} />
            </div>
            {!isMobile && (
              <div className="flex-1 min-h-0 min-w-0">
                <ColumnsView
                  viewMode={previousView === 'upcoming' ? 'upcoming' : 'main_db'}
                  navigationPath={navigationPath}
                  colorMode={colorMode}
                />
              </div>
            )}
          </div>
        ) : currentView === 'archive' ? (
          <ArchiveView />
        ) : isMobile ? (
          <MobileColumnsView
            viewMode={currentView === 'upcoming' ? 'upcoming' : 'main_db'}
            navigationPath={navigationPath}
            colorMode={colorMode}
          />
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
      <HelpSheet />
      <CommandPalette />
      {onboardingOpen && <OnboardingFlow />}
      <FeedbackToast />
      {pendingConflict && (
        <ConflictDialog
          conflict={pendingConflict}
          onResolve={(resolution, data) => resolveConflict(resolution, data)}
          onCancel={cancelConflict}
        />
      )}
      <MobileMenu />
    </div>
  )
}
