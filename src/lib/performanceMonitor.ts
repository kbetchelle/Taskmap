/**
 * Optional performance monitoring: startMeasure/endMeasure, warn if > 50ms.
 * Guard with import.meta.env.DEV in call sites if desired.
 */

const metrics = new Map<string, number[]>()

export function startMeasure(name: string): () => void {
  const start = performance.now()
  return () => {
    const duration = performance.now() - start
    const list = metrics.get(name) ?? []
    list.push(duration)
    metrics.set(name, list)
    if (import.meta.env.DEV && duration > 50) {
      console.warn(`[perf] ${name} took ${duration.toFixed(2)}ms`)
    }
  }
}

export function getAverage(name: string): number {
  const list = metrics.get(name) ?? []
  if (list.length === 0) return 0
  return list.reduce((a, b) => a + b, 0) / list.length
}

export function printReport(): void {
  if (import.meta.env.DEV) {
    console.log('Performance report:')
    for (const [name, list] of metrics.entries()) {
      const avg = list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0
      console.log(`  ${name}: avg ${avg.toFixed(2)}ms (${list.length} samples)`)
    }
  }
}
