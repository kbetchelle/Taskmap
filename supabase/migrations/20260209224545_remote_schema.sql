create extension if not exists "pg_cron" with schema "pg_catalog";

drop extension if exists "pg_net";

alter table "public"."tasks" drop constraint "tasks_archive_reason_check";

alter table "public"."tasks" drop constraint "tasks_recurrence_parent_id_fkey";

alter table "public"."tasks" drop constraint "tasks_recurrence_series_id_fkey";

drop view if exists "public"."active_tasks";

drop view if exists "public"."archived_tasks";

drop index if exists "public"."idx_directories_user_parent";

drop index if exists "public"."idx_tasks_active";

drop index if exists "public"."idx_tasks_archived_at";

drop index if exists "public"."idx_tasks_checklist";

drop index if exists "public"."idx_tasks_directory_position";

drop index if exists "public"."idx_tasks_main_db";

drop index if exists "public"."idx_tasks_recurrence_series";

drop index if exists "public"."idx_tasks_recurring";

drop index if exists "public"."idx_tasks_search";

drop index if exists "public"."idx_tasks_user_completed";

drop index if exists "public"."idx_tasks_user_dates";

drop index if exists "public"."idx_tasks_user_id_archived_at";

alter table "public"."directories" add column "search_vector" tsvector;

alter table "public"."tasks" drop column "archive_reason";

alter table "public"."tasks" drop column "archived_at";

alter table "public"."tasks" drop column "checklist_items";

alter table "public"."tasks" drop column "is_recurrence_template";

alter table "public"."tasks" drop column "recurrence_parent_id";

alter table "public"."tasks" drop column "recurrence_pattern";

alter table "public"."tasks" drop column "recurrence_series_id";

alter table "public"."tasks" add column "search_vector" tsvector;

alter table "public"."user_settings" drop column "custom_shortcuts";

CREATE INDEX idx_directories_search_vector ON public.directories USING gin (search_vector);

CREATE INDEX idx_tasks_search_vector ON public.tasks USING gin (search_vector);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.cleanup_completed_tasks()
 RETURNS bigint
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  WITH deleted AS (
    DELETE FROM tasks
    WHERE is_completed = true AND completed_at < now() - interval '6 hours'
    RETURNING id
  )
  SELECT count(*)::bigint FROM deleted;
$function$
;

CREATE OR REPLACE FUNCTION public.directories_search_vector_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.name, ''));
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.search_archived_tasks_fts(p_user_id uuid, p_query text, p_reason text DEFAULT NULL::text, p_limit integer DEFAULT 100)
 RETURNS SETOF public.tasks
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_query tsquery;
BEGIN
  IF p_query IS NULL OR trim(p_query) = '' THEN
    RETURN QUERY
    SELECT t.*
    FROM tasks t
    WHERE t.user_id = p_user_id
      AND t.archived_at IS NOT NULL
      AND (p_reason IS NULL OR t.archive_reason = p_reason)
    ORDER BY t.archived_at DESC
    LIMIT p_limit;
    RETURN;
  END IF;

  BEGIN
    v_query := websearch_to_tsquery('english', p_query);
  EXCEPTION WHEN OTHERS THEN
    RETURN;
  END;

  RETURN QUERY
  SELECT t.*
  FROM tasks t
  WHERE t.user_id = p_user_id
    AND t.archived_at IS NOT NULL
    AND (p_reason IS NULL OR t.archive_reason = p_reason)
    AND t.search_vector @@ v_query
  ORDER BY ts_rank(t.search_vector, v_query) DESC
  LIMIT p_limit;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.search_directories_fts(p_user_id uuid, p_query text)
 RETURNS SETOF public.directories
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_query tsquery;
BEGIN
  IF p_query IS NULL OR trim(p_query) = '' THEN
    RETURN;
  END IF;

  BEGIN
    v_query := websearch_to_tsquery('english', p_query);
  EXCEPTION WHEN OTHERS THEN
    RETURN;
  END;

  RETURN QUERY
  SELECT d.*
  FROM directories d
  WHERE d.user_id = p_user_id
    AND d.search_vector @@ v_query
  ORDER BY ts_rank(d.search_vector, v_query) DESC
  LIMIT 20;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.search_tasks_fts(p_user_id uuid, p_query text, p_filters jsonb DEFAULT '{}'::jsonb)
 RETURNS SETOF public.tasks
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_query tsquery;
  v_tags text[];
  v_priorities task_priority[];
  v_categories text[];
  v_date_start timestamptz;
  v_date_end timestamptz;
  v_show_completed boolean;
BEGIN
  IF p_query IS NULL OR trim(p_query) = '' THEN
    RETURN;
  END IF;

  BEGIN
    v_query := websearch_to_tsquery('english', p_query);
  EXCEPTION WHEN OTHERS THEN
    RETURN;
  END;

  v_tags := COALESCE(
    (SELECT array_agg(x::text) FROM jsonb_array_elements_text(p_filters->'tags') x),
    '{}'
  );
  v_priorities := COALESCE(
    (SELECT array_agg(x::task_priority) FROM jsonb_array_elements_text(p_filters->'priorities') x),
    '{}'
  );
  v_categories := COALESCE(
    (SELECT array_agg(x::text) FROM jsonb_array_elements_text(p_filters->'categories') x),
    '{}'
  );
  v_date_start := (p_filters->>'dateRangeStart')::timestamptz;
  v_date_end := (p_filters->>'dateRangeEnd')::timestamptz;
  v_show_completed := COALESCE((p_filters->>'showCompleted')::boolean, false);

  RETURN QUERY
  SELECT t.*
  FROM tasks t
  WHERE t.user_id = p_user_id
    AND t.archived_at IS NULL
    AND t.search_vector @@ v_query
    AND (v_show_completed OR NOT t.is_completed)
    AND (array_length(v_tags, 1) IS NULL OR t.tags && v_tags)
    AND (array_length(v_priorities, 1) IS NULL OR t.priority = ANY(v_priorities))
    AND (array_length(v_categories, 1) IS NULL OR t.category = ANY(v_categories))
    AND (v_date_start IS NULL OR t.start_date >= v_date_start)
    AND (v_date_end IS NULL OR t.start_date <= v_date_end)
  ORDER BY ts_rank(t.search_vector, v_query) DESC
  LIMIT 50;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.tasks_search_vector_update()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_active_items(p_user_id uuid, p_current_date timestamp with time zone)
 RETURNS TABLE(kind text, id uuid, name text, parent_id uuid, directory_id uuid, start_date timestamp with time zone, "position" integer, depth_level integer, priority public.task_priority, due_date timestamp with time zone, is_completed boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT 'directory'::text, d.id, d.name, d.parent_id, NULL::uuid, d.start_date, d.position, d.depth_level, NULL::task_priority, NULL::timestamptz, NULL::boolean
  FROM directories d
  WHERE d.user_id = p_user_id AND (d.start_date IS NULL OR d.start_date <= p_current_date)
  UNION ALL
  SELECT 'task'::text, t.id, t.title, NULL::uuid, t.directory_id, t.start_date, t.position, NULL::integer, t.priority, t.due_date, t.is_completed
  FROM tasks t
  WHERE t.user_id = p_user_id AND (t.start_date IS NULL OR t.start_date <= p_current_date)
  ORDER BY "position", name;
$function$
;

CREATE OR REPLACE FUNCTION public.get_upcoming_items(p_user_id uuid, p_current_date timestamp with time zone)
 RETURNS TABLE(kind text, id uuid, name text, parent_id uuid, directory_id uuid, start_date timestamp with time zone, "position" integer, depth_level integer, priority public.task_priority, due_date timestamp with time zone, is_completed boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT 'directory'::text, d.id, d.name, d.parent_id, NULL::uuid, d.start_date, d.position, d.depth_level, NULL::task_priority, NULL::timestamptz, NULL::boolean
  FROM directories d
  WHERE d.user_id = p_user_id
  UNION ALL
  SELECT 'task'::text, t.id, t.title, NULL::uuid, t.directory_id, t.start_date, t.position, NULL::integer, t.priority, t.due_date, t.is_completed
  FROM tasks t
  WHERE t.user_id = p_user_id
  ORDER BY "position", name;
$function$
;

CREATE TRIGGER directories_search_vector_trigger BEFORE INSERT OR UPDATE ON public.directories FOR EACH ROW EXECUTE FUNCTION public.directories_search_vector_update();

CREATE TRIGGER tasks_search_vector_trigger BEFORE INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.tasks_search_vector_update();


