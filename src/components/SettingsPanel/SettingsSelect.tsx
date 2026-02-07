interface Option {
  value: string
  label: string
}

interface SettingsSelectProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  className?: string
}

export function SettingsSelect({
  value,
  onChange,
  options,
  className = '',
}: SettingsSelectProps) {
  return (
    <select
      className={`w-full px-3 py-2 text-sm text-flow-textPrimary bg-white border border-flow-columnBorder rounded-md cursor-pointer transition-colors hover:border-neutral-300 focus:outline-none focus:border-flow-focus ${className}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
