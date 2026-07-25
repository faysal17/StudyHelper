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
import { X, Plus, CheckCircle, AlertCircle, BookOpen, Layers } from 'lucide-react';

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
  const [priority, setPriority] = useState<number>(2); // Default 2 (Normal)
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
      setErrorMessage('টাস্ক শিরোনাম (Task Title) আবশ্যক।');
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
      setErrorMessage(err.message || 'টাস্ক তৈরিতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">নতুন টাস্ক তৈরি (Create New Task)</h3>
              <p className="text-xs text-slate-400">বিষয়, টপিক, প্রায়োরিটি ও তারিখ নির্ধারণ করুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Title (Bangla Supported) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              টাস্ক শিরোনাম (Task Title) *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="যেমন: প্রাচীন বাংলার জনপদ ও রাজবংশের নামাবলি"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              required
            />
          </div>

          {/* Subject Selection / Creation */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">বিষয় (Subject)</label>
              <button
                type="button"
                onClick={() => setIsCreatingSubject(!isCreatingSubject)}
                className="text-[11px] text-emerald-400 hover:underline flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>নতুন বিষয়</span>
              </button>
            </div>

            {isCreatingSubject ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="যেমন: ভূগোল ও পরিবেশ"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleCreateSubject}
                  className="px-3 py-2 bg-emerald-500 text-slate-950 text-xs font-bold rounded-xl hover:bg-emerald-400"
                >
                  যোগ করুন
                </button>
              </div>
            ) : (
              <select
                value={selectedSubjectId}
                onChange={(e) => {
                  setSelectedSubjectId(e.target.value);
                  setSelectedTopicId('');
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="">বিষয় নির্বাচন করুন</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Topic Selection / Creation */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300">টপিক (Topic)</label>
              <button
                type="button"
                onClick={() => setIsCreatingTopic(!isCreatingTopic)}
                className="text-[11px] text-emerald-400 hover:underline flex items-center space-x-1"
                disabled={!selectedSubjectId}
              >
                <Plus className="w-3 h-3" />
                <span>নতুন টপিক</span>
              </button>
            </div>

            {isCreatingTopic ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  placeholder="যেমন: বাংলাদেশের নদ-নদী"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleCreateTopic}
                  className="px-3 py-2 bg-emerald-500 text-slate-950 text-xs font-bold rounded-xl hover:bg-emerald-400"
                >
                  যোগ করুন
                </button>
              </div>
            ) : (
              <select
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="">টপিক নির্বাচন করুন</option>
                {filteredTopics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Priority & Initial Date Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                প্রায়োরিটি (Priority)
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value={1}>1 - High (১.৫x Multiplier)</option>
                <option value={2}>2 - Normal (১.০x Multiplier)</option>
                <option value={3}>3 - Low (০.৫x Multiplier)</option>
              </select>
            </div>

            {/* Initial Study Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                প্রাথমিক তারিখ (Initial Date)
              </label>
              <input
                type="date"
                value={initialDate}
                onChange={(e) => setInitialDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold rounded-xl text-xs hover:from-emerald-400 hover:to-teal-400 transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50"
            >
              {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'টাস্ক তৈরি করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
