'use client';

import { useState, useEffect } from 'react';
import { isSupabaseConfigured, fetchAllSynonymQuizAttempts, fetchAllSynonymSrsRecords } from '@/lib/supabase';
import SynonymBlock from './SynonymBlock';

type WordEntry = [string, string[], string];
type RevisionItem = { word: string; alternatives: string[]; cluster: string };

export default function Dashboard({
  user,
  words,
  onStartQuiz,
  onStartReview,
}: {
  user: { email?: string | null; user_metadata?: { full_name?: string } };
  words: WordEntry[];
  onStartQuiz: () => void;
  onStartReview: (answerMode: 'write' | 'mcq', reviewList: RevisionItem[]) => void;
}) {
  const [stats, setStats] = useState({
    totalAttempts: 0,
    averageAccuracy: 0,
    totalQuestions: 0,
    masteredWords: 0,
  });
  const [revisionList, setRevisionList] = useState<RevisionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && words.length > 0) {
      fetchUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, words]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      if (!isSupabaseConfigured) return;

      const { data: attemptsData, error: attemptsError } = await fetchAllSynonymQuizAttempts();

      if (attemptsError) throw attemptsError;

      const { data: srsData, error: srsError } = await fetchAllSynonymSrsRecords();

      if (srsError) throw srsError;

      const totalAttempts = attemptsData ? attemptsData.length : 0;
      let averageAccuracy = 0;
      if (totalAttempts > 0) {
        const totalCorrect = attemptsData.reduce((acc: number, curr: any) => acc + curr.score, 0);
        const totalQ = attemptsData.reduce((acc: number, curr: any) => acc + curr.total_questions, 0);
        averageAccuracy = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;
      }

      const recordsByWord: Record<string, any[]> = {};
      srsData?.forEach((r: any) => {
        if (!recordsByWord[r.word]) recordsByWord[r.word] = [];
        recordsByWord[r.word].push(r);
      });

      const practicedWords = Object.keys(recordsByWord);
      const totalQuestions = practicedWords.length;

      const masteredWords = words.filter(([word, alternatives]) => {
        const records = recordsByWord[word];
        if (!records || records.length < alternatives.length) return false;
        return records.every((r) => r.box === 5);
      }).length;

      const now = new Date();
      const dueWords = new Set(
        (srsData || [])
          .filter((r: any) => new Date(r.next_review_at) <= now)
          .map((r: any) => r.word)
      );

      const matchedReviews: RevisionItem[] = Array.from(dueWords).map((word) => {
        const match = words.find((w) => w[0] === word);
        return {
          word: word as string,
          alternatives: match ? match[1] : [],
          cluster: match ? match[2] : '',
        };
      }).filter((r) => r.alternatives.length > 0);

      setStats({ totalAttempts, averageAccuracy, totalQuestions, masteredWords });
      setRevisionList(matchedReviews);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
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
        <p>BCS বাংলা অর্থতত্ত্ব অনুশীলন ড্যাশবোর্ডে আপনাকে স্বাগতম। আপনার অগ্রগতি ট্র্যাক করতে, ভুল করা শব্দগুলো রিভিশন দিতে এবং নিয়মিত অনুশীলনের মাধ্যমে প্রস্তুতি মজবুত করুন।</p>
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
          <div className="stat-val">{stats.totalQuestions}টি</div>
          <div className="stat-label">মোট অনুশীলিত শব্দ</div>
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
                  <div className="topic-category">অর্থতত্ত্ব (Semantics)</div>
                  <h4 className="topic-title">সমার্থক শব্দ</h4>
                  <p className="topic-desc">৪৪টি মূল শব্দ এবং তাদের ৫ শতাধিক সমার্থক শব্দ অনুশীলন করুন। সাজেশন-ভিত্তিক টাইপিং সেশনের মাধ্যমে বানান ও প্রস্তুতি নিশ্চিত করুন।</p>
                </div>
                <div className="topic-footer">
                  <span className="topic-progress">{stats.masteredWords}/{words.length} শব্দ আয়ত্ত</span>
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
          <SynonymBlock revisionList={revisionList} onStartReview={onStartReview} />
        </div>
      </div>
    </div>
  );
}
