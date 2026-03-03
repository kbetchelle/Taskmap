// Accent color utilities — hex/HSL conversion, WCAG contrast, derived colors.
// No external dependencies.

// ── Presets ──────────────────────────────────────────────────────────────

export const ACCENT_PRESETS = [
  { label: 'Blue', color: '#007AFF' },
  { label: 'Purple', color: '#AF52DE' },
  { label: 'Pink', color: '#FF2D55' },
  { label: 'Red', color: '#FF3B30' },
  { label: 'Orange', color: '#FF9500' },
  { label: 'Yellow', color: '#FFD60A' },
  { label: 'Green', color: '#34C759' },
  { label: 'Teal', color: '#5AC8FA' },
] as const

// ── Hex ↔ RGB ↔ HSL conversion ──────────────────────────────────────────

/** Parse a #RRGGBB hex string into [r, g, b] (0-255). */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

/** Convert [r, g, b] (0-255) to a #RRGGBB string. */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/** Convert [r, g, b] (0-255) to [h (0-360), s (0-1), l (0-1)]. */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2

  if (max === min) return [0, 0, l]

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

  let h = 0
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
  else if (max === gn) h = ((bn - rn) / d + 2) / 6
  else h = ((rn - gn) / d + 4) / 6

  return [h * 360, s, l]
}

/** Convert [h (0-360), s (0-1), l (0-1)] to [r, g, b] (0-255). */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hNorm = h / 360
  if (s === 0) {
    const v = Math.round(l * 255)
    return [v, v, v]
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t
    if (tt < 0) tt += 1
    if (tt > 1) tt -= 1
    if (tt < 1 / 6) return p + (q - p) * 6 * tt
    if (tt < 1 / 2) return q
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
    return p
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q

  return [
    Math.round(hue2rgb(p, q, hNorm + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, hNorm) * 255),
    Math.round(hue2rgb(p, q, hNorm - 1 / 3) * 255),
  ]
}

export function hexToHsl(hex: string): [number, number, number] {
  return rgbToHsl(...hexToRgb(hex))
}

export function hslToHex(h: number, s: number, l: number): string {
  return rgbToHex(...hslToRgb(h, s, l))
}

// ── WCAG Contrast ────────────────────────────────────────────────────────

/** Relative luminance per WCAG 2.1 */
function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio between two hex colors (1 to 21). */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1)
  const l2 = relativeLuminance(hex2)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

// ── Derive accent variants ──────────────────────────────────────────────

export interface AccentColors {
  /** The accent color itself */
  base: string
  /** Slightly darker for hover states */
  hover: string
  /** Very light for selected backgrounds */
  light: string
  /** White or black — readable text on the accent background */
  text: string
}

/**
 * Derive hover, light, and text colors from a base accent hex.
 * Uses simple HSL lightness adjustments.
 */
export function deriveAccentColors(hex: string): AccentColors {
  const [h, s, l] = hexToHsl(hex)

  // Hover: darken by ~10% lightness (clamp)
  const hoverL = Math.max(0, l - 0.1)
  const hover = hslToHex(h, s, hoverL)

  // Light: 10% opacity-like effect (very high lightness, low saturation)
  const lightL = Math.min(0.95, l + (1 - l) * 0.85)
  const lightS = s * 0.3
  const light = hslToHex(h, lightS, lightL)

  // Text on accent: white if contrast >= 4.5, else black
  const whiteContrast = contrastRatio(hex, '#FFFFFF')
  const text = whiteContrast >= 4.5 ? '#FFFFFF' : '#000000'

  return { base: hex, hover, light, text }
}

/** Validate that a string is a valid 6-digit hex color. */
export function isValidHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}
