import { createClient } from '@supabase/supabase-js';
import { Subject, Topic, Task, Note, Overlay, RevisionLog } from './types';
import { getTodayDateString } from './spacedRepetition';

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

// ==========================================
// LOCAL STORAGE MOCK DB ENGINE FOR ZERO-SETUP
// ==========================================
const MOCK_STORAGE_KEY = 'bcs_studyhelper_mock_db_v2';
const DEFAULT_USER_ID = 'demo-user-123';

interface MockDB {
  subjects: Subject[];
  topics: Topic[];
  tasks: Task[];
  notes: Note[];
  overlays: Overlay[];
  revisionLogs: RevisionLog[];
  targetDate: string;
  targetTitle: string;
}

const SAMPLE_NOTE_IMAGE =
  'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80';

const INITIAL_MOCK_DATA: MockDB = {
  targetDate: '2026-11-15',
  targetTitle: '47th BCS Preliminary Exam',
  subjects: [
    { id: 'subj-1', name: 'বাংলাদেশ বিষয়াবলী', user_id: DEFAULT_USER_ID, created_at: new Date().toISOString() },
    { id: 'subj-2', name: 'আন্তর্জাতিক বিষয়াবলী', user_id: DEFAULT_USER_ID, created_at: new Date().toISOString() },
    { id: 'subj-3', name: 'বাংলা ভাষা ও সাহিত্য', user_id: DEFAULT_USER_ID, created_at: new Date().toISOString() },
    { id: 'subj-4', name: 'সাধারণ বিজ্ঞান ও তথ্যপ্রযুক্তি', user_id: DEFAULT_USER_ID, created_at: new Date().toISOString() },
  ],
  topics: [
    { id: 'top-1', name: 'প্রাচীন বাংলার ইতিহাস ও জনপদ', subject_id: 'subj-1', user_id: DEFAULT_USER_ID, created_at: new Date().toISOString() },
    { id: 'top-2', name: '১৯৭১ সালের মুক্তিযুদ্ধ ও পটভূমি', subject_id: 'subj-1', user_id: DEFAULT_USER_ID, created_at: new Date().toISOString() },
    { id: 'top-3', name: 'জাতিসংঘ ও আন্তর্জাতিক সংস্থাসমূহ', subject_id: 'subj-2', user_id: DEFAULT_USER_ID, created_at: new Date().toISOString() },
    { id: 'top-4', name: 'চর্যাপদ ও মধ্যযুগের সাহিত্য', subject_id: 'subj-3', user_id: DEFAULT_USER_ID, created_at: new Date().toISOString() },
  ],
  tasks: [
    {
      id: 'task-1',
      title: 'প্রাচীন বাংলা: জনপদ ও শাসকসমূহের ছক রিভিশন',
      topic_id: 'top-1',
      priority: 1, // High
      last_reviewed_date: null, // New Study Block (Blue)
      current_interval: 1,
      ease_factor: 2.5,
      status_color: 'blue',
      next_revision_date: getTodayDateString(),
      user_id: DEFAULT_USER_ID,
      created_at: new Date().toISOString(),
    },
    {
      id: 'task-2',
      title: 'মুক্তিযুদ্ধের ৭টি সেক্টর ও কমান্ডারদের তালিকা memorization',
      topic_id: 'top-2',
      priority: 1, // High
      last_reviewed_date: '2026-07-20',
      current_interval: 2,
      ease_factor: 2.3,
      status_color: 'red',
      next_revision_date: getTodayDateString(), // Revision Block
      user_id: DEFAULT_USER_ID,
      created_at: new Date().toISOString(),
    },
    {
      id: 'task-3',
      title: 'জাতিসংঘের প্রধান অঙ্গসংগঠন ও সদর দপ্তর',
      topic_id: 'top-3',
      priority: 2, // Normal
      last_reviewed_date: '2026-07-22',
      current_interval: 4,
      ease_factor: 2.5,
      status_color: 'green',
      next_revision_date: getTodayDateString(),
      user_id: DEFAULT_USER_ID,
      created_at: new Date().toISOString(),
    },
    {
      id: 'task-4',
      title: 'চর্যাপদের কবি ও পদের সংখ্যা বিষয়ক তথ্য',
      topic_id: 'top-4',
      priority: 3, // Low
      last_reviewed_date: null,
      current_interval: 1,
      ease_factor: 2.5,
      status_color: 'blue',
      next_revision_date: getTodayDateString(),
      user_id: DEFAULT_USER_ID,
      created_at: new Date().toISOString(),
    },
  ],
  notes: [
    {
      id: 'note-1',
      task_id: 'task-1',
      image_url: SAMPLE_NOTE_IMAGE,
      user_id: DEFAULT_USER_ID,
      created_at: new Date().toISOString(),
    },
    {
      id: 'note-2',
      task_id: 'task-2',
      image_url: SAMPLE_NOTE_IMAGE,
      user_id: DEFAULT_USER_ID,
      created_at: new Date().toISOString(),
    },
  ],
  overlays: [
    {
      id: 'ov-1',
      note_id: 'note-1',
      x_coord: 15,
      y_coord: 20,
      width: 35,
      height: 12,
      is_currently_failing: false,
      user_id: DEFAULT_USER_ID,
    },
    {
      id: 'ov-2',
      note_id: 'note-1',
      x_coord: 55,
      y_coord: 20,
      width: 30,
      height: 12,
      is_currently_failing: true,
      user_id: DEFAULT_USER_ID,
    },
    {
      id: 'ov-3',
      note_id: 'note-1',
      x_coord: 15,
      y_coord: 45,
      width: 70,
      height: 15,
      is_currently_failing: false,
      user_id: DEFAULT_USER_ID,
    },
  ],
  revisionLogs: [],
};

function getMockDB(): MockDB {
  if (typeof window === 'undefined') return INITIAL_MOCK_DATA;
  const stored = localStorage.getItem(MOCK_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(INITIAL_MOCK_DATA));
    return INITIAL_MOCK_DATA;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_MOCK_DATA;
  }
}

function saveMockDB(db: MockDB) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(db));
  }
}

// Helper to attach nested topic and subject to tasks
function populateTaskRelations(task: Task, db: MockDB): Task {
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

// API FUNCTIONS (HANDLES BOTH SUPABASE AND LOCAL MOCK FALLBACK)

export async function fetchSubjects(): Promise<Subject[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('subjects').select('*').order('name');
    if (error) {
      console.error('Error fetching subjects from Supabase:', error);
      return getMockDB().subjects;
    }
    return data || [];
  }
  return getMockDB().subjects;
}

export async function fetchTopics(): Promise<Topic[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('topics')
      .select('*, subject:subjects(*)')
      .order('name');
    if (error) {
      console.error('Error fetching topics from Supabase:', error);
      return getMockDB().topics;
    }
    return data || [];
  }
  const db = getMockDB();
  return db.topics.map((t) => ({
    ...t,
    subject: db.subjects.find((s) => s.id === t.subject_id),
  }));
}

export async function createSubject(name: string): Promise<Subject> {
  const newSubject: Subject = {
    id: isSupabaseConfigured ? undefined! : `subj-${Date.now()}`,
    name,
    user_id: DEFAULT_USER_ID,
  };

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

  const db = getMockDB();
  db.subjects.push(newSubject);
  saveMockDB(db);
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

  const db = getMockDB();
  const newTopic: Topic = {
    id: `top-${Date.now()}`,
    name,
    subject_id: subjectId,
    user_id: DEFAULT_USER_ID,
    subject: db.subjects.find((s) => s.id === subjectId),
  };
  db.topics.push(newTopic);
  saveMockDB(db);
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

    if (error) {
      console.error('Supabase fetch tasks error:', error);
      const db = getMockDB();
      return db.tasks.map((t) => populateTaskRelations(t, db));
    }
    return data || [];
  }

  const db = getMockDB();
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

    if (error) {
      console.error('Fetch task by ID error:', error);
      const db = getMockDB();
      const raw = db.tasks.find((t) => t.id === id);
      return raw ? populateTaskRelations(raw, db) : null;
    }
    return data;
  }

  const db = getMockDB();
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

  const db = getMockDB();
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
  saveMockDB(db);
  return populateTaskRelations(newTask, db);
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('tasks').update(updates).eq('id', id);
    if (error) console.error('Error updating task in Supabase:', error);
    return;
  }

  const db = getMockDB();
  const idx = db.tasks.findIndex((t) => t.id === id);
  if (idx !== -1) {
    db.tasks[idx] = { ...db.tasks[idx], ...updates };
    saveMockDB(db);
  }
}

export async function deleteTask(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) console.error('Error deleting task in Supabase:', error);
    return;
  }

  const db = getMockDB();
  db.tasks = db.tasks.filter((t) => t.id !== id);
  const noteIds = db.notes.filter((n) => n.task_id === id).map((n) => n.id);
  db.notes = db.notes.filter((n) => n.task_id !== id);
  db.overlays = db.overlays.filter((o) => !noteIds.includes(o.note_id));
  saveMockDB(db);
}

// NOTE & OVERLAY OPERATIONS

export async function uploadNoteImage(file: File): Promise<string> {
  if (isSupabaseConfigured && supabase) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from('scanned-notes')
      .upload(fileName, file, { contentType: file.type || 'image/webp' });

    if (uploadError) {
      console.error('Supabase image upload failed:', uploadError);
    } else {
      const { data } = supabase.storage.from('scanned-notes').getPublicUrl(fileName);
      if (data?.publicUrl) return data.publicUrl;
    }
  }

  // Local fallback: convert file to Base64 data URL
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

  const db = getMockDB();
  const newNote: Note = {
    id: `note-${Date.now()}`,
    task_id: taskId,
    image_url: imageUrl,
    user_id: DEFAULT_USER_ID,
    created_at: new Date().toISOString(),
    overlays: [],
  };
  db.notes.push(newNote);
  saveMockDB(db);
  return newNote;
}

export async function saveOverlays(
  noteId: string,
  overlays: { x_coord: number; y_coord: number; width: number; height: number }[]
): Promise<Overlay[]> {
  if (isSupabaseConfigured && supabase) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || DEFAULT_USER_ID;

    // Remove old overlays for note if replacing
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

  const db = getMockDB();
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
  saveMockDB(db);
  return createdOverlays;
}

export async function updateOverlayFailingStatus(
  overlayId: string,
  isCurrentlyFailing: boolean
): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase
      .from('overlays')
      .update({ is_currently_failing: isCurrentlyFailing })
      .eq('id', overlayId);
    if (error) console.error('Error updating overlay status in Supabase:', error);
    return;
  }

  const db = getMockDB();
  const idx = db.overlays.findIndex((o) => o.id === overlayId);
  if (idx !== -1) {
    db.overlays[idx].is_currently_failing = isCurrentlyFailing;
    saveMockDB(db);
  }
}

export async function logRevisionScore(taskId: string, score: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || DEFAULT_USER_ID;
    const { error } = await supabase
      .from('revision_logs')
      .insert([{ task_id: taskId, score, user_id: userId }]);
    if (error) console.error('Error logging revision in Supabase:', error);
    return;
  }

  const db = getMockDB();
  db.revisionLogs.push({
    id: `rev-${Date.now()}`,
    task_id: taskId,
    score,
    created_at: new Date().toISOString(),
    user_id: DEFAULT_USER_ID,
  });
  saveMockDB(db);
}

// TARGET D-DAY BANNER CONFIG
export function getDDayConfig(): { targetDate: string; targetTitle: string } {
  const db = getMockDB();
  return {
    targetDate: db.targetDate || '2026-11-15',
    targetTitle: db.targetTitle || '47th BCS Preliminary Exam',
  };
}

export function saveDDayConfig(targetDate: string, targetTitle: string): void {
  const db = getMockDB();
  db.targetDate = targetDate;
  db.targetTitle = targetTitle;
  saveMockDB(db);
}
