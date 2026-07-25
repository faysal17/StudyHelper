'use client';

import { useState, useEffect } from 'react';
import DDayBanner from '@/components/DDayBanner';
import NewStudyBlock from '@/components/NewStudyBlock';
import RevisionBlock from '@/components/RevisionBlock';
import CalendarBlock from '@/components/CalendarBlock';
import NoteUploader from '@/components/NoteUploader';
import { Task } from '@/lib/types';
import { fetchTasks } from '@/lib/supabase';
import { Loader2, Plus, Sparkles, BookOpen, Layers } from 'lucide-react';
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
    <div className="space-y-8">
      {/* Top Banner: Target Exam D-Day Counter */}
      <DDayBanner />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <p className="text-sm font-medium">BCS StudyHelper লোড হচ্ছে...</p>
        </div>
      ) : (
        <>
          {/* Blocks Grid */}
          <div className="grid grid-cols-1 gap-8">
            {/* New Study Block (Blue) */}
            <NewStudyBlock
              tasks={tasks}
              onUploadNote={(task) => setNoteTaskTarget(task)}
            />

            {/* Revision Block (Red / Yellow / Green) */}
            <RevisionBlock
              tasks={tasks}
              onUploadNote={(task) => setNoteTaskTarget(task)}
            />

            {/* 3-Week Forward Calendar Block */}
            <CalendarBlock tasks={tasks} />
          </div>
        </>
      )}

      {/* Note Uploader Modal */}
      {noteTaskTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
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
