-- Phase 7: add category_names to user_settings
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS category_names jsonb;
