-- Recurring tasks: pattern, parent chain, and series for end_after_count
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS recurrence_pattern jsonb,
  ADD COLUMN IF NOT EXISTS recurrence_parent_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recurrence_series_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_recurrence_template boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tasks_recurring
  ON tasks(user_id, is_recurrence_template)
  WHERE recurrence_pattern IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_recurrence_series
  ON tasks(recurrence_series_id)
  WHERE recurrence_series_id IS NOT NULL;
