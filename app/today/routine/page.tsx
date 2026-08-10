'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { fetchRoutineBlocks, deleteRoutineBlock } from '@/lib/routines';
import { RoutineBlock } from '@/lib/types';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Settings as SettingsIcon } from 'lucide-react';
import RoutineBlockFormModal from '@/components/today/RoutineBlockFormModal';
import ConfirmModal from '@/components/ConfirmModal';

export default function RoutineSettingsPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [routines, setRoutines] = useState<RoutineBlock[]>([]);
  const [editingBlock, setEditingBlock] = useState<RoutineBlock | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<RoutineBlock | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.auth.getSession();
        if (!data?.session) {
          router.push('/login');
          return;
        }
      } else if (typeof window !== 'undefined') {
        const storedSession = localStorage.getItem('studyhub_user_session');
        if (!storedSession) {
          router.push('/login');
          return;
        }
      }
      setCheckingAuth(false);
    };
    checkSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!checkingAuth) loadRoutines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkingAuth]);

  const loadRoutines = async () => {
    setLoading(true);
    try {
      const data = await fetchRoutineBlocks();
      setRoutines(data);
    } catch (err) {
      console.error('Error loading routine blocks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRoutineBlock(deleteTarget.id);
      setRoutines((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    } catch (err) {
      console.error('Error deleting routine block:', err);
    } finally {
      setDeleteTarget(null);
    }
  };

  if (checkingAuth || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500 space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        <p className="text-xs">Loading routine settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/today"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1 mb-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Today</span>
          </Link>
          <h1 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-zinc-400" />
            <span>Routine Settings</span>
          </h1>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-xl border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-400 leading-relaxed max-w-md">
            Define recurring blocks (e.g. &quot;Physics study&quot;, &quot;Gym&quot;) that automatically appear on
            your Today timeline for the weekdays you choose, until an optional end date.
          </p>
          <button
            onClick={() => setEditingBlock(null)}
            className="shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 text-zinc-950 hover:bg-zinc-200 transition-all flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Routine Block</span>
          </button>
        </div>

        {routines.length === 0 ? (
          <div className="text-center py-10 bg-zinc-950/40 rounded-xl border border-zinc-800">
            <p className="text-xs text-zinc-500">No routine blocks yet. Add one to get started!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {routines.map((block) => (
              <div
                key={block.id}
                className="glass-card p-3 rounded-lg border border-zinc-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: block.color }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-100 truncate">{block.label}</p>
                    <p className="text-[11px] text-zinc-500 font-mono truncate">
                      {block.weekdays.map((d) => d.slice(0, 3)).join(', ')} &bull; {block.start_time}-{block.end_time}
                      {block.end_date ? ` · ends ${block.end_date}` : ' · no end date'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setEditingBlock(block)}
                    className="p-1.5 text-zinc-500 hover:text-zinc-200 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(block)}
                    className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <RoutineBlockFormModal
        isOpen={editingBlock !== undefined}
        initial={editingBlock}
        onClose={() => setEditingBlock(undefined)}
        onSaved={loadRoutines}
      />

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete routine block?"
        message={`"${deleteTarget?.label}" will no longer appear on your Today timeline.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
