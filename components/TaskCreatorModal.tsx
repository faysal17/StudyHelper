'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Subject, Topic, Subtopic } from '@/lib/types';
import { fetchSubjects, fetchTopics, fetchSubtopics, createTask } from '@/lib/supabase';
import { getTodayDateString } from '@/lib/spacedRepetition';
import { X, AlertCircle, ExternalLink } from 'lucide-react';
import CustomSelect from './CustomSelect';

interface TaskCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
  initialSubjectId?: string;
  initialTopicId?: string;
  initialSubtopicId?: string;
  initialTitle?: string;
  // If the parent page already holds this data in state, pass it in to skip
  // the corresponding fetch on open. Omit whichever ones the caller doesn't have.
  preloadedSubjects?: Subject[];
  preloadedTopics?: Topic[];
  preloadedSubtopics?: Subtopic[];
}

export default function TaskCreatorModal({
  isOpen,
  onClose,
  onTaskCreated,
  initialSubjectId,
  initialTopicId,
  initialSubtopicId,
  initialTitle,
  preloadedSubjects,
  preloadedTopics,
  preloadedSubtopics,
}: TaskCreatorModalProps) {
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<number>(2);
  const [initialDate, setInitialDate] = useState<string>(getTodayDateString());

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subtopics, setSubtopics] = useState<Subtopic[]>([]);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [selectedSubtopicId, setSelectedSubtopicId] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadDropdownData();
    }
  }, [
    isOpen,
    initialSubjectId,
    initialTopicId,
    initialSubtopicId,
    initialTitle,
    preloadedSubjects,
    preloadedTopics,
    preloadedSubtopics,
  ]);

  const loadDropdownData = async () => {
    try {
      const [subData, topData, subtopData] = await Promise.all([
        preloadedSubjects ?? fetchSubjects(),
        preloadedTopics ?? fetchTopics(),
        preloadedSubtopics ?? fetchSubtopics(),
      ]);
      setSubjects(subData);
      setTopics(topData);
      setSubtopics(subtopData);

      // Pre-fill initial values if provided
      if (initialTitle) {
        setTitle(initialTitle);
      }
      if (initialSubjectId) {
        setSelectedSubjectId(initialSubjectId);
      } else if (subData.length > 0) {
        setSelectedSubjectId(subData[0].id);
      }

      if (initialTopicId) {
        setSelectedTopicId(initialTopicId);
      }
      if (initialSubtopicId) {
        setSelectedSubtopicId(initialSubtopicId);
      }
    } catch (err) {
      console.error('Error loading subjects/topics:', err);
    }
  };

  const filteredTopics = topics.filter((t) => t.subject_id === selectedSubjectId);
  const filteredSubtopics = subtopics.filter((st) => st.topic_id === selectedTopicId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('Task title is required.');
      return;
    }

    if (!selectedSubjectId) {
      setErrorMessage('Please select a subject.');
      return;
    }

    if (!selectedTopicId) {
      setErrorMessage('Please select a topic.');
      return;
    }

    setIsSubmitting(true);

    try {
      await createTask({
        title: title.trim(),
        topic_id: selectedTopicId,
        subtopic_id: selectedSubtopicId || null,
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

  if (!isOpen || !mounted) return null;

  const subjectOptions = subjects.map((s) => ({ value: s.id, label: s.name }));
  const topicOptions = filteredTopics.map((t) => ({ value: t.id, label: t.name }));
  const subtopicOptions = filteredSubtopics.map((st) => ({
    value: st.id,
    label: `${st.name} (${st.status})`,
  }));

  const priorityOptions = [
    { value: '1', label: 'Priority 1 (High - 1.5x)' },
    { value: '2', label: 'Priority 2 (Normal - 1.0x)' },
    { value: '3', label: 'Priority 3 (Low - 0.5x)' },
  ];

  return createPortal(
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[9999] bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-5">
          <div>
            <h3 className="text-base font-semibold text-zinc-100">Create Study Task</h3>
            <p className="text-xs text-zinc-400">Set topic, syllabus subtopic, priority, and schedule date</p>
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
              placeholder="Enter task name or study details..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
              required
            />
          </div>

          {/* Subject Custom Dropdown */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-zinc-300">
                Subject *
              </label>
              <Link
                href="/syllabus"
                onClick={onClose}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center space-x-1"
              >
                <span>Manage Syllabus</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {subjects.length === 0 ? (
              <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800 text-xs text-zinc-400">
                No subjects found. Create subjects in the{' '}
                <Link href="/syllabus" onClick={onClose} className="text-zinc-200 underline font-medium">
                  Syllabus tab
                </Link>.
              </div>
            ) : (
              <CustomSelect
                options={subjectOptions}
                value={selectedSubjectId}
                onChange={(val) => {
                  setSelectedSubjectId(val);
                  setSelectedTopicId('');
                  setSelectedSubtopicId('');
                }}
                placeholder="Select Subject *"
              />
            )}
          </div>

          {/* Topic Custom Dropdown */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Topic *
            </label>
            <CustomSelect
              options={topicOptions}
              value={selectedTopicId}
              onChange={(val) => {
                setSelectedTopicId(val);
                setSelectedSubtopicId('');
              }}
              placeholder={
                !selectedSubjectId
                  ? 'Select Subject first'
                  : filteredTopics.length === 0
                  ? 'No topics found under subject (Add in Syllabus tab)'
                  : 'Select Topic *'
              }
              disabled={!selectedSubjectId || filteredTopics.length === 0}
            />
          </div>

          {/* Subtopic Custom Dropdown */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Syllabus Subtopic (Optional Target)
            </label>
            <CustomSelect
              options={subtopicOptions}
              value={selectedSubtopicId}
              onChange={(val) => setSelectedSubtopicId(val)}
              placeholder={
                !selectedTopicId
                  ? 'Select Topic first'
                  : filteredSubtopics.length === 0
                  ? 'No subtopics defined (Add in Syllabus tab)'
                  : 'Select Subtopic (Optional)'
              }
              disabled={!selectedTopicId}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Priority
              </label>
              <CustomSelect
                options={priorityOptions}
                value={String(priority)}
                onChange={(val) => setPriority(Number(val))}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Initial Date
              </label>
              <input
                type="date"
                min="2026-01-01"
                max="2099-12-31"
                defaultValue={initialDate}
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
              disabled={isSubmitting || !title.trim() || !selectedSubjectId || !selectedTopicId}
              className="px-5 py-2 bg-zinc-100 text-zinc-950 font-semibold rounded-lg text-xs hover:bg-zinc-200 transition-all shadow-sm disabled:opacity-40"
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
