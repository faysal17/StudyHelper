'use client';

import { useState, useEffect } from 'react';
import { Task, Subject } from '@/lib/types';
import { fetchTasks, fetchSubjects, deleteTask } from '@/lib/supabase';
import {
  CheckSquare,
  Search,
  PlusCircle,
  Eye,
  Layers,
  FileImage,
  Trash2,
  Filter,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import TaskCreatorModal from '@/components/TaskCreatorModal';
import NoteUploader from '@/components/NoteUploader';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [noteTaskTarget, setNoteTaskTarget] = useState<Task | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tData, sData] = await Promise.all([fetchTasks(), fetchSubjects()]);
      setTasks(tData);
      setSubjects(sData);
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('আপনি কি নিশ্চিত যে এই টাস্কটি মুছে ফেলতে চান?')) {
      await deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.topic?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject?.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSubject =
      selectedSubject === 'all' || t.subject?.id === selectedSubject;

    const matchesPriority =
      selectedPriority === 'all' || String(t.priority) === selectedPriority;

    return matchesSearch && matchesSubject && matchesPriority;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-emerald-400" />
            <span>টাস্ক ও নোট লাইব্রেরি (Task Library)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            আপনার সকল রিভিশন টাস্ক এবং হ্যান্ডরাইটিং নোট এক নজরে দেখুন
          </p>
        </div>

        <button
          onClick={() => setIsTaskModalOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 flex items-center space-x-2"
        >
          <PlusCircle className="w-4 h-4" />
          <span>নতুন টাস্ক যোগ করুন</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="খুঁজুন (বাংলা বা ইংরেজি শিরোনাম)..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Subject Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">সকল বিষয় (All Subjects)</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Priority Filter */}
        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
        >
          <option value="all">সকল প্রায়োরিটি (All Priority)</option>
          <option value="1">Priority 1 (High)</option>
          <option value="2">Priority 2 (Normal)</option>
          <option value="3">Priority 3 (Low)</option>
        </select>
      </div>

      {/* Task Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <p className="text-sm">টাস্ক লোড হচ্ছে...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800">
          <p className="text-sm text-slate-400">কোন টাস্ক পাওয়া যায়নি।</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((t) => {
            const hasNote = t.notes && t.notes.length > 0;
            const firstNote = hasNote ? t.notes![0] : null;
            const overlayCount = firstNote?.overlays?.length || 0;

            return (
              <div
                key={t.id}
                className="glass-card p-4 rounded-xl border border-slate-800 hover:border-slate-600 flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md truncate max-w-[180px]">
                      {t.subject?.name || 'বিষয়'} &bull; {t.topic?.name || 'টপিক'}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                        t.status_color === 'red'
                          ? 'bg-red-500/20 text-red-400 border-red-500/30'
                          : t.status_color === 'yellow'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : t.status_color === 'green'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      }`}
                    >
                      P{t.priority} &bull; {t.status_color}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-100 line-clamp-2 mb-2">
                    {t.title}
                  </h3>

                  <div className="text-[11px] text-slate-400 space-y-0.5 mb-4">
                    <p>পরবর্তী রিভিশন: <strong className="text-slate-200">{t.next_revision_date}</strong></p>
                    <p>ইন্টারভাল: {t.current_interval} days | Ease Factor: {t.ease_factor}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                    title="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center space-x-2">
                    {!hasNote ? (
                      <button
                        onClick={() => setNoteTaskTarget(t)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-colors flex items-center space-x-1"
                      >
                        <FileImage className="w-3.5 h-3.5" />
                        <span>নোট যোগ</span>
                      </button>
                    ) : overlayCount === 0 ? (
                      <Link
                        href={`/notes/${firstNote!.id}/occlude`}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors flex items-center space-x-1"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>অক্লুশন আঁকুন</span>
                      </Link>
                    ) : (
                      <Link
                        href={`/study/${t.id}`}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>স্টাডি ({overlayCount})</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
          loadData();
        }}
      />
    </div>
  );
}
