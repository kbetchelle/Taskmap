import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppContext } from '../../contexts/AppContext'
import { useShortcutStore } from '../../lib/shortcutManager'
import { formatShortcutForDisplay } from '../../lib/platform'
import { parseKeyboardShortcut } from '../../lib/keyboardUtils'
import { Button } from '../ui/Button'
import type { ShortcutCategory } from '../../types/keyboard'

const CATEGORY_ORDER: ShortcutCategory[] = [
  'View',
  'Actions',
  'Navigation',
  'Selection',
  'Other',
]

interface ShortcutCustomizationProps {
  open: boolean
  onClose: () => void
}

export function ShortcutCustomization({ open, onClose }: ShortcutCustomizationProps) {
  const { userId } = useAppContext()
  const mappings = useShortcutStore((s) => s.getAllMappings())
  const updateShortcut = useShortcutStore((s) => s.updateShortcut)
  const resetToDefaultsAndPersist = useShortcutStore((s) => s.resetToDefaultsAndPersist)

  const [editingAction, setEditingAction] = useState<string | null>(null)
  const [recordingShortcut, setRecordingShortcut] = useState(false)

  const byCategory = useMemo(() => {
    const map = new Map<ShortcutCategory, typeof mappings>()
    for (const cat of CATEGORY_ORDER) {
      map.set(cat, mappings.filter((m) => m.category === cat))
    }
    return map
  }, [mappings])

  const handleRecord = useCallback(
    (action: string) => {
      setEditingAction(action)
      setRecordingShortcut(true)

      const handleKeyPress = (e: KeyboardEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const newShortcut = parseKeyboardShortcut(e)
        if (userId) {
          updateShortcut(userId, action, newShortcut).then(() => {
            setEditingAction(null)
            setRecordingShortcut(false)
          })
        } else {
          setEditingAction(null)
          setRecordingShortcut(false)
        }
      }

      document.addEventListener('keydown', handleKeyPress, { once: true })
    },
    [userId, updateShortcut]
  )

  const handleReset = useCallback(
    (action: string) => {
      const mapping = mappings.find((m) => m.action === action)
      if (!mapping || !userId) return
      updateShortcut(userId, action, mapping.defaultShortcut)
    },
    [userId, mappings, updateShortcut]
  )

  const handleResetAll = useCallback(async () => {
    if (!userId) return
    if (!window.confirm('Reset all shortcuts to defaults?')) return
    await resetToDefaultsAndPersist(userId)
  }, [userId, resetToDefaultsAndPersist])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingAction(null)
        setRecordingShortcut(false)
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
      role="dialog"
      aria-label="Customize keyboard shortcuts"
      onClick={() => !recordingShortcut && onClose()}
    >
      <div
        className="bg-flow-background border border-flow-columnBorder rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 px-6 py-4 border-b border-flow-columnBorder">
          <h2 className="text-lg font-semibold text-flow-textPrimary m-0 mb-1">
            Customize Keyboard Shortcuts
          </h2>
          <p className="text-sm text-flow-textSecondary m-0">
            Click Remap and press the keys you want to use
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-6">
          {CATEGORY_ORDER.map((category) => {
            const items = byCategory.get(category)?.filter((m) => m.description) ?? []
            if (items.length === 0) return null

            return (
              <div key={category}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-flow-textSecondary mb-3">
                  {category}
                </h3>
                <div className="flex flex-col gap-2">
                  {items.map((mapping) => (
                    <div
                      key={mapping.action}
                      className="flex items-center justify-between gap-4 py-2 px-3 rounded-md hover:bg-flow-columnBorder/30"
                    >
                      <span className="text-sm text-flow-textPrimary flex-1">
                        {mapping.description}
                      </span>
                      <div className="flex items-center gap-2">
                        {editingAction === mapping.action && recordingShortcut ? (
                          <span className="text-xs text-flow-textSecondary animate-pulse">
                            Press keys...
                          </span>
                        ) : (
                          <>
                            <kbd className="px-2 py-1 text-xs font-mono bg-flow-columnBorder/50 rounded border border-flow-columnBorder">
                              {formatShortcutForDisplay(mapping.currentShortcut)}
                            </kbd>
                            <Button
                              type="button"
                              variant="ghost"
                              className="py-1 px-2 text-xs"
                              onClick={() => handleRecord(mapping.action)}
                            >
                              Remap
                            </Button>
                            {mapping.currentShortcut !== mapping.defaultShortcut && (
                              <Button
                                type="button"
                                variant="ghost"
                                className="py-1 px-2 text-xs"
                                onClick={() => handleReset(mapping.action)}
                              >
                                Reset
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex-shrink-0 px-6 py-4 border-t border-flow-columnBorder flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="border border-flow-columnBorder"
            onClick={handleResetAll}
          >
            Reset All to Defaults
          </Button>
          <Button type="button" variant="primary" className="ml-auto" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}
