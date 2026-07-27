import { createClient } from '@supabase/supabase-js';
import { Subject, Topic, Subtopic, Task, Note, Overlay, RevisionLog, UserSettings, SubtopicStatus, FocusSession } from './types';
import { calculateLevelAndProgress, updateStreakOnActivity } from './gamification';
import { getTodayDateString, getMondayOfWeek } from './spacedRepetition';

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

const DEFAULT_WEEKEND_DAYS = ['Saturday', 'Sunday'];

interface LocalDB {
  subjects: Subject[];
  topics: Topic[];
  subtopics: Subtopic[];
  tasks: Task[];
  notes: Note[];
  overlays: Overlay[];
  revisionLogs: RevisionLog[];
  focusSessions: FocusSession[];
  settings: UserSettings;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  user_id: DEFAULT_USER_ID,
  target_date: null,
  target_title: null,
  day_end_time: '00:00',
  quotes: DEFAULT_QUOTES,
  weekend_days: DEFAULT_WEEKEND_DAYS,
  week_start_day: 'Monday',
  weekday_target_minutes: 120,
  weekend_target_minutes: 210,
  weekly_focus_log: {},
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
  last_vocab_xp_date: null,
};

const CLEAN_EMPTY_DB: LocalDB = {
  subjects: [],
  topics: [],
  subtopics: [],
  tasks: [],
  notes: [],
  overlays: [],
  revisionLogs: [],
  focusSessions: [],
  settings: DEFAULT_USER_SETTINGS,
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
    return {
      ...CLEAN_EMPTY_DB,
      ...parsed,
      settings: {
        ...DEFAULT_USER_SETTINGS,
        ...(parsed.settings || {}),
      },
    };
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

export function calculateWeekFocusSeconds(weeklyLog: Record<string, number>, todayStr: string): number {
  const currentMon = getMondayOfWeek(todayStr);
  let total = 0;
  for (const [dateStr, seconds] of Object.entries(weeklyLog)) {
    if (getMondayOfWeek(dateStr) === currentMon) {
      total += seconds || 0;
    }
  }
  return total;
}

export function sanitizeUserSettings(rawSettings: UserSettings): UserSettings & { _needsPersist?: boolean } {
  let needsPersist = false;
  const settings: UserSettings = {
    ...DEFAULT_USER_SETTINGS,
    ...rawSettings,
  };

  const dayEndTime = settings.day_end_time || '00:00';
  const todayStr = getTodayDateString(dayEndTime);

  const [y, m, d] = todayStr.split('-').map(Number);
  const yesterdayObj = new Date(y, m - 1, d);
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yYear = yesterdayObj.getFullYear();
  const yMonth = String(yesterdayObj.getMonth() + 1).padStart(2, '0');
  const yDay = String(yesterdayObj.getDate()).padStart(2, '0');
  const yesterdayStr = `${yYear}-${yMonth}-${yDay}`;

  const lastActive = settings.last_active_date;
  const weeklyLog = settings.weekly_focus_log || {};

  // 1. Daily Rollover
  if (lastActive !== todayStr) {
    settings.last_active_date = todayStr;
    settings.focus_seconds_today = weeklyLog[todayStr] || 0;
    settings.stops_today = 0;
    needsPersist = true;
  } else {
    const logTodaySeconds = weeklyLog[todayStr] || 0;
    if (logTodaySeconds > (settings.focus_seconds_today || 0)) {
      settings.focus_seconds_today = logTodaySeconds;
      needsPersist = true;
    }
  }

  // 2. Weekly Rollover
  const lastActiveMon = lastActive ? getMondayOfWeek(lastActive) : getMondayOfWeek(todayStr);
  const currentMon = getMondayOfWeek(todayStr);
  if (lastActiveMon !== currentMon) {
    settings.stops_this_week = 0;
    needsPersist = true;
  }

  // 3. Sync focus_seconds_week
  const calculatedWeekSeconds = calculateWeekFocusSeconds(weeklyLog, todayStr);
  if (settings.focus_seconds_week !== calculatedWeekSeconds) {
    settings.focus_seconds_week = calculatedWeekSeconds;
    needsPersist = true;
  }

  // 4. Streak Check
  const lastStudy = settings.last_study_date;
  if (lastStudy && lastStudy !== todayStr && lastStudy !== yesterdayStr) {
    if (settings.streak_days !== 0) {
      settings.streak_days = 0;
      needsPersist = true;
    }
  }

  // 5. Level & Rank calculation
  const stats = calculateLevelAndProgress(settings.xp || 0);
  settings.level = stats.level;
  settings.current_rank = stats.rankInfo.rank;
  settings.current_title = stats.rankInfo.title;

  return {
    ...settings,
    _needsPersist: needsPersist,
  };
}

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
        const sanitized = sanitizeUserSettings(data);
        if (sanitized._needsPersist) {
          const { _needsPersist, ...toSave } = sanitized;
          await supabase.from('user_settings').upsert({ ...toSave, user_id: userId });
        }
        delete sanitized._needsPersist;
        return sanitized;
      }

      const defaultSettings: UserSettings = {
        ...DEFAULT_USER_SETTINGS,
        user_id: userId,
        last_active_date: getTodayDateString('00:00'),
      };

      await supabase.from('user_settings').upsert(defaultSettings);
      return defaultSettings;
    }
  }

  const local = getLocalDB().settings;
  const sanitized = sanitizeUserSettings(local);
  if (sanitized._needsPersist) {
    const { _needsPersist, ...toSave } = sanitized;
    const db = getLocalDB();
    db.settings = toSave;
    saveLocalDB(db);
  }
  delete sanitized._needsPersist;
  return sanitized;
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

export async function updateWeekendDaysConfig(weekendDays: string[]): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const userId = userData.user.id;
      await supabase.from('user_settings').upsert({
        user_id: userId,
        weekend_days: weekendDays,
        updated_at: new Date().toISOString(),
      });
      return;
    }
  }

  const db = getLocalDB();
  db.settings.weekend_days = weekendDays;
  saveLocalDB(db);
}

export async function updateStudyTargetsConfig(weekdayMins: number, weekendMins: number): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const userId = userData.user.id;
      await supabase.from('user_settings').upsert({
        user_id: userId,
        weekday_target_minutes: weekdayMins,
        weekend_target_minutes: weekendMins,
        updated_at: new Date().toISOString(),
      });
      return;
    }
  }

  const db = getLocalDB();
  db.settings.weekday_target_minutes = weekdayMins;
  db.settings.weekend_target_minutes = weekendMins;
  saveLocalDB(db);
}

// FOCUS SESSIONS API
export async function fetchFocusSessions(): Promise<FocusSession[]> {
  if (isSupabaseConfigured && supabase) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const { data, error } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });

      if (!error && data) return data;
    }
  }

  const db = getLocalDB();
  return db.focusSessions || [];
}

export async function createFocusSession(sessionData: {
  duration_seconds: number;
  rating?: number;
  xp_earned?: number;
  status?: 'completed' | 'abandoned';
  task_id?: string | null;
}): Promise<FocusSession> {
  const newSession: FocusSession = {
    id: `session-${Date.now()}`,
    user_id: DEFAULT_USER_ID,
    duration_seconds: sessionData.duration_seconds,
    rating: sessionData.rating ?? 4,
    xp_earned: sessionData.xp_earned ?? 0,
    status: sessionData.status ?? 'completed',
    task_id: sessionData.task_id || null,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      newSession.user_id = userData.user.id;
      const { data, error } = await supabase
        .from('focus_sessions')
        .insert([{
          user_id: userData.user.id,
          task_id: sessionData.task_id || null,
          duration_seconds: sessionData.duration_seconds,
          rating: sessionData.rating ?? 4,
          xp_earned: sessionData.xp_earned ?? 0,
          status: sessionData.status ?? 'completed',
        }])
        .select()
        .single();

      if (!error && data) return data;
    }
  }

  const db = getLocalDB();
  if (!db.focusSessions) db.focusSessions = [];
  db.focusSessions.unshift(newSession);
  saveLocalDB(db);
  return newSession;
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

  await createFocusSession({
    duration_seconds: 0,
    rating: 1,
    xp_earned: -penaltyAmount,
    status: 'abandoned',
  });

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

// COMPLETED FOCUS SESSION WITH SELF-RATING SCORE & 7-DAY LOGGING
export async function recordRatedFocusSession(minutes: number, stars: number): Promise<UserSettings> {
  const addedSeconds = Math.round(minutes * 60);

  // Focus Timer Anti-Farm Rule: Minimum 15 minutes required to earn XP
  let earnedXP = 0;
  if (minutes >= 15) {
    const baseXP = minutes >= 25
      ? 15 + Math.floor((minutes - 25) / 10) * 5
      : Math.round(15 * (minutes / 25));

    let multiplier = 1.0;
    if (stars === 5) multiplier = 2.0;
    else if (stars === 4) multiplier = 1.0;
    else if (stars === 3) multiplier = 0.7;
    else if (stars === 2) multiplier = 0.3;
    else if (stars === 1) multiplier = 0.0;

    earnedXP = Math.round(baseXP * multiplier);
  }

  await createFocusSession({
    duration_seconds: addedSeconds,
    rating: stars,
    xp_earned: earnedXP,
    status: 'completed',
  });

  const current = await fetchUserSettings();
  const todayStr = getTodayDateString(current.day_end_time || '00:00');
  const newToday = (current.focus_seconds_today || 0) + addedSeconds;

  // Update rolling focus log dictionary first
  const updatedWeeklyLog = { ...(current.weekly_focus_log || {}) };
  updatedWeeklyLog[todayStr] = (updatedWeeklyLog[todayStr] || 0) + addedSeconds;
  const newWeek = calculateWeekFocusSeconds(updatedWeeklyLog, todayStr);

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
    weekly_focus_log: updatedWeeklyLog,
    xp: newXP,
    level,
    current_rank: rankInfo.rank,
    current_title: rankInfo.title,
    streak_days: updatedStreak,
    last_study_date: updatedLastDate,
    last_active_date: todayStr,
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

export async function updateLastVocabXPDate(dateStr: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const userId = userData.user.id;
      await supabase.from('user_settings').upsert({
        user_id: userId,
        last_vocab_xp_date: dateStr,
        updated_at: new Date().toISOString(),
      });
      return;
    }
  }

  const db = getLocalDB();
  db.settings.last_vocab_xp_date = dateStr;
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
  const topics = await fetchTopics();
  const childTopicIds = topics.filter((t) => t.subject_id === id).map((t) => t.id);
  const subtopics = await fetchSubtopics();
  const childSubtopics = subtopics.filter((st) => childTopicIds.includes(st.topic_id));
  const completedCount = childSubtopics.filter((st) => st.status === 'completed').length;

  if (completedCount > 0) {
    await awardXPAndSync(-30 * completedCount);
  }

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
  const subtopics = await fetchSubtopics();
  const childSubtopics = subtopics.filter((st) => st.topic_id === id);
  const completedCount = childSubtopics.filter((st) => st.status === 'completed').length;

  if (completedCount > 0) {
    await awardXPAndSync(-30 * completedCount);
  }

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
  const subtopics = await fetchSubtopics();
  const target = subtopics.find((st) => st.id === id);

  if (target && target.status !== 'completed' && status === 'completed') {
    await awardXPAndSync(30); // Subtopic Completed: +30 XP
  } else if (target && target.status === 'completed' && status !== 'completed') {
    await awardXPAndSync(-30); // Unchecking Completed Subtopic: -30 XP (prevents XP farming)
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
  const subtopics = await fetchSubtopics();
  const target = subtopics.find((st) => st.id === id);

  if (target && target.status === 'completed') {
    await awardXPAndSync(-30); // Deduct XP if deleting a completed subtopic
  }

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
    try {
      // 1. Fetch note image URLs associated with this task to clean up storage files
      const { data: notes } = await supabase
        .from('notes')
        .select('image_url')
        .eq('task_id', id);

      if (notes && notes.length > 0) {
        const filePaths: string[] = notes
          .map((n) => {
            const url = n.image_url;
            if (url && url.includes('/scanned-notes/')) {
              return url.split('/scanned-notes/').pop() || '';
            }
            return '';
          })
          .filter(Boolean);

        if (filePaths.length > 0) {
          await supabase.storage.from('scanned-notes').remove(filePaths);
        }
      }
    } catch (err) {
      console.error('Error clearing note images from Supabase storage during task deletion:', err);
    }

    // 2. Delete task from Supabase DB (cascades to notes and overlays table rows)
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

export async function deleteNote(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: note } = await supabase
        .from('notes')
        .select('image_url')
        .eq('id', id)
        .single();

      if (note?.image_url && note.image_url.includes('/scanned-notes/')) {
        const filePath = note.image_url.split('/scanned-notes/').pop();
        if (filePath) {
          await supabase.storage.from('scanned-notes').remove([filePath]);
        }
      }
    } catch (err) {
      console.error('Error clearing note image from Supabase storage during note deletion:', err);
    }

    await supabase.from('notes').delete().eq('id', id);
    return;
  }

  const db = getLocalDB();
  db.notes = db.notes.filter((n) => n.id !== id);
  db.overlays = db.overlays.filter((o) => o.note_id !== id);
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

export function calculateActiveRecallXP(
  totalOverlays: number,
  score: number,
  isRepeatToday: boolean = false
): number {
  if (isRepeatToday || totalOverlays <= 0 || score < 50) return 0;

  let scoreFactor = 0;
  if (score >= 100) scoreFactor = 1.0;
  else if (score >= 80) scoreFactor = 0.7;
  else if (score >= 50) scoreFactor = 0.3;

  let rawXP = 0;
  if (totalOverlays <= 3) {
    rawXP = totalOverlays * 2;
  } else if (totalOverlays <= 10) {
    rawXP = totalOverlays * 3;
  } else {
    rawXP = Math.min(50, totalOverlays * 4);
  }

  return Math.round(rawXP * scoreFactor);
}

export async function logRevisionScore(
  taskId: string,
  score: number,
  totalOverlays: number = 1,
  isRepeatToday: boolean = false
): Promise<number> {
  const earnedXP = calculateActiveRecallXP(totalOverlays, score, isRepeatToday);
  if (earnedXP > 0) {
    await awardXPAndSync(earnedXP);
  }

  if (isSupabaseConfigured && supabase) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id || DEFAULT_USER_ID;
    await supabase
      .from('revision_logs')
      .insert([{ task_id: taskId, score, user_id: userId }]);
    return earnedXP;
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
  return earnedXP;
}
