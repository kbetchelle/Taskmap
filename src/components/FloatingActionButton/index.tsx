import { useState, useCallback, useEffect, useRef } from 'react'
import { Plus, X } from 'lucide-react'
import { FABMenuItem } from './FABMenuItem'
import { useAppStore } from '../../stores/appStore'
import { useTaskStore } from '../../stores/taskStore'
import { useDirectoryStore } from '../../stores/directoryStore'
import {
  getApplicableCommands,
  type CommandContext,
} from '../../lib/commandRegistry'
import { useNetworkStore } from '../../stores/networkStore'

/**
 * Floating Action Button — mobile-only replacement for the backslash menu trigger.
 * Fixed position, bottom-right, above the bottom nav bar.
 * Tapping opens an action menu with staggered animation.
 */
export function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const lastScrollYRef = useRef(0)
  const fabRef = useRef<HTMLDivElement>(null)

  const isReadOnly = useNetworkStore((s) => !s.isOnline)
  const focusedItemId = useAppStore((s) => s.focusedItemId)
  const selectedItems = useAppStore((s) => s.selectedItems)
  const navigationPath = useAppStore((s) => s.navigationPath)

  // Build command context
  const commandContext: CommandContext = (() => {
    const tasks = useTaskStore.getState().tasks
    const directories = useDirectoryStore.getState().directories

    const focusedItemType: 'task' | 'directory' | null = (() => {
      if (!focusedItemId) return null
      if (tasks.some((t) => t.id === focusedItemId)) return 'task'
      if (directories.some((d) => d.id === focusedItemId)) return 'directory'
      return null
    })()

    const selectedItemTypes: ('task' | 'directory' | null)[] = selectedItems.map((id) => {
      if (tasks.some((t) => t.id === id)) return 'task'
      if (directories.some((d) => d.id === id)) return 'directory'
      return null
    })

    const currentDirectoryId = navigationPath.length > 0
      ? navigationPath[navigationPath.length - 1]
      : null

    return {
      focusedItemId,
      focusedItemType,
      selectedItems,
      selectedItemTypes,
      currentDirectoryId,
    }
  })()

  const commands = getApplicableCommands(commandContext, isReadOnly)

  const toggleMenu = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const handleSelect = useCallback((commandId: string) => {
    setIsOpen(false)
    // Trigger via the backslash menu's execute flow
    useAppStore.getState().setBackslashMenuOpen(true)
    // We push the command to be executed via the existing command flow
    // For now, dispatch through the app's action system
    requestAnimationFrame(() => {
      useAppStore.getState().closeBackslashMenu()
    })
    // TODO: wire to actual command execution when action registry supports it
    void commandId
  }, [])

  // Click outside to dismiss
  useEffect(() => {
    if (!isOpen) return
    const handleTouch = (e: TouchEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('touchstart', handleTouch)
    return () => document.removeEventListener('touchstart', handleTouch)
  }, [isOpen])

  // Scroll direction detection to hide/show FAB
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      if (scrollY > lastScrollYRef.current + 10) {
        setIsVisible(false) // scrolling down
      } else if (scrollY < lastScrollYRef.current - 10) {
        setIsVisible(true) // scrolling up
      }
      lastScrollYRef.current = scrollY
    }

    // Also listen to scroll events on main content areas
    const scrollContainers = document.querySelectorAll('[data-scroll-container]')
    scrollContainers.forEach((el) => {
      el.addEventListener('scroll', handleScroll, { passive: true })
    })
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      scrollContainers.forEach((el) => {
        el.removeEventListener('scroll', handleScroll)
      })
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <div
      ref={fabRef}
      className={`fixed z-[1300] transition-transform duration-300 ease-out ${
        isVisible ? 'translate-y-0' : 'translate-y-[100px]'
      }`}
      style={{
        bottom: 'calc(56px + env(safe-area-inset-bottom, 0px) + 16px)',
        right: 24,
      }}
    >
      {/* Action menu items */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-[-1]"
            onClick={() => setIsOpen(false)}
          />
          {/* Menu items stacked above FAB */}
          <div className="absolute bottom-[64px] right-0 w-[220px] flex flex-col gap-2">
            {commands.map((cmd, idx) => (
              <FABMenuItem
                key={cmd.id}
                icon={cmd.icon}
                label={cmd.label}
                onClick={() => handleSelect(cmd.id)}
                delay={idx * 50}
              />
            ))}
          </div>
        </>
      )}

      {/* FAB button */}
      <button
        type="button"
        className="w-14 h-14 rounded-full bg-flow-focus text-white shadow-lg flex items-center justify-center transition-transform duration-200 active:scale-95"
        onClick={toggleMenu}
        aria-label={isOpen ? 'Close action menu' : 'Open action menu'}
      >
        {isOpen ? <X size={24} /> : <Plus size={24} />}
      </button>
    </div>
  )
}
