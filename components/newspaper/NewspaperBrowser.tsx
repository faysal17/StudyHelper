'use client';

import { useMemo, useState } from 'react';
import { NewspaperPdf } from '@/lib/types';
import { ChevronDown, ChevronRight, FileText, Trash2, Newspaper } from 'lucide-react';

interface NewspaperBrowserProps {
  pdfs: NewspaperPdf[];
  onOpenPdf: (pdfId: string) => void;
  onDeletePdf: (pdfId: string) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface SlotGroup {
  key: string;
  label: string;
  sortKey: number;
  pdfs: NewspaperPdf[];
}

interface MonthGroup {
  month: number;
  slots: SlotGroup[];
}

interface YearGroup {
  year: number;
  months: MonthGroup[];
}

function buildTree(pdfs: NewspaperPdf[]): YearGroup[] {
  const byYear = new Map<number, Map<number, Map<string, SlotGroup>>>();

  for (const pdf of pdfs) {
    if (!byYear.has(pdf.year)) byYear.set(pdf.year, new Map());
    const byMonth = byYear.get(pdf.year)!;

    if (!byMonth.has(pdf.month)) byMonth.set(pdf.month, new Map());
    const bySlot = byMonth.get(pdf.month)!;

    const isWeek = pdf.week !== null;
    const slotKey = isWeek ? `w${pdf.week}` : `d${pdf.day}`;
    const label = isWeek ? `Week ${pdf.week}` : `Day ${pdf.day}`;
    // Weeks sort before days; within each, ascending by number.
    const sortKey = isWeek ? (pdf.week as number) : 100 + (pdf.day as number);

    if (!bySlot.has(slotKey)) {
      bySlot.set(slotKey, { key: slotKey, label, sortKey, pdfs: [] });
    }
    bySlot.get(slotKey)!.pdfs.push(pdf);
  }

  const years: YearGroup[] = Array.from(byYear.entries())
    .map(([year, byMonth]) => ({
      year,
      months: Array.from(byMonth.entries())
        .map(([month, bySlot]) => ({
          month,
          slots: Array.from(bySlot.values()).sort((a, b) => a.sortKey - b.sortKey),
        }))
        .sort((a, b) => b.month - a.month),
    }))
    .sort((a, b) => b.year - a.year);

  return years;
}

function readProgress(pdf: NewspaperPdf): { read: number; total: number } {
  const pages = pdf.pages || [];
  const read = pages.filter((p) => p.is_read).length;
  return { read, total: pdf.page_count };
}

export default function NewspaperBrowser({ pdfs, onOpenPdf, onDeletePdf }: NewspaperBrowserProps) {
  const tree = useMemo(() => buildTree(pdfs), [pdfs]);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const toggleMonth = (key: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (pdfs.length === 0) {
    return (
      <div className="glass-panel rounded-xl border border-zinc-800/90 p-10 text-center space-y-2">
        <Newspaper className="w-8 h-8 text-zinc-600 mx-auto" />
        <p className="text-sm text-zinc-400">No newspaper articles uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tree.map((yearGroup) => {
        const yearExpanded = expandedYears.has(yearGroup.year);
        return (
          <div key={yearGroup.year} className="glass-panel rounded-xl border border-zinc-800/90 overflow-hidden">
            <button
              onClick={() => toggleYear(yearGroup.year)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-900/60 transition-colors"
            >
              <span className="text-sm font-bold text-zinc-100">{yearGroup.year}</span>
              {yearExpanded ? (
                <ChevronDown className="w-4 h-4 text-zinc-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-zinc-500" />
              )}
            </button>

            {yearExpanded && (
              <div className="border-t border-zinc-800/90 divide-y divide-zinc-800/60">
                {yearGroup.months.map((monthGroup) => {
                  const monthKey = `${yearGroup.year}-${monthGroup.month}`;
                  const monthExpanded = expandedMonths.has(monthKey);
                  return (
                    <div key={monthKey}>
                      <button
                        onClick={() => toggleMonth(monthKey)}
                        className="w-full flex items-center justify-between px-4 py-2.5 pl-7 hover:bg-zinc-900/60 transition-colors"
                      >
                        <span className="text-xs font-semibold text-zinc-300">
                          {MONTH_NAMES[monthGroup.month - 1]}
                        </span>
                        {monthExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                        )}
                      </button>

                      {monthExpanded && (
                        <div className="px-4 pb-3 pl-10 space-y-2">
                          {monthGroup.slots.map((slot) => (
                            <div key={slot.key} className="space-y-1.5">
                              <div className="text-[11px] font-medium text-zinc-500">{slot.label}</div>
                              <div className="space-y-1.5">
                                {slot.pdfs.map((pdf) => {
                                  const { read, total } = readProgress(pdf);
                                  return (
                                    <div
                                      key={pdf.id}
                                      className="flex items-center justify-between bg-zinc-950/60 border border-zinc-800 rounded-lg px-3 py-2 hover:border-zinc-700 transition-colors group"
                                    >
                                      <button
                                        onClick={() => onOpenPdf(pdf.id)}
                                        className="flex items-center space-x-2.5 min-w-0 flex-1 text-left"
                                      >
                                        <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                        <span className="text-xs text-zinc-200 truncate">{pdf.title}</span>
                                        <span className="text-[10px] text-zinc-500 shrink-0">
                                          {read}/{total} read
                                        </span>
                                      </button>
                                      <button
                                        onClick={() => onDeletePdf(pdf.id)}
                                        className="text-zinc-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0 ml-2"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
