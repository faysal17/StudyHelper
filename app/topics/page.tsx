'use client';

import { useState, useEffect } from 'react';
import { Subject, Topic } from '@/lib/types';
import {
  fetchSubjects,
  fetchTopics,
  createSubject,
  createTopic,
  deleteSubject,
  deleteTopic,
} from '@/lib/supabase';
import {
  FolderKanban,
  Plus,
  Trash2,
  BookOpen,
  Layers,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export default function TopicsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  // New Subject State
  const [newSubjectName, setNewSubjectName] = useState('');
  const [isSubmittingSubject, setIsSubmittingSubject] = useState(false);

  // New Topic State
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [newTopicName, setNewTopicName] = useState('');
  const [isSubmittingTopic, setIsSubmittingTopic] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sData, tData] = await Promise.all([fetchSubjects(), fetchTopics()]);
      setSubjects(sData);
      setTopics(tData);
      if (sData.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(sData[0].id);
      }
    } catch (err) {
      console.error('Error loading subjects/topics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    setIsSubmittingSubject(true);
    setErrorMessage('');

    try {
      const created = await createSubject(newSubjectName.trim());
      setSubjects((prev) => [...prev, created]);
      if (!selectedSubjectId) setSelectedSubjectId(created.id);
      setNewSubjectName('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create subject');
    } finally {
      setIsSubmittingSubject(false);
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim() || !selectedSubjectId) return;
    setIsSubmittingTopic(true);
    setErrorMessage('');

    try {
      const created = await createTopic(newTopicName.trim(), selectedSubjectId);
      setTopics((prev) => [...prev, created]);
      setNewTopicName('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create topic');
    } finally {
      setIsSubmittingTopic(false);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (confirm('Deleting a subject will also remove its associated topics. Proceed?')) {
      await deleteSubject(id);
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      setTopics((prev) => prev.filter((t) => t.subject_id !== id));
      if (selectedSubjectId === id) setSelectedSubjectId('');
    }
  };

  const handleDeleteTopic = async (id: string) => {
    if (confirm('Are you sure you want to delete this topic?')) {
      await deleteTopic(id);
      setTopics((prev) => prev.filter((t) => t.id !== id));
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="glass-panel p-6 rounded-xl border border-zinc-800/80 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-zinc-400" />
            <span>Subject & Topic Management</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Create and organize subjects and topics. These will be available for selection when creating tasks.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Forms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Subject Card */}
        <div className="glass-panel p-5 rounded-xl border border-zinc-800 space-y-4">
          <div className="flex items-center space-x-2 text-zinc-200">
            <BookOpen className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold">1. Add New Subject</h2>
          </div>

          <form onSubmit={handleCreateSubject} className="flex gap-2">
            <input
              type="text"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder="Subject Name (e.g. History, Mathematics)..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
              required
            />
            <button
              type="submit"
              disabled={isSubmittingSubject}
              className="px-4 py-2 bg-zinc-100 text-zinc-950 font-semibold text-xs rounded-lg hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center space-x-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Subject</span>
            </button>
          </form>
        </div>

        {/* Create Topic Card */}
        <div className="glass-panel p-5 rounded-xl border border-zinc-800 space-y-4">
          <div className="flex items-center space-x-2 text-zinc-200">
            <Layers className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold">2. Add New Topic under Subject</h2>
          </div>

          <form onSubmit={handleCreateTopic} className="space-y-3">
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
              required
            >
              <option value="">Select Subject First</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <input
                type="text"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                placeholder="Topic Name..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
                disabled={!selectedSubjectId}
                required
              />
              <button
                type="submit"
                disabled={isSubmittingTopic || !selectedSubjectId}
                className="px-4 py-2 bg-zinc-100 text-zinc-950 font-semibold text-xs rounded-lg hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center space-x-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Topic</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Subjects & Topics Tree Display */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500 space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          <p className="text-xs">Loading taxonomy...</p>
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-16 bg-zinc-950/40 rounded-xl border border-zinc-800">
          <p className="text-xs text-zinc-500">No subjects created yet. Add a subject above to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xs font-semibold uppercase text-zinc-400 tracking-wider">
            Created Subjects & Topics ({subjects.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((subject) => {
              const subjectTopics = topics.filter((t) => t.subject_id === subject.id);

              return (
                <div
                  key={subject.id}
                  className="glass-card p-4 rounded-xl border border-zinc-800 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
                      <div className="flex items-center space-x-2">
                        <BookOpen className="w-4 h-4 text-zinc-400" />
                        <h3 className="text-sm font-bold text-zinc-100">{subject.name}</h3>
                      </div>
                      <button
                        onClick={() => handleDeleteSubject(subject.id)}
                        className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                        title="Delete Subject"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1.5 min-h-[60px]">
                      {subjectTopics.length === 0 ? (
                        <p className="text-[11px] text-zinc-600 italic">No topics under this subject.</p>
                      ) : (
                        subjectTopics.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between bg-zinc-950/80 px-2.5 py-1 rounded-lg border border-zinc-800/80 text-xs"
                          >
                            <span className="text-zinc-300 truncate">{t.name}</span>
                            <button
                              onClick={() => handleDeleteTopic(t.id)}
                              className="p-0.5 text-zinc-600 hover:text-red-400 transition-colors"
                              title="Delete Topic"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-800/80 mt-3 text-[10px] text-zinc-500">
                    {subjectTopics.length} topic(s)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
