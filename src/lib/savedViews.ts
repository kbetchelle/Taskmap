import type { SavedView } from '../types/state'
import type { SavedViewRow } from '../types/database'
import { DEFAULT_FILTER_STATE } from '../types/state'

function serializeFilters(f: SavedView['filters']): Record<string, unknown> {
  return {
    ...f,
    dateRange:
      f.dateRange == null
        ? null
        : {
            start: f.dateRange.start?.toISOString() ?? null,
            end: f.dateRange.end?.toISOString() ?? null,
          },
  }
}

function deserializeFilters(r: Record<string, unknown>): SavedView['filters'] {
  const base = { ...DEFAULT_FILTER_STATE, ...r }
  const dr = r.dateRange as { start: string | null; end: string | null } | null | undefined
  if (dr && typeof dr === 'object') {
    base.dateRange = {
      start: dr.start ? new Date(dr.start) : null,
      end: dr.end ? new Date(dr.end) : null,
    }
  }
  return base as SavedView['filters']
}

export function savedViewToRow(v: SavedView): SavedViewRow {
  return {
    id: v.id,
    name: v.name,
    filters: serializeFilters(v.filters),
    colorMode: v.colorMode,
    shortcut: v.shortcut,
    createdAt: v.createdAt,
  }
}

export function rowToSavedView(r: SavedViewRow): SavedView {
  return {
    id: r.id,
    name: r.name,
    filters: deserializeFilters(r.filters as Record<string, unknown>),
    colorMode: r.colorMode,
    shortcut: r.shortcut,
    createdAt: r.createdAt,
  }
}
