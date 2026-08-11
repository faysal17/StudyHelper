'use client';

import { useRouter } from 'next/navigation';
import { Bell, X, Clock } from 'lucide-react';
import { DailyTaskPlacement } from '@/lib/types';

export default function UpcomingTaskNotification({
  placement,
  minutesUntilStart,
  onDismiss,
}: {
  placement: DailyTaskPlacement;
  minutesUntilStart: number;
  onDismiss: () => void;
}) {
  const router = useRouter();

  if (!placement.task) return null;

  const timingLabel =
    minutesUntilStart <= 0
      ? 'Starting now'
      : minutesUntilStart === 1
      ? 'Starting in 1 minute'
      : `Starting in ${minutesUntilStart} minutes`;

  const handleClick = () => {
    onDismiss();
    router.push('/today');
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick();
      }}
      className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/40 text-blue-200 flex items-center justify-between gap-4 shadow-lg animate-in slide-in-from-top duration-300 cursor-pointer hover:bg-blue-950/40 transition-colors"
    >
      <div className="flex items-center space-x-3 min-w-0">
        <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
          <Bell className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs font-bold font-mono uppercase tracking-wide text-blue-400 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            <span>{timingLabel}</span>
          </h4>
          <p className="text-xs text-blue-100 mt-0.5 truncate">
            <strong className="font-semibold">{placement.task.title}</strong> is coming up on your Today schedule.
          </p>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="p-1.5 rounded-lg text-blue-300/70 hover:text-blue-100 hover:bg-blue-500/20 transition-colors shrink-0"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
