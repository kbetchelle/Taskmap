-- Conflict resolution: add version and updated_by for optimistic locking
-- Replaces set_updated_at trigger on tasks/directories with increment_version

-- Add version and updated_by columns
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

ALTER TABLE directories ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE directories ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Drop existing updated_at triggers (we'll handle updated_at in increment_version)
DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
DROP TRIGGER IF EXISTS directories_updated_at ON directories;

-- Function: increment version, set updated_at and updated_by on UPDATE
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = OLD.version + 1;
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add version triggers
CREATE TRIGGER tasks_version_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

CREATE TRIGGER directories_version_trigger
  BEFORE UPDATE ON directories
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();
