/**
 * Phase 4: Inline error display for creation/validation.
 * Appends error message under the row, adds shake animation; dismisses on next keydown.
 */
export function showInlineError(
  itemId: string,
  message: string,
  expectedInput?: string
): void {
  const element = document.getElementById(`item-${itemId}`)
  if (!element) return

  const text = message || (expectedInput != null ? `Expected: ${expectedInput}` : 'Invalid input')
  const errorEl = document.createElement('div')
  errorEl.className = 'inline-error'
  errorEl.textContent = text
  errorEl.setAttribute('data-inline-error', 'true')

  element.classList.add('error-shake')
  element.style.position = 'relative'
  element.appendChild(errorEl)

  const dismiss = () => {
    element.classList.remove('error-shake')
    const child = element.querySelector('[data-inline-error="true"]')
    if (child) child.remove()
    window.removeEventListener('keydown', dismiss)
  }

  window.addEventListener('keydown', dismiss, { once: true })
}
