// TypeScript types matching DB schema

export type TaskPriority = 'LOW' | 'MED' | 'HIGH';

export type ActionType = 'create' | 'update' | 'delete' | 'move' | 'complete';
export type EntityType = 'task' | 'directory';

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  days_of_week?: number[];
  day_of_month?: number;
  month_of_year?: number;
  end_date?: string | null;
  end_after_count?: number | null;
}

export interface ChecklistItem {
  id: string;
  text: string;
  is_completed: boolean;
  position: number;
  created_at: string;
}

export interface Directory {
  id: string;
  name: string;
  parent_id: string | null;
  start_date: string | null;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  depth_level: number;
  version?: number;
  updated_by?: string | null;
}

export interface Task {
  id: string;
  title: string;
  directory_id: string;
  priority: TaskPriority | null;
  start_date: string | null;
  due_date: string | null;
  background_color: string | null;
  category: string | null;
  tags: string[];
  description: string | null;
  is_completed: boolean;
  completed_at: string | null;
  archived_at: string | null;
  archive_reason: 'completed' | 'user_deleted' | 'auto_archived' | null;
  position: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  version?: number;
  updated_by?: string | null;
  recurrence_pattern?: RecurrencePattern | null;
  recurrence_parent_id?: string | null;
  recurrence_series_id?: string | null;
  is_recurrence_template?: boolean;
  estimated_duration_minutes?: number | null;
  actual_duration_minutes?: number;
  checklist_items?: ChecklistItem[];
}

export type RecurringTask = Task & { recurrence_pattern: RecurrencePattern };

export interface TimeEntry {
  id: string;
  task_id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  user_id: string;
  created_at: string;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
  file_size?: number | null;
  storage_url: string | null;
  created_at: string;
  user_id: string;
}

export interface SavedViewRow {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  colorMode: 'none' | 'category' | 'priority';
  shortcut: string;
  createdAt: number;
}

export interface UserSettings {
  user_id: string;
  default_view: string;
  priority_high_color: string | null;
  priority_med_color: string | null;
  category_colors: Record<string, string> | null;
  category_names?: Record<string, string> | null;
  background_color_palette: string[] | null;
  week_start_day: 'sunday' | 'monday';
  saved_views?: SavedViewRow[] | null;
  skip_starter_structure: boolean;
  custom_shortcuts?: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

export interface ActionHistory {
  id: string;
  user_id: string;
  action_type: ActionType;
  entity_type: EntityType;
  entity_data: Record<string, unknown> | null;
  created_at: string;
  expires_at: string;
}

export interface ActiveItemRow {
  kind: 'directory' | 'task';
  id: string;
  name: string;
  parent_id: string | null;
  directory_id: string | null;
  start_date: string | null;
  position: number;
  depth_level: number | null;
  priority: TaskPriority | null;
  due_date: string | null;
  is_completed: boolean | null;
}
