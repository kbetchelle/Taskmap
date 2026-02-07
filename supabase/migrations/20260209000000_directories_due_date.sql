-- Add due_date to directories (e.g. for project deadlines)
ALTER TABLE directories
  ADD COLUMN IF NOT EXISTS due_date timestamptz;
