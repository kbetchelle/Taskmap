const GAP = 4 // px between cursor and menu edge

/**
 * Compute the absolute screen position for a floating menu
 * anchored to a cursor rect, staying within the viewport.
 *
 * Default: menu appears below the cursor, left-aligned.
 * Flips above if it would clip the bottom; shifts left if it clips the right.
 */
export function computeMenuPosition(
  anchorRect: DOMRect,
  menuWidth: number,
  menuHeight: number
): { top: number; left: number } {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  // Vertical: prefer below the cursor line
  let top = anchorRect.bottom + GAP
  if (top + menuHeight > viewportHeight) {
    // Flip above the cursor
    top = anchorRect.top - menuHeight - GAP
  }
  // Clamp so it never goes off-screen top
  if (top < 0) top = GAP

  // Horizontal: align left edge with cursor
  let left = anchorRect.left
  if (left + menuWidth > viewportWidth) {
    left = viewportWidth - menuWidth - GAP
  }
  if (left < 0) left = GAP

  return { top, left }
}
