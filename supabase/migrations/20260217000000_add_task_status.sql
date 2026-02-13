-- Add status column to tasks (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'status'
  ) THEN
    ALTER TABLE tasks ADD COLUMN status text NOT NULL DEFAULT 'not_started';
  END IF;
END$$;

-- Migrate existing data
UPDATE tasks SET status = 'completed' WHERE is_completed = true AND status = 'not_started';
UPDATE tasks SET status = 'not_started' WHERE is_completed = false AND status != 'not_started'
  AND status NOT IN ('in_progress', 'finishing_touches');

-- Add check constraint (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_status'
  ) THEN
    ALTER TABLE tasks ADD CONSTRAINT valid_status
      CHECK (status IN ('not_started', 'in_progress', 'finishing_touches', 'completed'));
  END IF;
END$$;
