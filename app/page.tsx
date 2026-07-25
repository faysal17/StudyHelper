'use client';

import { useState, useEffect } from 'react';
import FocusTimerBlock from '@/components/FocusTimerBlock';
import TaskCountersBlock from '@/components/TaskCountersBlock';
import FocusStatsBlock from '@/components/FocusStatsBlock';
import DDayBlock from '@/components/DDayBlock';
import NewStudyBlock from '@/components/NewStudyBlock';
import RevisionBlock from '@/components/RevisionBlock';
import CalendarBlock from '@/components/CalendarBlock';
import NoteUploader from '@/components/NoteUploader';
import { Task } from '@/lib/types';
import { fetchTasks } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import TaskCreatorModal from '@/components/TaskCreatorModal';

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [noteTaskTarget, setNoteTaskTarget] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await fetchTasks();
      setTasks(data);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 w-full">
      {/* 4-Block Header Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Block 1: Focus Study Timer */}
        <FocusTimerBlock />

        {/* Block 2: Study & Revision Counters */}
        <TaskCountersBlock tasks={tasks} />

        {/* Block 3: Focus Hours & Rank / Title Placeholders */}
        <FocusStatsBlock />

        {/* Block 4: D-Day Countdown */}
        <DDayBlock />
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
            {/* New Study Block (Fixed Height + Internal Scrollbar) */}
            <NewStudyBlock
              tasks={tasks}
              onUploadNote={(task) => setNoteTaskTarget(task)}
            />

            {/* Revision Block (Fixed Height + Internal Scrollbar) */}
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
          loadTasks();
        }}
      />
    </div>
  );
}
