import type { Command } from '../commandRegistry'

interface FuzzyResult {
  match: boolean
  score: number
}

/**
 * Fuzzy-match a query against a target string.
 *
 * Scoring:
 *  - Exact prefix match gets highest bonus (+100)
 *  - Consecutive character matches get +5 each
 *  - Matches at word boundaries (after space, hyphen, uppercase) get +10
 *  - Each matched character gets +1 base
 *
 * Returns { match: false, score: 0 } when the query chars don't appear in order.
 */
export function fuzzyMatch(query: string, target: string): FuzzyResult {
  if (!query) return { match: true, score: 0 }

  const q = query.toLowerCase()
  const t = target.toLowerCase()

  // Exact prefix match — highest score
  if (t.startsWith(q)) {
    return { match: true, score: 100 + q.length }
  }

  // Subsequence match with scoring
  let score = 0
  let qi = 0
  let lastMatchIndex = -2 // -2 so first match isn't "consecutive"
  const wordBoundaries = buildWordBoundarySet(target)

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += 1 // base point per matched char

      // Consecutive match bonus
      if (ti === lastMatchIndex + 1) {
        score += 5
      }

      // Word boundary bonus
      if (wordBoundaries.has(ti)) {
        score += 10
      }

      lastMatchIndex = ti
      qi++
    }
  }

  if (qi === q.length) {
    return { match: true, score }
  }

  return { match: false, score: 0 }
}

/**
 * Build a set of indices that are word-boundary positions:
 * index 0, and any position preceded by a space, hyphen, or
 * where a lowercase→uppercase transition occurs.
 */
function buildWordBoundarySet(str: string): Set<number> {
  const set = new Set<number>()
  set.add(0) // first character is always a boundary
  for (let i = 1; i < str.length; i++) {
    const prev = str[i - 1]
    const curr = str[i]
    if (prev === ' ' || prev === '-' || prev === '_') {
      set.add(i)
    } else if (
      prev === prev.toLowerCase() &&
      curr === curr.toUpperCase() &&
      curr !== curr.toLowerCase()
    ) {
      // camelCase boundary
      set.add(i)
    }
  }
  return set
}

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
