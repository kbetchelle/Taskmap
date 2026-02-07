import { useEffect, useCallback } from 'react'
import { SHORTCUTS } from '../lib/constants'
import { useAppStore } from '../stores/appStore'

type ShortcutHandler = () => void

interface UseKeyboardOptions {
  onMainView?: ShortcutHandler
  onUpcomingView?: ShortcutHandler
  onSearch?: ShortcutHandler
  onNewTask?: ShortcutHandler
  onNewDirectory?: ShortcutHandler
  onInitiateCreation?: ShortcutHandler
  onSettings?: ShortcutHandler
  onUndo?: ShortcutHandler
  onRedo?: ShortcutHandler
  onCommandPalette?: ShortcutHandler
  onScrollLeft?: ShortcutHandler
  onScrollRight?: ShortcutHandler
  onScrollHome?: ShortcutHandler
  onScrollEnd?: ShortcutHandler
  onColorNone?: ShortcutHandler
  onColorCategory?: ShortcutHandler
  onColorPriority?: ShortcutHandler
  // Phase 3: navigation (only when context === 'navigation')
  onArrowUp?: ShortcutHandler
  onArrowDown?: ShortcutHandler
  onArrowLeft?: ShortcutHandler
  onArrowRight?: ShortcutHandler
  onEnter?: ShortcutHandler
  onEscape?: ShortcutHandler
  onSpace?: ShortcutHandler
  onShiftArrowUp?: ShortcutHandler
  onShiftArrowDown?: ShortcutHandler
  onCmdA?: ShortcutHandler
  onCmdArrowUp?: ShortcutHandler
  onCmdArrowDown?: ShortcutHandler
  onCmdSlash?: ShortcutHandler
  // Phase 4: creation context (T/D/Escape)
  onCreationTypeTask?: ShortcutHandler
  onCreationTypeDirectory?: ShortcutHandler
  onCreationEscape?: ShortcutHandler
  onCreationInvalidKey?: (key: string) => void
  // Phase 4: edit, delete, copy/paste/cut
  onQuickEdit?: ShortcutHandler
  onFullEdit?: ShortcutHandler
  onDelete?: ShortcutHandler
  onCopy?: ShortcutHandler
  onCopyRecursive?: ShortcutHandler
  onPaste?: ShortcutHandler
  onPasteWithMetadata?: ShortcutHandler
  onCut?: ShortcutHandler
  // Phase 5: search, completed, saved views
  onSearchClose?: ShortcutHandler
  onToggleShowCompleted?: ShortcutHandler
  onSaveView?: ShortcutHandler
  onLoadSavedView?: (index: number) => void
  // Phase 6: expanded task panel (when context === 'editing')
  onExitEditing?: ShortcutHandler
  onAddAttachment?: ShortcutHandler
  onOpenAllAttachments?: ShortcutHandler
  // Phase 7: settings panel (when context === 'settings')
  onSettingsSave?: ShortcutHandler
  onSettingsClose?: ShortcutHandler
  enabled?: boolean
}

function parseShortcut(shortcut: string): { key: string; meta: boolean; shift?: boolean; alt?: boolean } {
  const parts = shortcut.toLowerCase().split('+')
  const meta = parts.includes('mod') || parts.includes('meta') || parts.includes('ctrl')
  const shift = parts.includes('shift')
  const alt = parts.includes('alt')
  const key = parts.find((p) => !['mod', 'meta', 'ctrl', 'shift', 'alt'].includes(p)) ?? ''
  return { key, meta, shift, alt }
}

function matchShortcut(e: KeyboardEvent, shortcut: string): boolean {
  const { key, meta, shift, alt } = parseShortcut(shortcut)
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
  const metaKey = isMac ? e.metaKey : e.ctrlKey
  const keyNorm =
    key === 'arrowleft'
      ? 'arrowleft'
      : key === 'arrowright'
        ? 'arrowright'
        : key === 'arrowup'
          ? 'arrowup'
          : key === 'arrowdown'
            ? 'arrowdown'
            : key
  const eKey = e.key.toLowerCase()
  if (keyNorm !== eKey) return false
  if (meta !== metaKey) return false
  if (shift !== undefined && shift !== e.shiftKey) return false
  if (alt !== undefined && alt !== e.altKey) return false
  return true
}

function isNavigationContext(): boolean {
  return useAppStore.getState().getCurrentKeyboardContext() === 'navigation'
}

function isCreationContext(): boolean {
  return useAppStore.getState().getCurrentKeyboardContext() === 'creation'
}

function isSearchContext(): boolean {
  return useAppStore.getState().getCurrentKeyboardContext() === 'search'
}

function isEditingContext(): boolean {
  return useAppStore.getState().getCurrentKeyboardContext() === 'editing'
}

function isSettingsContext(): boolean {
  return useAppStore.getState().getCurrentKeyboardContext() === 'settings'
}

export function useKeyboard({
  onMainView,
  onUpcomingView,
  onSearch,
  onNewTask,
  onNewDirectory,
  onInitiateCreation,
  onSettings,
  onUndo,
  onRedo,
  onCommandPalette,
  onScrollLeft,
  onScrollRight,
  onScrollHome,
  onScrollEnd,
  onColorNone,
  onColorCategory,
  onColorPriority,
  onArrowUp,
  onArrowDown,
  onArrowLeft,
  onArrowRight,
  onEnter,
  onEscape,
  onSpace,
  onShiftArrowUp,
  onShiftArrowDown,
  onCmdA,
  onCmdArrowUp,
  onCmdArrowDown,
  onCmdSlash,
  onCreationTypeTask,
  onCreationTypeDirectory,
  onCreationEscape,
  onCreationInvalidKey,
  onQuickEdit,
  onFullEdit,
  onDelete,
  onCopy,
  onCopyRecursive,
  onPaste,
  onPasteWithMetadata,
  onCut,
  onSearchClose,
  onToggleShowCompleted,
  onSaveView,
  onLoadSavedView,
  onExitEditing,
  onAddAttachment,
  onOpenAllAttachments,
  onSettingsSave,
  onSettingsClose,
  enabled = true,
}: UseKeyboardOptions = {}) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.target.getAttribute('data-keyboard-ignore') != null) return
      }

      // Phase 7: settings context — Enter save, Escape close
      if (isSettingsContext()) {
        if (matchShortcut(e, SHORTCUTS.ENTER) && onSettingsSave) {
          e.preventDefault()
          onSettingsSave()
          return
        }
        if (matchShortcut(e, SHORTCUTS.ESCAPE) && onSettingsClose) {
          e.preventDefault()
          onSettingsClose()
          return
        }
      }

      // Phase 5: search context — Escape closes
      if (isSearchContext() && matchShortcut(e, SHORTCUTS.ESCAPE) && onSearchClose) {
        e.preventDefault()
        onSearchClose()
        return
      }

      // Phase 4: creation context — only T, D, Escape
      if (isCreationContext()) {
        const key = e.key.toLowerCase()
        if (key === 't' && (onCreationTypeTask != null)) {
          e.preventDefault()
          onCreationTypeTask()
          return
        }
        if (key === 'd' && (onCreationTypeDirectory != null)) {
          e.preventDefault()
          onCreationTypeDirectory()
          return
        }
        if (e.key === 'Escape' && (onCreationEscape != null)) {
          e.preventDefault()
          onCreationEscape()
          return
        }
        if (onCreationInvalidKey != null) {
          e.preventDefault()
          onCreationInvalidKey(e.key)
          return
        }
      }

      // Phase 6: editing context (expanded task panel) — Escape, Cmd+Shift+F, Cmd+Shift+O
      if (isEditingContext()) {
        if (matchShortcut(e, SHORTCUTS.ESCAPE) && onExitEditing) {
          e.preventDefault()
          onExitEditing()
          return
        }
        if (matchShortcut(e, SHORTCUTS.CMD_SHIFT_F) && onAddAttachment) {
          e.preventDefault()
          onAddAttachment()
          return
        }
        if (matchShortcut(e, SHORTCUTS.CMD_SHIFT_O) && onOpenAllAttachments) {
          e.preventDefault()
          onOpenAllAttachments()
          return
        }
      }

      const nav = isNavigationContext()
      if (matchShortcut(e, SHORTCUTS.MAIN_VIEW) && onMainView) {
        e.preventDefault()
        onMainView()
        return
      }
      if (matchShortcut(e, SHORTCUTS.UPCOMING_VIEW) && onUpcomingView) {
        e.preventDefault()
        onUpcomingView()
        return
      }
      if (matchShortcut(e, SHORTCUTS.COMMAND_PALETTE) && onCommandPalette) {
        e.preventDefault()
        onCommandPalette()
        return
      }
      if (matchShortcut(e, SHORTCUTS.SEARCH_OPEN) && onSearch) {
        e.preventDefault()
        onSearch()
        return
      }
      if (matchShortcut(e, SHORTCUTS.COMPLETED_TOGGLE) && onToggleShowCompleted) {
        e.preventDefault()
        onToggleShowCompleted()
        return
      }
      if (matchShortcut(e, SHORTCUTS.SAVE_VIEW) && onSaveView) {
        e.preventDefault()
        onSaveView()
        return
      }
      // Saved view slots Cmd+2 .. Cmd+9 (index 0..7)
      if (onLoadSavedView) {
        const savedViewShortcuts = [
          SHORTCUTS.SAVED_VIEW_2,
          SHORTCUTS.SAVED_VIEW_3,
          SHORTCUTS.SAVED_VIEW_4,
          SHORTCUTS.SAVED_VIEW_5,
          SHORTCUTS.SAVED_VIEW_6,
          SHORTCUTS.SAVED_VIEW_7,
          SHORTCUTS.SAVED_VIEW_8,
          SHORTCUTS.SAVED_VIEW_9,
        ]
        for (let i = 0; i < savedViewShortcuts.length; i++) {
          if (matchShortcut(e, savedViewShortcuts[i])) {
            e.preventDefault()
            onLoadSavedView(i)
            return
          }
        }
      }
      if (matchShortcut(e, SHORTCUTS.NEW_TASK) && (onInitiateCreation ?? onNewTask)) {
        e.preventDefault()
        ;(onInitiateCreation ?? onNewTask)!()
        return
      }
      if (matchShortcut(e, SHORTCUTS.NEW_DIRECTORY) && (onInitiateCreation ?? onNewDirectory)) {
        e.preventDefault()
        ;(onInitiateCreation ?? onNewDirectory)!()
        return
      }
      if (matchShortcut(e, SHORTCUTS.SETTINGS) && onSettings) {
        e.preventDefault()
        onSettings()
        return
      }
      if (matchShortcut(e, SHORTCUTS.UNDO) && onUndo) {
        e.preventDefault()
        onUndo()
        return
      }
      if (matchShortcut(e, SHORTCUTS.REDO) && onRedo) {
        e.preventDefault()
        onRedo()
        return
      }
      if (matchShortcut(e, SHORTCUTS.SCROLL_LEFT) && onScrollLeft) {
        e.preventDefault()
        onScrollLeft()
        return
      }
      if (matchShortcut(e, SHORTCUTS.SCROLL_RIGHT) && onScrollRight) {
        e.preventDefault()
        onScrollRight()
        return
      }
      if (matchShortcut(e, SHORTCUTS.SCROLL_HOME) && onScrollHome) {
        e.preventDefault()
        onScrollHome()
        return
      }
      if (matchShortcut(e, SHORTCUTS.SCROLL_END) && onScrollEnd) {
        e.preventDefault()
        onScrollEnd()
        return
      }
      if (matchShortcut(e, SHORTCUTS.COLOR_NONE) && onColorNone) {
        e.preventDefault()
        onColorNone()
        return
      }
      if (matchShortcut(e, SHORTCUTS.COLOR_CATEGORY) && onColorCategory) {
        e.preventDefault()
        onColorCategory()
        return
      }
      if (matchShortcut(e, SHORTCUTS.COLOR_PRIORITY) && onColorPriority) {
        e.preventDefault()
        onColorPriority()
        return
      }
      // Phase 3: navigation shortcuts (only in navigation context, except Cmd+/ which is global)
      if (matchShortcut(e, SHORTCUTS.CMD_SLASH) && onCmdSlash) {
        e.preventDefault()
        onCmdSlash()
        return
      }
      if (!nav) return
      if (matchShortcut(e, SHORTCUTS.ARROW_UP) && !e.shiftKey && onArrowUp) {
        e.preventDefault()
        onArrowUp()
        return
      }
      if (matchShortcut(e, SHORTCUTS.ARROW_DOWN) && !e.shiftKey && onArrowDown) {
        e.preventDefault()
        onArrowDown()
        return
      }
      if (matchShortcut(e, SHORTCUTS.ARROW_LEFT) && onArrowLeft) {
        e.preventDefault()
        onArrowLeft()
        return
      }
      if (matchShortcut(e, SHORTCUTS.ARROW_RIGHT) && onArrowRight) {
        e.preventDefault()
        onArrowRight()
        return
      }
      if (matchShortcut(e, SHORTCUTS.ENTER) && onEnter) {
        e.preventDefault()
        onEnter()
        return
      }
      if (matchShortcut(e, SHORTCUTS.ESCAPE) && onEscape) {
        e.preventDefault()
        onEscape()
        return
      }
      if (matchShortcut(e, SHORTCUTS.SPACE) && onSpace) {
        e.preventDefault()
        onSpace()
        return
      }
      if (matchShortcut(e, SHORTCUTS.SHIFT_ARROW_UP) && onShiftArrowUp) {
        e.preventDefault()
        onShiftArrowUp()
        return
      }
      if (matchShortcut(e, SHORTCUTS.SHIFT_ARROW_DOWN) && onShiftArrowDown) {
        e.preventDefault()
        onShiftArrowDown()
        return
      }
      if (matchShortcut(e, SHORTCUTS.CMD_A) && onCmdA) {
        e.preventDefault()
        onCmdA()
        return
      }
      if (matchShortcut(e, SHORTCUTS.CMD_ARROW_UP) && onCmdArrowUp) {
        e.preventDefault()
        onCmdArrowUp()
        return
      }
      if (matchShortcut(e, SHORTCUTS.CMD_ARROW_DOWN) && onCmdArrowDown) {
        e.preventDefault()
        onCmdArrowDown()
        return
      }
      // Phase 4: edit, delete, copy/paste/cut (navigation context)
      if (matchShortcut(e, SHORTCUTS.OPTION_E) && onQuickEdit) {
        e.preventDefault()
        onQuickEdit()
        return
      }
      if (matchShortcut(e, SHORTCUTS.CMD_SHIFT_E) && onFullEdit) {
        e.preventDefault()
        onFullEdit()
        return
      }
      if (matchShortcut(e, SHORTCUTS.CMD_DELETE) && onDelete) {
        e.preventDefault()
        onDelete()
        return
      }
      if (matchShortcut(e, SHORTCUTS.CMD_C) && onCopy) {
        e.preventDefault()
        onCopy()
        return
      }
      if (matchShortcut(e, SHORTCUTS.CMD_SHIFT_C) && onCopyRecursive) {
        e.preventDefault()
        onCopyRecursive()
        return
      }
      if (matchShortcut(e, SHORTCUTS.CMD_V) && onPaste) {
        e.preventDefault()
        onPaste()
        return
      }
      if (matchShortcut(e, SHORTCUTS.CMD_SHIFT_V) && onPasteWithMetadata) {
        e.preventDefault()
        onPasteWithMetadata()
        return
      }
      if (matchShortcut(e, SHORTCUTS.CMD_X) && onCut) {
        e.preventDefault()
        onCut()
        return
      }
    },
    [
      enabled,
      onMainView,
      onUpcomingView,
      onSearch,
      onNewTask,
      onNewDirectory,
      onInitiateCreation,
      onSettings,
      onUndo,
      onRedo,
      onCommandPalette,
      onScrollLeft,
      onScrollRight,
      onScrollHome,
      onScrollEnd,
      onColorNone,
      onColorCategory,
      onColorPriority,
      onArrowUp,
      onArrowDown,
      onArrowLeft,
      onArrowRight,
      onEnter,
      onEscape,
      onSpace,
      onShiftArrowUp,
      onShiftArrowDown,
      onCmdA,
      onCmdArrowUp,
      onCmdArrowDown,
      onCmdSlash,
      onCreationTypeTask,
      onCreationTypeDirectory,
      onCreationEscape,
      onCreationInvalidKey,
      onQuickEdit,
      onFullEdit,
      onDelete,
      onCopy,
      onCopyRecursive,
      onPaste,
      onPasteWithMetadata,
      onCut,
      onSearchClose,
      onToggleShowCompleted,
      onSaveView,
      onLoadSavedView,
      onExitEditing,
      onAddAttachment,
      onOpenAllAttachments,
      onSettingsSave,
      onSettingsClose,
    ]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
