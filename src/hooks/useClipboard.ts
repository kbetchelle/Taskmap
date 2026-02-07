import { useCallback, useState } from 'react'

type ClipboardData = { kind: 'task' | 'directory'; id: string; payload?: unknown }

export function useClipboard() {
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null)

  const copy = useCallback((data: ClipboardData) => {
    setClipboard(data)
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(JSON.stringify(data)).catch(() => {})
    }
  }, [])

  const paste = useCallback((): ClipboardData | null => {
    return clipboard
  }, [clipboard])

  const clear = useCallback(() => setClipboard(null), [])

  const hasClipboard = clipboard != null

  return {
    clipboard,
    hasClipboard,
    copy,
    paste,
    clear,
  }
}
