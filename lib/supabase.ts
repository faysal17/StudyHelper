import { createClient } from '@supabase/supabase-js';
import { Subject, Topic, Subtopic, Task, Note, Overlay, RevisionLog, UserSettings, SubtopicStatus } from './types';

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

const STORAGE_KEY = 'learning_hub_db_v5';
const DEFAULT_USER_ID = 'user-owner';

interface LocalDB {
  subjects: Subject[];
  topics: Topic[];
  subtopics: Subtopic[];
  tasks: Task[];
  notes: Note[];
  overlays: Overlay[];
  revisionLogs: RevisionLog[];
  settings: UserSettings;
}

const CLEAN_EMPTY_DB: LocalDB = {
  subjects: [],
  topics: [],
  subtopics: [],
  tasks: [],
  notes: [],
  overlays: [],
  revisionLogs: [],
  settings: {
    user_id: DEFAULT_USER_ID,
    target_date: null,
    target_title: null,
    day_end_time: '00:00',
    focus_seconds_today: 0,
    focus_seconds_week: 0,
    current_rank: 'Unranked',
    current_title: 'Learner',
  },
};

function getLocalDB(): LocalDB {
  if (typeof window === 'undefined') return CLEAN_EMPTY_DB;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(CLEAN_EMPTY_DB));
    return CLEAN_EMPTY_DB;
  }
  try {
    const parsed = JSON.parse(stored);
    if (!parsed.subtopics) parsed.subtopics = [];
    if (!parsed.settings) parsed.settings = CLEAN_EMPTY_DB.settings;
    if (!parsed.settings.day_end_time) parsed.settings.day_end_time = '00:00';
    return parsed;
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
  const subtopic = db.subtopics.find((st) => st.id === task.subtopic_id);
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
    subtopic,
    subject,
    notes,
  };
}

// USER SETTINGS & ONLINE SYNC

export async function fetchUserSettings(): Promise<UserSettings> {
  if (isSupabaseConfigured && supabase) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const userId = userData.user.id;
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!error && data) {
        return {
          day_end_time: '00:00',
          ...data,
        };
      }

      const defaultSettings: UserSettings = {
        user_id: userId,
        target_date: null,
        target_title: null,
        day_end_time: '00:00',
        focus_seconds_today: 0,
        focus_seconds_week: 0,
        current_rank: 'Unranked',
        current_title: 'Learner',
      };

      await supabase.from('user_settings').upsert(defaultSettings);
      return defaultSettings;
    }
  }

  return getLocalDB().settings;
}

export async function updateDDayConfig(targetDate: string, targetTitle: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const userId = userData.user.id;
      await supabase.from('user_settings').upsert({
        user_id: userId,
        target_date: targetDate,
        target_title: targetTitle,
        updated_at: new Date().toISOString(),
      });
      return;
    }
  }

  const db = getLocalDB();
  db.settings.target_date = targetDate;
  db.settings.target_title = targetTitle;
  saveLocalDB(db);
}

export async function updateDayEndTimeConfig(dayEndTime: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const userId = userData.user.id;
      await supabase.from('user_settings').upsert({
        user_id: userId,
        day_end_time: dayEndTime,
        updated_at: new Date().toISOString(),
      });
      return;
    }
  }

  const db = getLocalDB();
  db.settings.day_end_time = dayEndTime;
  saveLocalDB(db);
}

export async function recordFocusSession(minutes: number): Promise<UserSettings> {
  const addedSeconds = Math.round(minutes * 60);

  if (isSupabaseConfigured && supabase) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const userId = userData.user.id;
      const current = await fetchUserSettings();
      const newToday = (current.focus_seconds_today || 0) + addedSeconds;
      const newWeek = (current.focus_seconds_week || 0) + addedSeconds;

      const updated: Partial<UserSettings> = {
        user_id: userId,
        focus_seconds_today: newToday,
        focus_seconds_week: newWeek,
        updated_at: new Date().toISOString(),
      };

      await supabase.from('user_settings').upsert(updated);
      return { ...current, ...updated };
    }
  }

  const db = getLocalDB();
  db.settings.focus_seconds_today = (db.settings.focus_seconds_today || 0) + addedSeconds;
  db.settings.focus_seconds_week = (db.settings.focus_seconds_week || 0) + addedSeconds;
  saveLocalDB(db);
  return db.settings;
}

// SUBJECT, TOPIC, SUBTOPIC DATA API

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

export async function fetchSubtopics(): Promise<Subtopic[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('subtopics')
      .select('*, topic:topics(*, subject:subjects(*))')
      .order('name');
    if (!error && data) {
      return data.map((st: any) => ({
        ...st,
        subject: st.topic?.subject || undefined,
      }));
    }
  }

  const db = getLocalDB();
  return db.subtopics.map((st) => {
    const topic = db.topics.find((t) => t.id === st.topic_id);
    const subject = topic ? db.subjects.find((s) => s.id === topic.subject_id) : undefined;
    return { ...st, topic: topic ? { ...topic, subject } : undefined, subject };
  });
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

export async function deleteSubject(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase.from('subjects').delete().eq('id', id);
    return;
  }

  const db = getLocalDB();
  db.subjects = db.subjects.filter((s) => s.id !== id);
  const topicIds = db.topics.filter((t) => t.subject_id === id).map((t) => t.id);
  db.topics = db.topics.filter((t) => t.subject_id !== id);
  db.subtopics = db.subtopics.filter((st) => !topicIds.includes(st.topic_id));
  saveLocalDB(db);
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

export async function deleteTopic(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase.from('topics').delete().eq('id', id);
    return;
  }

  const db = getLocalDB();
  db.topics = db.topics.filter((t) => t.id !== id);
  db.subtopics = db.subtopics.filter((st) => st.topic_id !== id);
  saveLocalDB(db);
}

export async function createSubtopic(name: string, topicId: string): Promise<Subtopic> {
  if (isSupabaseConfigured && supabase) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || DEFAULT_USER_ID;
    const { data, error } = await supabase
      .from('subtopics')
      .insert([{ name, topic_id: topicId, status: 'unstudied', user_id: userId }])
      .select('*, topic:topics(*, subject:subjects(*))')
      .single();
    if (error) throw error;
    return {
      ...data,
      subject: data.topic?.subject || undefined,
    };
  }

  const db = getLocalDB();
  const topic = db.topics.find((t) => t.id === topicId);
  const subject = topic ? db.subjects.find((s) => s.id === topic.subject_id) : undefined;
  const newSubtopic: Subtopic = {
    id: `subtop-${Date.now()}`,
    name,
    topic_id: topicId,
    status: 'unstudied',
    user_id: DEFAULT_USER_ID,
    topic: topic ? { ...topic, subject } : undefined,
    subject,
    created_at: new Date().toISOString(),
  };
  db.subtopics.push(newSubtopic);
  saveLocalDB(db);
  return newSubtopic;
}

export async function updateSubtopicStatus(id: string, status: SubtopicStatus): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase.from('subtopics').update({ status }).eq('id', id);
    return;
  }

  const db = getLocalDB();
  const idx = db.subtopics.findIndex((st) => st.id === id);
  if (idx !== -1) {
    db.subtopics[idx].status = status;
    saveLocalDB(db);
  }
}

export async function deleteSubtopic(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase.from('subtopics').delete().eq('id', id);
    return;
  }

  const db = getLocalDB();
  db.subtopics = db.subtopics.filter((st) => st.id !== id);
  saveLocalDB(db);
}

// TASK DATA API

export async function fetchTasks(): Promise<Task[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        topic:topics(*, subject:subjects(*)),
        subtopic:subtopics(*),
        notes:notes(*, overlays(*))
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return data.map((t: any) => ({
        ...t,
        subject: t.topic?.subject || undefined,
      }));
    }
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
        subtopic:subtopics(*),
        notes:notes(*, overlays(*))
      `)
      .eq('id', id)
      .single();

    if (!error && data) {
      return {
        ...data,
        subject: data.topic?.subject || undefined,
      };
    }
  }

  const db = getLocalDB();
  const raw = db.tasks.find((t) => t.id === id);
  return raw ? populateTaskRelations(raw, db) : null;
}

export async function createTask(taskData: {
  title: string;
  topic_id: string;
  subtopic_id?: string | null;
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
          subtopic_id: taskData.subtopic_id || null,
          priority: taskData.priority,
          next_revision_date: taskData.next_revision_date,
          status_color: 'blue',
          last_reviewed_date: null,
          current_interval: 1,
          ease_factor: 2.5,
          user_id: userId,
        },
      ])
      .select(`*, topic:topics(*, subject:subjects(*)), subtopic:subtopics(*)`)
      .single();

    if (error) throw error;
    return {
      ...data,
      subject: data.topic?.subject || undefined,
    };
  }

  const db = getLocalDB();
  const newTask: Task = {
    id: `task-${Date.now()}`,
    title: taskData.title,
    topic_id: taskData.topic_id,
    subtopic_id: taskData.subtopic_id || null,
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
  overlays: { x_coord: number; y_coord: number; width: number; height: number; label?: string | null }[]
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
      label: ov.label || null,
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
    label: ov.label || null,
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
