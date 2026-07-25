'use client';

import { useState, useEffect } from 'react';
import { Edit2, Check, X, Calendar as CalendarIcon } from 'lucide-react';
import { getDDayConfig, saveDDayConfig } from '@/lib/supabase';

export default function DDayBanner() {
  const [targetTitle, setTargetTitle] = useState('Target Goal Date');
  const [targetDate, setTargetDate] = useState('2026-12-31');
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
    saveDDayConfig(editDate, editTitle || 'Target Goal Date');
    setTargetDate(editDate);
    setTargetTitle(editTitle || 'Target Goal Date');
    setIsEditing(false);
  };

  return (
    <div className="glass-panel rounded-xl p-5 border border-zinc-800/80 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
      {/* Target Title & Date info */}
      <div className="flex items-center space-x-3 w-full md:w-auto">
        <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 shrink-0">
          <CalendarIcon className="w-5 h-5 stroke-[1.75]" />
        </div>

        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono tracking-wider uppercase text-zinc-400">
              D-Day Countdown
            </span>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
              title="Edit Target Date"
            >
              <Edit2 className="w-3 h-3" />
            </button>
          </div>

          {!isEditing ? (
            <h1 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <span>{targetTitle}</span>
              <span className="text-zinc-400 font-normal text-xs">
                ({targetDate})
              </span>
            </h1>
          ) : (
            <div className="flex items-center space-x-2 mt-1">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
                placeholder="Target Name"
              />
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
              />
              <button
                onClick={handleSave}
                className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Countdown Grid */}
      <div className="flex items-center space-x-3 text-center">
        <div className="bg-zinc-950 border border-zinc-800/80 rounded-lg px-3.5 py-2 min-w-[64px]">
          <span className="text-xl font-bold font-mono text-zinc-100 block leading-tight">
            {timeLeft.days}
          </span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Days</span>
        </div>

        <span className="text-zinc-700 font-bold text-sm">:</span>

        <div className="bg-zinc-950 border border-zinc-800/80 rounded-lg px-3.5 py-2 min-w-[56px]">
          <span className="text-xl font-bold font-mono text-zinc-200 block leading-tight">
            {String(timeLeft.hours).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Hours</span>
        </div>

        <span className="text-zinc-700 font-bold text-sm">:</span>

        <div className="bg-zinc-950 border border-zinc-800/80 rounded-lg px-3.5 py-2 min-w-[56px]">
          <span className="text-xl font-bold font-mono text-zinc-200 block leading-tight">
            {String(timeLeft.minutes).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Mins</span>
        </div>

        <span className="text-zinc-700 font-bold text-sm">:</span>

        <div className="bg-zinc-950 border border-zinc-800/80 rounded-lg px-3.5 py-2 min-w-[56px]">
          <span className="text-xl font-bold font-mono text-zinc-400 block leading-tight">
            {String(timeLeft.seconds).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Secs</span>
        </div>
      </div>
    </div>
  );
}
