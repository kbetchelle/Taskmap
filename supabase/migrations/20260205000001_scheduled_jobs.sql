-- Scheduled jobs for Taskmap (requires pg_cron extension)
-- Enable in Supabase Dashboard: Database → Extensions → pg_cron

-- Uncomment after enabling pg_cron:

-- Clean expired action_history (expires_at < now()) every hour
-- SELECT cron.schedule(
--   'cleanup-expired-actions',
--   '0 * * * *',
--   $$SELECT cleanup_expired_actions()$$
-- );

-- Permanently delete completed tasks older than 6 hours, every hour
-- SELECT cron.schedule(
--   'cleanup-completed-tasks',
--   '0 * * * *',
--   $$SELECT cleanup_completed_tasks()$$
-- );

-- To remove jobs later:
-- SELECT cron.unschedule('cleanup-expired-actions');
-- SELECT cron.unschedule('cleanup-completed-tasks');
