import { useState, useEffect } from 'react'
import {
  parseDateInputWithConfidence,
  type ParsedDate,
} from '../../lib/validation'

export interface DateInputFieldProps {
  value: string
  onChange: (value: string) => void
  onSelect?: (date: Date | null) => void
  label: string
  placeholder?: string
  id?: string
  className?: string
  onKeyDown?: (e: React.KeyboardEvent) => void
  inputRef?: React.RefObject<HTMLInputElement | null>
  /** Callback ref so parent can register the input for focus/keyboard nav (e.g. fieldRefs.current[i] = el). */
  inputRefCallback?: (el: HTMLInputElement | null) => void
}

function dateToIsoLocal(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function DateInputField({
  value,
  onChange,
  onSelect,
  label,
  placeholder = 'e.g., tomorrow, next friday, 02/14/26',
  id,
  className,
  onKeyDown,
  inputRef,
  inputRefCallback,
}: DateInputFieldProps) {
  const [parsed, setParsed] = useState<ParsedDate | null>(null)
  const [showAlternatives, setShowAlternatives] = useState(false)

  useEffect(() => {
    if (value) {
      const result = parseDateInputWithConfidence(value)
      setParsed(result)
    } else {
      setParsed(null)
    }
  }, [value])

  const handleSelect = (date: Date) => {
    onSelect?.(date)
    onChange(dateToIsoLocal(date))
    setShowAlternatives(false)
  }

  const handleMainPreviewClick = () => {
    if (parsed?.date) {
      handleSelect(parsed.date)
    }
  }

  return (
    <div className={`date-input-field ${className ?? ''}`.trim()}>
      <label htmlFor={id} className="block text-flow-meta text-flow-textSecondary mb-1">
        {label}
      </label>

      <input
        ref={(el) => {
          if (inputRef) (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el
          inputRefCallback?.(el)
        }}
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
        data-keyboard-ignore
      />

      {parsed && parsed.confidence !== 'low' && parsed.date && (
        <div
          className={`date-preview confidence-${parsed.confidence}`}
          role="region"
          aria-label="Date preview"
        >
          <div
            className="preview-main"
            onClick={handleMainPreviewClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleMainPreviewClick()
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Select date: ${parsed.interpretation}`}
          >
            <span className="preview-icon" aria-hidden>
              {parsed.confidence === 'high' ? '✓' : '?'}
            </span>
            <span className="preview-text">{parsed.interpretation}</span>
          </div>

          {parsed.alternativeInterpretations && parsed.alternativeInterpretations.length > 0 && (
            <>
              <button
                type="button"
                className="show-alternatives"
                onClick={() => setShowAlternatives(!showAlternatives)}
                aria-expanded={showAlternatives}
              >
                {showAlternatives ? 'Hide' : 'Show'} alternatives
              </button>

              {showAlternatives && (
                <div className="alternatives-list" role="list">
                  {parsed.alternativeInterpretations.map((alt, i) => (
                    <button
                      key={i}
                      type="button"
                      className="alternative-option"
                      onClick={() => handleSelect(alt.date)}
                      role="listitem"
                    >
                      {alt.interpretation}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {parsed && parsed.confidence === 'low' && value.trim() !== '' && (
        <div className="date-error" role="alert">
          Could not understand &quot;{value}&quot;. Try formats like &quot;tomorrow&quot;, &quot;next
          friday&quot;, or &quot;02/14/26&quot;
        </div>
      )}
    </div>
  )
}
