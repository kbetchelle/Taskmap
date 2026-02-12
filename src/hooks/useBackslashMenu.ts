import { useState, useCallback, useRef, useMemo } from 'react'
import { getCommands, type Command } from '../lib/commandRegistry'
import { fuzzyFilterCommands } from '../lib/utils/fuzzyMatch'
import { computeMenuPosition } from '../lib/utils/menuPositioning'

const MENU_WIDTH = 280
const MENU_HEIGHT_ESTIMATE = 288 // ~8 items × 36px

export interface BackslashMenuState {
  isOpen: boolean
  position: { top: number; left: number }
  filterText: string
  selectedIndex: number
  filteredCommands: Command[]
  handleKeyDown: (e: React.KeyboardEvent) => void
  handleInput: () => void
  selectCommand: (command: Command) => void
  dismiss: () => void
  setSelectedIndex: (index: number) => void
}

/**
 * Hook that manages the backslash command menu lifecycle:
 * trigger detection, filter extraction, keyboard navigation,
 * command selection, and text cleanup in a contentEditable editor.
 */
export function useBackslashMenu(
  editorRef: React.RefObject<HTMLDivElement | null>
): BackslashMenuState {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [filterText, setFilterText] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Marker: the text node and character offset where `\` was inserted
  const markerRef = useRef<{ node: Text; offset: number } | null>(null)

  // Get commands filtered to current context (any + single for now)
  const availableCommands = useMemo(() => {
    return getCommands().filter(
      (cmd) => cmd.context === 'any' || cmd.context === 'single'
    )
  }, [])

  const filteredCommands = useMemo(() => {
    return fuzzyFilterCommands(availableCommands, filterText)
  }, [availableCommands, filterText])

  const open = useCallback((pos: { top: number; left: number }) => {
    setIsOpen(true)
    setPosition(pos)
    setFilterText('')
    setSelectedIndex(0)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setFilterText('')
    setSelectedIndex(0)
    markerRef.current = null
  }, [])

  /**
   * Remove the `\` and filter text from the DOM, then execute the command.
   */
  const selectCommand = useCallback(
    (command: Command) => {
      const marker = markerRef.current
      if (marker && marker.node.parentNode) {
        const text = marker.node.textContent ?? ''
        const backslashOffset = marker.offset
        // Find how far the filter text extends after the `\`
        const totalLen = 1 + filterText.length // `\` + filter chars
        const before = text.slice(0, backslashOffset)
        const after = text.slice(backslashOffset + totalLen)
        marker.node.textContent = before + after

        // Restore cursor to where the `\` was
        try {
          const sel = window.getSelection()
          if (sel) {
            const range = document.createRange()
            const cursorPos = Math.min(backslashOffset, (marker.node.textContent ?? '').length)
            range.setStart(marker.node, cursorPos)
            range.collapse(true)
            sel.removeAllRanges()
            sel.addRange(range)
          }
        } catch {
          // Selection restore failed — not critical
        }
      }

      close()
      command.action()

      // Notify ContentEditor that content changed so autosave picks it up
      const editor = editorRef.current
      if (editor) {
        editor.dispatchEvent(new Event('input', { bubbles: true }))
      }
    },
    [filterText, close, editorRef]
  )

  const dismiss = useCallback(() => {
    close()
  }, [close])

  /**
   * Called from ContentEditor's onKeyDown.
   * Detects `\` to open the menu, and handles navigation/selection when open.
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // When menu is open, intercept navigation keys
      if (isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          e.stopPropagation()
          setSelectedIndex((i) =>
            filteredCommands.length
              ? (i + 1) % filteredCommands.length
              : 0
          )
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          e.stopPropagation()
          setSelectedIndex((i) =>
            filteredCommands.length
              ? (i - 1 + filteredCommands.length) % filteredCommands.length
              : 0
          )
          return
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault()
          e.stopPropagation()
          if (filteredCommands[selectedIndex]) {
            selectCommand(filteredCommands[selectedIndex])
          }
          return
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          dismiss()
          return
        }
        // Don't interfere with other keys — let them type into the editor
        return
      }

      // Detect `\` keystroke to open menu
      if (e.key === '\\') {
        // Let the `\` be inserted by the browser, then capture position on next microtask
        requestAnimationFrame(() => {
          const sel = window.getSelection()
          if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return

          const range = sel.getRangeAt(0)
          const textNode = range.startContainer
          if (textNode.nodeType !== Node.TEXT_NODE) return

          const offset = range.startOffset
          const text = textNode.textContent ?? ''

          // Verify the `\` is right before the cursor
          if (offset > 0 && text[offset - 1] === '\\') {
            markerRef.current = {
              node: textNode as Text,
              offset: offset - 1,
            }

            // Get cursor position for menu placement
            const cursorRect = range.getBoundingClientRect()
            const pos = computeMenuPosition(
              cursorRect,
              MENU_WIDTH,
              MENU_HEIGHT_ESTIMATE
            )
            open(pos)
          }
        })
      }
    },
    [isOpen, filteredCommands, selectedIndex, selectCommand, dismiss, open]
  )

  /**
   * Called from ContentEditor's onInput.
   * Extracts the filter text between `\` and cursor when menu is open.
   */
  const handleInput = useCallback(() => {
    if (!isOpen) return

    const marker = markerRef.current
    if (!marker || !marker.node.parentNode) {
      // Marker node was removed from DOM — close menu
      close()
      return
    }

    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) {
      close()
      return
    }

    const range = sel.getRangeAt(0)
    const currentNode = range.startContainer
    const currentOffset = range.startOffset

    // If cursor moved to a different text node, close
    if (currentNode !== marker.node) {
      close()
      return
    }

    const text = marker.node.textContent ?? ''
    const backslashPos = marker.offset

    // Check the `\` is still there
    if (backslashPos >= text.length || text[backslashPos] !== '\\') {
      close()
      return
    }

    // Extract filter: characters between `\` and cursor
    const filter = text.slice(backslashPos + 1, currentOffset)

    // If there's a space in the filter, the user has moved on — dismiss
    if (filter.includes(' ') || filter.includes('\n')) {
      close()
      return
    }

    setFilterText(filter)
    setSelectedIndex(0)

    // Update position based on current cursor location
    const cursorRect = range.getBoundingClientRect()
    if (cursorRect.width === 0 && cursorRect.height === 0) return // collapsed/invisible
    const pos = computeMenuPosition(cursorRect, MENU_WIDTH, MENU_HEIGHT_ESTIMATE)
    setPosition(pos)
  }, [isOpen, close])

  return {
    isOpen,
    position,
    filterText,
    selectedIndex,
    filteredCommands,
    handleKeyDown,
    handleInput,
    selectCommand,
    dismiss,
    setSelectedIndex,
  }
}
