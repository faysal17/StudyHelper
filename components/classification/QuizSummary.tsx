'use client';

import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Axis } from '@/lib/wordClassification';

type ClassificationUpdate = { word: string; axis: Axis; isCorrect: boolean };
type ResultEntry = {
  kind: 'forward' | 'reverse' | 'exam';
  qLabel: string;
  shown: string;
  correct: string;
  chosen: string;
  wasCorrect: boolean;
  update: ClassificationUpdate | null;
};

export default function QuizSummary({
  score,
  total,
  results,
  onRestart,
  onGoToDashboard,
}: {
  score: number;
  total: number;
  results: ResultEntry[];
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

      if (!isSupabaseConfigured || !supabase) {
        setSaving(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('ব্যবহারকারী লগইন অবস্থায় নেই। ফলাফল সংরক্ষণ করা সম্ভব হয়নি।');
      }

      const { error: attemptError } = await supabase.from('quiz_attempts').insert({
        user_id: user.id,
        mode: 'classification',
        score,
        total_questions: total,
      });

      if (attemptError) throw attemptError;

      const updates = results.map((r) => r.update).filter((u): u is ClassificationUpdate => Boolean(u));
      const srsKey = (word: string, axis: string) => `${word} ${axis}`;
      const wordsPlayed = [...new Set(updates.map((u) => u.word))];

      if (wordsPlayed.length > 0) {
        const { data: srsRecords, error: srsFetchError } = await supabase
          .from('user_classification_srs')
          .select('word, axis, box, next_review_at')
          .in('word', wordsPlayed);

        if (srsFetchError) throw srsFetchError;

        const srsMap: Record<string, { box: number; nextReviewAt: Date }> = {};
        (srsRecords || []).forEach((r: any) => {
          srsMap[srsKey(r.word, r.axis)] = { box: r.box, nextReviewAt: new Date(r.next_review_at) };
        });

        const intervals = [0, 1, 3, 7, 14, 30];
        const now = new Date();
        const srsStateByKey: Record<string, { word: string; axis: string; box: number; nextReviewAt: Date }> = {};

        updates.forEach((u) => {
          const key = srsKey(u.word, u.axis);
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

          srsStateByKey[key] = { word: u.word, axis: u.axis, box: newBox, nextReviewAt };
        });

        const srsInserts = Object.values(srsStateByKey).map((state) => ({
          user_id: user.id,
          word: state.word,
          axis: state.axis,
          box: state.box,
          interval_days: intervals[state.box],
          next_review_at: state.nextReviewAt.toISOString(),
          last_reviewed_at: new Date().toISOString(),
        }));

        if (srsInserts.length > 0) {
          const { error: srsUpsertError } = await supabase
            .from('user_classification_srs')
            .upsert(srsInserts, { onConflict: 'user_id,word,axis' });

          if (srsUpsertError) throw srsUpsertError;
        }
      }
    } catch (err: any) {
      console.error('Error saving classification quiz results:', err);
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
          {wrongOnes.map((r, idx) => (
            <li key={idx} className="review-item">
              <span className="rt">
                {r.qLabel}{' '}
                <span style={{ fontSize: '10.5px', color: 'var(--gold)', marginLeft: '6px', fontFamily: 'sans-serif' }}>
                  [{r.kind === 'exam' ? 'প্রশ্নব্যাংক' : r.kind === 'reverse' ? 'শব্দ বাছাই' : 'শ্রেণি নির্ণয়'}]
                </span>
              </span>
              তুমি লিখেছিলে <span className="rw">{r.chosen}</span> — সঠিক উত্তর: <span className="rc">{r.correct}</span>
            </li>
          ))}
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
