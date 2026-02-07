// Phase 6: file type to icon (emoji) for attachments

const ICON_MAP: Record<string, string> = {
  'application/pdf': '📕',
  'application/msword': '📘',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📘',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'application/vnd.ms-powerpoint': '📊',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📊',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'image/gif': '🖼️',
  'image/svg+xml': '🎨',
  'video/mp4': '🎬',
  'video/quicktime': '🎬',
  'audio/mpeg': '🎵',
  'audio/wav': '🎵',
  'application/zip': '📦',
  'application/x-rar-compressed': '📦',
  'text/javascript': '💻',
  'text/html': '💻',
  'text/css': '💻',
  'application/json': '💻',
  'text/plain': '📝',
  'text/markdown': '📝',
}

export function getFileIcon(mimeType: string | null): string {
  if (!mimeType) return '📄'
  if (ICON_MAP[mimeType]) return ICON_MAP[mimeType]
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.startsWith('video/')) return '🎬'
  if (mimeType.startsWith('audio/')) return '🎵'
  if (mimeType.startsWith('text/')) return '📝'
  return '📄'
}
