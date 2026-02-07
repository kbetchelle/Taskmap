-- Performance indexes for large datasets
-- Supports get_active_items, get_upcoming_items, and common filters

CREATE INDEX IF NOT EXISTS idx_tasks_directory_position ON tasks(directory_id, position);
CREATE INDEX IF NOT EXISTS idx_tasks_user_completed ON tasks(user_id, is_completed);
CREATE INDEX IF NOT EXISTS idx_tasks_user_dates ON tasks(user_id, start_date, due_date);
CREATE INDEX IF NOT EXISTS idx_directories_user_parent ON directories(user_id, parent_id);

-- Partial indexes for active tasks
CREATE INDEX IF NOT EXISTS idx_tasks_active ON tasks(user_id, directory_id)
  WHERE is_completed = false;

-- Full-text search (optional; searchTasks uses ilike, useful for future tsquery)
CREATE INDEX IF NOT EXISTS idx_tasks_search ON tasks
  USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Main DB query optimization (partial index for active tasks)
CREATE INDEX IF NOT EXISTS idx_tasks_main_db ON tasks(user_id, start_date)
  WHERE is_completed = false;
