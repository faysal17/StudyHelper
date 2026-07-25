'use client';

import { useState, useEffect } from 'react';
import { Edit2, Check, X, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { updateDDayConfig } from '@/lib/supabase';
import { UserSettings } from '@/lib/types';
import DateWheelPicker from '@/components/DateWheelPicker';

interface DDayBlockProps {
  settings?: UserSettings | null;
  onSettingsUpdate?: () => void;
}

function calculateExactDDayBreakdown(targetDateStr: string) {
  const parts = targetDateStr.split('-').map(Number);
  if (parts.length !== 3) return null;

  const target = new Date(parts[0], parts[1] - 1, parts[2]);
  const nowObj = new Date();
  const today = new Date(nowObj.getFullYear(), nowObj.getMonth(), nowObj.getDate());

  if (isNaN(target.getTime()) || target.getTime() <= today.getTime()) {
    return { months: 0, weeks: 0, days: 0, isPast: true };
  }

  // Count full calendar months
  let temp = new Date(today);
  let months = 0;

  while (true) {
    const nextMonth = new Date(temp.getFullYear(), temp.getMonth() + 1, temp.getDate());
    // Handle month end overflow (e.g. Jan 31 -> Feb 28)
    if (nextMonth.getDate() !== temp.getDate()) {
      nextMonth.setDate(0);
    }

    if (nextMonth.getTime() <= target.getTime()) {
      months++;
      temp = nextMonth;
    } else {
      break;
    }
  }

  // Calculate remaining days between temp and target
  const diffMs = target.getTime() - temp.getTime();
  const remainingDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(remainingDays / 7);
  const days = remainingDays % 7;

  return { months, weeks, days, isPast: false };
}

export default function DDayBlock({ settings, onSettingsUpdate }: DDayBlockProps) {
  const [targetTitle, setTargetTitle] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [editTitle, setEditTitle] = useState('');
  const [editDay, setEditDay] = useState('');
  const [editMonth, setEditMonth] = useState('');
  const [editYear, setEditYear] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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

      const parts = settings.target_date.split('-');
      if (parts.length === 3) {
        setEditYear(parts[0]);
        setEditMonth(parts[1]);
        setEditDay(parts[2]);
      }
    } else {
      setTargetTitle(null);
      setTargetDate(null);
      setEditTitle('');
      setEditDay('');
      setEditMonth('');
      setEditYear('');
    }
  }, [settings]);

  useEffect(() => {
    if (!targetDate) {
      setCountdown(null);
      return;
    }

    function calculateCountdown() {
      const res = calculateExactDDayBreakdown(targetDate!);
      setCountdown(res);
    }

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000 * 60);
    return () => clearInterval(interval);
  }, [targetDate]);

  const handleSave = async () => {
    setErrorMsg('');

    const dayNum = parseInt(editDay, 10);
    const monthNum = parseInt(editMonth, 10);
    const yearNum = parseInt(editYear, 10);

    if (!editDay || !editMonth || !editYear) {
      setErrorMsg('Fill day, month & year.');
      return;
    }

    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      setErrorMsg('Day must be 01–31.');
      return;
    }

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      setErrorMsg('Month must be 01–12.');
      return;
    }

    if (isNaN(yearNum) || editYear.length !== 4 || yearNum < 2026 || yearNum > 2099) {
      setErrorMsg('Year must be 4 digits (2026–2099).');
      return;
    }

    const dateObj = new Date(yearNum, monthNum - 1, dayNum);
    if (
      dateObj.getFullYear() !== yearNum ||
      dateObj.getMonth() !== monthNum - 1 ||
      dateObj.getDate() !== dayNum
    ) {
      setErrorMsg('Invalid date (e.g. Feb 31).');
      return;
    }

    const sanitizedDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const newTitle = editTitle.trim() || 'Target Goal Date';

    await updateDDayConfig(sanitizedDate, newTitle);
    setTargetDate(sanitizedDate);
    setTargetTitle(newTitle);
    setIsEditing(false);
    if (onSettingsUpdate) onSettingsUpdate();
  };

  return (
    <div className="glass-panel rounded-xl p-4 border border-zinc-800 flex flex-col justify-between h-[190px] min-h-[190px] max-h-[190px] overflow-hidden w-full">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-1.5 text-zinc-300">
          <CalendarIcon className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-200">D-Day Counter</span>
        </div>
        <button
          onClick={() => {
            setIsEditing(!isEditing);
            setErrorMsg('');
          }}
          className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
          title={targetDate ? 'Edit Target Date' : 'Set Target Date'}
        >
          {targetDate ? <Edit2 className="w-3 h-3" /> : <Plus className="w-3.5 h-3.5" />}
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-1.5 my-auto">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600"
            placeholder="Target Title..."
          />
          <DateWheelPicker
            day={editDay}
            month={editMonth}
            year={editYear}
            onDayChange={setEditDay}
            onMonthChange={setEditMonth}
            onYearChange={setEditYear}
          />
          <div className="flex gap-1 pt-0.5">
            <button
              onClick={handleSave}
              className="flex-1 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
            >
              <Check className="w-3 h-3" />
              <span>Save</span>
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded text-[11px] transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          {errorMsg && <p className="text-[10px] text-red-400 text-center">{errorMsg}</p>}
        </div>
      ) : !targetDate || !countdown ? (
        <div className="my-auto text-center p-2 bg-zinc-950/60 rounded-lg border border-zinc-800/60">
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
        <div className="my-auto">
          <div className="text-[11px] text-zinc-400 truncate mb-1">{targetTitle}</div>
          <div className="flex items-center justify-between text-center bg-zinc-950/80 p-2 rounded-lg border border-zinc-800/80">
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

      <div className="text-[10px] text-zinc-500 border-t border-zinc-800/80 pt-2 truncate shrink-0">
        {targetDate ? `Target: ${targetDate}` : 'No date set'}
      </div>
    </div>
  );
}
