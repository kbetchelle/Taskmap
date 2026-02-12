import { useCallback, useEffect, useRef } from 'react'

/**
 * Hook that detects markdown-style shortcuts as the user types inside a
 * contentEditable div and converts them into rich formatting.
 *
 * Supported shortcuts:
 *   **text**  → bold
 *   *text*    → italic
 *   ~~text~~ → strikethrough
 *   # + space → H1   (at line start)
 *   ## + space → H2
 *   ### + space → H3
 *   - + space → bulleted list item
 *   1. + space → numbered list item
 */
export function useMarkdownShortcuts(
  editorRef: React.RefObject<HTMLDivElement | null>,
  onContentChange?: () => void
) {
  const processingRef = useRef(false)

  const handleInput = useCallback(() => {
    if (processingRef.current) return
    const editor = editorRef.current
    if (!editor) return

    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return

    const range = sel.getRangeAt(0)
    const textNode = range.startContainer
    if (textNode.nodeType !== Node.TEXT_NODE) return

    const text = textNode.textContent ?? ''
    const offset = range.startOffset

    // --- Block-level shortcuts (at start of block) ---
    // These trigger on the space that completes the pattern
    const textUpToCursor = text.slice(0, offset)

    // Heading shortcuts: "# ", "## ", "### "
    const headingMatch = textUpToCursor.match(/^(#{1,3})\s$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const tag = `h${level}` as 'h1' | 'h2' | 'h3'
      processingRef.current = true

      // Remove the markdown prefix
      const newText = text.slice(headingMatch[0].length)
      textNode.textContent = newText

      // Place cursor at start
      const newRange = document.createRange()
      newRange.setStart(textNode, 0)
      newRange.collapse(true)
      sel.removeAllRanges()
      sel.addRange(newRange)

      // Apply heading format
      document.execCommand('formatBlock', false, tag)
      onContentChange?.()
      processingRef.current = false
      return
    }

    // Bulleted list: "- "
    if (textUpToCursor === '- ') {
      processingRef.current = true
      const newText = text.slice(2)
      textNode.textContent = newText
      const newRange = document.createRange()
      newRange.setStart(textNode, 0)
      newRange.collapse(true)
      sel.removeAllRanges()
      sel.addRange(newRange)
      document.execCommand('insertUnorderedList')
      onContentChange?.()
      processingRef.current = false
      return
    }

    // Numbered list: "1. "
    if (textUpToCursor === '1. ') {
      processingRef.current = true
      const newText = text.slice(3)
      textNode.textContent = newText
      const newRange = document.createRange()
      newRange.setStart(textNode, 0)
      newRange.collapse(true)
      sel.removeAllRanges()
      sel.addRange(newRange)
      document.execCommand('insertOrderedList')
      onContentChange?.()
      processingRef.current = false
      return
    }

    // --- Inline shortcuts ---
    // Bold: **text**
    if (tryInlineShortcut(text, offset, '**', 'bold', sel, textNode, onContentChange)) return
    // Strikethrough: ~~text~~
    if (tryInlineShortcut(text, offset, '~~', 'strikeThrough', sel, textNode, onContentChange))
      return
    // Italic: *text* (single asterisk, must not be part of **)
    if (tryInlineSingle(text, offset, '*', 'italic', sel, textNode, onContentChange)) return
  }, [editorRef, onContentChange])

  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    el.addEventListener('input', handleInput)
    return () => el.removeEventListener('input', handleInput)
  }, [editorRef, handleInput])
}

/**
 * Try to match a double-character inline delimiter (** or ~~).
 * Pattern: `delimiter + text + delimiter` ending at cursor.
 */
function tryInlineShortcut(
  text: string,
  offset: number,
  delimiter: string,
  command: string,
  sel: Selection,
  textNode: Node,
  onContentChange?: () => void
): boolean {
  const len = delimiter.length
  // The cursor must be right after the closing delimiter
  const before = text.slice(0, offset)
  if (!before.endsWith(delimiter)) return false

  // Find the opening delimiter (not the closing one)
  const withoutClosing = before.slice(0, before.length - len)
  const openIdx = withoutClosing.lastIndexOf(delimiter)
  if (openIdx < 0) return false

  // There must be content between the delimiters
  const inner = withoutClosing.slice(openIdx + len)
  if (!inner || inner.trim().length === 0) return false

  // Extract parts
  const beforeOpen = text.slice(0, openIdx)
  const afterClose = text.slice(offset)

  // Replace the text node content: remove delimiters, keep inner text
  textNode.textContent = beforeOpen + inner + afterClose

  // Select the inner text
  const range = document.createRange()
  range.setStart(textNode, openIdx)
  range.setEnd(textNode, openIdx + inner.length)
  sel.removeAllRanges()
  sel.addRange(range)

  // Apply the formatting command
  document.execCommand(command)

  // Collapse cursor to end of formatted text
  const newSel = window.getSelection()
  if (newSel && newSel.rangeCount > 0) {
    newSel.collapseToEnd()
  }

  onContentChange?.()
  return true
}

/**
 * Try to match a single-character inline delimiter (*) for italic.
 * Must not be preceded by another * (to avoid conflict with bold **).
 */
function tryInlineSingle(
  text: string,
  offset: number,
  delimiter: string,
  command: string,
  sel: Selection,
  textNode: Node,
  onContentChange?: () => void
): boolean {
  const before = text.slice(0, offset)
  if (!before.endsWith(delimiter)) return false

  // Make sure it's not a double delimiter (which would be bold)
  if (before.endsWith(delimiter + delimiter)) return false

  const withoutClosing = before.slice(0, before.length - 1)
  // Find the opening * that isn't preceded by another *
  let openIdx = -1
  for (let i = withoutClosing.length - 1; i >= 0; i--) {
    if (withoutClosing[i] === delimiter) {
      // Check it's not part of **
      if (i > 0 && withoutClosing[i - 1] === delimiter) continue
      openIdx = i
      break
    }
  }

  if (openIdx < 0) return false

  const inner = withoutClosing.slice(openIdx + 1)
  if (!inner || inner.trim().length === 0) return false

  // Also make sure the inner text doesn't contain unmatched delimiters
  const beforeOpen = text.slice(0, openIdx)
  const afterClose = text.slice(offset)

  textNode.textContent = beforeOpen + inner + afterClose

  const range = document.createRange()
  range.setStart(textNode, openIdx)
  range.setEnd(textNode, openIdx + inner.length)
  sel.removeAllRanges()
  sel.addRange(range)

  document.execCommand(command)

  const newSel = window.getSelection()
  if (newSel && newSel.rangeCount > 0) {
    newSel.collapseToEnd()
  }

  onContentChange?.()
  return true
}
