import { useEffect, useRef } from 'react'

interface TypeSelectorRowProps {
  itemId: string
}

export function TypeSelectorRow({ itemId }: TypeSelectorRowProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.focus()
    ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [])

  return (
    <div
      ref={ref}
      id={`item-${itemId}`}
      role="status"
      tabIndex={-1}
      className="flex items-center gap-2 py-2 px-3 min-h-[32px] text-flow-task text-flow-textSecondary border-b border-transparent"
      data-creation-type-selector
    >
      <span className="type-selector-cursor inline-block w-0.5 h-4 bg-flow-textPrimary animate-blink" />
      <span className="text-flow-meta">T for Task, D for Directory</span>
    </div>
  )
}
