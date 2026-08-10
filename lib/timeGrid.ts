import { RoutineBlock } from './types';

export const SLOT_COUNT = 48;
export const SLOT_MINUTES = 30;

export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function slotIndexToLabel(slotIndex: number): string {
  const totalMinutes = slotIndex * SLOT_MINUTES;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function timeStringToSlotIndex(time: string): number {
  const [h, m] = time.split(':').map(Number);
  const slot = Math.floor(((h || 0) * 60 + (m || 0)) / SLOT_MINUTES);
  return Math.max(0, Math.min(SLOT_COUNT - 1, slot));
}

export function getWeekdayName(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  return WEEKDAY_NAMES[dateObj.getDay()];
}

export function isRoutineActiveOnDate(block: RoutineBlock, dateStr: string): boolean {
  if (!block.is_active) return false;
  if (!block.weekdays.includes(getWeekdayName(dateStr))) return false;
  if (block.start_date && dateStr < block.start_date) return false;
  if (block.end_date && dateStr > block.end_date) return false;
  return true;
}

export function slotsForRoutineBlock(block: RoutineBlock): { startSlot: number; endSlot: number } {
  const startSlot = timeStringToSlotIndex(block.start_time);
  let endSlot = timeStringToSlotIndex(block.end_time);
  if (endSlot <= startSlot) endSlot = Math.min(SLOT_COUNT, startSlot + 1);
  return { startSlot, endSlot };
}
