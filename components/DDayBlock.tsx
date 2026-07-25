'use client';

import { useState, useEffect } from 'react';
import { Edit2, Check, X, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { updateDDayConfig } from '@/lib/supabase';
import { UserSettings } from '@/lib/types';

interface DDayBlockProps {
  settings?: UserSettings | null;
  onSettingsUpdate?: () => void;
}

export default function DDayBlock({ settings, onSettingsUpdate }: DDayBlockProps) {
  const [targetTitle, setTargetTitle] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');

  const [countdown, setCountdown] = useState<{
    months: number;
    weeks: number;
    days: number;
    isPast: boolean;
  } | null>(null);

  useEffect(() => {
    if (settings && settings.target_date) {
      setTargetTitle(settings.target_title || 'Target Goal Date');
      setTargetDate(settings.target_date);
      setEditTitle(settings.target_title || 'Target Goal Date');
      setEditDate(settings.target_date);
    } else {
      setTargetTitle(null);
      setTargetDate(null);
      setEditTitle('');
      setEditDate('');
    }
  }, [settings]);

  useEffect(() => {
    if (!targetDate) {
      setCountdown(null);
      return;
    }

    function calculateCountdown() {
      const target = new Date(`${targetDate}T00:00:00`).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setCountdown({ months: 0, weeks: 0, days: 0, isPast: true });
        return;
      }

      const totalDays = Math.floor(diff / (1000 * 60 * 60 * 24));
      const months = Math.floor(totalDays / 30);
      const rem1 = totalDays % 30;
      const weeks = Math.floor(rem1 / 7);
      const days = rem1 % 7;

      setCountdown({ months, weeks, days, isPast: false });
    }

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000 * 60); // update every minute
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
          title={targetDate ? 'Edit Target Date' : 'Set Target Date'}
        >
          {targetDate ? <Edit2 className="w-3 h-3" /> : <Plus className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-2 my-1">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs text-zinc-100 focus:outline-none"
            placeholder="Target Title (e.g. Exam Date)"
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
      ) : !targetDate || !countdown ? (
        <div className="my-2 text-center p-2 bg-zinc-950/60 rounded-lg border border-zinc-800/60">
          <p className="text-xs text-zinc-400 font-medium mb-1">No Target Date Set</p>
          <button
            onClick={() => setIsEditing(true)}
            className="text-[11px] text-zinc-300 hover:text-zinc-100 font-semibold underline flex items-center justify-center space-x-1 mx-auto"
          >
            <Plus className="w-3 h-3" />
            <span>Set Target Goal Date</span>
          </button>
        </div>
      ) : (
        <div className="my-1">
          <div className="text-[11px] text-zinc-400 truncate mb-1">{targetTitle}</div>
          <div className="flex items-center justify-between text-center bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800/80">
            <div>
              <span className="text-xl font-bold font-mono text-zinc-100 block leading-none">
                {countdown.months}
              </span>
              <span className="text-[9px] text-zinc-500 uppercase">Months</span>
            </div>
            <span className="text-zinc-700 text-xs font-bold">:</span>
            <div>
              <span className="text-xl font-bold font-mono text-zinc-200 block leading-none">
                {countdown.weeks}
              </span>
              <span className="text-[9px] text-zinc-500 uppercase">Weeks</span>
            </div>
            <span className="text-zinc-700 text-xs font-bold">:</span>
            <div>
              <span className="text-xl font-bold font-mono text-zinc-200 block leading-none">
                {countdown.days}
              </span>
              <span className="text-[9px] text-zinc-500 uppercase">Days</span>
            </div>
          </div>
        </div>
      )}

      <div className="text-[10px] text-zinc-500 border-t border-zinc-800/80 pt-2 truncate">
        {targetDate ? `Target: ${targetDate}` : 'No date set'}
      </div>
    </div>
  );
}
