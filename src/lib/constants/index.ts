// Color palettes, presets, shortcuts

export const PRESET_CATEGORIES = ['Work', 'Personal', 'Health', 'Finance', 'Other'] as const

/** Max file size for attachments (50MB) */
export const MAX_ATTACHMENT_FILE_SIZE = 50 * 1024 * 1024

export const DEFAULT_PRIORITY_HIGH_COLOR = '#FF3B30'
export const DEFAULT_PRIORITY_MED_COLOR = '#FF9500'
export const DEFAULT_BACKGROUND_PALETTE = [
  '#FFF8E7',
  '#E8F5E9',
  '#E3F2FD',
  '#FCE4EC',
  '#F3E5F5',
  '#FFF3E0',
]

// Phase 7: color presets for settings ColorPicker
export const COLOR_PRESETS = {
  priority: [
    '#FF3B30', // Red
    '#FF9500', // Orange
    '#FFCC00', // Yellow
    '#34C759', // Green
    '#007AFF', // Blue
    '#5856D6', // Purple
  ],
  category: [
    '#FF6B6B', // Coral
    '#4ECDC4', // Turquoise
    '#45B7D1', // Sky Blue
    '#FFA07A', // Light Salmon
    '#98D8C8', // Mint
    '#F7DC6F', // Light Yellow
    '#BB8FCE', // Lavender
    '#85C1E2', // Light Blue
  ],
  background: [
    '#FFF8E7', // Cream
    '#E8F5E9', // Light Green
    '#E3F2FD', // Light Blue
    '#FCE4EC', // Light Pink
    '#F3E5F5', // Light Purple
    '#FFF3E0', // Light Orange
    '#F1F8E9', // Light Lime
    '#E0F2F1', // Light Cyan
  ],
} as const

// Phase 7: default settings (omit user_id/created_at/updated_at for merging)
export const DEFAULT_SETTINGS_PAYLOAD = {
  default_view: 'main_db' as const,
  week_start_day: 'sunday' as const,
  priority_high_color: DEFAULT_PRIORITY_HIGH_COLOR,
  priority_med_color: DEFAULT_PRIORITY_MED_COLOR,
  category_colors: {
    '1': '#FF6B6B',
    '2': '#4ECDC4',
    '3': '#45B7D1',
    '4': '#FFA07A',
    '5': '#98D8C8',
  },
  category_names: {
    '1': 'Category 1',
    '2': 'Category 2',
    '3': 'Category 3',
    '4': 'Category 4',
    '5': 'Category 5',
  },
  background_color_palette: [...DEFAULT_BACKGROUND_PALETTE],
  skip_starter_structure: false,
}

// Keyboard shortcuts have been moved to src/lib/shortcutRegistry.ts (SHORTCUT_BINDINGS)
// The SHORTCUTS constant has been removed — all bindings are now defined in the unified registry.
