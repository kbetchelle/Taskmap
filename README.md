# Taskmap

Minimalist task management app built with React, TypeScript, Supabase, Zustand, and Tailwind CSS.

## Setup

1. **Environment**

   Copy `.env.local.example` to `.env.local` and set:

   - `VITE_SUPABASE_URL` – your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` – your Supabase anon key

2. **Database**

   Create a Supabase project at [supabase.com](https://supabase.com), then run the migration:

   - Open **SQL Editor** in the Supabase Dashboard, or
   - Use Supabase CLI: `supabase db push`

   Migration file: `supabase/migrations/20260205000000_initial_schema.sql`

3. **Realtime** (optional)

   In Supabase Dashboard → Database → Replication, enable replication for `directories` and `tasks` if you want live updates.

4. **Scheduled jobs** (optional)

   To run `cleanup_expired_actions()` and `cleanup_completed_tasks()` on a schedule:

   - Enable the `pg_cron` extension in Supabase Dashboard → Database → Extensions.
   - Schedule hourly, e.g.:
     - `SELECT cron.schedule('cleanup-actions', '0 * * * *', 'SELECT cleanup_expired_actions()');`
     - `SELECT cron.schedule('cleanup-tasks', '0 * * * *', 'SELECT cleanup_completed_tasks()');`

   Or call these RPCs from an external cron.

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Phase 1 deliverables

- **State management**: `AppState` (currentView, colorMode, selectedItems, clipboardItems, activeFilters, navigationPath, expandedTaskId, undoStack, settings) in `types/state.ts`; `useAppStore` for UI state; existing stores for data.
- **Data validation**: `lib/validation` – min length (directory/task), natural-language dates (13 days), priority/category enums. Attachments use Supabase Storage (path format `userId/taskId/timestamp-filename`, signed URLs).
- **Error handling**: `ErrorBoundary` component, `lib/errors` (AppError, userFacingMessage), `ValidationErrors` component, `useRetry` for network retries.
- **Auto-save**: `useAutoSave` – debounced save, save on Enter (handleSubmit), save on blur (handleBlur), optimistic with onError rollback.
- **User settings on first login**: `fetchSettings` upserts default `user_settings` when null.
- **Scheduled jobs**: See `supabase/migrations/20260205000001_scheduled_jobs.sql` (pg_cron) and `TESTING_CHECKLIST.md`.

## Project structure

- `src/components/` – Column, TaskItem, DirectoryItem, TaskEditor, CreatePanel, SettingsPanel, SearchBar, Footer, ErrorBoundary, ValidationErrors, ui/Button
- `src/hooks/` – useKeyboard, useDatabase, useAuth, useRealtime, useUndo, useClipboard, useRetry, useAutoSave
- `src/contexts/` – AppContext, ViewContext
- `src/lib/` – supabase, constants, utils, validation, errors
- `src/types/` – database, state (AppState, FilterState, ClipboardItem, etc.)
- `src/api/` – RPC/table helpers (directories, tasks, userSettings, actionHistory)
- `src/stores/` – authStore, appStore, directoryStore, taskStore, settingsStore, uiStore
- `src/pages/` – MainDb, Login
- `supabase/migrations/` – initial schema, scheduled jobs (pg_cron)
- `TESTING_CHECKLIST.md` – Phase 1 testing checklist
