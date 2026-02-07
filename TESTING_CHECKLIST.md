# Phase 1 Testing Checklist

## Directories

- [ ] Can create root-level directories (Column 1)
- [ ] Can create nested directories up to depth 15
- [ ] Error thrown when attempting depth > 15 (trigger `validate_directory_depth`)

## Tasks

- [ ] Can create tasks within directories
- [ ] Cannot create tasks in Column 1 (root level): task creation requires a valid `directory_id`; UI should not offer "New Task" when no directory is selected or when at root

## User & Security

- [ ] User settings are created on first login (`fetchSettings` upserts default row when null)
- [ ] RLS policies prevent cross-user data access (all tables filter by `auth.uid() = user_id`)

## Real-time & History

- [ ] Real-time updates reflect in UI immediately (subscriptions on `directories` and `tasks` for current user)
- [ ] Action history records all changes (insert into `action_history` on create/update/delete/move/complete)
- [ ] Completed tasks auto-delete after 6 hours (scheduled job or RPC `cleanup_completed_tasks()`)
- [ ] Action history auto-expires after 2 hours (scheduled job or RPC `cleanup_expired_actions()`)

## How to verify

1. **Depth 15**: Create 15 levels of nested directories; 16th should throw.
2. **RLS**: Use two Supabase users; confirm each sees only their own rows.
3. **Real-time**: Open app in two tabs with same user; create/edit in one tab, see update in the other.
4. **Cleanup**: Run `SELECT cleanup_completed_tasks();` and `SELECT cleanup_expired_actions();` in SQL Editor after creating expired data.
