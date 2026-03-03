-- Increase timeouts for this migration (FK constraints need locks on referenced tables)
SET statement_timeout = '120s';
SET lock_timeout = '30s';

-- Create table without foreign keys first (no locks on other tables needed)
CREATE TABLE IF NOT EXISTS task_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL,
  target_id uuid NOT NULL,
  link_type text NOT NULL DEFAULT 'reference',
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,

  CONSTRAINT valid_link_type CHECK (link_type IN ('reference', 'dependency')),
  CONSTRAINT no_self_link CHECK (source_id != target_id),
  CONSTRAINT unique_link UNIQUE (source_id, target_id, link_type)
);

-- Add foreign keys separately so each lock on the referenced table is brief
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'task_links_source_id_fkey'
  ) THEN
    ALTER TABLE task_links
      ADD CONSTRAINT task_links_source_id_fkey
      FOREIGN KEY (source_id) REFERENCES tasks(id) ON DELETE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'task_links_target_id_fkey'
  ) THEN
    ALTER TABLE task_links
      ADD CONSTRAINT task_links_target_id_fkey
      FOREIGN KEY (target_id) REFERENCES tasks(id) ON DELETE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'task_links_user_id_fkey'
  ) THEN
    ALTER TABLE task_links
      ADD CONSTRAINT task_links_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;
END$$;

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_task_links_source ON task_links(source_id);
CREATE INDEX IF NOT EXISTS idx_task_links_target ON task_links(target_id);

-- Enable RLS
ALTER TABLE task_links ENABLE ROW LEVEL SECURITY;

-- Drop-and-recreate policy idempotently
DROP POLICY IF EXISTS "Users can manage their own links" ON task_links;
CREATE POLICY "Users can manage their own links" ON task_links
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Reset timeouts to defaults
RESET statement_timeout;
RESET lock_timeout;
