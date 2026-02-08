-- Task checklist: JSONB array of checklist items for subtasks

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS checklist_items jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_tasks_checklist ON tasks USING gin (checklist_items);
