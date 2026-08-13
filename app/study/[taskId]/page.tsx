'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'next/navigation';
import { Task } from '@/lib/types';
import { fetchTaskById } from '@/lib/supabase';
import ImageOcclusionViewer from '@/components/ImageOcclusionViewer';
import NoteUploader from '@/components/NoteUploader';
import { Loader2, AlertCircle, FileImage, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function StudyTaskPage() {
  const params = useParams();
  const taskId = params.taskId as string;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);

  useEffect(() => {
    if (taskId) {
      loadTaskData();
    }
  }, [taskId]);

  const loadTaskData = async () => {
    setLoading(true);
    try {
      const data = await fetchTaskById(taskId);
      setTask(data);
    } catch (err) {
      console.error('Error loading task for study mode:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500 space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        <p className="text-xs">Loading study session...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-16 bg-zinc-950/50 rounded-xl border border-zinc-800 space-y-4">
        <AlertCircle className="w-8 h-8 text-zinc-500 mx-auto" />
        <h2 className="text-sm font-semibold text-zinc-100">Task Not Found</h2>
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-xs font-semibold bg-zinc-800 text-zinc-200 px-4 py-2 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    );
  }

  const note = task.notes && task.notes.length > 0 ? task.notes[0] : null;
  const overlays = note?.overlays || [];

  if (!note) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-6">
        <div className="glass-panel p-6 rounded-xl border border-zinc-800 space-y-4">
          <FileImage className="w-10 h-10 text-zinc-400 mx-auto" />
          <h2 className="text-base font-semibold text-zinc-100">{task.title}</h2>
          <p className="text-xs text-zinc-400">
            No scanned handwritten note image has been uploaded for this task yet.
          </p>
          <button
            onClick={() => setShowUploader(true)}
            className="px-4 py-2 bg-zinc-100 text-zinc-950 font-semibold text-xs rounded-lg shadow-sm hover:bg-zinc-200 transition-all"
          >
            Upload Handwritten Note
          </button>
        </div>

        {showUploader &&
          createPortal(
            <div className="fixed inset-0 z-[9999] bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4 !m-0">
              <NoteUploader
                taskId={task.id}
                taskTitle={task.title}
                onClose={() => setShowUploader(false)}
                onSuccess={() => {
                  setShowUploader(false);
                  loadTaskData();
                }}
              />
            </div>,
            document.body
          )}
      </div>
    );
  }

  if (overlays.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-6">
        <div className="glass-panel p-6 rounded-xl border border-zinc-800 space-y-4">
          <FileImage className="w-10 h-10 text-zinc-400 mx-auto" />
          <h2 className="text-base font-semibold text-zinc-100">{task.title}</h2>
          <p className="text-xs text-zinc-400">
            Note uploaded, but no occlusion overlays have been drawn.
          </p>
          <Link
            href={`/notes/${note.id}/occlude`}
            className="inline-block px-4 py-2 bg-zinc-100 text-zinc-950 font-semibold text-xs rounded-lg shadow-sm hover:bg-zinc-200 transition-all"
          >
            Draw Occlusion Boxes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ImageOcclusionViewer
      task={task}
      note={note}
      overlays={overlays}
    />
  );
}
