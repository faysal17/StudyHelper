'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, CheckCircle2 } from 'lucide-react';
import { RoutineBlock } from '@/lib/types';
import { createRoutineBlock, updateRoutineBlock } from '@/lib/routines';

const ALL_WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const COLOR_PRESETS = ['#f59e0b', '#22c55e', '#3b82f6', '#ec4899', '#a855f7', '#ef4444', '#14b8a6'];

export default function RoutineBlockFormModal({
  isOpen,
  initial,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  initial?: RoutineBlock | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [label, setLabel] = useState('');
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [weekdays, setWeekdays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('07:00');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isOpen) return;
    setLabel(initial?.label || '');
    setColor(initial?.color || COLOR_PRESETS[0]);
    setWeekdays(initial?.weekdays || []);
    setStartTime(initial?.start_time || '06:00');
    setEndTime(initial?.end_time || '07:00');
    setEndDate(initial?.end_date || '');
    setSuccess(false);
  }, [isOpen, initial]);

  if (!isOpen || !mounted) return null;

  const toggleWeekday = (day: string) => {
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const handleSave = async () => {
    if (!label.trim() || weekdays.length === 0) return;
    setSaving(true);
    try {
      const payload = {
        label: label.trim(),
        color,
        weekdays,
        start_time: startTime,
        end_time: endTime,
        end_date: endDate || null,
      };
      if (initial) {
        await updateRoutineBlock(initial.id, payload);
      } else {
        await createRoutineBlock(payload);
      }
      setSuccess(true);
      onSaved();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 900);
    } catch (err) {
      console.error('Error saving routine block:', err);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[9999] bg-zinc-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-100">
            {initial ? 'Edit Routine Block' : 'Add Routine Block'}
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300">Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Physics study"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 block">Weekdays</label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_WEEKDAYS.map((day) => {
              const isSelected = weekdays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleWeekday(day)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all border ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Start time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">End time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 block">Highlight color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 rounded-md border border-zinc-800 bg-zinc-950 cursor-pointer"
            />
            <div className="flex gap-1.5">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                    color === c ? 'border-zinc-100 scale-110' : 'border-transparent'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300">End date (optional)</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-zinc-700"
          />
          <p className="text-[10px] text-zinc-500">Leave blank for the routine to run indefinitely.</p>
        </div>

        <div className="pt-2 flex items-center justify-end gap-3 border-t border-zinc-800/80">
          {success && (
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 mt-3">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !label.trim() || weekdays.length === 0}
            className="mt-3 px-4 py-2.5 rounded-xl bg-zinc-100 text-zinc-950 font-bold text-xs hover:bg-zinc-200 disabled:opacity-50 transition-all flex items-center space-x-1.5"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
