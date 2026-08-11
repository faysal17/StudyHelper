'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Axis, ClassificationEntry } from '@/lib/wordClassification';
import { buildChapters } from '@/lib/wordClassification';

const AXIS_OPTIONS: { value: Axis | 'all'; label: string }[] = [
  { value: 'all', label: 'সব' },
  { value: 'গঠন', label: 'গঠন অনুসারে' },
  { value: 'অর্থ', label: 'অর্থ অনুসারে' },
  { value: 'উৎপত্তি', label: 'উৎপত্তি অনুসারে' },
];

export default function QuizSetup({
  entries,
  completedChapters,
  onStart,
  onBackToDashboard,
}: {
  entries: ClassificationEntry[];
  completedChapters: Set<string>;
  onStart: (mode: string, pool: ClassificationEntry[], size: number, selectedChunkKeys: string[], answerMode: string) => void;
  onBackToDashboard: () => void;
}) {
  const [setupMode, setSetupMode] = useState(() => {
    if (typeof window === 'undefined') return 'normal';
    return localStorage.getItem('bangla_classification_setup_mode') || 'normal';
  });
  const [axisFilter, setAxisFilter] = useState<Axis | 'all'>(() => {
    if (typeof window === 'undefined') return 'all';
    return (localStorage.getItem('bangla_classification_axis') as Axis | 'all') || 'all';
  });
  const [answerMode, setAnswerMode] = useState(() => {
    if (typeof window === 'undefined') return 'write';
    return localStorage.getItem('bangla_classification_answer_mode') || 'write';
  });
  const [sessionSize, setSessionSize] = useState(() => {
    if (typeof window === 'undefined') return 10;
    const saved = localStorage.getItem('bangla_classification_qcount');
    return saved ? parseInt(saved, 10) : 10;
  });
  const [selectedChapterKeys, setSelectedChapterKeys] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    const saved = localStorage.getItem('bangla_classification_selected_chapters');
    try {
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [isStudyMode, setIsStudyMode] = useState(false);

  useEffect(() => {
    localStorage.setItem('bangla_classification_setup_mode', setupMode);
  }, [setupMode]);

  useEffect(() => {
    localStorage.setItem('bangla_classification_axis', axisFilter);
  }, [axisFilter]);

  useEffect(() => {
    localStorage.setItem('bangla_classification_answer_mode', answerMode);
  }, [answerMode]);

  useEffect(() => {
    localStorage.setItem('bangla_classification_qcount', sessionSize.toString());
  }, [sessionSize]);

  useEffect(() => {
    localStorage.setItem('bangla_classification_selected_chapters', JSON.stringify(Array.from(selectedChapterKeys)));
  }, [selectedChapterKeys]);

  const pool = axisFilter === 'all' ? entries : entries.filter((e) => e.axis === axisFilter);

  const chapters = useMemo(() => buildChapters(entries), [entries]);
  const chaptersByAxis = useMemo(() => {
    const grouped: Record<Axis, typeof chapters> = { 'গঠন': [], 'অর্থ': [], 'উৎপত্তি': [] };
    chapters.forEach((c) => grouped[c.axis].push(c));
    return grouped;
  }, [chapters]);

  const selectedChapters = chapters.filter((c) => selectedChapterKeys.has(c.key));
  const chapterPool = selectedChapters.flatMap((c) => c.entries);

  const studyPool = setupMode === 'chapter' ? chapterPool : pool;

  const handleStart = () => {
    if (pool.length === 0) return;
    onStart('normal', pool, sessionSize, [], answerMode);
  };

  const handleStartChapters = () => {
    if (chapterPool.length === 0) return;
    onStart('chapter', chapterPool, chapterPool.length, Array.from(selectedChapterKeys), answerMode);
  };

  const handleStudyStart = () => {
    if (setupMode === 'chapter') {
      handleStartChapters();
    } else {
      handleStart();
    }
  };

  const toggleChapter = (key: string) => {
    const next = new Set(selectedChapterKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedChapterKeys(next);
  };

  const selectAllChapters = () => {
    setSelectedChapterKeys(new Set(chapters.filter((c) => c.axis !== 'গঠন').map((c) => c.key)));
  };

  const clearChapterSelection = () => {
    setSelectedChapterKeys(new Set());
  };

  const labelFor = (e: ClassificationEntry) =>
    e.axis === 'উৎপত্তি' && e.subGroup === 'বিদেশি' && e.originLanguage
      ? `${e.subGroup} (${e.originLanguage})`
      : e.subGroup;

  if (isStudyMode) {
    return (
      <div className="study-card">
        <button className="back-link" onClick={() => setIsStudyMode(false)}>
          ← সেটআপে ফিরি
        </button>
        <div className="study-words-container">
          {studyPool.map((e) => (
            <div key={`${e.word}-${e.axis}`} className="study-word-block">
              <div className="study-word">{e.word}</div>
              <div className="study-syns">
                {e.axis} — {labelFor(e)}
              </div>
            </div>
          ))}
        </div>
        <button className="start-btn" onClick={handleStudyStart} disabled={studyPool.length === 0}>
          অনুশীলন শুরু করি
        </button>
      </div>
    );
  }

  return (
    <div className="setup-card">
      <button className="back-link" onClick={onBackToDashboard}>
        ← ড্যাশবোর্ডে ফিরি
      </button>

      <div className="mode-tabs">
        <button className={`mode-tab ${setupMode === 'normal' ? 'active' : ''}`} onClick={() => setSetupMode('normal')}>
          স্বাভাবিক অনুশীলন
        </button>
        <button className={`mode-tab ${setupMode === 'chapter' ? 'active' : ''}`} onClick={() => setSetupMode('chapter')}>
          চ্যাপ্টার ভিত্তিক
        </button>
      </div>

      {setupMode === 'normal' ? (
        <div id="normalPanel">
          <div className="setup-label">কোন অংশ থেকে অনুশীলন করবেন</div>
          <div className="mode-tabs">
            {AXIS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`mode-tab ${axisFilter === opt.value ? 'active' : ''}`}
                onClick={() => setAxisFilter(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="setup-label">উত্তর দেওয়ার মাধ্যম</div>
          <div className="mode-tabs">
            <button className={`mode-tab ${answerMode === 'write' ? 'active' : ''}`} onClick={() => setAnswerMode('write')}>
              লিখে উত্তর দিন
            </button>
            <button className={`mode-tab ${answerMode === 'mcq' ? 'active' : ''}`} onClick={() => setAnswerMode('mcq')}>
              বহুনির্বাচনী (MCQ)
            </button>
          </div>

          <div className="setup-label">সেশনের দৈর্ঘ্য</div>
          <div className="size-row">
            {[8, 10, 15, 25].map((n) => (
              <button
                key={n}
                className={`size-btn ${sessionSize === n ? 'active' : ''}`}
                onClick={() => setSessionSize(n)}
              >
                {n}টি
              </button>
            ))}
          </div>
          <div className="qcount-row">
            <label htmlFor="classQCount" className="qcount-label">
              অথবা নিজে সংখ্যা দাও
            </label>
            <input
              type="number"
              id="classQCount"
              min="1"
              max="150"
              value={sessionSize}
              onChange={(e) => {
                const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                setSessionSize(val);
              }}
              className="qcount-input"
            />
          </div>

          <div className="chunk-btns-row">
            <button className="start-btn secondary" onClick={() => setIsStudyMode(true)} disabled={pool.length === 0}>
              শব্দগুলো পড়ি
            </button>
            <button className="start-btn" onClick={handleStart} disabled={pool.length === 0}>
              শুরু করি
            </button>
          </div>
          <div className="note">
            নির্বাচিত অংশে {pool.length}টি শব্দ-তথ্য আছে। MCQ মোডে কিছু প্রশ্ন আসল BCS প্রশ্নব্যাংক থেকে আসবে।
          </div>
        </div>
      ) : (
        <div id="chapterPanel">
          <div className="setup-label">উত্তর দেওয়ার মাধ্যম</div>
          <div className="mode-tabs">
            <button className={`mode-tab ${answerMode === 'write' ? 'active' : ''}`} onClick={() => setAnswerMode('write')}>
              লিখে উত্তর দিন
            </button>
            <button className={`mode-tab ${answerMode === 'mcq' ? 'active' : ''}`} onClick={() => setAnswerMode('mcq')}>
              বহুনির্বাচনী (MCQ)
            </button>
          </div>

          <div className="setup-label">চ্যাপ্টার বেছে নাও (একাধিক নেওয়া যায়)</div>
          {(['গঠন', 'অর্থ', 'উৎপত্তি'] as Axis[]).map((axis) => (
            <div key={axis} style={{ marginBottom: '10px' }}>
              <div className="setup-label" style={{ fontSize: '12px', opacity: 0.75 }}>
                {axis}
                {axis === 'গঠন' && ' (চ্যাপ্টার ভিত্তিক অনুশীলনের জন্য উপলব্ধ নয়)'}
              </div>
              <div className="chunk-grid">
                {chaptersByAxis[axis].map((chapter) => {
                  const isDisabled = axis === 'গঠন';
                  const isSelected = selectedChapterKeys.has(chapter.key);
                  const isDone = completedChapters.has(chapter.key);
                  const wordsList = chapter.entries.map((e) => e.word).join(', ');
                  return (
                    <button
                      key={chapter.key}
                      className={`chunk-btn ${isSelected ? 'selected' : ''} ${isDone ? 'chunk-done' : ''}`}
                      onClick={() => toggleChapter(chapter.key)}
                      disabled={isDisabled}
                    >
                      <span className="ccheck"></span>
                      <span className="cnum">{chapter.label}</span>
                      <span className="cwords">{wordsList}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="chunk-actions-row">
            <button className="link-btn" onClick={selectAllChapters}>
              সব নির্বাচন করি
            </button>
            <button className="link-btn" onClick={clearChapterSelection}>
              মুছে ফেলি
            </button>
          </div>

          <div className="selection-summary">
            {selectedChapterKeys.size === 0 ? (
              'কোনো চ্যাপ্টার এখনো বাছা হয়নি'
            ) : (
              <span>
                নির্বাচিত: <b>{selectedChapterKeys.size}টি চ্যাপ্টার</b> · <b>{chapterPool.length}টি তথ্য</b>
              </span>
            )}
          </div>

          <div className="chunk-btns-row">
            <button className="start-btn secondary" disabled={selectedChapterKeys.size === 0} onClick={() => setIsStudyMode(true)}>
              শব্দগুলো পড়ি
            </button>
            <button className="start-btn" disabled={selectedChapterKeys.size === 0} onClick={handleStartChapters}>
              অনুশীলন শুরু করি
            </button>
          </div>
          <div className="note">
            প্রতিটি চ্যাপ্টারে সর্বোচ্চ ১৬টি শব্দ-তথ্য আছে, যাতে এক বসাতেই পড়ে ফেলা যায়। চ্যাপ্টার ভিত্তিক সেশনে শুধু নির্বাচিত চ্যাপ্টারের প্রশ্নই আসবে, BCS প্রশ্নব্যাংক থেকে কোনো প্রশ্ন মেশানো হবে না।
          </div>
        </div>
      )}
    </div>
  );
}
