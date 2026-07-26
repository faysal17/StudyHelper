import { createClient } from '@supabase/supabase-js';
import { Subject, Topic, Subtopic, Task, Note, Overlay, RevisionLog, UserSettings, SubtopicStatus } from './types';
import { calculateLevelAndProgress, updateStreakOnActivity } from './gamification';

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

const DEFAULT_QUOTES = [
  'Focus on being productive instead of busy.',
  'Discipline is choosing between what you want now and what you want most.',
  'Small daily improvements over time lead to stunning results.',
  'Success is the sum of small efforts, repeated day in and day out.',
  'The secret of getting ahead is getting started.',
];

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
    quotes: DEFAULT_QUOTES,
    xp: 0,
    level: 1,
    streak_days: 0,
    last_study_date: null,
    stops_today: 0,
    stops_this_week: 0,
    last_stop_timestamp: null,
    pause_start_timestamp: null,
    last_active_date: null,
    focus_seconds_today: 0,
    focus_seconds_week: 0,
    current_rank: 'E-Rank',
    current_title: 'Procrastinating Worm',
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
    if (!parsed.settings.quotes || parsed.settings.quotes.length === 0) {
      parsed.settings.quotes = DEFAULT_QUOTES;
    }
    if (parsed.settings.xp === undefined) parsed.settings.xp = 0;
    if (parsed.settings.level === undefined) parsed.settings.level = 1;
    if (parsed.settings.streak_days === undefined) parsed.settings.streak_days = 0;
    if (parsed.settings.stops_today === undefined) parsed.settings.stops_today = 0;
    if (parsed.settings.stops_this_week === undefined) parsed.settings.stops_this_week = 0;
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

// USER SETTINGS & GAMIFICATION SYNC

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
        const stats = calculateLevelAndProgress(data.xp || 0);
        return {
          day_end_time: '00:00',
          quotes: DEFAULT_QUOTES,
          xp: 0,
          level: stats.level,
          streak_days: 0,
          stops_today: 0,
          stops_this_week: 0,
          current_rank: stats.rankInfo.rank,
          current_title: stats.rankInfo.title,
          ...data,
        };
      }

      const defaultSettings: UserSettings = {
        user_id: userId,
        target_date: null,
        target_title: null,
        day_end_time: '00:00',
        quotes: DEFAULT_QUOTES,
        xp: 0,
        level: 1,
        streak_days: 0,
        last_study_date: null,
        stops_today: 0,
        stops_this_week: 0,
        last_stop_timestamp: null,
        pause_start_timestamp: null,
        last_active_date: null,
        focus_seconds_today: 0,
        focus_seconds_week: 0,
        current_rank: 'E-Rank',
        current_title: 'Procrastinating Worm',
      };

      await supabase.from('user_settings').upsert(defaultSettings);
      return defaultSettings;
    }
  }

  const local = getLocalDB().settings;
  const stats = calculateLevelAndProgress(local.xp || 0);
  return {
    ...local,
    level: stats.level,
    current_rank: stats.rankInfo.rank,
    current_title: stats.rankInfo.title,
  };
}

export async function awardXPAndSync(addedXP: number): Promise<UserSettings> {
  const current = await fetchUserSettings();
  const rawXP = (current.xp || 0) + addedXP;
  const newXP = Math.max(0, rawXP);
  const { level, rankInfo } = calculateLevelAndProgress(newXP);
  const { updatedStreak, updatedLastDate } = updateStreakOnActivity(
    current.streak_days || 0,
    current.last_study_date || null,
    current.day_end_time || '00:00'
  );

  const updated: Partial<UserSettings> = {
    user_id: current.user_id,
    xp: newXP,
    level,
    current_rank: rankInfo.rank,
    current_title: rankInfo.title,
    streak_days: updatedStreak,
    last_study_date: updatedLastDate,
    last_active_date: updatedLastDate,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      await supabase.from('user_settings').upsert({ ...updated, user_id: userData.user.id });
      return { ...current, ...updated };
    }
  }

  const db = getLocalDB();
  db.settings = { ...db.settings, ...updated };
  saveLocalDB(db);
  return db.settings;
}

// STOP SESSION PENALTY API
export async function recordSessionStop(): Promise<{ updatedSettings: UserSettings; isPenaltyApplied: boolean; penaltyAmount: number }> {
  const current = await fetchUserSettings();
  const stopsToday = (current.stops_today || 0) + 1;
  const stopsWeek = (current.stops_this_week || 0) + 1;

  let penaltyAmount = 0;
  if (stopsToday > 2) {
    penaltyAmount += 30; // Exceeded daily 2 free stops
  }
  if (stopsWeek > 7) {
    penaltyAmount += 20; // Exceeded weekly 7 free stops
  }

  const rawXP = (current.xp || 0) - penaltyAmount;
  const newXP = Math.max(0, rawXP);
  const { level, rankInfo } = calculateLevelAndProgress(newXP);

  const updated: Partial<UserSettings> = {
    user_id: current.user_id,
    stops_today: stopsToday,
    stops_this_week: stopsWeek,
    last_stop_timestamp: new Date().toISOString(),
    pause_start_timestamp: null,
    xp: newXP,
    level,
    current_rank: rankInfo.rank,
    current_title: rankInfo.title,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      await supabase.from('user_settings').upsert({ ...updated, user_id: userData.user.id });
      return { updatedSettings: { ...current, ...updated }, isPenaltyApplied: penaltyAmount > 0, penaltyAmount };
    }
  }

  const db = getLocalDB();
  db.settings = { ...db.settings, ...updated };
  saveLocalDB(db);
  return { updatedSettings: db.settings, isPenaltyApplied: penaltyAmount > 0, penaltyAmount };
}

// COMPLETED FOCUS SESSION WITH SELF-RATING SCORE
export async function recordRatedFocusSession(minutes: number, stars: number): Promise<UserSettings> {
  const addedSeconds = Math.round(minutes * 60);

  // Base XP: 15 XP for 25m (+ 5 XP per extra 10m)
  const baseXP = 15 + Math.max(0, Math.floor((minutes - 25) / 10) * 5);

  // Star Rating Multipliers: 5 = 2.0x, 4 = 1.0x, 3 = 0.7x, 2 = 0.3x, 1 = 0.0x
  let multiplier = 1.0;
  if (stars === 5) multiplier = 2.0;
  else if (stars === 4) multiplier = 1.0;
  else if (stars === 3) multiplier = 0.7;
  else if (stars === 2) multiplier = 0.3;
  else if (stars === 1) multiplier = 0.0;

  const earnedXP = Math.round(baseXP * multiplier);

  const current = await fetchUserSettings();
  const newToday = (current.focus_seconds_today || 0) + addedSeconds;
  const newWeek = (current.focus_seconds_week || 0) + addedSeconds;
  const newXP = Math.max(0, (current.xp || 0) + earnedXP);
  const { level, rankInfo } = calculateLevelAndProgress(newXP);
  const { updatedStreak, updatedLastDate } = updateStreakOnActivity(
    current.streak_days || 0,
    current.last_study_date || null,
    current.day_end_time || '00:00'
  );

  const updated: Partial<UserSettings> = {
    user_id: current.user_id,
    focus_seconds_today: newToday,
    focus_seconds_week: newWeek,
    xp: newXP,
    level,
    current_rank: rankInfo.rank,
    current_title: rankInfo.title,
    streak_days: updatedStreak,
    last_study_date: updatedLastDate,
    last_active_date: updatedLastDate,
    pause_start_timestamp: null,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      await supabase.from('user_settings').upsert({ ...updated, user_id: userData.user.id });
      return { ...current, ...updated };
    }
  }

  const db = getLocalDB();
  db.settings = { ...db.settings, ...updated };
  saveLocalDB(db);
  return db.settings;
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

export async function updateQuotesConfig(quotes: string[]): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const userId = userData.user.id;
      await supabase.from('user_settings').upsert({
        user_id: userId,
        quotes,
        updated_at: new Date().toISOString(),
      });
      return;
    }
  }

  const db = getLocalDB();
  db.settings.quotes = quotes;
  saveLocalDB(db);
}

export async function recordFocusSession(minutes: number): Promise<UserSettings> {
  return recordRatedFocusSession(minutes, 4);
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
  if (status === 'completed') {
    await awardXPAndSync(30); // Subtopic Completed: +30 XP
  }

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
  // Grindy Active Recall XP: 25 XP for 100%, 15 XP for 80%+, 5 XP below 80%
  const earnedXP = score >= 100 ? 25 : score >= 80 ? 15 : 5;
  await awardXPAndSync(earnedXP);

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
