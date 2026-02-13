import type { TaskStatus } from '../../types/database'
import { getStatusColor } from '../../lib/statusUtils'

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
  const color = getStatusColor(status)
  const strokeWidth = 2
  const r = strokeWidth / 2
  const inner = size - strokeWidth

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`flex-shrink-0 cursor-pointer ${className}`}
      role="button"
      aria-label={`Status: ${status.replace(/_/g, ' ')}`}
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
  )
}
