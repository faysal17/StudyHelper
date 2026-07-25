'use client';

import { useState, useEffect } from 'react';
import { UserSettings } from '@/lib/types';
import { fetchUserSettings, updateDayEndTimeConfig, updateQuotesConfig } from '@/lib/supabase';
import { Settings as SettingsIcon, Moon, Save, CheckCircle2, Clock, Quote, Plus, Trash2, RotateCcw } from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';

const DEFAULT_QUOTES = [
  'Focus on being productive instead of busy.',
  'Discipline is choosing between what you want now and what you want most.',
  'Small daily improvements over time lead to stunning results.',
  'Success is the sum of small efforts, repeated day in and day out.',
  'The secret of getting ahead is getting started.',
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [dayEndTime, setDayEndTime] = useState<string>('00:00');
  const [quotes, setQuotes] = useState<string[]>(DEFAULT_QUOTES);
  const [newQuoteInput, setNewQuoteInput] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await fetchUserSettings();
      setSettings(data);
      if (data.day_end_time) {
        setDayEndTime(data.day_end_time);
      }
      if (data.quotes && data.quotes.length > 0) {
        setQuotes(data.quotes);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    }
  };

  const handleAddQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuoteInput.trim()) return;
    setQuotes((prev) => [...prev, newQuoteInput.trim()]);
    setNewQuoteInput('');
  };

  const handleDeleteQuote = (index: number) => {
    setQuotes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleResetDefaultQuotes = () => {
    setQuotes(DEFAULT_QUOTES);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await Promise.all([
        updateDayEndTimeConfig(dayEndTime),
        updateQuotesConfig(quotes.length > 0 ? quotes : DEFAULT_QUOTES),
      ]);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const dayEndTimeOptions = [
    { value: '00:00', label: '12:00 AM (Midnight - Default)' },
    { value: '01:00', label: '01:00 AM (Night Owl)' },
    { value: '02:00', label: '02:00 AM (Late Night Owl)' },
    { value: '03:00', label: '03:00 AM (Deep Night Owl)' },
    { value: '04:00', label: '04:00 AM (Early Morning Cutoff)' },
    { value: '05:00', label: '05:00 AM (Dawn Cutoff)' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="glass-panel p-6 rounded-xl border border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100 shadow-sm">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-100">User Settings</h1>
            <p className="text-xs text-zinc-400">Configure custom study preferences, day cutoffs, and motivational quotes</p>
          </div>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="px-5 py-2 rounded-lg bg-zinc-100 text-zinc-950 font-semibold text-xs hover:bg-zinc-200 transition-all shadow-sm flex items-center space-x-2 disabled:opacity-50"
        >
          {saveSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Saved!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </>
          )}
        </button>
      </div>

      {/* Settings Section 1: Day End Cutoff Time */}
      <div className="glass-panel p-6 rounded-xl border border-zinc-800 space-y-6">
        <div className="flex items-start space-x-3 border-b border-zinc-800 pb-4">
          <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
            <Moon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Day End Cutoff Time (Night Owl Mode)</h2>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Select the time when your study day officially ends. If you study past midnight (e.g. until 3:00 AM),
              tasks reviewed or completed before your cutoff time will still count as <strong>Today&apos;s study session</strong>.
            </p>
          </div>
        </div>

        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>Select Day Cutoff Time</span>
            </label>
            <CustomSelect
              options={dayEndTimeOptions}
              value={dayEndTime}
              onChange={(val) => setDayEndTime(val)}
            />
          </div>

          <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800/80 text-xs text-zinc-400 space-y-1 font-mono">
            <p className="text-zinc-200 font-semibold">Active Rule:</p>
            {dayEndTime === '00:00' ? (
              <p>Standard calendar day. The study day resets at midnight (12:00 AM).</p>
            ) : (
              <p>
                Study sessions between 12:00 AM and <strong className="text-amber-400">{dayEndTime}</strong> will be logged under the previous calendar day.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Settings Section 2: Motivational Quotes Configuration */}
      <div className="glass-panel p-6 rounded-xl border border-zinc-800 space-y-6">
        <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-amber-400">
              <Quote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Motivational Quotes Manager</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Customize inspiring quotes displayed at the top of Fullscreen Focus Mode
              </p>
            </div>
          </div>

          <button
            onClick={handleResetDefaultQuotes}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors flex items-center space-x-1"
            title="Reset to default quotes"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>

        {/* Add New Quote Form */}
        <form onSubmit={handleAddQuote} className="flex gap-2">
          <input
            type="text"
            value={newQuoteInput}
            onChange={(e) => setNewQuoteInput(e.target.value)}
            placeholder="Type a new motivational quote..."
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
          />
          <button
            type="submit"
            disabled={!newQuoteInput.trim()}
            className="px-4 py-2 bg-zinc-100 text-zinc-950 font-semibold text-xs rounded-xl hover:bg-zinc-200 transition-all flex items-center space-x-1 disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
            <span>Add Quote</span>
          </button>
        </form>

        {/* Existing Quotes List */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {quotes.map((q, idx) => (
            <div
              key={idx}
              className="p-3 bg-zinc-950/80 border border-zinc-800/80 rounded-xl text-xs flex items-center justify-between gap-3 group hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center space-x-2.5 truncate">
                <Quote className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="text-zinc-200 italic font-medium truncate">&ldquo;{q}&rdquo;</span>
              </div>
              <button
                onClick={() => handleDeleteQuote(idx)}
                className="p-1 text-zinc-600 hover:text-red-400 transition-colors shrink-0"
                title="Delete quote"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
