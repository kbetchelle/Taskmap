import { useState, useEffect, useCallback } from 'react'
import { List, Calendar, Columns3, Home } from 'lucide-react'
import { useAppStore } from '../../stores/appStore'
import { useViewStore } from '../../stores/viewStore'
import type { ViewType } from '../../types/views'

/**
 * Mobile bottom tab bar for view switching.
 * Fixed at bottom with safe area padding.
 * Hides when software keyboard is open.
 */
export function BottomNavBar() {
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const navigationPath = useAppStore((s) => s.navigationPath)
  const setNavigationPath = useAppStore((s) => s.setNavigationPath)
  const setGlobalDefault = useViewStore((s) => s.setGlobalDefault)
  const globalDefault = useViewStore((s) => s.globalDefault)

  // Detect keyboard open/close via focusin/focusout on input-like elements
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        setKeyboardOpen(true)
      }
    }
    const handleFocusOut = () => {
      // Small delay to avoid flicker when focus moves between inputs
      setTimeout(() => {
        const active = document.activeElement as HTMLElement | null
        if (
          !active ||
          (active.tagName !== 'INPUT' &&
            active.tagName !== 'TEXTAREA' &&
            !active.isContentEditable)
        ) {
          setKeyboardOpen(false)
        }
      }, 100)
    }

    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)
    return () => {
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
    }
  }, [])

  const handleViewChange = useCallback(
    (view: ViewType) => {
      setGlobalDefault(view)
      // Also set for current directory if in one
      if (navigationPath.length > 0) {
        const dirId = navigationPath[navigationPath.length - 1]
        useViewStore.getState().setViewForDirectory(dirId, view)
      }
    },
    [setGlobalDefault, navigationPath]
  )

  const handleHome = useCallback(() => {
    setNavigationPath([])
  }, [setNavigationPath])

  if (keyboardOpen) return null

  const tabs: { id: string; icon: typeof List; label: string; action: () => void; isActive: boolean }[] = [
    {
      id: 'list',
      icon: List,
      label: 'List',
      action: () => handleViewChange('list'),
      isActive: globalDefault === 'list',
    },
    {
      id: 'calendar',
      icon: Calendar,
      label: 'Calendar',
      action: () => handleViewChange('calendar'),
      isActive: globalDefault === 'calendar',
    },
    {
      id: 'kanban',
      icon: Columns3,
      label: 'Kanban',
      action: () => handleViewChange('kanban'),
      isActive: globalDefault === 'kanban',
    },
    {
      id: 'home',
      icon: Home,
      label: 'Home',
      action: handleHome,
      isActive: navigationPath.length === 0,
    },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[1200] border-t border-flow-columnBorder bg-flow-background flex items-center justify-around"
      style={{
        height: 56,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            type="button"
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full min-w-[44px] transition-colors ${
              tab.isActive ? 'text-flow-focus' : 'text-flow-textSecondary'
            }`}
            onClick={tab.action}
            aria-label={tab.label}
          >
            <Icon size={22} />
            <span className="text-[10px] font-flow-medium leading-tight">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
