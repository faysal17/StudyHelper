'use client';

import { useState, useEffect } from 'react';

type WordEntry = [string, string[], string];

export default function QuizSetup({
  words,
  completedChapters,
  onStart,
  onBackToDashboard,
}: {
  words: WordEntry[];
  completedChapters: Set<number>;
  onStart: (mode: string, pool: WordEntry[], size: number, selectedChunkIndices: number[], answerMode: string) => void;
  onBackToDashboard: () => void;
}) {
  const [mode, setMode] = useState(() => {
    if (typeof window === 'undefined') return 'random';
    return localStorage.getItem('bangla_quiz_mode') || 'random';
  });
  const [sessionSize, setSessionSize] = useState(() => {
    if (typeof window === 'undefined') return 8;
    const saved = localStorage.getItem('bangla_quiz_session_size');
    return saved ? parseInt(saved, 10) : 8;
  });
  const [randomQCount, setRandomQCount] = useState(() => {
    if (typeof window === 'undefined') return 8;
    const saved = localStorage.getItem('bangla_quiz_random_qcount');
    return saved ? parseInt(saved, 10) : 8;
  });
  const [selectedChunks, setSelectedChunks] = useState<Set<number>>(() => {
    if (typeof window === 'undefined') return new Set();
    const saved = localStorage.getItem('bangla_quiz_selected_chunks');
    try {
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [chunkQCount, setChunkQCount] = useState(() => {
    if (typeof window === 'undefined') return 4;
    const saved = localStorage.getItem('bangla_quiz_chunk_qcount');
    return saved ? parseInt(saved, 10) : 4;
  });
  const [chunkQCountTouched, setChunkQCountTouched] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('bangla_quiz_chunk_qcount_touched') === 'true';
  });
  const [isStudyMode, setIsStudyMode] = useState(false);
  const [answerMode, setAnswerMode] = useState(() => {
    if (typeof window === 'undefined') return 'write';
    return localStorage.getItem('bangla_quiz_answer_mode') || 'write';
  });

  const chunks: WordEntry[][] = [];
  for (let i = 0; i < words.length; i += 4) {
    chunks.push(words.slice(i, i + 4));
  }

  const getSelectedPool = () => {
    return Array.from(selectedChunks)
      .sort((a, b) => a - b)
      .flatMap((idx) => chunks[idx] || []);
  };

  const selectedPool = getSelectedPool();

  useEffect(() => {
    localStorage.setItem('bangla_quiz_mode', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('bangla_quiz_session_size', sessionSize.toString());
  }, [sessionSize]);

  useEffect(() => {
    localStorage.setItem('bangla_quiz_random_qcount', randomQCount.toString());
  }, [randomQCount]);

  useEffect(() => {
    localStorage.setItem('bangla_quiz_selected_chunks', JSON.stringify(Array.from(selectedChunks)));
  }, [selectedChunks]);

  useEffect(() => {
    localStorage.setItem('bangla_quiz_chunk_qcount', chunkQCount.toString());
  }, [chunkQCount]);

  useEffect(() => {
    localStorage.setItem('bangla_quiz_chunk_qcount_touched', chunkQCountTouched.toString());
  }, [chunkQCountTouched]);

  useEffect(() => {
    localStorage.setItem('bangla_quiz_answer_mode', answerMode);
  }, [answerMode]);

  useEffect(() => {
    if (!chunkQCountTouched && selectedPool.length > 0) {
      setChunkQCount(selectedPool.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChunks, chunkQCountTouched, selectedPool.length]);

  const toggleChunk = (idx: number) => {
    const next = new Set(selectedChunks);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setSelectedChunks(next);
  };

  const selectAllChunks = () => {
    const next = new Set(chunks.map((_, i) => i));
    setSelectedChunks(next);
  };

  const clearChunkSelection = () => {
    setSelectedChunks(new Set());
    setChunkQCountTouched(false);
  };

  const handleStartRandom = () => {
    const count = randomQCount || sessionSize;
    onStart('random', words, count, Array.from(selectedChunks), answerMode);
  };

  const handleStartChunk = () => {
    if (selectedPool.length === 0) return;
    const count = chunkQCount || selectedPool.length;
    onStart('chunk', selectedPool, count, Array.from(selectedChunks), answerMode);
  };

  if (isStudyMode) {
    return (
      <div className="study-card">
        <button className="back-link" onClick={() => setIsStudyMode(false)}>
          ← চ্যাপ্টার তালিকায় ফিরি
        </button>
        <div className="study-words-container">
          {selectedPool.map(([word, alternatives]) => (
            <div key={word} className="study-word-block">
              <div className="study-word">{word}</div>
              <div className="study-syns">{alternatives.join(', ')}</div>
            </div>
          ))}
        </div>
        <button className="start-btn" onClick={handleStartChunk}>
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
        <button className={`mode-tab ${mode === 'random' ? 'active' : ''}`} onClick={() => setMode('random')}>
          র‍্যান্ডম সেশন
        </button>
        <button className={`mode-tab ${mode === 'chunk' ? 'active' : ''}`} onClick={() => setMode('chunk')}>
          চ্যাপ্টার (৪+৪)
        </button>
      </div>

      {mode === 'random' ? (
        <div id="randomPanel">
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
            {[6, 8, 12, 20].map((n) => (
              <button
                key={n}
                className={`size-btn ${sessionSize === n && randomQCount === n ? 'active' : ''}`}
                onClick={() => {
                  setSessionSize(n);
                  setRandomQCount(n);
                }}
              >
                {n}টি
              </button>
            ))}
          </div>
          <div className="qcount-row">
            <label htmlFor="randomQCount" className="qcount-label">
              অথবা নিজে সংখ্যা দাও
            </label>
            <input
              type="number"
              id="randomQCount"
              min="1"
              max="120"
              value={randomQCount}
              onChange={(e) => {
                const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                setRandomQCount(val);
              }}
              className="qcount-input"
            />
          </div>
          <button className="start-btn" onClick={handleStartRandom}>
            শুরু করি
          </button>
          <div className="note">
            সংখ্যা ৪৪-এর বেশি দিলে কিছু শব্দ একাধিকবার আসবে, প্রতিবার ভিন্ন সমার্থক শব্দ দিয়ে।
          </div>
        </div>
      ) : (
        <div id="chunkGridPanel">
          <div className="setup-label">উত্তর দেওয়ার মাধ্যম</div>
          <div className="mode-tabs">
            <button className={`mode-tab ${answerMode === 'write' ? 'active' : ''}`} onClick={() => setAnswerMode('write')}>
              লিখে উত্তর দিন
            </button>
            <button className={`mode-tab ${answerMode === 'mcq' ? 'active' : ''}`} onClick={() => setAnswerMode('mcq')}>
              বহুনির্বাচনী (MCQ)
            </button>
          </div>

          <div className="setup-label">১১টি চ্যাপ্টার থেকে বেছে নাও (একাধিক নেওয়া যায়)</div>
          <div className="chunk-grid">
            {chunks.map((chunk, idx) => {
              const isSelected = selectedChunks.has(idx);
              const isDone = completedChapters.has(idx);
              const wordsList = chunk.map(([w]) => w).join(', ');
              return (
                <button
                  key={idx}
                  className={`chunk-btn ${isSelected ? 'selected' : ''} ${isDone ? 'chunk-done' : ''}`}
                  onClick={() => toggleChunk(idx)}
                >
                  <span className="ccheck"></span>
                  <span className="cnum">চ্যাপ্টার {idx + 1}</span>
                  <span className="cwords">{wordsList}</span>
                </button>
              );
            })}
          </div>

          <div className="chunk-actions-row">
            <button className="link-btn" onClick={selectAllChunks}>
              সব নির্বাচন করি
            </button>
            <button className="link-btn" onClick={clearChunkSelection}>
              মুছে ফেলি
            </button>
          </div>

          <div className="selection-summary">
            {selectedChunks.size === 0 ? (
              'কোনো চ্যাপ্টার এখনো বাছা হয়নি'
            ) : (
              <span>
                নির্বাচিত: <b>{selectedChunks.size}টি চ্যাপ্টার</b> · <b>{selectedPool.length}টি শব্দ</b>
              </span>
            )}
          </div>

          <div className="qcount-row">
            <label htmlFor="chunkQCount" className="qcount-label">
              প্রশ্ন সংখ্যা
            </label>
            <input
              type="number"
              id="chunkQCount"
              min="1"
              max="200"
              value={chunkQCount}
              onChange={(e) => {
                setChunkQCountTouched(true);
                const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                setChunkQCount(val);
              }}
              className="qcount-input"
            />
          </div>

          <div className="chunk-btns-row">
            <button className="start-btn secondary" disabled={selectedChunks.size === 0} onClick={() => setIsStudyMode(true)}>
              শব্দগুলো পড়ি
            </button>
            <button className="start-btn" disabled={selectedChunks.size === 0} onClick={handleStartChunk}>
              অনুশীলন শুরু করি
            </button>
          </div>
          <div className="note">
            প্রশ্ন সংখ্যা বাছাই করা শব্দের সংখ্যার চেয়ে বেশি দিলে কিছু শব্দ একাধিকবার আসবে, প্রতিবার ভিন্ন সমার্থক শব্দ দিয়ে।
          </div>
        </div>
      )}
    </div>
  );
}
