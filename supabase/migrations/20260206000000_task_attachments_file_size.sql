-- Phase 6: add file_size to task_attachments for UI display
ALTER TABLE task_attachments ADD COLUMN IF NOT EXISTS file_size bigint;
