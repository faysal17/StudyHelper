'use client';

import { useState, useEffect } from 'react';
import { UserSettings } from '@/lib/types';
import { fetchUserSettings, updateDayEndTimeConfig, updateQuotesConfig, updateWeekendDaysConfig, updateStudyTargetsConfig, isSupabaseConfigured, supabase } from '@/lib/supabase';
import { Settings, Clock, Quote, Plus, Trash2, Save, CheckCircle2, Calendar, Target, Shield } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [dayEndTime, setDayEndTime] = useState<string>('00:00');
  const [quotes, setQuotes] = useState<string[]>([]);
  const [newQuote, setNewQuote] = useState<string>('');
  const [weekendDays, setWeekendDays] = useState<string[]>(['Saturday', 'Sunday']);
  const [weekStartDay, setWeekStartDay] = useState<string>('Monday');

  const [weekdayTargetMins, setWeekdayTargetMins] = useState<number>(120);
  const [weekendTargetMins, setWeekendTargetMins] = useState<number>(210);

  const [savingTime, setSavingTime] = useState(false);
  const [savingQuotes, setSavingQuotes] = useState(false);
  const [savingWeekend, setSavingWeekend] = useState(false);
  const [savingTargets, setSavingTargets] = useState(false);

  const [successTime, setSuccessTime] = useState(false);
  const [successQuotes, setSuccessQuotes] = useState(false);
  const [successWeekend, setSuccessWeekend] = useState(false);
  const [successTargets, setSuccessTargets] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const data = await fetchUserSettings();
    setSettings(data);
    if (data?.day_end_time) setDayEndTime(data.day_end_time);
    if (data?.quotes) setQuotes(data.quotes);
    if (data?.weekend_days) setWeekendDays(data.weekend_days);
    if (data?.week_start_day) setWeekStartDay(data.week_start_day);
    if (data?.weekday_target_minutes) setWeekdayTargetMins(data.weekday_target_minutes);
    if (data?.weekend_target_minutes) setWeekendTargetMins(data.weekend_target_minutes);
  };

  const handleSaveDayEndTime = async () => {
    setSavingTime(true);
    try {
      await updateDayEndTimeConfig(dayEndTime);
      setSuccessTime(true);
      setTimeout(() => setSuccessTime(false), 2500);
    } catch (err) {
      console.error('Error updating day end time:', err);
    } finally {
      setSavingTime(false);
    }
  };

  const handleToggleWeekendDay = (day: string) => {
    if (weekendDays.includes(day)) {
      if (weekendDays.length > 1) {
        setWeekendDays(weekendDays.filter((d) => d !== day));
      }
    } else {
      setWeekendDays([...weekendDays, day]);
    }
  };

  const handleSaveWeekendConfig = async () => {
    setSavingWeekend(true);
    try {
      await updateWeekendDaysConfig(weekendDays);
      if (isSupabaseConfigured && supabase) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          await supabase.from('user_settings').upsert({
            user_id: userData.user.id,
            week_start_day: weekStartDay,
            updated_at: new Date().toISOString(),
          });
        }
      }
      setSuccessWeekend(true);
      setTimeout(() => setSuccessWeekend(false), 2500);
    } catch (err) {
      console.error('Error updating weekend config:', err);
    } finally {
      setSavingWeekend(false);
    }
  };

  const handleSaveStudyTargets = async () => {
    setSavingTargets(true);
    try {
      await updateStudyTargetsConfig(weekdayTargetMins, weekendTargetMins);
      setSuccessTargets(true);
      setTimeout(() => setSuccessTargets(false), 2500);
    } catch (err) {
      console.error('Error updating study targets:', err);
    } finally {
      setSavingTargets(false);
    }
  };

  const handleAddQuote = () => {
    if (!newQuote.trim()) return;
    setQuotes([...quotes, newQuote.trim()]);
    setNewQuote('');
  };

  const handleDeleteQuote = (index: number) => {
    setQuotes(quotes.filter((_, idx) => idx !== index));
  };

  const handleSaveQuotes = async () => {
    setSavingQuotes(true);
    try {
      await updateQuotesConfig(quotes);
      setSuccessQuotes(true);
      setTimeout(() => setSuccessQuotes(false), 2500);
    } catch (err) {
      console.error('Error updating quotes:', err);
    } finally {
      setSavingQuotes(false);
    }
  };

  const allDaysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const targetHoursOptions = [
    { mins: 60, label: '1.0 Hour / day' },
    { mins: 90, label: '1.5 Hours / day' },
    { mins: 120, label: '2.0 Hours / day (Standard)' },
    { mins: 150, label: '2.5 Hours / day' },
    { mins: 180, label: '3.0 Hours / day' },
    { mins: 210, label: '3.5 Hours / day (High Momentum)' },
    { mins: 240, label: '4.0 Hours / day (Intensive)' },
    { mins: 300, label: '5.0 Hours / day (Hardcore)' },
    { mins: 360, label: '6.0 Hours / day (Extreme)' },
  ];

  const timeOptions = [
    { value: '00:00', label: '12:00 AM (Midnight - Standard)' },
    { value: '01:00', label: '01:00 AM (Night Owl)' },
    { value: '02:00', label: '02:00 AM (Night Owl)' },
    { value: '03:00', label: '03:00 AM (Late Night Owl)' },
    { value: '04:00', label: '04:00 AM (Extreme Night Owl)' },
    { value: '05:00', label: '05:00 AM (Early Bird Cutoff)' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <div className="flex items-center space-x-3 border-b border-zinc-800 pb-4">
        <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">User Settings</h1>
          <p className="text-xs text-zinc-400">
            Configure night owl cutoff hours, week start day, weekend target hours, and focus mode quotes.
          </p>
        </div>
      </div>

      {/* 1. Daily Focus Targets (Weekday & Weekend Target Hours) */}
      <div className="glass-panel p-6 rounded-xl border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-zinc-100">Daily Focus Target Hours</h2>
          </div>
          {successTargets && (
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
            </span>
          )}
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Set your daily study goals for Weekdays vs Weekend Days. Your 7-Day Rolling Momentum Score evaluates how consistently you hit these targets!
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Weekday Target Hours */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <span>Weekday Focus Goal</span>
            </label>
            <select
              value={weekdayTargetMins}
              onChange={(e) => setWeekdayTargetMins(Number(e.target.value))}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-zinc-600 transition-colors font-mono"
            >
              {targetHoursOptions.map((opt) => (
                <option key={opt.mins} value={opt.mins}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Weekend Target Hours */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <span>Weekend Focus Goal</span>
            </label>
            <select
              value={weekendTargetMins}
              onChange={(e) => setWeekendTargetMins(Number(e.target.value))}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-zinc-600 transition-colors font-mono"
            >
              {targetHoursOptions.map((opt) => (
                <option key={opt.mins} value={opt.mins}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSaveStudyTargets}
            disabled={savingTargets}
            className="px-4 py-2.5 rounded-xl bg-zinc-100 text-zinc-950 font-bold text-xs hover:bg-zinc-200 transition-all flex items-center space-x-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{savingTargets ? 'Saving...' : 'Save Target Goals'}</span>
          </button>
        </div>
      </div>

      {/* 2. Custom Weekend Selection & Week Start Day */}
      <div className="glass-panel p-6 rounded-xl border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-zinc-100">Week Start & Weekend Selection</h2>
          </div>
          {successWeekend && (
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
            </span>
          )}
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Configure your official <strong>Week Start Day</strong> (when official weekly Hunter Rank updates take place) and select custom weekend days.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Week Start Day */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Official Week Start Day</label>
            <select
              value={weekStartDay}
              onChange={(e) => setWeekStartDay(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-zinc-600 transition-colors font-mono"
            >
              {allDaysOfWeek.map((day) => (
                <option key={day} value={day}>
                  {day} (Official Rank Update)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Weekend Days Checkboxes */}
        <div className="space-y-2 pt-2">
          <label className="text-xs font-semibold text-zinc-300 block">Weekend Days Selection</label>
          <div className="flex flex-wrap gap-2">
            {allDaysOfWeek.map((day) => {
              const isSelected = weekendDays.includes(day);
              return (
                <button
                  key={day}
                  onClick={() => handleToggleWeekendDay(day)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all border ${
                    isSelected
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  {day} {isSelected ? `(Weekend Target: ${weekendTargetMins / 60}h)` : ''}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSaveWeekendConfig}
            disabled={savingWeekend}
            className="px-4 py-2.5 rounded-xl bg-zinc-100 text-zinc-950 font-bold text-xs hover:bg-zinc-200 transition-all flex items-center space-x-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{savingWeekend ? 'Saving...' : 'Save Week Configuration'}</span>
          </button>
        </div>
      </div>

      {/* 3. Day End Cutoff Time (Night Owl Mode) */}
      <div className="glass-panel p-6 rounded-xl border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-zinc-100">Day End Cutoff Time (Night Owl Mode)</h2>
          </div>
          {successTime && (
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
            </span>
          )}
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Pick the time when your study day ends. If you study past midnight (e.g. until 3:00 AM), setting this to 03:00 AM will ensure your late-night study hours count towards <strong>Today</strong> instead of tomorrow!
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <select
            value={dayEndTime}
            onChange={(e) => setDayEndTime(e.target.value)}
            className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-100 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-zinc-600 transition-colors font-mono"
          >
            {timeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <button
            onClick={handleSaveDayEndTime}
            disabled={savingTime}
            className="px-4 py-2.5 rounded-xl bg-zinc-100 text-zinc-950 font-bold text-xs hover:bg-zinc-200 transition-all flex items-center justify-center space-x-1.5 shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>{savingTime ? 'Saving...' : 'Save Cutoff Time'}</span>
          </button>
        </div>
      </div>

      {/* 4. Focus Mode Motivational Quotes Manager */}
      <div className="glass-panel p-6 rounded-xl border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Quote className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-zinc-100">Focus Mode Motivational Quotes</h2>
          </div>
          {successQuotes && (
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
            </span>
          )}
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Manage quotes displayed at the top of Fullscreen Focus Mode during study sessions. Add custom quotes to keep yourself locked in!
        </p>

        {/* Add Quote Form */}
        <div className="flex items-center space-x-2 pt-2">
          <input
            type="text"
            placeholder="Type a new motivational quote..."
            value={newQuote}
            onChange={(e) => setNewQuote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddQuote()}
            className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-100 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-zinc-600 transition-colors"
          />
          <button
            onClick={handleAddQuote}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 hover:text-zinc-100 hover:bg-zinc-800 transition-all text-xs font-semibold flex items-center space-x-1 shrink-0"
          >
            <Plus className="w-4 h-4 text-blue-400" />
            <span>Add Quote</span>
          </button>
        </div>

        {/* Quote List */}
        <div className="space-y-2 pt-2 max-h-80 overflow-y-auto pr-1">
          {quotes.length === 0 ? (
            <p className="text-xs text-zinc-500 italic text-center py-4">No custom quotes configured yet.</p>
          ) : (
            quotes.map((quote, idx) => (
              <div
                key={idx}
                className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80 flex items-center justify-between group hover:border-zinc-700 transition-all text-xs"
              >
                <span className="text-zinc-300 italic flex-1 pr-3 leading-relaxed">
                  &ldquo;{quote}&rdquo;
                </span>
                <button
                  onClick={() => handleDeleteQuote(idx)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                  title="Delete quote"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-zinc-800/80 flex justify-end">
          <button
            onClick={handleSaveQuotes}
            disabled={savingQuotes}
            className="px-4 py-2.5 rounded-xl bg-zinc-100 text-zinc-950 font-bold text-xs hover:bg-zinc-200 transition-all flex items-center space-x-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{savingQuotes ? 'Saving...' : 'Save Quotes Manager'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
