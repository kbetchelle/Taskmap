import type { TaskStatus } from '../../types/database'
import { getStatusColor } from '../../lib/statusUtils'
import { useReadOnly } from '../../hooks/useReadOnly'

interface StatusIconProps {
  status: TaskStatus
  size?: number
  onClick?: (e: React.MouseEvent) => void
  onContextMenu?: (e: React.MouseEvent) => void
  className?: string
}

export function StatusIcon({
  status,
  size = 18,
  onClick,
  onContextMenu,
  className = '',
}: StatusIconProps) {
  const { isReadOnly } = useReadOnly()
  const color = getStatusColor(status)
  const strokeWidth = 2
  const r = strokeWidth / 2
  const inner = size - strokeWidth

  // Wrap in a touch-target container for mobile (44px min)
  return (
    <span
      className={`inline-flex items-center justify-center flex-shrink-0 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 ${isReadOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${className}`}
      onClick={isReadOnly ? undefined : onClick}
      onContextMenu={isReadOnly ? undefined : onContextMenu}
      role="button"
      aria-label={`Status: ${status.replace(/_/g, ' ')}`}
      data-write-action={onClick ? '' : undefined}
    >
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0"
    >
      {status === 'not_started' && (
        <rect
          x={r}
          y={r}
          width={inner}
          height={inner}
          rx={2}
          stroke={color}
          strokeWidth={strokeWidth}
        />
      )}

      {status === 'in_progress' && (
        <>
          <rect
            x={r}
            y={r}
            width={inner}
            height={inner}
            rx={2}
            stroke={color}
            strokeWidth={strokeWidth}
          />
          <line
            x1={size * 0.28}
            y1={size / 2}
            x2={size * 0.72}
            y2={size / 2}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </>
      )}

      {status === 'finishing_touches' && (
        <>
          <rect
            x={r}
            y={r}
            width={inner}
            height={inner}
            rx={2}
            stroke={color}
            strokeWidth={strokeWidth}
          />
          {/* 4-point sparkle/star */}
          <path
            d={`M${size / 2} ${size * 0.22} L${size * 0.56} ${size * 0.44} L${size * 0.78} ${size / 2} L${size * 0.56} ${size * 0.56} L${size / 2} ${size * 0.78} L${size * 0.44} ${size * 0.56} L${size * 0.22} ${size / 2} L${size * 0.44} ${size * 0.44} Z`}
            fill={color}
          />
        </>
      )}

      {status === 'completed' && (
        <>
          <rect
            x={r}
            y={r}
            width={inner}
            height={inner}
            rx={2}
            fill={color}
            stroke={color}
            strokeWidth={strokeWidth}
          />
          <polyline
            points={`${size * 0.27},${size * 0.5} ${size * 0.44},${size * 0.67} ${size * 0.73},${size * 0.33}`}
            fill="none"
            stroke="white"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
    </span>
  )
}
