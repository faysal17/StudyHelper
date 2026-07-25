import { Task, Priority, StatusColor } from './types';

/**
 * Returns today's date formatted as YYYY-MM-DD.
 */
export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Adds a specified number of days to a YYYY-MM-DD string date.
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns the priority multiplier for error rate calculations:
 * Priority 1 (High): 1.5x
 * Priority 2 (Normal): 1.0x
 * Priority 3 (Low): 0.5x
 */
export function getPriorityMultiplier(priority: Priority): number {
  switch (priority) {
    case 1:
      return 1.5;
    case 2:
      return 1.0;
    case 3:
      return 0.5;
    default:
      return 1.0;
  }
}

/**
 * Calculates the final weighted error percentage capped at 100.
 */
export function calculateWeightedErrorRate(
  totalOverlays: number,
  failedOverlays: number,
  priority: Priority
): number {
  if (totalOverlays === 0) return 0;
  const baseErrorRate = failedOverlays / totalOverlays;
  const multiplier = getPriorityMultiplier(priority);
  const weighted = baseErrorRate * multiplier * 100;
  return Math.min(100, Math.max(0, Math.round(weighted * 10) / 10));
}

export interface SpacedRepetitionResult {
  isLockedToday: boolean;
  weightedErrorPercent: number;
  newInterval: number;
  newStatusColor: StatusColor;
  newNextRevisionDate: string;
  newEaseFactor: number;
  updatedLastReviewedDate: string;
}

/**
 * Processes revision math based on once-daily lock, weighted error, and priority.
 */
export function evaluateSpacedRepetition(
  task: Task,
  totalOverlays: number,
  failedOverlays: number
): SpacedRepetitionResult {
  const today = getTodayDateString();
  const isLockedToday = task.last_reviewed_date === today;

  const weightedError = calculateWeightedErrorRate(totalOverlays, failedOverlays, task.priority);

  // If reviewed already today, DO NOT update current_interval or next_revision_date
  if (isLockedToday) {
    return {
      isLockedToday: true,
      weightedErrorPercent: weightedError,
      newInterval: task.current_interval,
      newStatusColor: task.status_color,
      newNextRevisionDate: task.next_revision_date,
      newEaseFactor: task.ease_factor,
      updatedLastReviewedDate: task.last_reviewed_date || today,
    };
  }

  let newInterval = task.current_interval || 1;
  let newEaseFactor = task.ease_factor || 2.5;
  let newStatusColor: StatusColor = 'green';
  let daysToAdd = 1;

  if (weightedError >= 50) {
    // High Error: Assign Red, reset to 1 day
    newStatusColor = 'red';
    newInterval = 1;
    daysToAdd = 1;
    // Slightly decrease ease factor for difficult items
    newEaseFactor = Math.max(1.3, Math.round((newEaseFactor - 0.2) * 100) / 100);
  } else if (weightedError >= 20) {
    // Moderate Error: Assign Yellow, maintain small interval
    newStatusColor = 'yellow';
    newInterval = Math.max(2, Math.round(newInterval * 1.2));
    daysToAdd = newInterval;
  } else {
    // Low / Zero Error: Assign Green, increase interval using ease factor
    newStatusColor = 'green';
    const currentInt = newInterval < 1 ? 1 : newInterval;
    newInterval = Math.max(3, Math.round(currentInt * newEaseFactor));
    daysToAdd = newInterval;
    // Slightly increase ease factor for mastered items
    newEaseFactor = Math.min(3.0, Math.round((newEaseFactor + 0.1) * 100) / 100);
  }

  const newNextRevisionDate = addDaysToDateString(today, daysToAdd);

  return {
    isLockedToday: false,
    weightedErrorPercent: weightedError,
    newInterval,
    newStatusColor,
    newNextRevisionDate,
    newEaseFactor,
    updatedLastReviewedDate: today,
  };
}
