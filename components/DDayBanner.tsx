'use client';

import { useState, useEffect } from 'react';
import { Target, Calendar as CalendarIcon, Edit3, Save, X, Flame } from 'lucide-react';
import { getDDayConfig, saveDDayConfig } from '@/lib/supabase';

export default function DDayBanner() {
  const [targetTitle, setTargetTitle] = useState('47th BCS Preliminary Exam');
  const [targetDate, setTargetDate] = useState('2026-11-15');
  const [isEditing, setIsEditing] = useState(false);

  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');

  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });

  useEffect(() => {
    const cfg = getDDayConfig();
    setTargetTitle(cfg.targetTitle);
    setTargetDate(cfg.targetDate);
    setEditTitle(cfg.targetTitle);
    setEditDate(cfg.targetDate);
  }, []);

  useEffect(() => {
    function calculateCountdown() {
      const target = new Date(`${targetDate}T00:00:00`).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isPast: false });
    }

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const handleSave = () => {
    if (!editDate) return;
    saveDDayConfig(editDate, editTitle || 'Target Exam Date');
    setTargetDate(editDate);
    setTargetTitle(editTitle || 'Target Exam Date');
    setIsEditing(false);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900/90 to-teal-950/60 border border-emerald-500/30 p-6 shadow-xl shadow-emerald-950/20 backdrop-blur-md mb-8">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left: Title & D-Day Big Display */}
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/30 shrink-0">
            <Flame className="w-8 h-8 fill-slate-950 stroke-none" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                Target Countdown
              </span>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-slate-400 hover:text-emerald-400 transition-colors p-1"
                title="Edit Target Date"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 mt-1 flex items-center gap-2">
              <span>{targetTitle}</span>
              <span className="text-emerald-400 text-sm font-semibold">
                (D-{timeLeft.isPast ? '0' : timeLeft.days})
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              টার্গেট তারিখ: {new Date(targetDate).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Right: Counter Grid */}
        {!isEditing ? (
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="flex flex-col items-center justify-center bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-3 min-w-[70px] sm:min-w-[80px] shadow-inner">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono leading-none">
                {timeLeft.days}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider mt-1">দিন (Days)</span>
            </div>

            <span className="text-xl font-bold text-slate-600">:</span>

            <div className="flex flex-col items-center justify-center bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-3 min-w-[65px] sm:min-w-[75px] shadow-inner">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-200 font-mono leading-none">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider mt-1">ঘণ্টা (Hrs)</span>
            </div>

            <span className="text-xl font-bold text-slate-600">:</span>

            <div className="flex flex-col items-center justify-center bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-3 min-w-[65px] sm:min-w-[75px] shadow-inner">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-200 font-mono leading-none">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider mt-1">মি (Mins)</span>
            </div>

            <span className="text-xl font-bold text-slate-600">:</span>

            <div className="flex flex-col items-center justify-center bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-3 min-w-[65px] sm:min-w-[75px] shadow-inner">
              <span className="text-2xl sm:text-3xl font-extrabold text-teal-400 font-mono leading-none">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider mt-1">সে (Secs)</span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 w-full md:w-auto space-y-3">
            <div className="text-xs font-semibold text-emerald-400">Edit Countdown Target</div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Target Exam Title"
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1 bg-emerald-500 text-slate-950 font-semibold rounded-lg text-xs hover:bg-emerald-400 flex items-center space-x-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
