import { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useUIStore } from '../../stores/uiStore'
import { useAppStore } from '../../stores/appStore'
import { useViewport } from '../../hooks/useViewport'
import type { KeyboardContext as KbCtx } from '../../types/keyboard'
import { TypeSelector } from './TypeSelector'
import { TaskFields } from './TaskFields'
import { DirectoryFields } from './DirectoryFields'
import { LinkFields } from './LinkFields'
import { LocationPicker } from './LocationPicker'
import { useCreation } from './useCreation'
import type { CreationContext } from '../../types/database'

type ItemType = NonNullable<CreationContext['type']>

export function CreationModal() {
  const isOpen = useUIStore((s) => s.creationModalOpen)
  const closeModal = useUIStore((s) => s.closeCreationModal)
  const pushKeyboardContext = useAppStore((s) => s.pushKeyboardContext)
  const popKeyboardContext = useAppStore((s) => s.popKeyboardContext)
  const { isMobile } = useViewport()

  if (!isOpen) return null

  return createPortal(
    <CreationModalInner
      isMobile={isMobile}
      onClose={closeModal}
      pushKeyboardContext={pushKeyboardContext}
      popKeyboardContext={popKeyboardContext}
    />,
    document.body,
  )
}

interface InnerProps {
  isMobile: boolean
  onClose: () => void
  pushKeyboardContext: (ctx: KbCtx) => void
  popKeyboardContext: () => void
}

function CreationModalInner({ isMobile, onClose, pushKeyboardContext, popKeyboardContext }: InnerProps) {
  const {
    form,
    validation,
    updateField,
    submit,
    submitAndAddAnother,
    directoryOnly,
    nameInputRef,
  } = useCreation()

  const backdropRef = useRef<HTMLDivElement>(null)
  const attemptedSubmitRef = useRef(false)

  // Push/pop keyboard context
  useEffect(() => {
    pushKeyboardContext('creation_modal')
    return () => popKeyboardContext()
  }, [pushKeyboardContext, popKeyboardContext])

  // Auto-focus name input on mount
  useEffect(() => {
    const timer = setTimeout(() => nameInputRef.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [nameInputRef])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      // Enter in name field = submit
      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
        // Only if we're in the name input
        if ((e.target as HTMLElement).dataset?.creationName !== undefined) {
          e.preventDefault()
          attemptedSubmitRef.current = true
          submit()
          return
        }
      }

      // Cmd+Enter = create & add another
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        attemptedSubmitRef.current = true
        submitAndAddAnother()
        return
      }

      // T/D/L shortcuts when name is empty to switch type
      if (
        form.name === '' &&
        (e.target as HTMLElement).dataset?.creationName !== undefined &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        const key = e.key.toLowerCase()
        if (key === 't' && !directoryOnly) {
          e.preventDefault()
          updateField('type', 'task')
          return
        }
        if (key === 'd') {
          e.preventDefault()
          updateField('type', 'directory')
          return
        }
        if (key === 'l' && !directoryOnly) {
          e.preventDefault()
          updateField('type', 'link')
          return
        }
      }
    },
    [form.name, directoryOnly, updateField, submit, submitAndAddAnother, onClose],
  )

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) onClose()
    },
    [onClose],
  )

  const typeLabel =
    form.type === 'task' ? 'Task' : form.type === 'directory' ? 'Directory' : 'Link'
  const namePlaceholder =
    form.type === 'task' ? 'Task name...' : form.type === 'directory' ? 'Directory name...' : 'Link name...'

  const showNameError = attemptedSubmitRef.current && validation.nameError

  // ── Mobile: full-screen panel ──────────────────────────────────────────
  if (isMobile) {
    return (
      <div
        className="fixed inset-0 z-[1400] bg-flow-background flex flex-col"
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal
        aria-label={`New ${typeLabel}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-flow-columnBorder">
          <button
            type="button"
            className="text-sm text-flow-focus font-flow-medium"
            onClick={onClose}
          >
            Cancel
          </button>
          <h2 className="text-sm font-flow-semibold text-flow-textPrimary">New {typeLabel}</h2>
          <button
            type="button"
            className="text-sm text-flow-focus font-flow-semibold disabled:text-flow-textDisabled"
            disabled={!validation.isValid}
            onClick={() => { attemptedSubmitRef.current = true; submit() }}
          >
            Create
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          <TypeSelector
            value={form.type}
            onChange={(t) => updateField('type', t as ItemType)}
            directoryOnly={directoryOnly}
          />

          {/* Name input */}
          <input
            ref={nameInputRef}
            type="text"
            data-creation-name
            data-keyboard-ignore
            className={`
              w-full text-lg px-0 py-2 bg-transparent text-flow-textPrimary
              placeholder:text-flow-textDisabled border-b
              focus:outline-none transition-colors
              ${showNameError ? 'border-flow-error' : 'border-flow-columnBorder focus:border-flow-focus'}
            `}
            placeholder={namePlaceholder}
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            autoFocus
          />
          {showNameError && (
            <p className="text-flow-meta text-flow-error -mt-2">{validation.nameError}</p>
          )}
          {validation.duplicateWarning && (
            <p className="text-flow-meta text-amber-500 -mt-2">{validation.duplicateWarning}</p>
          )}

          <LocationPicker
            value={form.parentDirectoryId}
            onChange={(id) => updateField('parentDirectoryId', id)}
          />

          {form.type === 'link' && (
            <LinkFields
              url={form.url}
              onUrlChange={(u) => updateField('url', u)}
              urlError={attemptedSubmitRef.current ? validation.urlError : null}
            />
          )}

          {form.type === 'task' && (
            <TaskFields
              status={form.status}
              onStatusChange={(s) => updateField('status', s)}
              priority={form.priority}
              onPriorityChange={(p) => updateField('priority', p)}
              dueDate={form.dueDate}
              onDueDateChange={(d) => updateField('dueDate', d)}
              description={form.description}
              onDescriptionChange={(d) => updateField('description', d)}
              tags={form.tags}
              onTagsChange={(t) => updateField('tags', t)}
              category={form.category}
              onCategoryChange={(c) => updateField('category', c)}
            />
          )}

          {form.type === 'directory' && (
            <DirectoryFields
              startDate={form.dirStartDate}
              onStartDateChange={(d) => updateField('dirStartDate', d)}
              dueDate={form.dirDueDate}
              onDueDateChange={(d) => updateField('dirDueDate', d)}
            />
          )}
        </div>
      </div>
    )
  }

  // ── Desktop: centered modal ────────────────────────────────────────────
  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[1400] flex items-center justify-center bg-flow-backdrop"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal
      aria-label={`New ${typeLabel}`}
    >
      <div className="w-full max-w-lg bg-flow-background rounded-xl shadow-2xl border border-flow-columnBorder overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4">
          <h2 className="text-base font-flow-semibold text-flow-textPrimary mb-4">
            New {typeLabel}
          </h2>

          <TypeSelector
            value={form.type}
            onChange={(t) => updateField('type', t as ItemType)}
            directoryOnly={directoryOnly}
          />
        </div>

        {/* Body */}
        <div className="px-6 pb-4 flex flex-col gap-4">
          {/* Name input */}
          <input
            ref={nameInputRef}
            type="text"
            data-creation-name
            data-keyboard-ignore
            className={`
              w-full text-lg px-3 py-2.5 rounded-lg bg-flow-surface text-flow-textPrimary
              placeholder:text-flow-textDisabled border
              focus:outline-none focus:ring-2 focus:ring-flow-focus/30 transition-colors
              ${showNameError ? 'border-flow-error ring-2 ring-flow-error/30' : 'border-flow-columnBorder focus:border-flow-focus'}
            `}
            placeholder={namePlaceholder}
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
          />
          {showNameError && (
            <p className="text-flow-meta text-flow-error -mt-2">{validation.nameError}</p>
          )}
          {validation.duplicateWarning && (
            <p className="text-flow-meta text-amber-500 -mt-2">{validation.duplicateWarning}</p>
          )}

          <LocationPicker
            value={form.parentDirectoryId}
            onChange={(id) => updateField('parentDirectoryId', id)}
          />

          {form.type === 'link' && (
            <LinkFields
              url={form.url}
              onUrlChange={(u) => updateField('url', u)}
              urlError={attemptedSubmitRef.current ? validation.urlError : null}
            />
          )}

          {form.type === 'task' && (
            <TaskFields
              status={form.status}
              onStatusChange={(s) => updateField('status', s)}
              priority={form.priority}
              onPriorityChange={(p) => updateField('priority', p)}
              dueDate={form.dueDate}
              onDueDateChange={(d) => updateField('dueDate', d)}
              description={form.description}
              onDescriptionChange={(d) => updateField('description', d)}
              tags={form.tags}
              onTagsChange={(t) => updateField('tags', t)}
              category={form.category}
              onCategoryChange={(c) => updateField('category', c)}
            />
          )}

          {form.type === 'directory' && (
            <DirectoryFields
              startDate={form.dirStartDate}
              onStartDateChange={(d) => updateField('dirStartDate', d)}
              dueDate={form.dirDueDate}
              onDueDateChange={(d) => updateField('dirDueDate', d)}
            />
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-flow-columnBorder flex items-center gap-2 justify-end">
          <button
            type="button"
            className="px-4 py-2 text-sm text-flow-textSecondary hover:text-flow-textPrimary transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm text-flow-focus hover:text-flow-textPrimary font-flow-medium transition-colors"
            onClick={() => { attemptedSubmitRef.current = true; submitAndAddAnother() }}
            disabled={!validation.isValid}
          >
            Create &amp; Add Another
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm text-white rounded-lg font-flow-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: 'var(--flow-focus)' }}
            onClick={() => { attemptedSubmitRef.current = true; submit() }}
            disabled={!validation.isValid}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}
