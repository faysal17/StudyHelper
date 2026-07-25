export type Priority = 1 | 2 | 3;
export type StatusColor = 'blue' | 'red' | 'yellow' | 'green';

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
}

export interface Overlay {
  id: string;
  note_id: string;
  x_coord: number;
  y_coord: number;
  width: number;
  height: number;
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
  priority: Priority; // 1 = High, 2 = Normal, 3 = Low
  last_reviewed_date: string | null; // ISO YYYY-MM-DD
  current_interval: number; // In days
  ease_factor: number; // e.g. 2.5
  status_color: StatusColor; // 'blue' | 'red' | 'yellow' | 'green'
  next_revision_date: string; // ISO YYYY-MM-DD
  user_id: string;
  created_at?: string;
  topic?: Topic;
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
