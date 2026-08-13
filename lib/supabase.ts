import { createClient } from '@supabase/supabase-js';
import { Subject, Topic, Subtopic, Task, Note, Overlay, RevisionLog, UserSettings, SubtopicStatus, FocusSession } from './types';
import { calculateLevelAndProgress, updateStreakOnActivity, calculateGlobalHunterRank } from './gamification';
import { getTodayDateString, getMondayOfWeek, getLogicalDateString, evaluateSpacedRepetition } from './spacedRepetition';
import { calculateMomentum } from './momentum';

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

const DEFAULT_USER_ID = 'user-owner';

const DEFAULT_QUOTES = [
  'Focus on being productive instead of busy.',
  'Discipline is choosing between what you want now and what you want most.',
  'Small daily improvements over time lead to stunning results.',
  'Success is the sum of small efforts, repeated day in and day out.',
  'The secret of getting ahead is getting started.',
];

const DEFAULT_WEEKEND_DAYS = ['Saturday', 'Sunday'];

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
  official_weekly_rank: 500,
  last_week_rank: 500,
  last_week_start_date: getMondayOfWeek(getTodayDateString('00:00')),
  show_weekly_rank_modal: false,
  focus_seconds_today: 0,
  focus_seconds_week: 0,
  current_rank: 'E-Rank',
  current_title: 'Procrastinating Worm',
  last_vocab_xp_date: null,
  show_rank_features: true,
};

async function getCurrentUserId(): Promise<string> {
  if (isSupabaseConfigured && supabase) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user?.id) {
      return userData.user.id;
    }
  }
  return DEFAULT_USER_ID;
}

// Auth header for the /api/upload and /api/storage/delete route handlers,
// which verify the caller's Supabase session server-side rather than
// trusting an unauthenticated request.
export async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!isSupabaseConfigured || !supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
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

export function rebuildWeeklyFocusLog(sessions: FocusSession[], dayEndTime: string = '00:00'): Record<string, number> {
  const log: Record<string, number> = {};
  for (const s of sessions) {
    if (s.status === 'completed' || (s.duration_seconds || 0) > 0) {
      const dateStr = getLogicalDateString(s.created_at, dayEndTime);
      log[dateStr] = (log[dateStr] || 0) + (s.duration_seconds || 0);
    }
  }
  return log;
}

export function sanitizeUserSettings(rawSettings: UserSettings, sessions?: FocusSession[]): UserSettings & { _needsPersist?: boolean } {
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

  // 1. Daily Rollover & Focus Seconds Today Sync
  if (lastActive !== todayStr) {
    settings.last_active_date = todayStr;
    settings.focus_seconds_today = weeklyLog[todayStr] || 0;
    settings.stops_today = 0;
    needsPersist = true;
  } else {
    const logTodaySeconds = weeklyLog[todayStr] || 0;
    if (settings.focus_seconds_today !== logTodaySeconds) {
      settings.focus_seconds_today = logTodaySeconds;
      needsPersist = true;
    }
  }

  // 2. Weekly Rollover & Official Weekly Rank Lock
  const lastActiveMon = lastActive ? getMondayOfWeek(lastActive) : getMondayOfWeek(todayStr);
  const currentMon = getMondayOfWeek(todayStr);
  const stats = calculateLevelAndProgress(settings.xp || 0);

  if (lastActiveMon !== currentMon || settings.last_week_start_date !== currentMon || !settings.official_weekly_rank) {
    if (settings.last_week_start_date && settings.last_week_start_date !== currentMon) {
      settings.last_week_rank = settings.official_weekly_rank || 500;
      settings.show_weekly_rank_modal = true;
    } else if (!settings.last_week_rank) {
      settings.last_week_rank = 500;
    }

    settings.stops_this_week = 0;
    settings.last_week_start_date = currentMon;
    const momentum = calculateMomentum(settings, sessions);
    settings.official_weekly_rank = calculateGlobalHunterRank(stats.level, momentum.score);
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

  // 5. Level & Rank title calculation
  settings.level = stats.level;
  settings.current_rank = stats.rankInfo.rank;
  settings.current_title = stats.rankInfo.title;

  return {
    ...settings,
    _needsPersist: needsPersist,
  };
}

export async function fetchUserSettings(): Promise<UserSettings> {
  const userId = await getCurrentUserId();
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!error && data) {
      const { data: sessionData } = await supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', userId);

      if (sessionData && sessionData.length > 0) {
        const syncedLog = rebuildWeeklyFocusLog(sessionData, data.day_end_time || '00:00');
        data.weekly_focus_log = syncedLog;
      }

      const sanitized = sanitizeUserSettings(data, sessionData || []);
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
      last_active_date: getTodayDateString(DEFAULT_USER_SETTINGS.day_end_time || '00:00'),
    };

    await supabase.from('user_settings').upsert(defaultSettings);
    return defaultSettings;
  }

  return { ...DEFAULT_USER_SETTINGS, user_id: userId };
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
    official_weekly_rank: current.official_weekly_rank || 500,
    last_week_start_date: current.last_week_start_date || getMondayOfWeek(updatedLastDate),
    last_week_rank: current.last_week_rank || 500,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    await supabase.from('user_settings').upsert({ ...updated, user_id: current.user_id });
  }

  return { ...current, ...updated };
}

export async function updateWeekendDaysConfig(weekendDays: string[]): Promise<void> {
  const userId = await getCurrentUserId();
  if (isSupabaseConfigured && supabase) {
    await supabase.from('user_settings').upsert({
      user_id: userId,
      weekend_days: weekendDays,
      updated_at: new Date().toISOString(),
    });
  }
}

export async function updateStudyTargetsConfig(weekdayMins: number, weekendMins: number): Promise<void> {
  const userId = await getCurrentUserId();
  if (isSupabaseConfigured && supabase) {
    await supabase.from('user_settings').upsert({
      user_id: userId,
      weekday_target_minutes: weekdayMins,
      weekend_target_minutes: weekendMins,
      updated_at: new Date().toISOString(),
    });
  }
}

// FOCUS SESSIONS API
export async function fetchFocusSessions(): Promise<FocusSession[]> {
  const userId = await getCurrentUserId();
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) return data;
  }
  return [];
}

export async function createFocusSession(sessionData: {
  duration_seconds: number;
  rating?: number;
  xp_earned?: number;
  status?: 'completed' | 'abandoned';
  task_id?: string | null;
}): Promise<FocusSession> {
  const userId = await getCurrentUserId();
  const newSession: FocusSession = {
    id: `session-${Date.now()}`,
    user_id: userId,
    duration_seconds: sessionData.duration_seconds,
    rating: sessionData.rating ?? 4,
    xp_earned: sessionData.xp_earned ?? 0,
    status: sessionData.status ?? 'completed',
    task_id: sessionData.task_id || null,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('focus_sessions')
      .insert([{
        user_id: userId,
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
    official_weekly_rank: current.official_weekly_rank || 500,
    last_week_start_date: current.last_week_start_date || getMondayOfWeek(getTodayDateString(current.day_end_time || '00:00')),
    last_week_rank: current.last_week_rank || 500,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    await supabase.from('user_settings').upsert({ ...updated, user_id: current.user_id });
  }

  const updatedSettings = { ...current, ...updated };
  return { updatedSettings, isPenaltyApplied: penaltyAmount > 0, penaltyAmount };
}

// COMPLETED FOCUS SESSION WITH SELF-RATING SCORE & 7-DAY LOGGING
export async function recordRatedFocusSession(minutes: number, stars: number): Promise<UserSettings> {
  const addedSeconds = Math.round(minutes * 60);

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

  const updatedWeeklyLog = { ...(current.weekly_focus_log || {}) };
  updatedWeeklyLog[todayStr] = (updatedWeeklyLog[todayStr] || 0) + addedSeconds;
  const newToday = updatedWeeklyLog[todayStr];
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
    official_weekly_rank: current.official_weekly_rank || 500,
    last_week_start_date: current.last_week_start_date || getMondayOfWeek(todayStr),
    last_week_rank: current.last_week_rank || 500,
    pause_start_timestamp: null,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    await supabase.from('user_settings').upsert({ ...updated, user_id: current.user_id });
  }

  return { ...current, ...updated };
}

export async function updateDDayConfig(targetDate: string, targetTitle: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (isSupabaseConfigured && supabase) {
    await supabase.from('user_settings').upsert({
      user_id: userId,
      target_date: targetDate,
      target_title: targetTitle,
      updated_at: new Date().toISOString(),
    });
  }
}

export async function acknowledgeWeeklyRankModal(): Promise<void> {
  const userId = await getCurrentUserId();
  if (isSupabaseConfigured && supabase) {
    await supabase.from('user_settings').upsert({
      user_id: userId,
      show_weekly_rank_modal: false,
      updated_at: new Date().toISOString(),
    });
  }
}

export async function updateDayEndTimeConfig(dayEndTime: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (isSupabaseConfigured && supabase) {
    await supabase.from('user_settings').upsert({
      user_id: userId,
      day_end_time: dayEndTime,
      updated_at: new Date().toISOString(),
    });
  }
}

export async function updateQuotesConfig(quotes: string[]): Promise<void> {
  const userId = await getCurrentUserId();
  if (isSupabaseConfigured && supabase) {
    await supabase.from('user_settings').upsert({
      user_id: userId,
      quotes,
      updated_at: new Date().toISOString(),
    });
  }
}

export async function updateShowRankFeaturesConfig(showRankFeatures: boolean): Promise<void> {
  const userId = await getCurrentUserId();
  if (isSupabaseConfigured && supabase) {
    await supabase.from('user_settings').upsert({
      user_id: userId,
      show_rank_features: showRankFeatures,
      updated_at: new Date().toISOString(),
    });
  }
}

export async function updateLastVocabXPDate(dateStr: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (isSupabaseConfigured && supabase) {
    await supabase.from('user_settings').upsert({
      user_id: userId,
      last_vocab_xp_date: dateStr,
      updated_at: new Date().toISOString(),
    });
  }
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
  return [];
}

export async function fetchTopics(): Promise<Topic[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('topics')
      .select('*, subject:subjects(*)')
      .order('name');
    if (!error && data) return data;
  }
  return [];
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
  return [];
}

export async function createSubject(name: string): Promise<Subject> {
  if (isSupabaseConfigured && supabase) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('subjects')
      .insert([{ name, user_id: userId }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  throw new Error('Supabase database is not configured.');
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
  }
}

export async function createTopic(name: string, subjectId: string): Promise<Topic> {
  if (isSupabaseConfigured && supabase) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('topics')
      .insert([{ name, subject_id: subjectId, user_id: userId }])
      .select('*, subject:subjects(*)')
      .single();
    if (error) throw error;
    return data;
  }
  throw new Error('Supabase database is not configured.');
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
  }
}

export async function createSubtopic(name: string, topicId: string): Promise<Subtopic> {
  if (isSupabaseConfigured && supabase) {
    const userId = await getCurrentUserId();
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
  throw new Error('Supabase database is not configured.');
}

export async function updateSubtopicStatus(id: string, status: SubtopicStatus): Promise<void> {
  const subtopics = await fetchSubtopics();
  const target = subtopics.find((st) => st.id === id);

  if (target && target.status !== 'completed' && status === 'completed') {
    await awardXPAndSync(30);
  } else if (target && target.status === 'completed' && status !== 'completed') {
    await awardXPAndSync(-30);
  }

  if (isSupabaseConfigured && supabase) {
    await supabase.from('subtopics').update({ status }).eq('id', id);
  }
}

export async function deleteSubtopic(id: string): Promise<void> {
  const subtopics = await fetchSubtopics();
  const target = subtopics.find((st) => st.id === id);

  if (target && target.status === 'completed') {
    await awardXPAndSync(-30);
  }

  if (isSupabaseConfigured && supabase) {
    await supabase.from('subtopics').delete().eq('id', id);
  }
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
  return [];
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
  return null;
}

export async function createTask(taskData: {
  title: string;
  topic_id: string;
  subtopic_id?: string | null;
  priority: number;
  next_revision_date: string;
}): Promise<Task> {
  if (isSupabaseConfigured && supabase) {
    const userId = await getCurrentUserId();
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
  throw new Error('Supabase database is not configured.');
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase.from('tasks').update(updates).eq('id', id);
  }
}

// Manually advance a task's spaced-repetition schedule without going through
// an Active Recall (image occlusion) review — used when no note/overlays
// exist yet, or the user simply wants to mark the task done for today.
export async function completeTaskManually(task: Task, dayEndTime: string = '00:00'): Promise<void> {
  const srResult = evaluateSpacedRepetition(task, 0, 0, dayEndTime);
  if (srResult.isLockedToday) return;

  await updateTask(task.id, {
    last_reviewed_date: srResult.updatedLastReviewedDate,
    current_interval: srResult.newInterval,
    ease_factor: srResult.newEaseFactor,
    status_color: srResult.newStatusColor,
    next_revision_date: srResult.newNextRevisionDate,
  });
}

const R2_PUBLIC_URL = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '').replace(/\/$/, '');

async function deleteNoteImagesFromR2(urls: string[]): Promise<void> {
  const r2Urls = urls.filter((url) => R2_PUBLIC_URL && url?.startsWith(`${R2_PUBLIC_URL}/`));
  if (r2Urls.length === 0) return;

  try {
    await fetch('/api/storage/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
      body: JSON.stringify({ urls: r2Urls }),
    });
  } catch (err) {
    console.error('Error clearing note images from R2 storage:', err);
  }
}

export async function deleteTask(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: notes } = await supabase
        .from('notes')
        .select('image_url')
        .eq('task_id', id);

      if (notes && notes.length > 0) {
        await deleteNoteImagesFromR2(notes.map((n) => n.image_url).filter(Boolean));
      }
    } catch (err) {
      console.error('Error clearing note images during task deletion:', err);
    }

    await supabase.from('tasks').delete().eq('id', id);
  }
}

export async function deleteNote(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: note } = await supabase
        .from('notes')
        .select('image_url')
        .eq('id', id)
        .single();

      if (note?.image_url) {
        await deleteNoteImagesFromR2([note.image_url]);
      }
    } catch (err) {
      console.error('Error clearing note image during note deletion:', err);
    }

    await supabase.from('notes').delete().eq('id', id);
  }
}

export async function uploadNoteImage(file: File): Promise<string> {
  const presignRes = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
    body: JSON.stringify({ contentType: file.type || 'image/webp', fileSize: file.size }),
  });
  if (!presignRes.ok) {
    const body = await presignRes.json().catch(() => null);
    throw new Error(body?.error || `Failed to get an R2 upload URL (status ${presignRes.status}).`);
  }
  const { uploadUrl, publicUrl } = await presignRes.json();
  if (!uploadUrl || !publicUrl) throw new Error('R2 did not return an upload URL.');

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'image/webp' },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error(`Upload to R2 failed (status ${putRes.status}).`);
  }

  return publicUrl;
}

export async function createNote(taskId: string, imageUrl: string): Promise<Note> {
  if (isSupabaseConfigured && supabase) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('notes')
      .insert([{ task_id: taskId, image_url: imageUrl, user_id: userId }])
      .select()
      .single();

    if (error) throw error;
    return { ...data, overlays: [] };
  }
  throw new Error('Supabase database is not configured.');
}

export async function saveOverlays(
  noteId: string,
  overlays: { x_coord: number; y_coord: number; width: number; height: number; label?: string | null }[]
): Promise<Overlay[]> {
  if (isSupabaseConfigured && supabase) {
    const userId = await getCurrentUserId();

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
  throw new Error('Supabase database is not configured.');
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
    const userId = await getCurrentUserId();
    await supabase
      .from('revision_logs')
      .insert([{ task_id: taskId, score, user_id: userId }]);
  }

  return earnedXP;
}
