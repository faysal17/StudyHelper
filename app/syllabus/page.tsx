'use client';

import { useState, useEffect } from 'react';
import { Subject, Topic, Subtopic, SubtopicStatus } from '@/lib/types';
import {
  fetchSubjects,
  fetchTopics,
  fetchSubtopics,
  createSubject,
  createTopic,
  createSubtopic,
  updateSubtopicStatus,
  deleteSubject,
  deleteTopic,
  deleteSubtopic,
} from '@/lib/supabase';
import {
  BookOpen,
  Layers,
  ListTree,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Circle,
  Zap,
  Loader2,
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import TaskCreatorModal from '@/components/TaskCreatorModal';

export default function SyllabusPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Inputs
  const [newSubjectName, setNewSubjectName] = useState('');
  const [selectedSubjectIdForTopic, setSelectedSubjectIdForTopic] = useState('');
  const [newTopicName, setNewTopicName] = useState('');

  const [selectedTopicIdForSubtopic, setSelectedTopicIdForSubtopic] = useState('');
  const [newSubtopicName, setNewSubtopicName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Task Creator Modal state for "Study Subtopic"
  const [studyTarget, setStudyTarget] = useState<{
    subjectId: string;
    topicId: string;
    subtopicId: string;
    subtopicName: string;
  } | null>(null);

  useEffect(() => {
    loadSyllabusData();
  }, []);

  const loadSyllabusData = async () => {
    setLoading(true);
    try {
      const [sData, tData, stData] = await Promise.all([
        fetchSubjects(),
        fetchTopics(),
        fetchSubtopics(),
      ]);
      setSubjects(sData);
      setTopics(tData);
      setSubtopics(stData);

      if (sData.length > 0 && !selectedSubjectIdForTopic) {
        setSelectedSubjectIdForTopic(sData[0].id);
      }
      if (tData.length > 0 && !selectedTopicIdForSubtopic) {
        setSelectedTopicIdForSubtopic(tData[0].id);
      }
    } catch (err) {
      console.error('Error loading syllabus:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const created = await createSubject(newSubjectName.trim());
      setSubjects((prev) => [...prev, created]);
      if (!selectedSubjectIdForTopic) setSelectedSubjectIdForTopic(created.id);
      setNewSubjectName('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create subject');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim() || !selectedSubjectIdForTopic) return;
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const created = await createTopic(newTopicName.trim(), selectedSubjectIdForTopic);
      setTopics((prev) => [...prev, created]);
      if (!selectedTopicIdForSubtopic) setSelectedTopicIdForSubtopic(created.id);
      setNewTopicName('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create topic');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSubtopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtopicName.trim() || !selectedTopicIdForSubtopic) return;
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const created = await createSubtopic(newSubtopicName.trim(), selectedTopicIdForSubtopic);
      setSubtopics((prev) => [...prev, created]);
      setNewSubtopicName('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create subtopic');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleSubtopicStatus = async (id: string, currentStatus: SubtopicStatus) => {
    const nextStatus: SubtopicStatus =
      currentStatus === 'unstudied'
        ? 'in_progress'
        : currentStatus === 'in_progress'
        ? 'completed'
        : 'unstudied';

    setSubtopics((prev) =>
      prev.map((st) => (st.id === id ? { ...st, status: nextStatus } : st))
    );
    await updateSubtopicStatus(id, nextStatus);
  };

  const handleDeleteSubject = async (id: string) => {
    if (confirm('Deleting a subject will remove all its topics and subtopics. Proceed?')) {
      await deleteSubject(id);
      setSubjects((prev) => prev.filter((s) => s.id !== id));
      const topicIds = topics.filter((t) => t.subject_id === id).map((t) => t.id);
      setTopics((prev) => prev.filter((t) => t.subject_id !== id));
      setSubtopics((prev) => prev.filter((st) => !topicIds.includes(st.topic_id)));
    }
  };

  const handleDeleteTopic = async (id: string) => {
    if (confirm('Deleting a topic will remove all its subtopics. Proceed?')) {
      await deleteTopic(id);
      setTopics((prev) => prev.filter((t) => t.id !== id));
      setSubtopics((prev) => prev.filter((st) => st.topic_id !== id));
    }
  };

  const handleDeleteSubtopic = async (id: string) => {
    if (confirm('Delete this subtopic?')) {
      await deleteSubtopic(id);
      setSubtopics((prev) => prev.filter((st) => st.id !== id));
    }
  };

  // Syllabus Completion Statistics
  const totalSubtopics = subtopics.length;
  const completedSubtopics = subtopics.filter((st) => st.status === 'completed').length;
  const inProgressSubtopics = subtopics.filter((st) => st.status === 'in_progress').length;
  const overallPercent = totalSubtopics > 0 ? Math.round((completedSubtopics / totalSubtopics) * 100) : 0;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header & Overall Syllabus Dashboard */}
      <div className="glass-panel p-6 rounded-xl border border-zinc-800/80 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200">
              <ListTree className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <span>Syllabus Completion Hub</span>
              </h1>
              <p className="text-xs text-zinc-400">
                Track full curriculum breakdown (Subject &rarr; Topic &rarr; Subtopic) and study completion
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 bg-zinc-950 border border-zinc-800 px-4 py-2 rounded-xl text-xs font-mono">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            <span>Overall Syllabus: <strong className="text-emerald-400 text-sm">{overallPercent}%</strong> ({completedSubtopics}/{totalSubtopics})</span>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-mono text-zinc-400">
            <span>Progress Breakdown</span>
            <span>{completedSubtopics} Completed &bull; {inProgressSubtopics} In Progress &bull; {totalSubtopics - completedSubtopics - inProgressSubtopics} Unstudied</span>
          </div>
          <div className="w-full bg-zinc-950 rounded-full h-2.5 overflow-hidden border border-zinc-800/80 flex">
            <div
              style={{ width: `${overallPercent}%` }}
              className="bg-emerald-500 transition-all duration-500"
              title={`${overallPercent}% Completed`}
            />
            <div
              style={{ width: `${totalSubtopics > 0 ? Math.round((inProgressSubtopics / totalSubtopics) * 100) : 0}%` }}
              className="bg-blue-500 transition-all duration-500"
              title="In Progress"
            />
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 3-Tier Builder Toolbar (Subject, Topic, Subtopic Creation) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Add Subject */}
        <div className="glass-panel p-4 rounded-xl border border-zinc-800 space-y-3">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-zinc-200">
            <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
            <span>1. Add Subject</span>
          </div>
          <form onSubmit={handleCreateSubject} className="flex gap-1.5">
            <input
              type="text"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder="Subject Name..."
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3 py-1.5 bg-zinc-100 text-zinc-950 font-semibold text-xs rounded-lg hover:bg-zinc-200 transition-all disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* 2. Add Topic */}
        <div className="glass-panel p-4 rounded-xl border border-zinc-800 space-y-3">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-zinc-200">
            <Layers className="w-3.5 h-3.5 text-zinc-400" />
            <span>2. Add Topic</span>
          </div>
          <form onSubmit={handleCreateTopic} className="space-y-2">
            <select
              value={selectedSubjectIdForTopic}
              onChange={(e) => setSelectedSubjectIdForTopic(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none"
              required
            >
              <option value="">Select Subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                placeholder="Topic Name..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                disabled={!selectedSubjectIdForTopic}
                required
              />
              <button
                type="submit"
                disabled={isSubmitting || !selectedSubjectIdForTopic}
                className="px-3 py-1 bg-zinc-100 text-zinc-950 font-semibold text-xs rounded-lg hover:bg-zinc-200 transition-all disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>

        {/* 3. Add Subtopic */}
        <div className="glass-panel p-4 rounded-xl border border-zinc-800 space-y-3">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-zinc-200">
            <ListTree className="w-3.5 h-3.5 text-zinc-400" />
            <span>3. Add Subtopic (Syllabus Item)</span>
          </div>
          <form onSubmit={handleCreateSubtopic} className="space-y-2">
            <select
              value={selectedTopicIdForSubtopic}
              onChange={(e) => setSelectedTopicIdForSubtopic(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none"
              required
            >
              <option value="">Select Topic</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.subject?.name ? `${t.subject.name} → ` : ''}{t.name}
                </option>
              ))}
            </select>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newSubtopicName}
                onChange={(e) => setNewSubtopicName(e.target.value)}
                placeholder="Subtopic Name..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
                disabled={!selectedTopicIdForSubtopic}
                required
              />
              <button
                type="submit"
                disabled={isSubmitting || !selectedTopicIdForSubtopic}
                className="px-3 py-1 bg-zinc-100 text-zinc-950 font-semibold text-xs rounded-lg hover:bg-zinc-200 transition-all disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Syllabus Interactive 3-Tier Hierarchy Tree */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          <p className="text-xs">Loading syllabus tree...</p>
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-16 bg-zinc-950/40 rounded-xl border border-zinc-800">
          <p className="text-xs text-zinc-500">No subjects in syllabus yet. Use the builder above to add your first subject!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {subjects.map((subject) => {
            const subjectTopics = topics.filter((t) => t.subject_id === subject.id);
            const topicIds = subjectTopics.map((t) => t.id);
            const subjectSubtopics = subtopics.filter((st) => topicIds.includes(st.topic_id));

            const sTotal = subjectSubtopics.length;
            const sCompleted = subjectSubtopics.filter((st) => st.status === 'completed').length;
            const sPercent = sTotal > 0 ? Math.round((sCompleted / sTotal) * 100) : 0;

            return (
              <div
                key={subject.id}
                className="glass-panel rounded-xl p-5 border border-zinc-800 space-y-4"
              >
                {/* Subject Header with Progress Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-zinc-300" />
                    <h2 className="text-base font-bold text-zinc-100">{subject.name}</h2>
                    <span className="text-xs font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                      {sCompleted}/{sTotal} completed ({sPercent}%)
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-36 bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
                      <div
                        style={{ width: `${sPercent}%` }}
                        className="bg-emerald-500 h-full transition-all duration-300"
                      />
                    </div>
                    <button
                      onClick={() => handleDeleteSubject(subject.id)}
                      className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                      title="Delete Subject"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Topics & Subtopics List */}
                {subjectTopics.length === 0 ? (
                  <p className="text-xs text-zinc-600 italic py-2">No topics added under this subject.</p>
                ) : (
                  <div className="space-y-4 pt-1">
                    {subjectTopics.map((topic) => {
                      const topicSubtopics = subtopics.filter((st) => st.topic_id === topic.id);

                      return (
                        <div
                          key={topic.id}
                          className="bg-zinc-950/80 rounded-xl p-4 border border-zinc-800/80 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Layers className="w-3.5 h-3.5 text-zinc-400" />
                              <h3 className="text-xs font-semibold text-zinc-200">{topic.name}</h3>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                ({topicSubtopics.filter((st) => st.status === 'completed').length}/{topicSubtopics.length})
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteTopic(topic.id)}
                              className="p-0.5 text-zinc-600 hover:text-red-400 transition-colors"
                              title="Delete Topic"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Subtopics List */}
                          {topicSubtopics.length === 0 ? (
                            <p className="text-[11px] text-zinc-600 italic pl-5">
                              No subtopics created. Add subtopics in box 3 above.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-2 sm:pl-5">
                              {topicSubtopics.map((subtopic) => {
                                return (
                                  <div
                                    key={subtopic.id}
                                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 transition-all ${
                                      subtopic.status === 'completed'
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                        : subtopic.status === 'in_progress'
                                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                                        : 'bg-zinc-900/90 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                                    }`}
                                  >
                                    <div className="flex items-center space-x-2 truncate">
                                      <button
                                        onClick={() => handleToggleSubtopicStatus(subtopic.id, subtopic.status)}
                                        className="shrink-0 transition-transform active:scale-90"
                                        title="Click to toggle status (Unstudied → In Progress → Completed)"
                                      >
                                        {subtopic.status === 'completed' ? (
                                          <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-500/20" />
                                        ) : subtopic.status === 'in_progress' ? (
                                          <Clock className="w-4 h-4 text-blue-400" />
                                        ) : (
                                          <Circle className="w-4 h-4 text-zinc-600 hover:text-zinc-400" />
                                        )}
                                      </button>
                                      <span className="font-medium truncate">{subtopic.name}</span>
                                    </div>

                                    <div className="flex items-center space-x-1 shrink-0">
                                      <button
                                        onClick={() =>
                                          setStudyTarget({
                                            subjectId: subject.id,
                                            topicId: topic.id,
                                            subtopicId: subtopic.id,
                                            subtopicName: subtopic.name,
                                          })
                                        }
                                        className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-semibold flex items-center space-x-1 transition-colors"
                                        title="Create Active Recall Study Task"
                                      >
                                        <Zap className="w-3 h-3 text-amber-400" />
                                        <span>Study</span>
                                      </button>
                                      <button
                                        onClick={() => handleDeleteSubtopic(subtopic.id)}
                                        className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                                        title="Delete subtopic"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Task Creator Modal when clicking "Study Subtopic" */}
      {studyTarget && (
        <TaskCreatorModal
          isOpen={Boolean(studyTarget)}
          onClose={() => setStudyTarget(null)}
          onTaskCreated={() => {
            setStudyTarget(null);
            loadSyllabusData();
          }}
        />
      )}
    </div>
  );
}
