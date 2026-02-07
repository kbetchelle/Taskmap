interface SettingsInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SettingsInput({
  value,
  onChange,
  placeholder,
  className = '',
}: SettingsInputProps) {
  return (
    <input
      type="text"
      className={`w-full px-3 py-2 text-sm text-flow-textPrimary bg-white border border-flow-columnBorder rounded-md transition-colors hover:border-neutral-300 focus:outline-none focus:border-flow-focus placeholder:text-flow-textSecondary ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      data-keyboard-ignore
    />
  )
}
