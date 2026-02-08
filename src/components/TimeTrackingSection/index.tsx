import { useState, useEffect, useCallback } from 'react'
import type { Task, TimeEntry } from '../../types'
import { useAppContext } from '../../contexts/AppContext'
import { useTimeTrackerStore } from '../../stores/timeTrackerStore'
import { useFeedbackStore } from '../../stores/feedbackStore'
import { fetchTimeEntriesByTask } from '../../api/timeEntries'
import { formatDuration, formatMinutes } from '../../lib/utils/timeFormat'
import { formatDateTimeNatural } from '../../lib/utils/dateFormat'
import { Button } from '../ui/Button'

interface TimeTrackingSectionProps {
  task: Task
  onTaskUpdated?: (updates: { actual_duration_minutes: number }) => void
}

export function TimeTrackingSection({ task, onTaskUpdated }: TimeTrackingSectionProps) {
  const { userId } = useAppContext()
  const tick = useTimeTrackerStore((s) => s.tick)
  const isTimerActive = useTimeTrackerStore((s) => s.isTimerActive)
  const getElapsedMs = useTimeTrackerStore((s) => s.getElapsedMs)
  const startTimer = useTimeTrackerStore((s) => s.startTimer)
  const stopTimer = useTimeTrackerStore((s) => s.stopTimer)
  const showError = useFeedbackStore((s) => s.showError)

  const [showHistory, setShowHistory] = useState(false)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(false)

  const running = isTimerActive(task.id)
  const elapsedMs = getElapsedMs(task.id)
  const totalMinutes = task.actual_duration_minutes ?? 0
  const estimatedMinutes = task.estimated_duration_minutes ?? 0
  const percentOfEstimate =
    estimatedMinutes > 0 ? Math.round((totalMinutes / estimatedMinutes) * 100) : 0

  const displayValue = running && elapsedMs != null
    ? formatDuration(elapsedMs)
    : formatDuration(totalMinutes * 60000)

  const loadTimeEntries = useCallback(async () => {
    setLoading(true)
    try {
      const entries = await fetchTimeEntriesByTask(task.id)
      setTimeEntries(entries)
    } catch {
      showError('Failed to load time history')
    } finally {
      setLoading(false)
    }
  }, [task.id, showError])

  useEffect(() => {
    if (showHistory) {
      loadTimeEntries()
    }
  }, [showHistory, loadTimeEntries, tick])

  const handleStartStop = useCallback(async () => {
    if (!userId) return
    try {
      if (running) {
        await stopTimer(task.id, (minutes) => {
          onTaskUpdated?.({ actual_duration_minutes: minutes })
        })
      } else {
        await startTimer(task.id, userId)
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to update timer')
    }
  }, [userId, running, task.id, startTimer, stopTimer, onTaskUpdated, showError])

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-flow-textSecondary m-0">
        Time Tracking
      </h3>
      <div className="flex flex-col gap-3 rounded border border-flow-columnBorder p-3">
        <div className="flex items-center justify-between gap-3">
          <div
            className="text-lg font-mono font-flow-medium text-flow-textPrimary"
            data-timer-task={task.id}
          >
            {displayValue}
          </div>
          <Button
            variant={running ? 'primary' : 'secondary'}
            onClick={handleStartStop}
            className={running ? 'bg-amber-500 hover:bg-amber-600' : ''}
          >
            {running ? '⏸ Stop' : '▶ Start'}
          </Button>
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex flex-col">
            <span className="text-flow-textSecondary text-xs">Total</span>
            <span className="font-flow-medium text-flow-textPrimary">
              {formatMinutes(totalMinutes)}
            </span>
          </div>
          {estimatedMinutes > 0 && (
            <>
              <div className="flex flex-col">
                <span className="text-flow-textSecondary text-xs">Estimated</span>
                <span className="font-flow-medium text-flow-textPrimary">
                  {formatMinutes(estimatedMinutes)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-flow-textSecondary text-xs">Progress</span>
                <span
                  className={`font-flow-medium ${
                    percentOfEstimate > 100 ? 'text-flow-error' : 'text-flow-textPrimary'
                  }`}
                >
                  {percentOfEstimate}%
                </span>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          className="text-xs text-flow-textSecondary hover:text-flow-textPrimary"
          onClick={() => setShowHistory(!showHistory)}
        >
          {showHistory ? 'Hide' : 'Show'} Time History
        </button>

        {showHistory && (
          <div className="flex flex-col gap-2 pt-2 border-t border-flow-columnBorder">
            {loading ? (
              <p className="text-flow-textSecondary text-xs">Loading...</p>
            ) : timeEntries.length === 0 ? (
              <p className="text-flow-textSecondary text-xs">No time entries yet</p>
            ) : (
              timeEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex justify-between items-center py-1 text-sm"
                >
                  <span className="text-flow-textSecondary">
                    {formatDateTimeNatural(entry.started_at)}
                  </span>
                  <span className="font-flow-medium text-flow-textPrimary">
                    {entry.duration_minutes != null
                      ? formatMinutes(entry.duration_minutes)
                      : 'In progress...'}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
