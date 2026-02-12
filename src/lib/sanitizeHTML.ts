/**
 * Allowlist-based HTML sanitizer for the ContentEditor.
 * Strips all tags, attributes, and scripts not in the allowlist.
 * Uses the browser's DOMParser — no external dependencies.
 */

const ALLOWED_TAGS = new Set([
  'P',
  'STRONG',
  'EM',
  'S',
  'H1',
  'H2',
  'H3',
  'UL',
  'OL',
  'LI',
  'BR',
])

/**
 * Recursively walk a DOM node and rebuild sanitized HTML.
 * Only allowed tags are preserved (with no attributes). All other
 * element nodes are replaced by their children's sanitized output.
 * Text nodes pass through as escaped text.
 */
function walkNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeHTML(node.textContent ?? '')
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return ''
  }

  const el = node as Element
  const tag = el.tagName

  // Completely strip <script>, <style>, <iframe>, <object>, <embed>
  if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED'].includes(tag)) {
    return ''
  }

  const childrenHTML = Array.from(el.childNodes).map(walkNode).join('')

  if (ALLOWED_TAGS.has(tag)) {
    const lower = tag.toLowerCase()
    // Self-closing tags
    if (tag === 'BR') {
      return '<br>'
    }
    return `<${lower}>${childrenHTML}</${lower}>`
  }

  // Tag not in allowlist — unwrap (keep children)
  return childrenHTML
}

export function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Sanitize an HTML string, keeping only the allowed tags with no attributes.
 * Returns a clean HTML string safe to store and render.
 */
export function sanitizeHTML(dirty: string): string {
  if (!dirty || !dirty.trim()) return ''

  const parser = new DOMParser()
  // Wrap in a body to ensure DOMParser parses fragment-style HTML correctly
  const doc = parser.parseFromString(`<body>${dirty}</body>`, 'text/html')
  const body = doc.body

  return Array.from(body.childNodes).map(walkNode).join('')
}
