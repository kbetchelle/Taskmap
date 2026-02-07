import { useEffect, useCallback } from 'react'
import { matchShortcut } from '../lib/keyboardUtils'
import { useShortcutStore } from '../lib/shortcutManager'
import { useAppStore } from '../stores/appStore'

function getShortcut(action: string): string {
  return useShortcutStore.getState().getShortcut(action)
}

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
        if (matchShortcut(e, getShortcut('enter')) && onSettingsSave) {
          e.preventDefault()
          onSettingsSave()
          return
        }
        if (matchShortcut(e, getShortcut('escape')) && onSettingsClose) {
          e.preventDefault()
          onSettingsClose()
          return
        }
      }

      // Phase 5: search context — Escape closes
      if (isSearchContext() && matchShortcut(e, getShortcut('escape')) && onSearchClose) {
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
        if (matchShortcut(e, getShortcut('escape')) && onExitEditing) {
          e.preventDefault()
          onExitEditing()
          return
        }
        if (matchShortcut(e, getShortcut('cmdShiftF')) && onAddAttachment) {
          e.preventDefault()
          onAddAttachment()
          return
        }
        if (matchShortcut(e, getShortcut('cmdShiftO')) && onOpenAllAttachments) {
          e.preventDefault()
          onOpenAllAttachments()
          return
        }
      }

      const nav = isNavigationContext()
      if (matchShortcut(e, getShortcut('mainView')) && onMainView) {
        e.preventDefault()
        onMainView()
        return
      }
      if (matchShortcut(e, getShortcut('upcomingView')) && onUpcomingView) {
        e.preventDefault()
        onUpcomingView()
        return
      }
      if (matchShortcut(e, getShortcut('commandPalette')) && onCommandPalette) {
        e.preventDefault()
        onCommandPalette()
        return
      }
      if (matchShortcut(e, getShortcut('searchOpen')) && onSearch) {
        e.preventDefault()
        onSearch()
        return
      }
      if (matchShortcut(e, getShortcut('completedToggle')) && onToggleShowCompleted) {
        e.preventDefault()
        onToggleShowCompleted()
        return
      }
      if (matchShortcut(e, getShortcut('saveView')) && onSaveView) {
        e.preventDefault()
        onSaveView()
        return
      }
      // Saved view slots Cmd+2 .. Cmd+9 (index 0..7)
      if (onLoadSavedView) {
        const savedViewActions = ['savedView2', 'savedView3', 'savedView4', 'savedView5', 'savedView6', 'savedView7', 'savedView8', 'savedView9']
        for (let i = 0; i < savedViewActions.length; i++) {
          if (matchShortcut(e, getShortcut(savedViewActions[i]))) {
            e.preventDefault()
            onLoadSavedView(i)
            return
          }
        }
      }
      if (matchShortcut(e, getShortcut('newTask')) && (onInitiateCreation ?? onNewTask)) {
        e.preventDefault()
        ;(onInitiateCreation ?? onNewTask)!()
        return
      }
      if (matchShortcut(e, getShortcut('newDirectory')) && (onInitiateCreation ?? onNewDirectory)) {
        e.preventDefault()
        ;(onInitiateCreation ?? onNewDirectory)!()
        return
      }
      if (matchShortcut(e, getShortcut('settings')) && onSettings) {
        e.preventDefault()
        onSettings()
        return
      }
      if (matchShortcut(e, getShortcut('undo')) && onUndo) {
        e.preventDefault()
        onUndo()
        return
      }
      if (matchShortcut(e, getShortcut('redo')) && onRedo) {
        e.preventDefault()
        onRedo()
        return
      }
      if (matchShortcut(e, getShortcut('scrollLeft')) && onScrollLeft) {
        e.preventDefault()
        onScrollLeft()
        return
      }
      if (matchShortcut(e, getShortcut('scrollRight')) && onScrollRight) {
        e.preventDefault()
        onScrollRight()
        return
      }
      if (matchShortcut(e, getShortcut('scrollHome')) && onScrollHome) {
        e.preventDefault()
        onScrollHome()
        return
      }
      if (matchShortcut(e, getShortcut('scrollEnd')) && onScrollEnd) {
        e.preventDefault()
        onScrollEnd()
        return
      }
      if (matchShortcut(e, getShortcut('colorNone')) && onColorNone) {
        e.preventDefault()
        onColorNone()
        return
      }
      if (matchShortcut(e, getShortcut('colorCategory')) && onColorCategory) {
        e.preventDefault()
        onColorCategory()
        return
      }
      if (matchShortcut(e, getShortcut('colorPriority')) && onColorPriority) {
        e.preventDefault()
        onColorPriority()
        return
      }
      // Phase 3: navigation shortcuts (only in navigation context, except Cmd+/ which is global)
      if (matchShortcut(e, getShortcut('cmdSlash')) && onCmdSlash) {
        e.preventDefault()
        onCmdSlash()
        return
      }
      if (!nav) return
      if (matchShortcut(e, getShortcut('arrowUp')) && !e.shiftKey && onArrowUp) {
        e.preventDefault()
        onArrowUp()
        return
      }
      if (matchShortcut(e, getShortcut('arrowDown')) && !e.shiftKey && onArrowDown) {
        e.preventDefault()
        onArrowDown()
        return
      }
      if (matchShortcut(e, getShortcut('arrowLeft')) && onArrowLeft) {
        e.preventDefault()
        onArrowLeft()
        return
      }
      if (matchShortcut(e, getShortcut('arrowRight')) && onArrowRight) {
        e.preventDefault()
        onArrowRight()
        return
      }
      if (matchShortcut(e, getShortcut('enter')) && onEnter) {
        e.preventDefault()
        onEnter()
        return
      }
      if (matchShortcut(e, getShortcut('escape')) && onEscape) {
        e.preventDefault()
        onEscape()
        return
      }
      if (matchShortcut(e, getShortcut('space')) && onSpace) {
        e.preventDefault()
        onSpace()
        return
      }
      if (matchShortcut(e, getShortcut('shiftArrowUp')) && onShiftArrowUp) {
        e.preventDefault()
        onShiftArrowUp()
        return
      }
      if (matchShortcut(e, getShortcut('shiftArrowDown')) && onShiftArrowDown) {
        e.preventDefault()
        onShiftArrowDown()
        return
      }
      if (matchShortcut(e, getShortcut('cmdA')) && onCmdA) {
        e.preventDefault()
        onCmdA()
        return
      }
      if (matchShortcut(e, getShortcut('cmdArrowUp')) && onCmdArrowUp) {
        e.preventDefault()
        onCmdArrowUp()
        return
      }
      if (matchShortcut(e, getShortcut('cmdArrowDown')) && onCmdArrowDown) {
        e.preventDefault()
        onCmdArrowDown()
        return
      }
      // Phase 4: edit, delete, copy/paste/cut (navigation context)
      if (matchShortcut(e, getShortcut('optionE')) && onQuickEdit) {
        e.preventDefault()
        onQuickEdit()
        return
      }
      if (matchShortcut(e, getShortcut('cmdShiftE')) && onFullEdit) {
        e.preventDefault()
        onFullEdit()
        return
      }
      if (matchShortcut(e, getShortcut('cmdDelete')) && onDelete) {
        e.preventDefault()
        onDelete()
        return
      }
      if (matchShortcut(e, getShortcut('cmdC')) && onCopy) {
        e.preventDefault()
        onCopy()
        return
      }
      if (matchShortcut(e, getShortcut('cmdShiftC')) && onCopyRecursive) {
        e.preventDefault()
        onCopyRecursive()
        return
      }
      if (matchShortcut(e, getShortcut('cmdV')) && onPaste) {
        e.preventDefault()
        onPaste()
        return
      }
      if (matchShortcut(e, getShortcut('cmdShiftV')) && onPasteWithMetadata) {
        e.preventDefault()
        onPasteWithMetadata()
        return
      }
      if (matchShortcut(e, getShortcut('cmdX')) && onCut) {
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
    document.addEventListener('keydown', handleKeyDown as EventListener)
    return () => document.removeEventListener('keydown', handleKeyDown as EventListener)
  }, [handleKeyDown])
}
