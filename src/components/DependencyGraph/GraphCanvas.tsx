import { useCallback, useState, useRef, useMemo } from 'react'
import type { GraphNode, GraphEdge } from './useGraphLayout'
import { getStatusColor } from '../../lib/statusUtils'

interface GraphCanvasProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  width: number  // reserved for future viewBox use
  height: number  // reserved for future viewBox use
  onNodeClick: (taskId: string) => void
}

const NODE_WIDTH = 180
const NODE_HEIGHT = 48
const ARROW_SIZE = 6

export function GraphCanvas({
  nodes,
  edges,
  width: _width,
  height: _height,
  onNodeClick,
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0 })
  const translateStart = useRef({ x: 0, y: 0 })

  const nodeMap = useMemo(
    () => new Map(nodes.map((n) => [n.id, n])),
    [nodes]
  )

  // Zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setScale((s) => Math.max(0.2, Math.min(3, s + delta)))
  }, [])

  // Pan
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      // Only pan if clicking on background
      if ((e.target as HTMLElement).closest('[data-graph-node]')) return
      setIsPanning(true)
      panStart.current = { x: e.clientX, y: e.clientY }
      translateStart.current = { ...translate }
    },
    [translate]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return
      setTranslate({
        x: translateStart.current.x + (e.clientX - panStart.current.x),
        y: translateStart.current.y + (e.clientY - panStart.current.y),
      })
    },
    [isPanning]
  )

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  return (
    <svg
      ref={svgRef}
      className="w-full h-full select-none"
      style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <defs>
        <marker
          id="arrow-dependency"
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth={ARROW_SIZE}
          markerHeight={ARROW_SIZE}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 Z" fill="#666" />
        </marker>
        <marker
          id="arrow-reference"
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth={ARROW_SIZE}
          markerHeight={ARROW_SIZE}
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 Z" fill="#aaa" />
        </marker>
      </defs>

      <g transform={`translate(${translate.x}, ${translate.y}) scale(${scale})`}>
        {/* Edges */}
        {edges.map((edge, idx) => {
          const from = nodeMap.get(edge.from)
          const to = nodeMap.get(edge.to)
          if (!from || !to) return null

          const isDependency = edge.type === 'dependency'
          // For dependency: arrow from target (depended-upon) to source (dependent)
          const x1 = to.x
          const y1 = to.y + NODE_HEIGHT / 2
          const x2 = from.x
          const y2 = from.y - NODE_HEIGHT / 2

          // Simple bezier curve
          const midY = (y1 + y2) / 2

          return (
            <path
              key={`edge-${idx}`}
              d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
              fill="none"
              stroke={isDependency ? '#666' : '#ccc'}
              strokeWidth={isDependency ? 2 : 1.5}
              strokeDasharray={isDependency ? 'none' : '6 3'}
              markerEnd={`url(#arrow-${edge.type})`}
            />
          )
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const statusColor = getStatusColor(node.task.status)
          const halfW = NODE_WIDTH / 2
          const halfH = NODE_HEIGHT / 2

          return (
            <g
              key={node.id}
              data-graph-node
              transform={`translate(${node.x - halfW}, ${node.y - halfH})`}
              onClick={() => onNodeClick(node.id)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={8}
                fill="white"
                stroke={statusColor}
                strokeWidth={2}
              />
              {/* Status indicator dot */}
              <circle
                cx={16}
                cy={NODE_HEIGHT / 2}
                r={5}
                fill={statusColor}
              />
              {/* Title */}
              <text
                x={30}
                y={NODE_HEIGHT / 2 + 1}
                dominantBaseline="middle"
                className="text-flow-task"
                fill="#000"
                fontSize={13}
              >
                {node.task.title.length > 18
                  ? node.task.title.slice(0, 18) + '...'
                  : node.task.title}
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
}
