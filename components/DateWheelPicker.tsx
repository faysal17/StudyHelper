'use client';

import { useRef } from 'react';

interface DateWheelPickerProps {
  day: string;
  month: string;
  year: string;
  onDayChange: (val: string) => void;
  onMonthChange: (val: string) => void;
  onYearChange: (val: string) => void;
}

export default function DateWheelPicker({
  day,
  month,
  year,
  onDayChange,
  onMonthChange,
  onYearChange,
}: DateWheelPickerProps) {
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
    onDayChange(val);
    if (val.length === 2 && monthRef.current) {
      monthRef.current.focus();
    }
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
    onMonthChange(val);
    if (val.length === 2 && yearRef.current) {
      yearRef.current.focus();
    }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    onYearChange(val);
  };

  return (
    <div className="flex items-center gap-1.5 w-full">
      <div className="flex-1">
        <label className="block text-[9px] uppercase tracking-wider text-zinc-500 mb-0.5">Day</label>
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          placeholder="DD"
          value={day}
          onChange={handleDayChange}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-center text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
        />
      </div>

      <span className="text-zinc-600 font-bold mt-3.5">/</span>

      <div className="flex-1">
        <label className="block text-[9px] uppercase tracking-wider text-zinc-500 mb-0.5">Month</label>
        <input
          ref={monthRef}
          type="text"
          inputMode="numeric"
          maxLength={2}
          placeholder="MM"
          value={month}
          onChange={handleMonthChange}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-center text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
        />
      </div>

      <span className="text-zinc-600 font-bold mt-3.5">/</span>

      <div className="flex-[1.4]">
        <label className="block text-[9px] uppercase tracking-wider text-zinc-500 mb-0.5">Year</label>
        <input
          ref={yearRef}
          type="text"
          inputMode="numeric"
          maxLength={4}
          placeholder="YYYY"
          value={year}
          onChange={handleYearChange}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-center text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
        />
      </div>
    </div>
  );
}
