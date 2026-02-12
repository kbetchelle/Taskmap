import { useCallback } from 'react'

interface ToolbarButton {
  label: string
  command: string
  value?: string
  formatKey: string
  title: string
}

const BUTTONS: (ToolbarButton | 'separator')[] = [
  { label: 'B', command: 'bold', formatKey: 'bold', title: 'Bold (Cmd+B)' },
  { label: 'I', command: 'italic', formatKey: 'italic', title: 'Italic (Cmd+I)' },
  { label: 'S', command: 'strikeThrough', formatKey: 'strikethrough', title: 'Strikethrough' },
  'separator',
  { label: 'H\u2081', command: 'formatBlock', value: 'h1', formatKey: 'h1', title: 'Heading 1' },
  { label: 'H\u2082', command: 'formatBlock', value: 'h2', formatKey: 'h2', title: 'Heading 2' },
  { label: 'H\u2083', command: 'formatBlock', value: 'h3', formatKey: 'h3', title: 'Heading 3' },
  'separator',
  {
    label: '\u2022',
    command: 'insertUnorderedList',
    formatKey: 'unorderedList',
    title: 'Bulleted List',
  },
  {
    label: '1.',
    command: 'insertOrderedList',
    formatKey: 'orderedList',
    title: 'Numbered List',
  },
]

interface EditorToolbarProps {
  onCommand: (command: string, value?: string) => void
  activeFormats: Set<string>
}

export function EditorToolbar({ onCommand, activeFormats }: EditorToolbarProps) {
  const handleClick = useCallback(
    (btn: ToolbarButton, e: React.MouseEvent) => {
      e.preventDefault() // Prevent stealing focus from editor
      onCommand(btn.command, btn.value)
    },
    [onCommand]
  )

  return (
    <div
      className="flex items-center gap-0.5 pb-2 mb-2 border-b border-flow-columnBorder"
      role="toolbar"
      aria-label="Formatting toolbar"
    >
      {BUTTONS.map((item, i) => {
        if (item === 'separator') {
          return (
            <div
              key={`sep-${i}`}
              className="w-px h-5 bg-flow-columnBorder mx-1"
              role="separator"
            />
          )
        }

        const isActive = activeFormats.has(item.formatKey)

        return (
          <button
            key={item.formatKey}
            type="button"
            title={item.title}
            aria-pressed={isActive}
            onMouseDown={(e) => handleClick(item, e)}
            className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors select-none ${
              isActive
                ? 'bg-flow-focus/10 text-flow-focus'
                : 'text-flow-textSecondary hover:bg-flow-focus/10'
            }`}
            style={
              item.formatKey === 'bold'
                ? { fontWeight: 700 }
                : item.formatKey === 'italic'
                  ? { fontStyle: 'italic' }
                  : item.formatKey === 'strikethrough'
                    ? { textDecoration: 'line-through' }
                    : undefined
            }
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
