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
import { Loader2 } from 'lucide-react';
import TaskCreatorModal from '@/components/TaskCreatorModal';

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

    // Auth gate check
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) {
        router.push('/login');
        return;
      }
    } else {
      // Local check
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

  return (
    <div className="space-y-8 w-full">
      {/* 4-Block Header Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Block 1: Focus Study Timer */}
        <FocusTimerBlock onSessionComplete={reloadSettings} />

        {/* Block 2: Study & Revision Counters */}
        <TaskCountersBlock tasks={tasks} />

        {/* Block 3: Real Focus Hours & Rank/Title */}
        <FocusStatsBlock settings={userSettings} />

        {/* Block 4: User-Specific Online D-Day Counter */}
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
