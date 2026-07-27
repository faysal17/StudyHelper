export type Priority = 1 | 2 | 3;
export type StatusColor = 'blue' | 'red' | 'yellow' | 'green';
export type SubtopicStatus = 'unstudied' | 'in_progress' | 'completed';

export interface Subject {
  id: string;
  name: string;
  user_id: string;
  created_at?: string;
}

export interface Topic {
  id: string;
  name: string;
  subject_id: string;
  user_id: string;
  created_at?: string;
  subject?: Subject;
  subtopics?: Subtopic[];
}

export interface Subtopic {
  id: string;
  name: string;
  topic_id: string;
  status: SubtopicStatus;
  user_id: string;
  created_at?: string;
  topic?: Topic;
  subject?: Subject;
}

export interface Overlay {
  id: string;
  note_id: string;
  x_coord: number;
  y_coord: number;
  width: number;
  height: number;
  label?: string | null;
  is_currently_failing: boolean;
  user_id: string;
  created_at?: string;
}

export interface Note {
  id: string;
  task_id: string;
  image_url: string;
  user_id: string;
  created_at?: string;
  overlays?: Overlay[];
}

export interface Task {
  id: string;
  title: string;
  topic_id: string | null;
  subtopic_id?: string | null;
  priority: Priority;
  last_reviewed_date: string | null;
  current_interval: number;
  ease_factor: number;
  status_color: StatusColor;
  next_revision_date: string;
  user_id: string;
  created_at?: string;
  topic?: Topic;
  subtopic?: Subtopic;
  subject?: Subject;
  notes?: Note[];
}

export interface RevisionLog {
  id: string;
  task_id: string;
  score: number;
  created_at: string;
  user_id: string;
}

export interface FocusSession {
  id: string;
  user_id: string;
  task_id?: string | null;
  duration_seconds: number;
  rating?: number | null;
  xp_earned?: number;
  status?: 'completed' | 'abandoned';
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  target_date: string | null;
  target_title: string | null;
  day_end_time?: string;
  quotes?: string[];
  weekend_days?: string[];
  week_start_day?: string;
  weekday_target_minutes?: number;
  weekend_target_minutes?: number;
  weekly_focus_log?: Record<string, number>;
  xp?: number;
  level?: number;
  streak_days?: number;
  last_study_date?: string | null;
  stops_today?: number;
  stops_this_week?: number;
  last_stop_timestamp?: string | null;
  pause_start_timestamp?: string | null;
  last_active_date?: string | null;
  momentum_score?: number;
  official_weekly_rank?: number;
  last_week_rank?: number;
  last_week_start_date?: string | null;
  focus_seconds_today: number;
  focus_seconds_week: number;
  current_rank: string;
  current_title: string;
  last_vocab_xp_date?: string | null;
  updated_at?: string;
}
