'use client';

import { useState, useEffect } from 'react';
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
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-sm">স্টাডি মোড লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
        <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
        <h2 className="text-lg font-bold text-slate-100">টাস্ক পাওয়া যায়নি</h2>
        <Link
          href="/"
          className="inline-flex items-center space-x-2 text-xs font-semibold bg-slate-800 text-slate-200 px-4 py-2 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>ড্যাশবোর্ডে ফিরুন</span>
        </Link>
      </div>
    );
  }

  const note = task.notes && task.notes.length > 0 ? task.notes[0] : null;
  const overlays = note?.overlays || [];

  if (!note) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-6">
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <FileImage className="w-12 h-12 text-blue-400 mx-auto" />
          <h2 className="text-lg font-bold text-slate-100">{task.title}</h2>
          <p className="text-xs text-slate-400">
            এই টাস্কের জন্য এখনো কোন স্ক্যানকৃত নোট আপলোড করা হয়নি।
          </p>
          <button
            onClick={() => setShowUploader(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow-md"
          >
            নোট ছবি আপলোড করুন
          </button>
        </div>

        {showUploader && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <NoteUploader
              taskId={task.id}
              taskTitle={task.title}
              onClose={() => setShowUploader(false)}
              onSuccess={() => {
                setShowUploader(false);
                loadTaskData();
              }}
            />
          </div>
        )}
      </div>
    );
  }

  if (overlays.length === 0) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-6">
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <FileImage className="w-12 h-12 text-indigo-400 mx-auto" />
          <h2 className="text-lg font-bold text-slate-100">{task.title}</h2>
          <p className="text-xs text-slate-400">
            নোট আপলোড করা হয়েছে, কিন্তু কোন অক্লুশন বক্স (Overlays) আঁকা হয়নি।
          </p>
          <Link
            href={`/notes/${note.id}/occlude`}
            className="inline-block px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-slate-950 font-bold text-xs rounded-xl shadow-md"
          >
            অক্লুশন আঁকতে ক্লিক করুন
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
