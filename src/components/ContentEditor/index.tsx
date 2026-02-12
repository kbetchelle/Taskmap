import { useState, useCallback, useRef, useEffect } from 'react'
import { EditorToolbar } from './EditorToolbar'
import { useMarkdownShortcuts } from './useMarkdownShortcuts'
import { useAutoSave } from '../../hooks/useAutoSave'
import { useBackslashMenu } from '../../hooks/useBackslashMenu'
import { BackslashMenu } from '../BackslashMenu'
import { sanitizeHTML, escapeHTML } from '../../lib/sanitizeHTML'

interface ContentEditorProps {
  initialContent: string | null
  onSave: (html: string) => Promise<void>
  taskId: string
}

/** Detect whether a string contains HTML tags */
function containsHTML(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str)
}

/** Prepare initial HTML: wrap plain text in <p>, pass HTML through as-is */
function prepareInitialHTML(content: string | null): string {
  if (!content || !content.trim()) return ''
  if (containsHTML(content)) return content
  // Plain text — escape special characters before wrapping in <p> tags
  return content
    .split('\n')
    .map((line) => `<p>${line ? escapeHTML(line) : '<br>'}</p>`)
    .join('')
}

type SaveStatus = 'idle' | 'saving' | 'saved'

export function ContentEditor({ initialContent, onSave, taskId }: ContentEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set())
  const [content, setContent] = useState('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initializedTaskRef = useRef<string | null>(null)
  const lastInitialContentRef = useRef<string | null>(null)
  const lastSavedRef = useRef<string>('')

  // Track content changes for autosave
  const handleContentChange = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    setContent(editor.innerHTML)
  }, [])

  // Initialize editor content when task or external content changes
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    // Skip if we've already initialized with this exact task + content pair
    if (initializedTaskRef.current === taskId && lastInitialContentRef.current === initialContent) {
      return
    }

    // Same task but initialContent changed — check if it's our own save roundtripping
    if (initializedTaskRef.current === taskId) {
      const incomingSanitized = sanitizeHTML(prepareInitialHTML(initialContent))
      if (incomingSanitized === lastSavedRef.current) {
        // Our own save came back through the store — update ref but don't reset editor
        lastInitialContentRef.current = initialContent
        return
      }
      // External update — only reset if user isn't actively editing
      if (document.activeElement === editor) {
        return
      }
    }

    const html = prepareInitialHTML(initialContent)
    editor.innerHTML = html
    lastSavedRef.current = sanitizeHTML(html)
    setContent(html)
    initializedTaskRef.current = taskId
    lastInitialContentRef.current = initialContent
  }, [taskId, initialContent])

  // Autosave via the existing useAutoSave hook
  const { saveNow } = useAutoSave<string>({
    value: content,
    debounceMs: 1500,
    onSave: useCallback(
      async (html: string) => {
        const sanitized = sanitizeHTML(html)
        // Skip save if content hasn't actually changed
        if (sanitized === lastSavedRef.current) return
        setSaveStatus('saving')
        try {
          await onSave(sanitized)
          lastSavedRef.current = sanitized
          setSaveStatus('saved')
          // Clear "Saved" after 2s
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
          saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
        } catch {
          setSaveStatus('idle')
        }
      },
      [onSave]
    ),
  })

  // Flush pending save on unmount
  useEffect(() => {
    const currentSaveNow = saveNow
    return () => {
      currentSaveNow()
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [saveNow])

  // Markdown shortcuts
  useMarkdownShortcuts(editorRef, handleContentChange)

  // Backslash command menu
  const backslash = useBackslashMenu(editorRef)

  // Active format tracking on selection change
  useEffect(() => {
    const updateActiveFormats = () => {
      const editor = editorRef.current
      if (!editor) return
      // Only update if selection is inside our editor
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) return
      const anchorNode = sel.anchorNode
      if (!anchorNode || !editor.contains(anchorNode)) return

      const formats = new Set<string>()

      try {
        if (document.queryCommandState('bold')) formats.add('bold')
        if (document.queryCommandState('italic')) formats.add('italic')
        if (document.queryCommandState('strikeThrough')) formats.add('strikethrough')
        if (document.queryCommandState('insertUnorderedList')) formats.add('unorderedList')
        if (document.queryCommandState('insertOrderedList')) formats.add('orderedList')

        const block = document.queryCommandValue('formatBlock')
        if (block) {
          const lower = block.toLowerCase()
          if (lower === 'h1') formats.add('h1')
          else if (lower === 'h2') formats.add('h2')
          else if (lower === 'h3') formats.add('h3')
        }
      } catch {
        // queryCommandState can throw in some edge cases
      }

      setActiveFormats(formats)
    }

    document.addEventListener('selectionchange', updateActiveFormats)
    return () => document.removeEventListener('selectionchange', updateActiveFormats)
  }, [])

  // Toolbar command execution
  const handleCommand = useCallback((command: string, value?: string) => {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()

    if (command === 'formatBlock' && value) {
      document.execCommand('formatBlock', false, `<${value}>`)
    } else {
      document.execCommand(command, false, value)
    }

    // Update content state after command
    setContent(editor.innerHTML)
  }, [])

  // Paste handler: strip formatting, insert plain text
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }, [])

  // Input handler
  const handleInput = useCallback(() => {
    handleContentChange()
    backslash.handleInput()
  }, [handleContentChange, backslash])

  // Key handler: backslash menu first, then Escape blurs editor
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      backslash.handleKeyDown(e)
      if (e.defaultPrevented) return
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        editorRef.current?.blur()
      }
    },
    [backslash]
  )

  return (
    <div className="flex flex-col">
      <EditorToolbar onCommand={handleCommand} activeFormats={activeFormats} />
      <div
        ref={editorRef}
        className="content-editor"
        contentEditable
        role="textbox"
        aria-multiline
        aria-label="Task description"
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        suppressContentEditableWarning
      />
      {saveStatus !== 'idle' && (
        <span
          className={`text-flow-meta text-flow-textSecondary mt-1 transition-opacity duration-300 ${
            saveStatus === 'saved' ? 'opacity-60' : 'opacity-100'
          }`}
        >
          {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
        </span>
      )}
      <BackslashMenu
        isOpen={backslash.isOpen}
        position={backslash.position}
        commands={backslash.filteredCommands}
        selectedIndex={backslash.selectedIndex}
        filterText={backslash.filterText}
        onSelect={backslash.selectCommand}
        onHover={backslash.setSelectedIndex}
        onDismiss={backslash.dismiss}
      />
    </div>
  )
}
