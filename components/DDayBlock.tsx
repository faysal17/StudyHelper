'use client';

import { useState, useEffect } from 'react';
import { Edit2, Check, X, Calendar as CalendarIcon } from 'lucide-react';
import { fetchUserSettings, updateDDayConfig } from '@/lib/supabase';
import { UserSettings } from '@/lib/types';

interface DDayBlockProps {
  settings?: UserSettings | null;
  onSettingsUpdate?: () => void;
}

export default function DDayBlock({ settings, onSettingsUpdate }: DDayBlockProps) {
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
    if (settings) {
      setTargetTitle(settings.target_title || 'Target Goal Date');
      setTargetDate(settings.target_date || '2026-12-31');
      setEditTitle(settings.target_title || 'Target Goal Date');
      setEditDate(settings.target_date || '2026-12-31');
    }
  }, [settings]);

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

  const handleSave = async () => {
    if (!editDate) return;
    const newTitle = editTitle || 'Target Goal Date';
    await updateDDayConfig(editDate, newTitle);
    setTargetDate(editDate);
    setTargetTitle(newTitle);
    setIsEditing(false);
    if (onSettingsUpdate) onSettingsUpdate();
  };

  return (
    <div className="glass-panel rounded-xl p-4 border border-zinc-800 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-1.5 text-zinc-300">
          <CalendarIcon className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-200">D-Day Counter</span>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
          title="Edit Target Date"
        >
          <Edit2 className="w-3 h-3" />
        </button>
      </div>

      {!isEditing ? (
        <div className="my-1">
          <div className="text-[11px] text-zinc-400 truncate mb-1">{targetTitle}</div>
          <div className="flex items-center justify-between text-center bg-zinc-950/80 p-2 rounded-lg border border-zinc-800/80">
            <div>
              <span className="text-xl font-bold font-mono text-zinc-100 block leading-none">
                {timeLeft.days}
              </span>
              <span className="text-[9px] text-zinc-500 uppercase">Days</span>
            </div>
            <span className="text-zinc-700 text-xs">:</span>
            <div>
              <span className="text-base font-bold font-mono text-zinc-300 block leading-none">
                {String(timeLeft.hours).padStart(2, '0')}
              </span>
              <span className="text-[9px] text-zinc-500 uppercase">Hrs</span>
            </div>
            <span className="text-zinc-700 text-xs">:</span>
            <div>
              <span className="text-base font-bold font-mono text-zinc-300 block leading-none">
                {String(timeLeft.minutes).padStart(2, '0')}
              </span>
              <span className="text-[9px] text-zinc-500 uppercase">Min</span>
            </div>
            <span className="text-zinc-700 text-xs">:</span>
            <div>
              <span className="text-base font-bold font-mono text-zinc-400 block leading-none">
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
              <span className="text-[9px] text-zinc-500 uppercase">Sec</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2 my-1">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none"
            placeholder="Target Title"
          />
          <div className="flex gap-1">
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none"
            />
            <button onClick={handleSave} className="p-1 bg-zinc-800 text-zinc-200 rounded">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setIsEditing(false)} className="p-1 bg-zinc-800 text-zinc-400 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="text-[10px] text-zinc-500 border-t border-zinc-800/80 pt-2 truncate">
        Target: {targetDate}
      </div>
    </div>
  );
}
