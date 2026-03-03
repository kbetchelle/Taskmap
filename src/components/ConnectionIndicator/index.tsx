import { useNetworkStore } from '../../stores/networkStore'

/**
 * Small colored dot indicating connection status.
 * Green = connected, Yellow = slow, Red = offline.
 */
export function ConnectionIndicator() {
  const connectionQuality = useNetworkStore((s) => s.connectionQuality)

  const colorClass =
    connectionQuality === 'good'
      ? 'bg-green-500'
      : connectionQuality === 'slow'
        ? 'bg-amber-500'
        : 'bg-red-500'

  const tooltip =
    connectionQuality === 'good'
      ? 'Connected'
      : connectionQuality === 'slow'
        ? 'Slow connection'
        : 'Offline — read-only mode'

  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${colorClass}`}
      title={tooltip}
      aria-label={tooltip}
      role="status"
    />
  )
}
