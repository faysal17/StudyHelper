'use client';

import { useState, useEffect } from 'react';
import {
  isSupabaseConfigured,
  getCurrentAuthUser,
  insertSynonymQuizAttempt,
  fetchSynonymSrsForWords,
  upsertSynonymSrsRecords,
  insertIncorrectSynonymAnswers,
  markSynonymChunksCompleted,
} from '@/lib/supabase';

type SynonymUpdate = { word: string; synonym: string; isCorrect: boolean };
type ResultEntry = {
  type: 'synonym' | 'odd';
  shown: string;
  correct: string;
  chosen: string;
  wasCorrect: boolean;
  synonymUpdates: SynonymUpdate[];
};

export default function QuizSummary({
  score,
  total,
  results,
  mode,
  selectedChunks,
  onRestart,
  onGoToDashboard,
}: {
  score: number;
  total: number;
  results: ResultEntry[];
  mode: string;
  selectedChunks: number[];
  onRestart: () => void;
  onGoToDashboard: () => void;
}) {
  const [saving, setSaving] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    saveSessionResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSessionResults = async () => {
    try {
      setSaving(true);
      setError(null);

      if (!isSupabaseConfigured) {
        setSaving(false);
        return;
      }

      const user = await getCurrentAuthUser();
      if (!user) {
        throw new Error('ব্যবহারকারী লগইন অবস্থায় নেই। ফলাফল সংরক্ষণ করা সম্ভব হয়নি।');
      }

      const { data: attemptData, error: attemptError } = await insertSynonymQuizAttempt({
        user_id: user.id,
        mode: mode,
        score: score,
        total_questions: total,
      });

      if (attemptError) throw attemptError;

      const attemptId = attemptData.id;

      const synonymUpdates = results.flatMap((r) => r.synonymUpdates || []);
      const wordsPlayed = [...new Set(synonymUpdates.map((u) => u.word))];
      const { data: srsRecords, error: srsFetchError } = await fetchSynonymSrsForWords(wordsPlayed);

      if (srsFetchError) throw srsFetchError;

      const srsKey = (word: string, synonym: string) => `${word} ${synonym}`;
      const srsMap: Record<string, { box: number; nextReviewAt: Date }> = {};
      srsRecords?.forEach((r: any) => {
        srsMap[srsKey(r.word, r.synonym)] = {
          box: r.box,
          nextReviewAt: new Date(r.next_review_at),
        };
      });

      const intervals = [0, 1, 3, 7, 14, 30];
      const now = new Date();
      const srsStateByKey: Record<string, { word: string; synonym: string; box: number; nextReviewAt: Date }> = {};
      synonymUpdates.forEach((u) => {
        const key = srsKey(u.word, u.synonym);
        const record = srsMap[key];
        const prevBox = srsStateByKey[key] ? srsStateByKey[key].box : record ? record.box : 0;
        const prevNextReviewAt = srsStateByKey[key] ? srsStateByKey[key].nextReviewAt : record ? record.nextReviewAt : null;

        const isDue = !prevNextReviewAt || prevNextReviewAt <= now;
        const isCorrect = u.isCorrect;

        let newBox: number;
        if (isCorrect) {
          newBox = isDue ? Math.min(5, prevBox + 1) : prevBox;
        } else {
          newBox = 0;
        }

        const interval = intervals[newBox];

        let nextReviewAt: Date;
        if (newBox === 0) {
          nextReviewAt = new Date();
        } else if (!isDue && isCorrect && prevNextReviewAt) {
          nextReviewAt = prevNextReviewAt;
        } else {
          nextReviewAt = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);
        }

        srsStateByKey[key] = { word: u.word, synonym: u.synonym, box: newBox, nextReviewAt };
      });

      const srsInserts = Object.values(srsStateByKey).map((state) => ({
        user_id: user.id,
        word: state.word,
        synonym: state.synonym,
        box: state.box,
        interval_days: intervals[state.box],
        next_review_at: state.nextReviewAt.toISOString(),
        last_reviewed_at: new Date().toISOString(),
      }));

      if (srsInserts.length > 0) {
        const { error: srsUpsertError } = await upsertSynonymSrsRecords(srsInserts);

        if (srsUpsertError) throw srsUpsertError;
      }

      const wrongAnswers = results.filter((r) => !r.wasCorrect);
      if (wrongAnswers.length > 0) {
        const wrongInserts = wrongAnswers.map((r) => ({
          user_id: user.id,
          attempt_id: attemptId,
          shown_synonym: r.shown,
          correct_word: r.correct,
          user_provided_word: r.chosen,
        }));

        const { error: wrongError } = await insertIncorrectSynonymAnswers(wrongInserts);

        if (wrongError) throw wrongError;
      }

      if (mode === 'chunk' && score === total && selectedChunks && selectedChunks.length > 0) {
        const uniqueChunks = [...new Set(selectedChunks)];
        const completedInserts = uniqueChunks.map((chunkIdx) => ({
          user_id: user.id,
          chunk_index: chunkIdx,
        }));

        const { error: completedError } = await markSynonymChunksCompleted(completedInserts);

        if (completedError) throw completedError;
      }
    } catch (err: any) {
      console.error('Error saving quiz results:', err);
      setError(`ফলাফল সার্ভারে সংরক্ষণ করার সময় সমস্যা হয়েছে: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  const wrongOnes = results.filter((r) => !r.wasCorrect);

  return (
    <div className="summary-card">
      <div className="big-score-label">সেশন শেষ</div>
      <div className="big-score">
        {score}/{total}
      </div>

      {saving && (
        <div style={{ margin: '14px 0', fontSize: '13px', color: 'var(--gold)' }}>
          ফলাফল সংরক্ষণ করা হচ্ছে...
        </div>
      )}

      {error && (
        <div className="auth-error" style={{ margin: '14px 0' }}>
          {error}
        </div>
      )}

      {wrongOnes.length === 0 && !saving && <div className="perfect">সবগুলো ঠিক! এই সেটটা মাথায় গেঁথে গেছে।</div>}

      {wrongOnes.length > 0 && (
        <ul className="review-list">
          {wrongOnes.map((r, idx) => {
            const isOdd = r.type === 'odd';
            const typeLabel = isOdd ? '[সমার্থক নয় এমন শব্দ]' : '[সমার্থক থেকে মূল শব্দ]';
            return (
              <li key={idx} className="review-item">
                <span className="rt">
                  {r.shown}{' '}
                  <span style={{ fontSize: '10.5px', color: 'var(--gold)', marginLeft: '6px', fontFamily: 'sans-serif' }}>
                    {typeLabel}
                  </span>
                </span>
                {isOdd ? 'তোমার উত্তর ' : 'তুমি লিখেছিলে '}
                <span className="rw">{r.chosen}</span> — সঠিক উত্তর: <span className="rc">{r.correct}</span>
              </li>
            );
          })}
        </ul>
      )}

      <div style={{ marginTop: '24px' }}>
        <button className="again-btn" onClick={onRestart}>
          নতুন সেশন
        </button>
        <button className="dashboard-link" onClick={onGoToDashboard}>
          ড্যাশবোর্ডে ফিরি
        </button>
      </div>
    </div>
  );
}
