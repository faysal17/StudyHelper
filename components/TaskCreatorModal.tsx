'use client';

import { useState, useEffect } from 'react';
import { Subject, Topic } from '@/lib/types';
import {
  fetchSubjects,
  fetchTopics,
  createSubject,
  createTopic,
  createTask,
} from '@/lib/supabase';
import { getTodayDateString } from '@/lib/spacedRepetition';
import { X, Plus, AlertCircle } from 'lucide-react';

interface TaskCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
}

export default function TaskCreatorModal({
  isOpen,
  onClose,
  onTaskCreated,
}: TaskCreatorModalProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<number>(2);
  const [initialDate, setInitialDate] = useState<string>(getTodayDateString());

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');

  const [newSubjectName, setNewSubjectName] = useState('');
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);

  const [newTopicName, setNewTopicName] = useState('');
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadDropdownData();
    }
  }, [isOpen]);

  const loadDropdownData = async () => {
    try {
      const [subData, topData] = await Promise.all([fetchSubjects(), fetchTopics()]);
      setSubjects(subData);
      setTopics(topData);
      if (subData.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(subData[0].id);
      }
    } catch (err) {
      console.error('Error loading subjects/topics:', err);
    }
  };

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) return;
    try {
      const created = await createSubject(newSubjectName.trim());
      setSubjects((prev) => [...prev, created]);
      setSelectedSubjectId(created.id);
      setNewSubjectName('');
      setIsCreatingSubject(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Subject creation failed');
    }
  };

  const handleCreateTopic = async () => {
    if (!newTopicName.trim() || !selectedSubjectId) return;
    try {
      const created = await createTopic(newTopicName.trim(), selectedSubjectId);
      setTopics((prev) => [...prev, created]);
      setSelectedTopicId(created.id);
      setNewTopicName('');
      setIsCreatingTopic(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Topic creation failed');
    }
  };

  const filteredTopics = topics.filter((t) => t.subject_id === selectedSubjectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Task title is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await createTask({
        title: title.trim(),
        topic_id: selectedTopicId || null,
        priority,
        next_revision_date: initialDate || getTodayDateString(),
      });
      onTaskCreated();
    } catch (err: any) {
      console.error('Create task error:', err);
      setErrorMessage(err.message || 'Failed to create task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full p-6 shadow-2xl relative">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-5">
          <div>
            <h3 className="text-base font-semibold text-zinc-100">Create New Task</h3>
            <p className="text-xs text-zinc-400">Set topic, priority, and study schedule date</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 transition-colors p-1"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task name or topic formula..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
              required
            />
          </div>

          {/* Subject */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-zinc-300">Subject</label>
              <button
                type="button"
                onClick={() => setIsCreatingSubject(!isCreatingSubject)}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>New Subject</span>
              </button>
            </div>

            {isCreatingSubject ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="Subject name..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
                />
                <button
                  type="button"
                  onClick={handleCreateSubject}
                  className="px-3 py-1.5 bg-zinc-100 text-zinc-950 text-xs font-semibold rounded-lg hover:bg-zinc-200"
                >
                  Add
                </button>
              </div>
            ) : (
              <select
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  setSelectedTopicId('');
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
              >
                <option value="">Select Subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Topic */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-zinc-300">Topic</label>
              <button
                type="button"
                onClick={() => setIsCreatingTopic(!isCreatingTopic)}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center space-x-1"
                disabled={!selectedSubjectId}
              >
                <Plus className="w-3 h-3" />
                <span>New Topic</span>
              </button>
            </div>

            {isCreatingTopic ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  placeholder="Topic name..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
                />
                <button
                  type="button"
                  onClick={handleCreateTopic}
                  className="px-3 py-1.5 bg-zinc-100 text-zinc-950 text-xs font-semibold rounded-lg hover:bg-zinc-200"
                >
                  Add
                </button>
              </div>
            ) : (
              <select
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
              >
                <option value="">Select Topic</option>
                {filteredTopics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
              >
                <option value={1}>Priority 1 (High - 1.5x)</option>
                <option value={2}>Priority 2 (Normal - 1.0x)</option>
                <option value={3}>Priority 3 (Low - 0.5x)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Initial Date
              </label>
              <input
                type="date"
                value={initialDate}
                onChange={(e) => setInitialDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-800 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-zinc-100 text-zinc-950 font-semibold rounded-lg text-xs hover:bg-zinc-200 transition-all shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
