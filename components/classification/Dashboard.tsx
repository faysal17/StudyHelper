'use client';

import { useState, useEffect } from 'react';
import { isSupabaseConfigured, fetchAllClassificationQuizAttempts, fetchAllClassificationSrsRecords } from '@/lib/supabase';
import ClassificationBlock from './ClassificationBlock';
import type { ClassificationEntry, RevisionItem } from '@/lib/wordClassification';

export default function Dashboard({
  user,
  entries,
  onStartQuiz,
  onStartReview,
}: {
  user: { email?: string | null; user_metadata?: { full_name?: string } };
  entries: ClassificationEntry[];
  onStartQuiz: () => void;
  onStartReview: (answerMode: 'write' | 'mcq', reviewList: RevisionItem[]) => void;
}) {
  const [stats, setStats] = useState({
    totalAttempts: 0,
    averageAccuracy: 0,
    masteredFacts: 0,
  });
  const [revisionList, setRevisionList] = useState<RevisionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, entries]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      if (!isSupabaseConfigured) return;

      const { data: attemptsData, error: attemptsError } = await fetchAllClassificationQuizAttempts();

      if (attemptsError) throw attemptsError;

      const { data: srsData, error: srsError } = await fetchAllClassificationSrsRecords();

      if (srsError) throw srsError;

      const totalAttempts = attemptsData ? attemptsData.length : 0;
      let averageAccuracy = 0;
      if (totalAttempts > 0) {
        const totalCorrect = attemptsData.reduce((acc: number, curr: any) => acc + curr.score, 0);
        const totalQ = attemptsData.reduce((acc: number, curr: any) => acc + curr.total_questions, 0);
        averageAccuracy = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;
      }

      const boxByKey: Record<string, number> = {};
      (srsData || []).forEach((r: any) => {
        boxByKey[`${r.word} ${r.axis}`] = r.box;
      });

      const masteredFacts = entries.filter((e) => boxByKey[`${e.word} ${e.axis}`] === 5).length;

      const now = new Date();
      const matchedReviews: RevisionItem[] = (srsData || [])
        .filter((r: any) => new Date(r.next_review_at) <= now)
        .map((r: any) => {
          const match = entries.find((e) => e.word === r.word && e.axis === r.axis);
          if (!match) return null;
          const label = match.axis === 'উৎপত্তি' && match.subGroup === 'বিদেশি'
            ? `${match.subGroup} (${match.originLanguage})`
            : match.subGroup;
          return { word: r.word, axis: r.axis, label: `${match.axis} — ${label}` };
        })
        .filter((r: RevisionItem | null): r is RevisionItem => Boolean(r));

      setStats({ totalAttempts, averageAccuracy, masteredFacts });
      setRevisionList(matchedReviews);
    } catch (err) {
      console.error('Error fetching classification dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>ড্যাশবোর্ড লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="welcome-banner">
        <h2>স্বাগতম, {user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'শিক্ষার্থী')}!</h2>
        <p>
          শব্দের শ্রেণিবিভাগ (গঠন, অর্থ ও উৎপত্তি অনুসারে) অনুশীলন করুন এবং আসল BCS প্রশ্নব্যাংক দিয়ে নিজেকে যাচাই করুন।
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-val">{stats.totalAttempts}টি</div>
          <div className="stat-label">মোট অনুশীলন</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{stats.averageAccuracy}%</div>
          <div className="stat-label">গড় নির্ভুলতা</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{stats.masteredFacts}টি</div>
          <div className="stat-label">আয়ত্ত করা শ্রেণি-তথ্য</div>
        </div>
      </div>

      <div className="dashboard-sections">
        <div className="dashboard-section">
          <div className="section-header">
            <h3 className="section-title">অধ্যয়ন এবং অনুশীলন টপিকসমূহ</h3>
          </div>

          <div className="topics-section">
            <div className="topics-grid">
              <div className="topic-card" onClick={onStartQuiz}>
                <div>
                  <div className="topic-category">শব্দতত্ত্ব (Word Classification)</div>
                  <h4 className="topic-title">শব্দের শ্রেণিবিভাগ</h4>
                  <p className="topic-desc">
                    গঠন, অর্থ ও উৎপত্তি অনুসারে শব্দের শ্রেণি এবং বিদেশি শব্দের উৎস ভাষা অনুশীলন করুন — সাথে আসল BCS প্রশ্নব্যাংক।
                  </p>
                </div>
                <div className="topic-footer">
                  <span className="topic-progress">{stats.masteredFacts}/{entries.length} তথ্য আয়ত্ত</span>
                  <span className="topic-action">অনুশীলন করুন</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-section">
          <div className="section-header">
            <h3 className="section-title">আজকের রিভিশন লিস্ট</h3>
          </div>
          <ClassificationBlock revisionList={revisionList} onStartReview={onStartReview} />
        </div>
      </div>
    </div>
  );
}
