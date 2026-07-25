import { createClient } from '@supabase/supabase-js';
import { Subject, Topic, Task, Note, Overlay, RevisionLog } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://your-supabase-project.supabase.co' &&
    !supabaseUrl.includes('placeholder')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

// LOCAL STORAGE PERSISTENCE ENGINE (CLEAN EMPTY INITIAL STATE)
const STORAGE_KEY = 'learning_hub_db_v3';
const DEFAULT_USER_ID = 'user-owner';

interface LocalDB {
  subjects: Subject[];
  topics: Topic[];
  tasks: Task[];
  notes: Note[];
  overlays: Overlay[];
  revisionLogs: RevisionLog[];
  targetDate: string;
  targetTitle: string;
}

const CLEAN_EMPTY_DB: LocalDB = {
  targetDate: '2026-12-31',
  targetTitle: 'Target Goal Date',
  subjects: [],
  topics: [],
  tasks: [],
  notes: [],
  overlays: [],
  revisionLogs: [],
};

function getLocalDB(): LocalDB {
  if (typeof window === 'undefined') return CLEAN_EMPTY_DB;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(CLEAN_EMPTY_DB));
    return CLEAN_EMPTY_DB;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return CLEAN_EMPTY_DB;
  }
}

function saveLocalDB(db: LocalDB) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }
}

function populateTaskRelations(task: Task, db: LocalDB): Task {
  const topic = db.topics.find((t) => t.id === task.topic_id);
  const subject = topic ? db.subjects.find((s) => s.id === topic.subject_id) : undefined;
  const notes = db.notes
    .filter((n) => n.task_id === task.id)
    .map((n) => ({
      ...n,
      overlays: db.overlays.filter((o) => o.note_id === n.id),
    }));

  return {
    ...task,
    topic: topic ? { ...topic, subject } : undefined,
    subject,
    notes,
  };
}

// API FUNCTIONS (SUPABASE WITH TRANSPARENT LOCAL STORAGE CLIENT)

export async function fetchSubjects(): Promise<Subject[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('subjects').select('*').order('name');
    if (!error && data) return data;
  }
  return getLocalDB().subjects;
}

export async function fetchTopics(): Promise<Topic[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('topics')
      .select('*, subject:subjects(*)')
      .order('name');
    if (!error && data) return data;
  }
  const db = getLocalDB();
  return db.topics.map((t) => ({
    ...t,
    subject: db.subjects.find((s) => s.id === t.subject_id),
  }));
}

export async function createSubject(name: string): Promise<Subject> {
  if (isSupabaseConfigured && supabase) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || DEFAULT_USER_ID;
    const { data, error } = await supabase
      .from('subjects')
      .insert([{ name, user_id: userId }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const db = getLocalDB();
  const newSubject: Subject = {
    id: `subj-${Date.now()}`,
    name,
    user_id: DEFAULT_USER_ID,
    created_at: new Date().toISOString(),
  };
  db.subjects.push(newSubject);
  saveLocalDB(db);
  return newSubject;
}

export async function createTopic(name: string, subjectId: string): Promise<Topic> {
  if (isSupabaseConfigured && supabase) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || DEFAULT_USER_ID;
    const { data, error } = await supabase
      .from('topics')
      .insert([{ name, subject_id: subjectId, user_id: userId }])
      .select('*, subject:subjects(*)')
      .single();
    if (error) throw error;
    return data;
  }

  const db = getLocalDB();
  const newTopic: Topic = {
    id: `top-${Date.now()}`,
    name,
    subject_id: subjectId,
    user_id: DEFAULT_USER_ID,
    subject: db.subjects.find((s) => s.id === subjectId),
    created_at: new Date().toISOString(),
  };
  db.topics.push(newTopic);
  saveLocalDB(db);
  return newTopic;
}

export async function fetchTasks(): Promise<Task[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        topic:topics(*, subject:subjects(*)),
        notes:notes(*, overlays(*))
      `)
      .order('created_at', { ascending: false });

    if (!error && data) return data;
  }

  const db = getLocalDB();
  return db.tasks.map((t) => populateTaskRelations(t, db));
}

export async function fetchTaskById(id: string): Promise<Task | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        topic:topics(*, subject:subjects(*)),
        notes:notes(*, overlays(*))
      `)
      .eq('id', id)
      .single();

    if (!error && data) return data;
  }

  const db = getLocalDB();
  const raw = db.tasks.find((t) => t.id === id);
  return raw ? populateTaskRelations(raw, db) : null;
}

export async function createTask(taskData: {
  title: string;
  topic_id: string | null;
  priority: number;
  next_revision_date: string;
}): Promise<Task> {
  if (isSupabaseConfigured && supabase) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || DEFAULT_USER_ID;
    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          title: taskData.title,
          topic_id: taskData.topic_id,
          priority: taskData.priority,
          next_revision_date: taskData.next_revision_date,
          status_color: 'blue',
          last_reviewed_date: null,
          current_interval: 1,
          ease_factor: 2.5,
          user_id: userId,
        },
      ])
      .select(`*, topic:topics(*, subject:subjects(*))`)
      .single();

    if (error) throw error;
    return data;
  }

  const db = getLocalDB();
  const newTask: Task = {
    id: `task-${Date.now()}`,
    title: taskData.title,
    topic_id: taskData.topic_id,
    priority: taskData.priority as any,
    last_reviewed_date: null,
    current_interval: 1,
    ease_factor: 2.5,
    status_color: 'blue',
    next_revision_date: taskData.next_revision_date,
    user_id: DEFAULT_USER_ID,
    created_at: new Date().toISOString(),
  };

  db.tasks.unshift(newTask);
  saveLocalDB(db);
  return populateTaskRelations(newTask, db);
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase.from('tasks').update(updates).eq('id', id);
    return;
  }

  const db = getLocalDB();
  const idx = db.tasks.findIndex((t) => t.id === id);
  if (idx !== -1) {
    db.tasks[idx] = { ...db.tasks[idx], ...updates };
    saveLocalDB(db);
  }
}

export async function deleteTask(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase.from('tasks').delete().eq('id', id);
    return;
  }

  const db = getLocalDB();
  db.tasks = db.tasks.filter((t) => t.id !== id);
  const noteIds = db.notes.filter((n) => n.task_id === id).map((n) => n.id);
  db.notes = db.notes.filter((n) => n.task_id !== id);
  db.overlays = db.overlays.filter((o) => !noteIds.includes(o.note_id));
  saveLocalDB(db);
}

export async function uploadNoteImage(file: File): Promise<string> {
  if (isSupabaseConfigured && supabase) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('scanned-notes')
      .upload(fileName, file, { contentType: file.type || 'image/webp' });

    if (!uploadError) {
      const { data } = supabase.storage.from('scanned-notes').getPublicUrl(fileName);
      if (data?.publicUrl) return data.publicUrl;
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function createNote(taskId: string, imageUrl: string): Promise<Note> {
  if (isSupabaseConfigured && supabase) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || DEFAULT_USER_ID;
    const { data, error } = await supabase
      .from('notes')
      .insert([{ task_id: taskId, image_url: imageUrl, user_id: userId }])
      .select()
      .single();

    if (error) throw error;
    return { ...data, overlays: [] };
  }

  const db = getLocalDB();
  const newNote: Note = {
    id: `note-${Date.now()}`,
    task_id: taskId,
    image_url: imageUrl,
    user_id: DEFAULT_USER_ID,
    created_at: new Date().toISOString(),
    overlays: [],
  };
  db.notes.push(newNote);
  saveLocalDB(db);
  return newNote;
}

export async function saveOverlays(
  noteId: string,
  overlays: { x_coord: number; y_coord: number; width: number; height: number }[]
): Promise<Overlay[]> {
  if (isSupabaseConfigured && supabase) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || DEFAULT_USER_ID;

    await supabase.from('overlays').delete().eq('note_id', noteId);

    const rows = overlays.map((ov) => ({
      note_id: noteId,
      x_coord: ov.x_coord,
      y_coord: ov.y_coord,
      width: ov.width,
      height: ov.height,
      is_currently_failing: false,
      user_id: userId,
    }));

    const { data, error } = await supabase.from('overlays').insert(rows).select();
    if (error) throw error;
    return data || [];
  }

  const db = getLocalDB();
  db.overlays = db.overlays.filter((o) => o.note_id !== noteId);

  const createdOverlays: Overlay[] = overlays.map((ov, i) => ({
    id: `ov-${Date.now()}-${i}`,
    note_id: noteId,
    x_coord: ov.x_coord,
    y_coord: ov.y_coord,
    width: ov.width,
    height: ov.height,
    is_currently_failing: false,
    user_id: DEFAULT_USER_ID,
  }));

  db.overlays.push(...createdOverlays);
  saveLocalDB(db);
  return createdOverlays;
}

export async function updateOverlayFailingStatus(
  overlayId: string,
  isCurrentlyFailing: boolean
): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase
      .from('overlays')
      .update({ is_currently_failing: isCurrentlyFailing })
      .eq('id', overlayId);
    return;
  }

  const db = getLocalDB();
  const idx = db.overlays.findIndex((o) => o.id === overlayId);
  if (idx !== -1) {
    db.overlays[idx].is_currently_failing = isCurrentlyFailing;
    saveLocalDB(db);
  }
}

export async function logRevisionScore(taskId: string, score: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || DEFAULT_USER_ID;
    await supabase
      .from('revision_logs')
      .insert([{ task_id: taskId, score, user_id: userId }]);
    return;
  }

  const db = getLocalDB();
  db.revisionLogs.push({
    id: `rev-${Date.now()}`,
    task_id: taskId,
    score,
    created_at: new Date().toISOString(),
    user_id: DEFAULT_USER_ID,
  });
  saveLocalDB(db);
}

export function getDDayConfig(): { targetDate: string; targetTitle: string } {
  const db = getLocalDB();
  return {
    targetDate: db.targetDate || '2026-12-31',
    targetTitle: db.targetTitle || 'Target Goal Date',
  };
}

export function saveDDayConfig(targetDate: string, targetTitle: string): void {
  const db = getLocalDB();
  db.targetDate = targetDate;
  db.targetTitle = targetTitle;
  saveLocalDB(db);
}
