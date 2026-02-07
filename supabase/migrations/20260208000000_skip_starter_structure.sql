-- Add skip_starter_structure to user_settings for onboarding starter projects option
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS skip_starter_structure boolean NOT NULL DEFAULT false;
