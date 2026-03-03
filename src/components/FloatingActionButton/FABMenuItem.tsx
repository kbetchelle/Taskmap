import type { LucideIcon } from 'lucide-react'

interface FABMenuItemProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  delay: number // stagger delay in ms
}

export function FABMenuItem({ icon: Icon, label, onClick, delay }: FABMenuItemProps) {
  return (
    <button
      type="button"
      className="flex items-center gap-3 px-4 h-12 rounded-lg bg-flow-background shadow-md border border-flow-columnBorder/50 text-flow-textPrimary hover:bg-flow-columnBorder/20 transition-all duration-150 w-full"
      style={{
        animation: `fabItemIn 200ms ease-out ${delay}ms both`,
      }}
      onClick={onClick}
    >
      <span className="w-6 h-6 flex items-center justify-center text-flow-textSecondary flex-shrink-0">
        <Icon size={20} />
      </span>
      <span className="text-sm font-flow-medium truncate">{label}</span>
    </button>
  )
}
