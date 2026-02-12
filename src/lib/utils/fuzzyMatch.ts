/**
 * Re-export from the shared fuzzyMatch utility.
 * Kept for backward compatibility with existing imports.
 */
export { fuzzyMatch } from '../fuzzyMatch'
export type { FuzzyResult } from '../fuzzyMatch'

import type { Command } from '../commandRegistry'
import { fuzzyMatch } from '../fuzzyMatch'

/**
 * Filter and sort commands by fuzzy match against a query.
 * Returns commands sorted by score (highest first).
 */
export function fuzzyFilterCommands(commands: Command[], query: string): Command[] {
  if (!query) return commands

  const results: { command: Command; score: number }[] = []

  for (const cmd of commands) {
    const { match, score } = fuzzyMatch(query, cmd.label)
    if (match) {
      results.push({ command: cmd, score })
    }
  }

  results.sort((a, b) => b.score - a.score)
  return results.map((r) => r.command)
}
