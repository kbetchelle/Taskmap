-- Time tracking: estimated/actual duration on tasks, time_entries table

-- Add time tracking columns to tasks
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS estimated_duration_minutes integer,
  ADD COLUMN IF NOT EXISTS actual_duration_minutes integer DEFAULT 0;

-- Create time_entries table
CREATE TABLE time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  duration_minutes integer,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_time_entries_task_id ON time_entries(task_id);
CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);

-- RLS for time_entries
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY time_entries_select ON time_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY time_entries_insert ON time_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY time_entries_update ON time_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY time_entries_delete ON time_entries FOR DELETE USING (auth.uid() = user_id);
