import { type ReactNode, useCallback, useRef } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useUIStore } from '../../stores/uiStore'
import { useConflictStore } from '../../stores/conflictStore'
import { useViewport } from '../../hooks/useViewport'
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
import { SidebarTree } from '../SidebarTree'
import {
  TOPBAR_HEIGHT_PX,
  SIDEBAR_WIDTH_DEFAULT,
  SIDEBAR_COLLAPSED_WIDTH,
} from '../../lib/theme'

interface AppContainerProps {
  children?: ReactNode
}

export function AppContainer({ children }: AppContainerProps) {
  useMobileMode()
  const { breakpoint, isMobile } = useViewport()
  const currentView = useAppStore((s) => s.currentView)
  const previousView = useAppStore((s) => s.previousView)
  const navigationPath = useAppStore((s) => s.navigationPath)
  const colorMode = useAppStore((s) => s.colorMode)
  const setCurrentView = useAppStore((s) => s.setCurrentView)
  const setPreviousView = useAppStore((s) => s.setPreviousView)
  const setSearchBarOpen = useAppStore((s) => s.setSearchBarOpen)
  const searchBarOpen = useAppStore((s) => s.searchBarOpen)
  const onboardingOpen = useAppStore((s) => s.onboardingOpen)
  const setHelpOpen = useAppStore((s) => s.setHelpOpen)
  const pendingConflict = useConflictStore((s) => s.pendingConflict)
  const resolveConflict = useConflictStore((s) => s.resolveConflict)
  const cancelConflict = useConflictStore((s) => s.cancelConflict)

  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const sidebarWidth = useUIStore((s) => s.sidebarWidth)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen)
  const setSidebarWidth = useUIStore((s) => s.setSidebarWidth)
  const setMobileMenuOpen = useUIStore((s) => s.setMobileMenuOpen)

  const handleCloseSettings = () => {
    setCurrentView(previousView ?? 'main_db')
    setPreviousView(null)
  }

  const handleOpenSettings = () => {
    setPreviousView(currentView)
    setCurrentView('settings')
  }

  // Desktop sidebar resize
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (breakpoint !== 'desktop' || !sidebarOpen) return
      e.preventDefault()
      const startX = e.clientX
      const startWidth = sidebarWidth
      resizeRef.current = { startX, startWidth }
      const onMove = (ev: MouseEvent) => {
        if (resizeRef.current == null) return
        const delta = ev.clientX - startX
        setSidebarWidth(startWidth + delta)
      }
      const onUp = () => {
        resizeRef.current = null
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [breakpoint, sidebarOpen, sidebarWidth, setSidebarWidth]
  )

  const effectiveSidebarWidth =
    breakpoint === 'desktop'
      ? sidebarOpen
        ? sidebarWidth
        : SIDEBAR_COLLAPSED_WIDTH
      : breakpoint === 'tablet'
        ? sidebarOpen
          ? SIDEBAR_WIDTH_DEFAULT
          : SIDEBAR_COLLAPSED_WIDTH
        : SIDEBAR_WIDTH_DEFAULT

  const showSidebarOverlay = breakpoint === 'mobile' && sidebarOpen

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-flow-background">
      {/* Top bar: 48px, title + hamburger on mobile, actions on right */}
      <header
        className="flex-shrink-0 border-b border-flow-columnBorder flex items-center justify-between px-4 bg-flow-background"
        style={{ height: TOPBAR_HEIGHT_PX }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isMobile && (
            <>
              <button
                type="button"
                className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full text-flow-textSecondary hover:text-flow-textPrimary hover:bg-flow-columnBorder/30 transition-colors"
                aria-label="Open menu"
                onClick={() => setMobileMenuOpen(true)}
              >
                <span className="text-lg font-medium">☰</span>
              </button>
              <button
                type="button"
                className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full text-flow-textSecondary hover:text-flow-textPrimary hover:bg-flow-columnBorder/30 transition-colors"
                aria-label="Open sidebar"
                onClick={() => setSidebarOpen(true)}
              >
                <span className="text-base">≡</span>
              </button>
            </>
          )}
          <h1 className="text-flow-dir font-flow-semibold text-flow-textPrimary truncate">Flow</h1>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-full text-flow-textSecondary hover:text-flow-textPrimary hover:bg-flow-columnBorder/30 transition-colors"
            aria-label="Search"
            onClick={() => setSearchBarOpen(true)}
          >
            <span className="text-base">🔍</span>
          </button>
          <button
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-full text-flow-textSecondary hover:text-flow-textPrimary hover:bg-flow-columnBorder/30 transition-colors"
            aria-label="Settings"
            onClick={handleOpenSettings}
          >
            <span className="text-base">⚙</span>
          </button>
          <button
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-full text-flow-textSecondary hover:text-flow-textPrimary hover:bg-flow-columnBorder/30 transition-colors font-medium text-lg"
            aria-label="Help – keyboard shortcuts and getting started"
            onClick={() => setHelpOpen(true)}
          >
            ?
          </button>
        </div>
      </header>

      {/* Body: sidebar + main */}
      <div className="flex-1 min-h-0 flex flex-row relative">
        {/* Sidebar: in flow on desktop/tablet when shown */}
        {(breakpoint === 'desktop' || breakpoint === 'tablet') && (
          <aside
            className="flex-shrink-0 border-r border-flow-columnBorder bg-flow-background flex flex-col transition-[width] duration-200 ease-out overflow-hidden"
            style={{
              width: effectiveSidebarWidth,
              minWidth: effectiveSidebarWidth,
            }}
          >
            <div className="flex items-center justify-between h-10 px-3 border-b border-flow-columnBorder/50">
              <span className="text-flow-meta text-flow-textSecondary truncate">Sidebar</span>
              {(breakpoint === 'desktop' || breakpoint === 'tablet') && (
                <button
                  type="button"
                  className="p-1 rounded text-flow-textSecondary hover:text-flow-textPrimary hover:bg-flow-columnBorder/30 transition-colors"
                  aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                  onClick={toggleSidebar}
                >
                  <span className="text-sm">{sidebarOpen ? '◀' : '▶'}</span>
                </button>
              )}
            </div>
            {sidebarOpen && <SidebarTree />}
          </aside>
        )}

        {/* Desktop sidebar resize handle */}
        {breakpoint === 'desktop' && sidebarOpen && (
          <div
            role="separator"
            className="absolute top-0 bottom-0 w-2 cursor-col-resize z-10 flex items-center justify-center group"
            style={{ left: effectiveSidebarWidth - 8 }}
            onMouseDown={handleResizeStart}
          >
            <span className="w-0.5 h-8 bg-flow-columnBorder group-hover:bg-flow-focus/50 transition-colors rounded-full pointer-events-none" />
          </div>
        )}

        {/* Mobile sidebar overlay */}
        {showSidebarOverlay && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-[1000] transition-opacity duration-200"
              aria-hidden
              onClick={() => setSidebarOpen(false)}
            />
            <aside
              className="fixed left-0 top-0 bottom-0 z-[1001] border-r border-flow-columnBorder bg-flow-background flex flex-col w-[260px] max-w-[85vw] shadow-xl transition-[transform] duration-200 ease-out"
              style={{
                marginTop: TOPBAR_HEIGHT_PX,
                transform: 'translateX(0)',
              }}
            >
              <div className="flex items-center justify-between h-10 px-3 border-b border-flow-columnBorder/50">
                <span className="text-flow-meta text-flow-textSecondary">Sidebar</span>
                <button
                  type="button"
                  className="p-1 rounded text-flow-textSecondary hover:text-flow-textPrimary hover:bg-flow-columnBorder/30"
                  aria-label="Close sidebar"
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="text-sm">✕</span>
                </button>
              </div>
              <SidebarTree />
            </aside>
          </>
        )}

        {/* Main content */}
        <main className="flex-1 min-h-0 flex flex-col relative min-w-0" tabIndex={-1}>
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
      </div>

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
