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
import { calculateMomentum } from '@/lib/momentum';
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
import ConfirmModal from '@/components/ConfirmModal';
import CustomSelect from '@/components/CustomSelect';
import XPChangeModal from '@/components/XPChangeModal';

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

  // XP Modal State
  const [xpModalOpen, setXpModalOpen] = useState(false);
  const [earnedXP, setEarnedXP] = useState(0);
  const [xpReason, setXpReason] = useState('');
  const [xpMultiplier, setXpMultiplier] = useState(1.0);
  const [newTotalXP, setNewTotalXP] = useState(0);

  // Task Creator Modal state for "Study Subtopic"
  const [studyTarget, setStudyTarget] = useState<{
    subjectId: string;
    topicId: string;
    subtopicId: string;
    subtopicName: string;
  } | null>(null);

  // Custom Confirm Modal State
  const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<{
    type: 'subject' | 'topic' | 'subtopic';
    id: string;
    title: string;
    message: string;
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
      console.error('Failed to load syllabus data:', err);
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

    const updatedSettings = await updateSubtopicStatus(id, nextStatus, currentStatus);

    if (nextStatus === 'completed' && updatedSettings) {
      if (updatedSettings.show_rank_features !== false) {
        const momentum = calculateMomentum(updatedSettings);
        setEarnedXP(30);
        setXpReason('Syllabus Subtopic Completed!');
        setXpMultiplier(momentum.xpMultiplier);
        setNewTotalXP(updatedSettings.xp || 0);
        setXpModalOpen(true);
      }
    }
  };

  const executeDelete = async () => {
    if (!confirmDeleteTarget) return;
    const { type, id } = confirmDeleteTarget;

    try {
      if (type === 'subject') {
        const topicIds = topics.filter((t) => t.subject_id === id).map((t) => t.id);
        const completedCount = subtopics.filter(
          (st) => topicIds.includes(st.topic_id) && st.status === 'completed'
        ).length;
        await deleteSubject(id, completedCount);
        setSubjects((prev) => prev.filter((s) => s.id !== id));
        setTopics((prev) => prev.filter((t) => t.subject_id !== id));
        setSubtopics((prev) => prev.filter((st) => !topicIds.includes(st.topic_id)));
      } else if (type === 'topic') {
        const completedCount = subtopics.filter(
          (st) => st.topic_id === id && st.status === 'completed'
        ).length;
        await deleteTopic(id, completedCount);
        setTopics((prev) => prev.filter((t) => t.id !== id));
        setSubtopics((prev) => prev.filter((st) => st.topic_id !== id));
      } else if (type === 'subtopic') {
        const target = subtopics.find((st) => st.id === id);
        await deleteSubtopic(id, target?.status === 'completed');
        setSubtopics((prev) => prev.filter((st) => st.id !== id));
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setConfirmDeleteTarget(null);
    }
  };

  const totalSubtopics = subtopics.length;
  const completedSubtopics = subtopics.filter((st) => st.status === 'completed').length;
  const overallProgress = totalSubtopics > 0 ? Math.round((completedSubtopics / totalSubtopics) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            <span>Syllabus Management Hub</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Build and track your 3-Tier Syllabus hierarchy: Subjects &rarr; Topics &rarr; Subtopics.
          </p>
        </div>

        {/* Global Syllabus Progress Indicator */}
        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl min-w-[200px] font-mono text-xs">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-zinc-400">Mastery Progress</span>
            <span className="text-purple-400 font-bold">{overallProgress}%</span>
          </div>
          <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
            <div
              className="bg-purple-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Creation Forms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Form 1: Subject Creator */}
        <form onSubmit={handleCreateSubject} className="glass-panel p-4 rounded-xl border border-zinc-800 space-y-3">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-purple-400" />
            <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">1. New Subject</h2>
          </div>
          <input
            type="text"
            placeholder="e.g. Bangladesh Affairs"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-zinc-600"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newSubjectName.trim()}
            className="w-full py-2 bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 font-semibold text-xs rounded-lg transition-all flex items-center justify-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Subject</span>
          </button>
        </form>

        {/* Form 2: Topic Creator */}
        <form onSubmit={handleCreateTopic} className="glass-panel p-4 rounded-xl border border-zinc-800 space-y-3">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">2. New Topic</h2>
          </div>
          <CustomSelect
            value={selectedSubjectIdForTopic}
            onChange={(val) => setSelectedSubjectIdForTopic(val)}
            options={subjects.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="Select Subject..."
          />
          <input
            type="text"
            placeholder="e.g. Ancient Bengal History"
            value={newTopicName}
            onChange={(e) => setNewTopicName(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-zinc-600"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newTopicName.trim() || !selectedSubjectIdForTopic}
            className="w-full py-2 bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30 font-semibold text-xs rounded-lg transition-all flex items-center justify-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Topic</span>
          </button>
        </form>

        {/* Form 3: Subtopic Creator */}
        <form onSubmit={handleCreateSubtopic} className="glass-panel p-4 rounded-xl border border-zinc-800 space-y-3">
          <div className="flex items-center space-x-2">
            <ListTree className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">3. New Subtopic</h2>
          </div>
          <CustomSelect
            value={selectedTopicIdForSubtopic}
            onChange={(val) => setSelectedTopicIdForSubtopic(val)}
            options={topics.map((t) => ({
              value: t.id,
              label: `${t.name} (${t.subject?.name || 'Subject'})`,
            }))}
            placeholder="Select Topic..."
          />
          <input
            type="text"
            placeholder="e.g. Pala Dynasty Rulers"
            value={newSubtopicName}
            onChange={(e) => setNewSubtopicName(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-zinc-600"
          />
          <button
            type="submit"
            disabled={isSubmitting || !newSubtopicName.trim() || !selectedTopicIdForSubtopic}
            className="w-full py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 font-semibold text-xs rounded-lg transition-all flex items-center justify-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Subtopic</span>
          </button>
        </form>
      </div>

      {/* Syllabus Tree Explorer */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-400" />
            <span>Interactive Syllabus Hierarchy</span>
          </h2>
          <span className="text-xs font-mono text-zinc-500">
            {subjects.length} Subjects | {topics.length} Topics | {subtopics.length} Subtopics
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-zinc-500 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-zinc-400" />
            <p className="text-xs font-mono">Loading syllabus tree...</p>
          </div>
        ) : subjects.length === 0 ? (
          <div className="text-center py-12 glass-panel rounded-xl border border-zinc-800 space-y-2">
            <BookOpen className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-xs text-zinc-400">No subjects created yet. Use the form above to add your first subject!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {subjects.map((subj) => {
              const subjTopics = topics.filter((t) => t.subject_id === subj.id);

              return (
                <div key={subj.id} className="glass-panel p-5 rounded-xl border border-zinc-800 space-y-4">
                  {/* Level 1: Subject Header */}
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="w-4 h-4 text-purple-400" />
                      <h3 className="text-sm font-bold text-zinc-100">{subj.name}</h3>
                      <span className="text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full">
                        {subjTopics.length} Topics
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        setConfirmDeleteTarget({
                          type: 'subject',
                          id: subj.id,
                          title: `Delete Subject "${subj.name}"?`,
                          message: 'Deleting this subject will also delete all associated topics and subtopics!',
                        })
                      }
                      className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete Subject"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Level 2 & 3: Topics & Subtopics */}
                  {subjTopics.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic pl-4">No topics in this subject yet.</p>
                  ) : (
                    <div className="space-y-3 pl-2 sm:pl-4">
                      {subjTopics.map((topic) => {
                        const topicSubtopics = subtopics.filter((st) => st.topic_id === topic.id);

                        return (
                          <div key={topic.id} className="p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 space-y-2">
                            {/* Topic Row */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                                <span className="text-xs font-semibold text-zinc-200">{topic.name}</span>
                                <span className="text-[10px] font-mono text-zinc-500">
                                  ({topicSubtopics.length} subtopics)
                                </span>
                              </div>

                              <button
                                onClick={() =>
                                  setConfirmDeleteTarget({
                                    type: 'topic',
                                    id: topic.id,
                                    title: `Delete Topic "${topic.name}"?`,
                                    message: 'Deleting this topic will also delete all associated subtopics!',
                                  })
                                }
                                className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                title="Delete Topic"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Subtopics Chips List */}
                            {topicSubtopics.length === 0 ? (
                              <p className="text-[11px] text-zinc-600 italic pl-5">No subtopics yet.</p>
                            ) : (
                              <div className="flex flex-wrap gap-2 pl-2 pt-1">
                                {topicSubtopics.map((st) => (
                                  <div
                                    key={st.id}
                                    className={`px-2.5 py-1 rounded-lg border text-xs font-mono flex items-center space-x-2 transition-all ${
                                      st.status === 'completed'
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                        : st.status === 'in_progress'
                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                    }`}
                                  >
                                    {/* Status Toggle Button */}
                                    <button
                                      onClick={() => handleToggleSubtopicStatus(st.id, st.status)}
                                      className="flex items-center space-x-1"
                                      title="Click to toggle status: Unstudied -> In Progress -> Completed"
                                    >
                                      {st.status === 'completed' ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                      ) : st.status === 'in_progress' ? (
                                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                                      ) : (
                                        <Circle className="w-3.5 h-3.5 text-zinc-500" />
                                      )}
                                      <span>{st.name}</span>
                                    </button>

                                    {/* Quick Study Action Button */}
                                    <button
                                      onClick={() =>
                                        setStudyTarget({
                                          subjectId: subj.id,
                                          topicId: topic.id,
                                          subtopicId: st.id,
                                          subtopicName: st.name,
                                        })
                                      }
                                      className="p-0.5 rounded text-zinc-400 hover:text-amber-400 transition-colors border-l border-zinc-800 pl-1.5 ml-1"
                                      title="Create Task to Study Subtopic"
                                    >
                                      <Zap className="w-3 h-3" />
                                    </button>

                                    {/* Delete Subtopic Button */}
                                    <button
                                      onClick={() =>
                                        setConfirmDeleteTarget({
                                          type: 'subtopic',
                                          id: st.id,
                                          title: `Delete Subtopic "${st.name}"?`,
                                          message: 'Are you sure you want to remove this subtopic?',
                                        })
                                      }
                                      className="p-0.5 rounded text-zinc-500 hover:text-red-400 transition-colors"
                                      title="Delete Subtopic"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
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
      </div>

      {/* Task Creator Modal for Studying Subtopic */}
      {studyTarget && (
        <TaskCreatorModal
          isOpen={Boolean(studyTarget)}
          onClose={() => setStudyTarget(null)}
          onTaskCreated={() => {
            setStudyTarget(null);
          }}
          initialTitle={`Study Subtopic: ${studyTarget.subtopicName}`}
          initialSubjectId={studyTarget.subjectId}
          initialTopicId={studyTarget.topicId}
          initialSubtopicId={studyTarget.subtopicId}
          preloadedSubjects={subjects}
          preloadedTopics={topics}
          preloadedSubtopics={subtopics}
        />
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={Boolean(confirmDeleteTarget)}
        onCancel={() => setConfirmDeleteTarget(null)}
        onConfirm={executeDelete}
        title={confirmDeleteTarget?.title || 'Confirm Deletion'}
        message={confirmDeleteTarget?.message || 'Are you sure you want to delete this item?'}
        confirmText="Yes, Delete"
      />

      {/* XP Change Modal Popup */}
      <XPChangeModal
        isOpen={xpModalOpen}
        onClose={() => setXpModalOpen(false)}
        amount={earnedXP}
        reason={xpReason}
        multiplier={xpMultiplier}
        newTotalXP={newTotalXP}
      />
    </div>
  );
}
