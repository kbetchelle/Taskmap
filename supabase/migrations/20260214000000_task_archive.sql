-- Task archival: replace permanent deletion with archive (recoverable)
-- Client handles delayed archival (6h after completion); no server cron for task cleanup.

-- Add archive columns to tasks
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archive_reason text
    CHECK (archive_reason IS NULL OR archive_reason IN ('completed', 'user_deleted', 'auto_archived'));

-- Views for active vs archived tasks
CREATE OR REPLACE VIEW active_tasks AS
SELECT * FROM tasks WHERE archived_at IS NULL;

CREATE OR REPLACE VIEW archived_tasks AS
SELECT * FROM tasks WHERE archived_at IS NOT NULL;

-- Indexes for archive queries
CREATE INDEX IF NOT EXISTS idx_tasks_archived_at ON tasks(archived_at);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id_archived_at ON tasks(user_id, archived_at);

-- get_active_items: exclude archived tasks
CREATE OR REPLACE FUNCTION get_active_items(p_user_id uuid, p_current_date timestamptz)
RETURNS TABLE (
  kind text,
  id uuid,
  name text,
  parent_id uuid,
  directory_id uuid,
  start_date timestamptz,
  "position" integer,
  depth_level integer,
  priority task_priority,
  due_date timestamptz,
  is_completed boolean
) AS $$
  SELECT 'directory'::text, d.id, d.name, d.parent_id, NULL::uuid, d.start_date, d.position, d.depth_level, NULL::task_priority, NULL::timestamptz, NULL::boolean
  FROM directories d
  WHERE d.user_id = p_user_id AND (d.start_date IS NULL OR d.start_date <= p_current_date)
  UNION ALL
  SELECT 'task'::text, t.id, t.title, NULL::uuid, t.directory_id, t.start_date, t.position, NULL::integer, t.priority, t.due_date, t.is_completed
  FROM tasks t
  WHERE t.user_id = p_user_id AND (t.start_date IS NULL OR t.start_date <= p_current_date) AND t.archived_at IS NULL
  ORDER BY "position", name;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- get_upcoming_items: exclude archived tasks
CREATE OR REPLACE FUNCTION get_upcoming_items(p_user_id uuid, p_current_date timestamptz)
RETURNS TABLE (
  kind text,
  id uuid,
  name text,
  parent_id uuid,
  directory_id uuid,
  start_date timestamptz,
  "position" integer,
  depth_level integer,
  priority task_priority,
  due_date timestamptz,
  is_completed boolean
) AS $$
  SELECT 'directory'::text, d.id, d.name, d.parent_id, NULL::uuid, d.start_date, d.position, d.depth_level, NULL::task_priority, NULL::timestamptz, NULL::boolean
  FROM directories d
  WHERE d.user_id = p_user_id
  UNION ALL
  SELECT 'task'::text, t.id, t.title, NULL::uuid, t.directory_id, t.start_date, t.position, NULL::integer, t.priority, t.due_date, t.is_completed
  FROM tasks t
  WHERE t.user_id = p_user_id AND t.archived_at IS NULL
  ORDER BY "position", name;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Drop cleanup_completed_tasks; client handles delayed archival (6h after completion)
DROP FUNCTION IF EXISTS cleanup_completed_tasks();
