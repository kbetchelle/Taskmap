-- Add saved_views to user_settings for Phase 5
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS saved_views jsonb DEFAULT '[]';
