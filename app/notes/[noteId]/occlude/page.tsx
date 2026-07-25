'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Note, Task } from '@/lib/types';
import { fetchTasks } from '@/lib/supabase';
import ImageOcclusionCreator from '@/components/ImageOcclusionCreator';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function OccludeNotePage() {
  const params = useParams();
  const noteId = params.noteId as string;

  const [note, setNote] = useState<Note | null>(null);
  const [taskId, setTaskId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (noteId) {
      loadNoteDetails();
    }
  }, [noteId]);

  const loadNoteDetails = async () => {
    setLoading(true);
    try {
      const allTasks = await fetchTasks();
      for (const t of allTasks) {
        if (t.notes) {
          const match = t.notes.find((n) => n.id === noteId);
          if (match) {
            setNote(match);
            setTaskId(t.id);
            break;
          }
        }
      }
    } catch (err) {
      console.error('Error fetching note for occlusion:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <p className="text-sm">নোট ও ওভারলে এডিটর লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-4">
        <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
        <h2 className="text-lg font-bold text-slate-100">নোট টি পাওয়া যায়নি</h2>
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

  return (
    <ImageOcclusionCreator
      noteId={note.id}
      taskId={taskId}
      imageUrl={note.image_url}
      existingOverlays={note.overlays || []}
    />
  );
}
