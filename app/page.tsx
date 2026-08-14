'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import FocusTimerBlock from '@/components/FocusTimerBlock';
import TaskCountersBlock from '@/components/TaskCountersBlock';
import FocusStatsBlock from '@/components/FocusStatsBlock';
import DDayBlock from '@/components/DDayBlock';
import NewStudyBlock from '@/components/NewStudyBlock';
import RevisionBlock from '@/components/RevisionBlock';
import CalendarBlock from '@/components/CalendarBlock';
import NoteUploader from '@/components/NoteUploader';
import UpcomingTaskNotification from '@/components/UpcomingTaskNotification';
import { Task, UserSettings, FocusSession, DailyTaskPlacement, RoutineBlock } from '@/lib/types';
import { fetchTasksWithNoteSummary, fetchUserSettings, fetchFocusSessions, acknowledgeWeeklyRankModal, isSupabaseConfigured, supabase } from '@/lib/supabase';
import { fetchPlacementsForDate, fetchRoutineBlocks } from '@/lib/routines';
import { getTodayDateString } from '@/lib/spacedRepetition';
import { SLOT_MINUTES, slotsForRoutineBlock } from '@/lib/timeGrid';
import { Loader2, Skull, AlertCircle, ZapOff } from 'lucide-react';
import TaskCreatorModal from '@/components/TaskCreatorModal';
import HunterEventModal from '@/components/HunterEventModal';
import { getQuitTauntMessage } from '@/lib/gamification';

const UPCOMING_WINDOW_MINUTES = 60;
const dismissedStorageKey = (dateStr: string) => `studyhub_dismissed_upcoming_${dateStr}`;

export default function DashboardPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeklyModalOpen, setWeeklyModalOpen] = useState(false);

  const [todayPlacements, setTodayPlacements] = useState<DailyTaskPlacement[]>([]);
  const [routineBlocks, setRoutineBlocks] = useState<RoutineBlock[]>([]);
  const [dismissedUpcomingIds, setDismissedUpcomingIds] = useState<Set<string>>(new Set());
  const [nowTick, setNowTick] = useState(() => Date.now());

  const [noteTaskTarget, setNoteTaskTarget] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  // Recheck which task is "coming up" every minute while the dashboard stays open
  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const checkAuthAndLoad = async () => {
    setLoading(true);

    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) {
        router.push('/login');
        return;
      }
    } else {
      if (typeof window !== 'undefined') {
        const storedSession = localStorage.getItem('studyhub_user_session');
        if (!storedSession) {
          router.push('/login');
          return;
        }
      }
    }

    try {
      const [taskData, settingsData, sessionData, routineData] = await Promise.all([
        fetchTasksWithNoteSummary(),
        fetchUserSettings(),
        fetchFocusSessions(),
        fetchRoutineBlocks(),
      ]);
      setTasks(taskData);
      setUserSettings(settingsData);
      setSessions(sessionData);
      setRoutineBlocks(routineData);

      const todayStr = getTodayDateString(settingsData?.day_end_time || '00:00');
      const placementData = await fetchPlacementsForDate(todayStr);
      setTodayPlacements(placementData);

      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(dismissedStorageKey(todayStr));
        setDismissedUpcomingIds(stored ? new Set(JSON.parse(stored)) : new Set());
      }

      if (settingsData?.show_weekly_rank_modal) {
        setWeeklyModalOpen(true);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const todayDateStr = useMemo(
    () => getTodayDateString(userSettings?.day_end_time || '00:00'),
    [userSettings?.day_end_time]
  );

  const upcomingTask = useMemo(() => {
    void nowTick; // recompute every minute
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    let best: { placement: DailyTaskPlacement; minutesUntilStart: number } | null = null;
    for (const placement of todayPlacements) {
      if (!placement.task || dismissedUpcomingIds.has(placement.id)) continue;

      let startSlot = placement.slot_index;
      if (placement.routine_block_id) {
        const block = routineBlocks.find((b) => b.id === placement.routine_block_id);
        if (block) startSlot = slotsForRoutineBlock(block).startSlot;
      }
      const startMinutes = startSlot * SLOT_MINUTES;
      const minutesUntilStart = startMinutes - nowMinutes;

      if (minutesUntilStart < 0 || minutesUntilStart > UPCOMING_WINDOW_MINUTES) continue;
      if (!best || minutesUntilStart < best.minutesUntilStart) {
        best = { placement, minutesUntilStart };
      }
    }
    return best;
  }, [todayPlacements, routineBlocks, dismissedUpcomingIds, nowTick]);

  const dismissUpcomingTask = (placementId: string) => {
    setDismissedUpcomingIds((prev) => {
      const next = new Set(prev).add(placementId);
      if (typeof window !== 'undefined') {
        localStorage.setItem(dismissedStorageKey(todayDateStr), JSON.stringify(Array.from(next)));
      }
      return next;
    });
  };

  const handleCloseWeeklyModal = async () => {
    setWeeklyModalOpen(false);
    try {
      await acknowledgeWeeklyRankModal();
      if (userSettings) {
        setUserSettings({ ...userSettings, show_weekly_rank_modal: false });
      }
    } catch (err) {
      // Non-critical: worst case the modal reappears next visit.
      console.error('Error acknowledging weekly rank modal:', err);
    }
  };

  const reloadSettings = async () => {
    const [updated, sess] = await Promise.all([fetchUserSettings(), fetchFocusSessions()]);
    setUserSettings(updated);
    setSessions(sess);
  };

  // Determine if a recent quit taunt or low XP warning should be displayed on Dashboard
  const recentStop = userSettings?.last_stop_timestamp;
  const isRecentQuitter =
    recentStop &&
    Date.now() - new Date(recentStop).getTime() < 1000 * 60 * 60 * 12; // stopped in last 12 hours

  const isLowXP = userSettings?.xp !== undefined && userSettings.xp < 30;
  const showRankFeatures = userSettings?.show_rank_features !== false;

  return (
    <div className="space-y-8 w-full">
      {/* Upcoming Today-Schedule Task Notification */}
      {upcomingTask && (
        <UpcomingTaskNotification
          placement={upcomingTask.placement}
          minutesUntilStart={upcomingTask.minutesUntilStart}
          onDismiss={() => dismissUpcomingTask(upcomingTask.placement.id)}
        />
      )}

      {/* Dynamic Quitter & Low-XP Dashboard Taunt Banner */}
      {userSettings && showRankFeatures && isRecentQuitter && (
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/40 text-red-200 flex items-center justify-between gap-4 shadow-lg animate-in slide-in-from-top duration-300">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 shrink-0">
              <Skull className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold font-mono uppercase tracking-wide text-red-400">
                Recent Quitter Alert ({userSettings.current_rank})
              </h4>
              <p className="text-xs text-red-200 mt-0.5 italic">
                &ldquo;{getQuitTauntMessage(userSettings.current_rank)}&rdquo;
              </p>
            </div>
          </div>
        </div>
      )}

      {userSettings && showRankFeatures && !isRecentQuitter && isLowXP && (
        <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 flex items-center space-x-3 shadow-sm">
          <ZapOff className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-xs">
            <strong>Pathetic XP Progress:</strong> You have barely earned any XP today. Complete focus sessions and active recall quizzes to climb out of {userSettings.current_rank}!
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          <p className="text-xs">Loading study tasks...</p>
        </div>
      ) : (
        <>
          {/* Header Row with Aligned Card Heights (Rank Hub features hideable via user settings) */}
          <div
            className={`grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch ${
              showRankFeatures ? 'xl:grid-cols-4' : 'xl:grid-cols-2'
            }`}
          >
            {showRankFeatures && <FocusTimerBlock onSessionComplete={reloadSettings} tasks={tasks} />}
            <TaskCountersBlock tasks={tasks} dayEndTime={userSettings?.day_end_time} />
            {showRankFeatures && <FocusStatsBlock settings={userSettings} sessions={sessions} />}
            <DDayBlock settings={userSettings} onSettingsUpdate={reloadSettings} />
          </div>

          {/* Side-by-Side Fixed-Height Blocks Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            <NewStudyBlock
              tasks={tasks}
              onUploadNote={(task) => setNoteTaskTarget(task)}
              onTaskCompleted={checkAuthAndLoad}
              dayEndTime={userSettings?.day_end_time}
            />

            <RevisionBlock
              tasks={tasks}
              onUploadNote={(task) => setNoteTaskTarget(task)}
              onTaskCompleted={checkAuthAndLoad}
              dayEndTime={userSettings?.day_end_time}
            />
          </div>

          {/* Enlarged 2-Week Calendar Block */}
          <CalendarBlock tasks={tasks} dayEndTime={userSettings?.day_end_time} />
        </>
      )}

      {/* Note Uploader Modal */}
      {noteTaskTarget &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4 !m-0">
            <NoteUploader
              taskId={noteTaskTarget.id}
              taskTitle={noteTaskTarget.title}
              onClose={() => setNoteTaskTarget(null)}
            />
          </div>,
          document.body
        )}

      {/* Task Creator Modal */}
      <TaskCreatorModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onTaskCreated={() => {
          setIsTaskModalOpen(false);
          checkAuthAndLoad();
        }}
      />

      {/* Weekly Rank Transition Announcement Modal */}
      {userSettings && showRankFeatures && (
        <HunterEventModal
          isOpen={weeklyModalOpen}
          onClose={handleCloseWeeklyModal}
          eventType="weekly-transition"
          oldGlobalPosition={userSettings.last_week_rank || 500}
          newGlobalPosition={userSettings.official_weekly_rank || 500}
        />
      )}
    </div>
  );
}
