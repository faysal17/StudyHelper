'use client';

import { useState, useEffect } from 'react';
import { Task, Subject } from '@/lib/types';
import { fetchTasks, fetchSubjects, deleteTask } from '@/lib/supabase';
import {
  CheckSquare,
  Search,
  Plus,
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
import ConfirmModal from '@/components/ConfirmModal';
import CustomSelect from '@/components/CustomSelect';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [noteTaskTarget, setNoteTaskTarget] = useState<Task | null>(null);

  // Custom Delete Confirm Modal state
  const [deleteTargetTask, setDeleteTargetTask] = useState<Task | null>(null);

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

  const handleConfirmDelete = async () => {
    if (!deleteTargetTask) return;
    try {
      await deleteTask(deleteTargetTask.id);
      setTasks((prev) => prev.filter((t) => t.id !== deleteTargetTask.id));
    } catch (err) {
      console.error('Error deleting task:', err);
    } finally {
      setDeleteTargetTask(null);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.topic?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject?.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSubject =
      selectedSubject === 'all' ||
      t.subject?.id === selectedSubject ||
      t.topic?.subject_id === selectedSubject;

    const matchesPriority =
      selectedPriority === 'all' || String(t.priority) === selectedPriority;

    return matchesSearch && matchesSubject && matchesPriority;
  });

  const subjectFilterOptions = [
    { value: 'all', label: 'All Subjects' },
    ...subjects.map((s) => ({ value: s.id, label: s.name })),
  ];

  const priorityFilterOptions = [
    { value: 'all', label: 'All Priorities' },
    { value: '1', label: 'Priority 1 (High)' },
    { value: '2', label: 'Priority 2 (Normal)' },
    { value: '3', label: 'Priority 3 (Low)' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-xl border border-zinc-800/80 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-zinc-400" />
            <span>Task Library</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage your study subjects, topics, and revision tasks
          </p>
        </div>

        <button
          onClick={() => setIsTaskModalOpen(true)}
          className="px-3.5 py-1.5 bg-zinc-100 text-zinc-950 font-semibold text-xs rounded-lg shadow-sm hover:bg-zinc-200 transition-all flex items-center space-x-1.5"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Custom Filter Toolbar */}
      <div className="glass-panel p-3.5 rounded-xl border border-zinc-800/80 flex flex-wrap items-center gap-3 relative z-20">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks, topics, or subjects..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
          />
        </div>

        <div className="flex items-center space-x-2 min-w-[170px]">
          <Filter className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <CustomSelect
            options={subjectFilterOptions}
            value={selectedSubject}
            onChange={(val) => setSelectedSubject(val)}
          />
        </div>

        <div className="min-w-[150px]">
          <CustomSelect
            options={priorityFilterOptions}
            value={selectedPriority}
            onChange={(val) => setSelectedPriority(val)}
          />
        </div>
      </div>

      {/* Task Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          <p className="text-xs">Loading tasks...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-16 bg-zinc-950/40 rounded-xl border border-zinc-800">
          <p className="text-xs text-zinc-500">No tasks found. Create a new task to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((t) => {
            const hasNote = t.notes && t.notes.length > 0;
            const firstNote = hasNote ? t.notes![0] : null;
            const overlayCount = firstNote?.overlays?.length || 0;

            const subjectName = t.subject?.name || t.topic?.subject?.name || 'Subject';
            const topicName = t.topic?.name || 'Topic';
            const subtopicName = t.subtopic?.name;

            return (
              <div
                key={t.id}
                className="glass-card p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded truncate max-w-[180px]">
                      {subjectName} &bull; {topicName}
                    </span>
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                        t.status_color === 'red'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : t.status_color === 'yellow'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : t.status_color === 'green'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}
                    >
                      P{t.priority} &bull; {t.status_color}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-zinc-100 line-clamp-2 mb-1">
                    {t.title}
                  </h3>

                  {subtopicName && (
                    <p className="text-[11px] text-zinc-400 font-medium mb-2">
                      Target: <span className="text-zinc-200">{subtopicName}</span>
                    </p>
                  )}

                  <div className="text-[11px] text-zinc-500 space-y-0.5 mb-4 font-mono">
                    <p>Next revision: <strong className="text-zinc-300">{t.next_revision_date}</strong></p>
                    <p>Interval: {t.current_interval}d | Ease: {t.ease_factor}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setDeleteTargetTask(t)}
                    className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                    title="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center space-x-2">
                    {!hasNote ? (
                      <button
                        onClick={() => setNoteTaskTarget(t)}
                        className="px-3 py-1 rounded-md text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors flex items-center space-x-1"
                      >
                        <FileImage className="w-3.5 h-3.5" />
                        <span>Upload Note</span>
                      </button>
                    ) : overlayCount === 0 ? (
                      <Link
                        href={`/notes/${firstNote!.id}/occlude`}
                        className="px-3 py-1 rounded-md text-xs font-medium bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700 transition-colors flex items-center space-x-1"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Overlays</span>
                      </Link>
                    ) : (
                      <Link
                        href={`/study/${t.id}`}
                        className="px-3 py-1 rounded-md text-xs font-semibold bg-zinc-100 text-zinc-950 hover:bg-zinc-200 transition-all flex items-center space-x-1 shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Study ({overlayCount})</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {noteTaskTarget && (
        <div className="fixed inset-0 z-[9999] bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4 !m-0">
          <NoteUploader
            taskId={noteTaskTarget.id}
            taskTitle={noteTaskTarget.title}
            onClose={() => setNoteTaskTarget(null)}
          />
        </div>
      )}

      <TaskCreatorModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onTaskCreated={() => {
          setIsTaskModalOpen(false);
          loadData();
        }}
      />

      {/* Custom Confirmation Popup */}
      {deleteTargetTask && (
        <ConfirmModal
          isOpen={Boolean(deleteTargetTask)}
          title="Delete Study Task"
          message={`Are you sure you want to delete "${deleteTargetTask.title}"? This cannot be undone.`}
          confirmText="Delete Task"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTargetTask(null)}
        />
      )}
    </div>
  );
}
