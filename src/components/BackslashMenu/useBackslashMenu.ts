import { useCallback, useMemo, useState } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useTaskStore } from '../../stores/taskStore'
import { useDirectoryStore } from '../../stores/directoryStore'
import { useUIStore } from '../../stores/uiStore'
import {
  getApplicableCommands,
  fuzzyMatch,
  type CommandContext,
  type CommandDescriptor,
} from '../../lib/commandRegistry'

// ── Menu height estimation for viewport flip ─────────────────────────────
const ITEM_HEIGHT = 40
const INPUT_HEIGHT = 44
const PADDING = 16
const MAX_VISIBLE_ITEMS = 8
const MENU_WIDTH = 280
const GAP = 4

function estimateMenuHeight(itemCount: number): number {
  const visible = Math.min(itemCount, MAX_VISIBLE_ITEMS)
  return INPUT_HEIGHT + visible * ITEM_HEIGHT + PADDING
}

// ── Hook ─────────────────────────────────────────────────────────────────

export interface UseBackslashMenuReturn {
  /** Whether the menu is currently open */
  isOpen: boolean
  /** Filtered commands based on current context + query */
  filteredCommands: CommandDescriptor[]
  /** Current filter query */
  query: string
  /** Set filter query */
  setQuery: (q: string) => void
  /** Calculated position for the menu (fixed coordinates) */
  position: { top: number; left: number } | null
  /** Whether to render as mobile bottom sheet */
  isMobile: boolean
  /** Open the menu, computing position from the focused item */
  openMenu: () => void
  /** Close the menu and restore keyboard context */
  closeMenu: () => void
  /** Build the current command context */
  commandContext: CommandContext
}

export function useBackslashMenu(): UseBackslashMenuReturn {
  const [query, setQuery] = useState('')

  const isOpen = useAppStore((s) => s.backslashMenuOpen)
  const position = useAppStore((s) => s.backslashMenuPosition)
  const focusedItemId = useAppStore((s) => s.focusedItemId)
  const selectedItems = useAppStore((s) => s.selectedItems)
  const navigationPath = useAppStore((s) => s.navigationPath)
  const isMobile = useUIStore((s) => s.mobileMode)

  // Build the command context from current app state
  const commandContext = useMemo<CommandContext>(() => {
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
  }, [focusedItemId, selectedItems, navigationPath])

  // Get applicable commands and apply fuzzy filter
  const filteredCommands = useMemo(() => {
    const applicable = getApplicableCommands(commandContext)
    if (!query) return applicable
    return applicable.filter((cmd) => fuzzyMatch(query, cmd.label))
  }, [commandContext, query])

  // Calculate position from focused item DOM element
  const calculatePosition = useCallback((): { top: number; left: number } | null => {
    if (isMobile) return null // mobile uses bottom sheet, no position needed

    const focusId = useAppStore.getState().focusedItemId
    let rect: DOMRect | null = null

    if (focusId) {
      const el = document.querySelector(`[data-item-id="${focusId}"]`)
      if (el) {
        rect = el.getBoundingClientRect()
      }
    }

    // If no focused item, try to anchor to the active column center
    if (!rect) {
      const columns = document.querySelectorAll('[data-column-index]')
      const colIndex = useAppStore.getState().focusedColumnIndex
      const col = columns[colIndex] as HTMLElement | undefined
      if (col) {
        const colRect = col.getBoundingClientRect()
        rect = new DOMRect(
          colRect.left + colRect.width / 2 - MENU_WIDTH / 2,
          colRect.top + colRect.height / 2,
          0,
          0,
        )
      }
    }

    if (!rect) {
      // Fallback: center of viewport
      return {
        top: window.innerHeight / 2 - 150,
        left: window.innerWidth / 2 - MENU_WIDTH / 2,
      }
    }

    let top = rect.bottom + GAP
    let left = rect.left

    // Viewport-aware: flip above if clipping below
    const menuHeight = estimateMenuHeight(filteredCommands.length || MAX_VISIBLE_ITEMS)
    if (top + menuHeight > window.innerHeight) {
      top = rect.top - menuHeight - GAP
    }

    // Shift left if clipping on the right
    if (left + MENU_WIDTH > window.innerWidth) {
      left = window.innerWidth - MENU_WIDTH - 8
    }

    // Don't go off-screen left
    if (left < 8) left = 8

    // Don't go off-screen top
    if (top < 8) top = 8

    return { top, left }
  }, [isMobile, filteredCommands.length])

  const openMenu = useCallback(() => {
    const pos = calculatePosition()
    useAppStore.getState().pushKeyboardContext('command_menu')
    useAppStore.getState().setBackslashMenuOpen(true, pos ?? undefined)
    setQuery('')
  }, [calculatePosition])

  const closeMenu = useCallback(() => {
    useAppStore.getState().popKeyboardContext()
    useAppStore.getState().closeBackslashMenu()
    setQuery('')

    // Return focus to the focused item element
    const focusId = useAppStore.getState().focusedItemId
    if (focusId) {
      requestAnimationFrame(() => {
        const el = document.querySelector(`[data-item-id="${focusId}"]`) as HTMLElement | null
        el?.focus()
      })
    }
  }, [])

  return {
    isOpen,
    filteredCommands,
    query,
    setQuery,
    position,
    isMobile,
    openMenu,
    closeMenu,
    commandContext,
  }
}
