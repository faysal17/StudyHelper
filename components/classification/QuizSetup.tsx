'use client';

import { useState, useEffect } from 'react';
import type { Axis, ClassificationEntry } from '@/lib/wordClassification';

const AXIS_OPTIONS: { value: Axis | 'all'; label: string }[] = [
  { value: 'all', label: 'সব' },
  { value: 'গঠন', label: 'গঠন অনুসারে' },
  { value: 'অর্থ', label: 'অর্থ অনুসারে' },
  { value: 'উৎপত্তি', label: 'উৎপত্তি অনুসারে' },
];

export default function QuizSetup({
  entries,
  onStart,
  onBackToDashboard,
}: {
  entries: ClassificationEntry[];
  onStart: (pool: ClassificationEntry[], size: number, answerMode: string) => void;
  onBackToDashboard: () => void;
}) {
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
  const [isStudyMode, setIsStudyMode] = useState(false);

  useEffect(() => {
    localStorage.setItem('bangla_classification_axis', axisFilter);
  }, [axisFilter]);

  useEffect(() => {
    localStorage.setItem('bangla_classification_answer_mode', answerMode);
  }, [answerMode]);

  useEffect(() => {
    localStorage.setItem('bangla_classification_qcount', sessionSize.toString());
  }, [sessionSize]);

  const pool = axisFilter === 'all' ? entries : entries.filter((e) => e.axis === axisFilter);

  const handleStart = () => {
    if (pool.length === 0) return;
    onStart(pool, sessionSize, answerMode);
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
          {pool.map((e) => (
            <div key={`${e.word}-${e.axis}`} className="study-word-block">
              <div className="study-word">{e.word}</div>
              <div className="study-syns">
                {e.axis} — {labelFor(e)}
              </div>
            </div>
          ))}
        </div>
        <button className="start-btn" onClick={handleStart} disabled={pool.length === 0}>
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
  );
}
