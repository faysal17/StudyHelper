import { Task, StatusColor } from './types';

export function getLogicalTodayDate(dayEndTime: string = '00:00'): Date {
  return getLogicalDateForTimestamp(new Date(), dayEndTime);
}

export function getLogicalDateForTimestamp(timestamp: Date | string | number, dayEndTime: string = '00:00'): Date {
  const d = new Date(timestamp);
  const [cutoffHour] = (dayEndTime || '00:00').split(':').map(Number);

  if (cutoffHour > 0 && d.getHours() < cutoffHour) {
    const logicalDate = new Date(d);
    logicalDate.setDate(logicalDate.getDate() - 1);
    return logicalDate;
  }
  return d;
}

export function getLogicalDateString(timestamp: Date | string | number, dayEndTime: string = '00:00'): string {
  const d = getLogicalDateForTimestamp(timestamp, dayEndTime);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayDateString(dayEndTime: string = '00:00'): string {
  return getLogicalDateString(new Date(), dayEndTime);
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const resYear = date.getFullYear();
  const resMonth = String(date.getMonth() + 1).padStart(2, '0');
  const resDay = String(date.getDate()).padStart(2, '0');
  return `${resYear}-${resMonth}-${resDay}`;
}

export function getMondayOfWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const day = dateObj.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  dateObj.setDate(dateObj.getDate() - diffToMonday);
  const resYear = dateObj.getFullYear();
  const resMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
  const resDay = String(dateObj.getDate()).padStart(2, '0');
  return `${resYear}-${resMonth}-${resDay}`;
}

export function diffInDays(dateStr1: string, dateStr2: string): number {
  const [y1, m1, d1] = dateStr1.split('-').map(Number);
  const [y2, m2, d2] = dateStr2.split('-').map(Number);

  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);

  const diffMs = t1 - t2;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export interface SpacedRepetitionResult {
  weightedErrorPercent: number;
  newInterval: number;
  newEaseFactor: number;
  newStatusColor: StatusColor;
  newNextRevisionDate: string;
  updatedLastReviewedDate: string;
  isLockedToday: boolean;
}

export function evaluateSpacedRepetition(
  task: Task,
  totalOverlays: number,
  failedOverlays: number,
  dayEndTime: string = '00:00'
): SpacedRepetitionResult {
  const todayStr = getTodayDateString(dayEndTime);

  if (task.last_reviewed_date === todayStr) {
    return {
      weightedErrorPercent: Math.round(((failedOverlays * 2) / Math.max(totalOverlays, 1)) * 100),
      newInterval: task.current_interval,
      newEaseFactor: task.ease_factor,
      newStatusColor: task.status_color,
      newNextRevisionDate: task.next_revision_date,
      updatedLastReviewedDate: task.last_reviewed_date,
      isLockedToday: true,
    };
  }

  const priorityWeight = task.priority === 1 ? 1.5 : task.priority === 2 ? 1.0 : 0.5;

  const rawError = totalOverlays > 0 ? (failedOverlays * 2) / totalOverlays : 0;
  const weightedErrorPercent = Math.min(100, Math.round(rawError * 100 * (1 / priorityWeight)));

  let newStatusColor: StatusColor = 'blue';
  if (weightedErrorPercent > 40) {
    newStatusColor = 'red';
  } else if (weightedErrorPercent > 20) {
    newStatusColor = 'yellow';
  } else if (weightedErrorPercent > 5) {
    newStatusColor = 'blue';
  } else {
    newStatusColor = 'green';
  }

  let deltaEF = 0;
  if (weightedErrorPercent === 0) deltaEF = 0.1;
  else if (weightedErrorPercent <= 20) deltaEF = 0.0;
  else if (weightedErrorPercent <= 40) deltaEF = -0.15;
  else deltaEF = -0.3;

  const newEaseFactor = Math.max(1.3, Math.round((task.ease_factor + deltaEF) * 100) / 100);

  let newInterval = 1;
  if (weightedErrorPercent > 40) {
    newInterval = 1;
  } else if (task.current_interval === 1) {
    newInterval = 6;
  } else {
    newInterval = Math.round(task.current_interval * newEaseFactor);
  }

  const newNextRevisionDate = addDays(todayStr, newInterval);

  return {
    weightedErrorPercent,
    newInterval,
    newEaseFactor,
    newStatusColor,
    newNextRevisionDate,
    updatedLastReviewedDate: todayStr,
    isLockedToday: false,
  };
}

export function isTaskDueToday(task: Task, dayEndTime: string = '00:00'): boolean {
  const todayStr = getTodayDateString(dayEndTime);
  return task.next_revision_date <= todayStr;
}

export function getDaysRemaining(targetDateStr: string, dayEndTime: string = '00:00'): number {
  const todayStr = getTodayDateString(dayEndTime);
  return diffInDays(targetDateStr, todayStr);
}
