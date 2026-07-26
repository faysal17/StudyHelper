'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FocusTimerBlock from '@/components/FocusTimerBlock';
import TaskCountersBlock from '@/components/TaskCountersBlock';
import FocusStatsBlock from '@/components/FocusStatsBlock';
import DDayBlock from '@/components/DDayBlock';
import NewStudyBlock from '@/components/NewStudyBlock';
import RevisionBlock from '@/components/RevisionBlock';
import CalendarBlock from '@/components/CalendarBlock';
import NoteUploader from '@/components/NoteUploader';
import { Task, UserSettings } from '@/lib/types';
import { fetchTasks, fetchUserSettings, isSupabaseConfigured, supabase } from '@/lib/supabase';
import { Loader2, Skull, AlertCircle, ZapOff } from 'lucide-react';
import TaskCreatorModal from '@/components/TaskCreatorModal';
import { getQuitTauntMessage } from '@/lib/gamification';

export default function DashboardPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const [noteTaskTarget, setNoteTaskTarget] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  useEffect(() => {
    checkAuthAndLoad();
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
      const [taskData, settingsData] = await Promise.all([
        fetchTasks(),
        fetchUserSettings(),
      ]);
      setTasks(taskData);
      setUserSettings(settingsData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const reloadSettings = async () => {
    const updated = await fetchUserSettings();
    setUserSettings(updated);
  };

  // Determine if a recent quit taunt or low XP warning should be displayed on Dashboard
  const recentStop = userSettings?.last_stop_timestamp;
  const isRecentQuitter =
    recentStop &&
    Date.now() - new Date(recentStop).getTime() < 1000 * 60 * 60 * 12; // stopped in last 12 hours

  const isLowXP = userSettings?.xp !== undefined && userSettings.xp < 30;

  return (
    <div className="space-y-8 w-full">
      {/* Dynamic Quitter & Low-XP Dashboard Taunt Banner */}
      {userSettings && isRecentQuitter && (
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

      {userSettings && !isRecentQuitter && isLowXP && (
        <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 flex items-center space-x-3 shadow-sm">
          <ZapOff className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-xs">
            <strong>Pathetic XP Progress:</strong> You have barely earned any XP today. Complete focus sessions and active recall quizzes to climb out of {userSettings.current_rank}!
          </p>
        </div>
      )}

      {/* 4-Block Header Row with Aligned Card Heights */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
        <FocusTimerBlock onSessionComplete={reloadSettings} tasks={tasks} />
        <TaskCountersBlock tasks={tasks} />
        <FocusStatsBlock settings={userSettings} />
        <DDayBlock settings={userSettings} onSettingsUpdate={reloadSettings} />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          <p className="text-xs">Loading study tasks...</p>
        </div>
      ) : (
        <>
          {/* Side-by-Side Fixed-Height Blocks Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            <NewStudyBlock
              tasks={tasks}
              onUploadNote={(task) => setNoteTaskTarget(task)}
            />

            <RevisionBlock
              tasks={tasks}
              onUploadNote={(task) => setNoteTaskTarget(task)}
            />
          </div>

          {/* Enlarged 2-Week Calendar Block */}
          <CalendarBlock tasks={tasks} />
        </>
      )}

      {/* Note Uploader Modal */}
      {noteTaskTarget && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <NoteUploader
            taskId={noteTaskTarget.id}
            taskTitle={noteTaskTarget.title}
            onClose={() => setNoteTaskTarget(null)}
          />
        </div>
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
    </div>
  );
}
