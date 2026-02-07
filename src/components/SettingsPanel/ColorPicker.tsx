import { useState } from 'react'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  presets: readonly string[]
}

export function ColorPicker({ value, onChange, presets }: ColorPickerProps) {
  const [showCustom, setShowCustom] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {presets.map((color) => (
          <button
            key={color}
            type="button"
            className={`relative w-8 h-8 rounded-md border-2 cursor-pointer transition-transform hover:scale-110 ${
              value === color ? 'border-flow-textPrimary' : 'border-transparent'
            }`}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
            title={color}
            aria-label={`Select color ${color}`}
          >
            {value === color && (
              <span
                className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold drop-shadow-[0_0_1px_rgba(0,0,0,0.8)]"
                style={{ pointerEvents: 'none' }}
              >
                ✓
              </span>
            )}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="self-start px-3 py-1.5 text-xs font-medium text-[#007AFF] bg-transparent border border-flow-columnBorder rounded-md cursor-pointer transition-colors hover:bg-neutral-50"
        onClick={() => setShowCustom(true)}
      >
        Custom…
      </button>
      {showCustom && (
        <div className="flex items-center gap-2 p-3 bg-neutral-50 rounded-md">
          <input
            type="color"
            className="w-10 h-8 border border-flow-columnBorder rounded cursor-pointer"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Custom color"
          />
          <input
            type="text"
            className="flex-1 px-2 py-1.5 text-sm font-mono border border-flow-columnBorder rounded"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
          />
          <button
            type="button"
            className="px-3 py-1.5 text-xs font-medium text-white bg-[#007AFF] border-0 rounded cursor-pointer"
            onClick={() => setShowCustom(false)}
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}
