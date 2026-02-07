import type { ReactNode } from 'react'

interface SettingFieldProps {
  label: string
  description?: string
  children: ReactNode
}

export function SettingField({ label, description, children }: SettingFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <label className="text-sm font-medium text-flow-textPrimary">{label}</label>
        {description != null && (
          <p className="text-xs text-flow-textSecondary m-0 leading-snug">{description}</p>
        )}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}
