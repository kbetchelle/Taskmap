/**
 * Haptic feedback utility with feature detection.
 *
 * Uses `navigator.vibrate()` (Android). iOS Safari does not support the
 * Vibration API from web context, but calls are included for future
 * native wrapper compatibility. All methods are safe no-ops when
 * vibration is unsupported.
 */

const canVibrate =
  typeof navigator !== 'undefined' && 'vibrate' in navigator

export const haptic = {
  /** Light tap — status change, swipe action trigger */
  light: () => { if (canVibrate) navigator.vibrate(10) },

  /** Medium tap — drag start (long-press grab) */
  medium: () => { if (canVibrate) navigator.vibrate(15) },

  /** Double tap pattern — drop complete */
  double: () => { if (canVibrate) navigator.vibrate([10, 50, 10]) },

  /** Very light micro tap — selection toggle, drop zone boundary cross */
  micro: () => { if (canVibrate) navigator.vibrate(5) },
}
