import { useState, useEffect } from 'react'
import type { RecurrencePattern } from '../../types'
import { DateInputField } from '../DateInputField'

export interface RecurrenceFieldProps {
  value: RecurrencePattern | null
  onChange: (value: RecurrencePattern | null) => void
}

const DEFAULT_PATTERN: RecurrencePattern = {
  frequency: 'weekly',
  interval: 1,
  days_of_week: [],
  end_date: null,
  end_after_count: null,
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function RecurrenceField({ value, onChange }: RecurrenceFieldProps) {
  const [enabled, setEnabled] = useState(!!value)
  const [pattern, setPattern] = useState<RecurrencePattern>(
    value ?? DEFAULT_PATTERN
  )

  useEffect(() => {
    if (value) {
      setEnabled(true)
      setPattern(value)
    } else {
      setEnabled(false)
      setPattern(DEFAULT_PATTERN)
    }
  }, [value])

  const apply = (next: RecurrencePattern) => {
    setPattern(next)
    onChange(next)
  }

  const disable = () => {
    setEnabled(false)
    onChange(null)
  }

  if (!enabled) {
    return (
      <div>
        <button
          type="button"
          className="w-full rounded border border-dashed border-neutral-300 px-2 py-1.5 text-sm text-flow-textSecondary hover:border-neutral-400 hover:text-flow-textPrimary"
          onClick={() => {
            setEnabled(true)
            apply(pattern)
          }}
          data-keyboard-ignore
        >
          + Make Recurring
        </button>
      </div>
    )
  }

  return (
    <div className="recurrence-config flex flex-col gap-3 rounded border border-neutral-300 p-3">
      <div className="recurrence-header flex items-center justify-between">
        <label className="text-flow-meta text-flow-textSecondary">Repeats</label>
        <button
          type="button"
          className="text-flow-meta text-flow-textSecondary hover:text-flow-textPrimary"
          onClick={disable}
        >
          Remove
        </button>
      </div>

      <div className="recurrence-frequency flex flex-wrap items-center gap-2">
        <select
          value={pattern.frequency}
          onChange={(e) => {
            const newPattern = {
              ...pattern,
              frequency: e.target.value as RecurrencePattern['frequency'],
            }
            apply(newPattern)
          }}
          className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
          data-keyboard-ignore
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
        <label className="text-flow-meta text-flow-textSecondary">Every</label>
        <input
          type="number"
          min={1}
          max={365}
          value={pattern.interval}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10)
            if (!isNaN(n)) apply({ ...pattern, interval: n })
          }}
          className="w-14 rounded border border-neutral-300 px-2 py-1.5 text-sm"
          data-keyboard-ignore
        />
        <span className="text-flow-meta text-flow-textSecondary">
          {pattern.frequency === 'daily' && 'day(s)'}
          {pattern.frequency === 'weekly' && 'week(s)'}
          {pattern.frequency === 'monthly' && 'month(s)'}
          {pattern.frequency === 'yearly' && 'year(s)'}
        </span>
      </div>

      {pattern.frequency === 'weekly' && (
        <div className="recurrence-weekdays flex flex-wrap items-center gap-2">
          <label className="text-flow-meta text-flow-textSecondary">On</label>
          <div className="weekday-selector flex flex-wrap gap-1">
            {WEEKDAY_LABELS.map((day, index) => (
              <button
                key={index}
                type="button"
                className={`rounded border px-2 py-1 text-sm ${
                  pattern.days_of_week?.includes(index)
                    ? 'border-flow-accent bg-flow-accent/10 text-flow-accent'
                    : 'border-neutral-300 hover:border-neutral-400'
                }`}
                onClick={() => {
                  const days = pattern.days_of_week ?? []
                  const newDays = days.includes(index)
                    ? days.filter((d) => d !== index)
                    : [...days, index].sort((a, b) => a - b)
                  apply({ ...pattern, days_of_week: newDays })
                }}
                data-keyboard-ignore
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}

      {pattern.frequency === 'monthly' && (
        <div className="recurrence-day flex flex-wrap items-center gap-2">
          <label className="text-flow-meta text-flow-textSecondary">
            On day
          </label>
          <input
            type="number"
            min={1}
            max={31}
            value={pattern.day_of_month ?? 1}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10)
              if (!isNaN(n)) apply({ ...pattern, day_of_month: n })
            }}
            className="w-14 rounded border border-neutral-300 px-2 py-1.5 text-sm"
            data-keyboard-ignore
          />
          <span className="text-flow-meta text-flow-textSecondary">
            of the month
          </span>
        </div>
      )}

      <div className="recurrence-end flex flex-wrap items-center gap-2">
        <label className="text-flow-meta text-flow-textSecondary">Ends</label>
        <select
          value={
            pattern.end_date
              ? 'date'
              : pattern.end_after_count != null
                ? 'count'
                : 'never'
          }
          onChange={(e) => {
            const v = e.target.value
            if (v === 'never') {
              apply({ ...pattern, end_date: null, end_after_count: null })
            } else if (v === 'date') {
              apply({ ...pattern, end_after_count: null })
            } else {
              apply({
                ...pattern,
                end_date: null,
                end_after_count: pattern.end_after_count ?? 5,
              })
            }
          }}
          className="rounded border border-neutral-300 px-2 py-1.5 text-sm"
          data-keyboard-ignore
        >
          <option value="never">Never</option>
          <option value="date">On date</option>
          <option value="count">After count</option>
        </select>
        {pattern.end_date != null && pattern.end_date !== undefined && (
          <DateInputField
            value={pattern.end_date}
            onChange={(date) => apply({ ...pattern, end_date: date })}
            label=""
          />
        )}
        {pattern.end_after_count != null &&
          pattern.end_after_count !== undefined && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={1}
                max={100}
                value={pattern.end_after_count}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10)
                  if (!isNaN(n)) apply({ ...pattern, end_after_count: n })
                }}
                className="w-14 rounded border border-neutral-300 px-2 py-1.5 text-sm"
                data-keyboard-ignore
              />
              <span className="text-flow-meta text-flow-textSecondary">
                occurrences
              </span>
            </div>
          )}
      </div>
    </div>
  )
}
