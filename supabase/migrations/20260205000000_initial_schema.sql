-- Taskmap: initial schema, RLS, indexes, and functions
-- Run in Supabase SQL Editor or via Supabase CLI

-- Enum for task priority
CREATE TYPE task_priority AS ENUM ('LOW', 'MED', 'HIGH');

-- Helper: set updated_at on row change
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============= TABLES =============

-- directories
CREATE TABLE directories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) >= 3),
  parent_id uuid REFERENCES directories(id) ON DELETE CASCADE,
  start_date timestamptz,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  depth_level integer NOT NULL DEFAULT 0 CHECK (depth_level <= 15)
);

CREATE TRIGGER directories_updated_at
  BEFORE UPDATE ON directories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- tasks
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) >= 3),
  directory_id uuid NOT NULL REFERENCES directories(id) ON DELETE CASCADE,
  priority task_priority,
  start_date timestamptz,
  due_date timestamptz,
  background_color text,
  category text,
  tags text[] DEFAULT '{}',
  description text,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- task_attachments
CREATE TABLE task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- user_settings
CREATE TABLE user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_view text NOT NULL DEFAULT 'main_db',
  priority_high_color text,
  priority_med_color text,
  category_colors jsonb,
  background_color_palette jsonb,
  week_start_day text NOT NULL DEFAULT 'sunday' CHECK (week_start_day IN ('sunday', 'monday')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- action_history
CREATE TABLE action_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '2 hours')
);

-- ============= INDEXES =============

CREATE INDEX idx_directories_parent_id ON directories(parent_id);
CREATE INDEX idx_directories_user_id ON directories(user_id);
CREATE INDEX idx_directories_start_date ON directories(start_date);

CREATE INDEX idx_tasks_directory_id ON tasks(directory_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_start_date ON tasks(start_date);
CREATE INDEX idx_tasks_completed_at ON tasks(completed_at);

CREATE INDEX idx_task_attachments_task_id ON task_attachments(task_id);
CREATE INDEX idx_task_attachments_user_id ON task_attachments(user_id);

CREATE INDEX idx_action_history_user_id ON action_history(user_id);
CREATE INDEX idx_action_history_expires_at ON action_history(expires_at);

-- ============= ROW LEVEL SECURITY =============

ALTER TABLE directories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_history ENABLE ROW LEVEL SECURITY;

-- directories policies
CREATE POLICY directories_select ON directories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY directories_insert ON directories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY directories_update ON directories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY directories_delete ON directories FOR DELETE USING (auth.uid() = user_id);

-- tasks policies
CREATE POLICY tasks_select ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY tasks_insert ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY tasks_update ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY tasks_delete ON tasks FOR DELETE USING (auth.uid() = user_id);

-- task_attachments policies
CREATE POLICY task_attachments_select ON task_attachments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY task_attachments_insert ON task_attachments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY task_attachments_update ON task_attachments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY task_attachments_delete ON task_attachments FOR DELETE USING (auth.uid() = user_id);

-- user_settings policies
CREATE POLICY user_settings_select ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY user_settings_insert ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_settings_update ON user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY user_settings_delete ON user_settings FOR DELETE USING (auth.uid() = user_id);

-- action_history policies
CREATE POLICY action_history_select ON action_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY action_history_insert ON action_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY action_history_update ON action_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY action_history_delete ON action_history FOR DELETE USING (auth.uid() = user_id);

-- ============= FUNCTIONS =============

-- get_directory_path(directory_id): returns array of names from root to current
CREATE OR REPLACE FUNCTION get_directory_path(p_directory_id uuid)
RETURNS text[] AS $$
  WITH RECURSIVE path AS (
    SELECT id, parent_id, name, 1 AS level
    FROM directories
    WHERE id = p_directory_id
    UNION ALL
    SELECT d.id, d.parent_id, d.name, path.level + 1
    FROM directories d
    JOIN path ON d.id = path.parent_id
  )
  SELECT array_agg(name ORDER BY level DESC)
  FROM path;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- get_active_items: directories and tasks where start_date <= current_date OR start_date IS NULL
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
  WHERE t.user_id = p_user_id AND (t.start_date IS NULL OR t.start_date <= p_current_date)
  ORDER BY "position", name;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- get_upcoming_items: all directories and tasks for user (no start_date filter)
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
  WHERE t.user_id = p_user_id
  ORDER BY "position", name;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- cleanup_expired_actions
CREATE OR REPLACE FUNCTION cleanup_expired_actions()
RETURNS bigint AS $$
  WITH deleted AS (
    DELETE FROM action_history WHERE expires_at < now() RETURNING id
  )
  SELECT count(*)::bigint FROM deleted;
$$ LANGUAGE sql SECURITY DEFINER;

-- cleanup_completed_tasks
CREATE OR REPLACE FUNCTION cleanup_completed_tasks()
RETURNS bigint AS $$
  WITH deleted AS (
    DELETE FROM tasks
    WHERE is_completed = true AND completed_at < now() - interval '6 hours'
    RETURNING id
  )
  SELECT count(*)::bigint FROM deleted;
$$ LANGUAGE sql SECURITY DEFINER;

-- validate_directory_depth: trigger to prevent depth > 15
CREATE OR REPLACE FUNCTION validate_directory_depth()
RETURNS TRIGGER AS $$
DECLARE
  new_depth integer;
BEGIN
  IF NEW.parent_id IS NULL THEN
    new_depth := 0;
  ELSE
    SELECT depth_level + 1 INTO new_depth
    FROM directories
    WHERE id = NEW.parent_id;
    IF new_depth IS NULL THEN
      RAISE EXCEPTION 'Parent directory not found';
    END IF;
  END IF;
  IF new_depth > 15 THEN
    RAISE EXCEPTION 'Directory depth cannot exceed 15 levels';
  END IF;
  NEW.depth_level := new_depth;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER directories_validate_depth
  BEFORE INSERT OR UPDATE OF parent_id ON directories
  FOR EACH ROW EXECUTE FUNCTION validate_directory_depth();

-- Optional: document scheduled jobs (pg_cron or external cron)
-- Run cleanup_expired_actions() and cleanup_completed_tasks() hourly.
-- Enable pg_cron in Supabase Dashboard and schedule:
--   SELECT cron.schedule('cleanup-actions', '0 * * * *', 'SELECT cleanup_expired_actions()');
--   SELECT cron.schedule('cleanup-tasks', '0 * * * *', 'SELECT cleanup_completed_tasks()');
