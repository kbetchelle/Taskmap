-- Add custom_shortcuts to user_settings for remappable keyboard shortcuts
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS custom_shortcuts jsonb;
