// ============================================
// EEE Batch Pulse — Constants
// ============================================

import type { PostType, ScheduleStatus } from './types';

export const BATCH_NAME = 'EEE Batch Pulse';

// Update these with your actual subjects
export const SUBJECTS = [
  'Power Systems',
  'Control Systems',
  'Digital Electronics',
  'Signals & Systems',
  'Electrical Machines',
  'Electromagnetic Theory',
  'Microprocessors',
  'Network Analysis',
  'Power Electronics',
  'Instrumentation',
] as const;

export const POST_TYPE_CONFIG: Record<
  PostType,
  { label: string; emoji: string; color: string; badgeClass: string }
> = {
  note: {
    label: 'Note',
    emoji: '📝',
    color: 'text-[#FF4F9A]',
    badgeClass: 'bg-[#FF4F9A]/10 text-[#C2185B] border-[#FF4F9A]/25',
  },
  highlight: {
    label: 'Highlight',
    emoji: '⚡',
    color: 'text-amber-600',
    badgeClass: 'bg-amber-500/10 text-amber-800 border-amber-500/25',
  },
  book_rec: {
    label: 'Book Rec',
    emoji: '📚',
    color: 'text-purple-600',
    badgeClass: 'bg-purple-500/10 text-purple-800 border-purple-500/25',
  },
  review: {
    label: 'Review',
    emoji: '📋',
    color: 'text-sky-600',
    badgeClass: 'bg-sky-500/10 text-sky-800 border-sky-500/25',
  },
};

export const SCHEDULE_STATUS_CONFIG: Record<
  ScheduleStatus,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    ledClass: string;
    chipClass: string;
  }
> = {
  happened: {
    label: 'Happened',
    color: 'bg-emerald-500',
    bgColor: 'bg-emerald-50/70',
    borderColor: 'border-emerald-200/80',
    textColor: 'text-emerald-800',
    ledClass: 'pulse-green-glow',
    chipClass:
      'bg-emerald-50/80 border-emerald-300/60 text-emerald-800 shadow-[0_2px_10px_rgba(16,185,129,0.12)]',
  },
  delayed: {
    label: 'Delayed',
    color: 'bg-amber-500',
    bgColor: 'bg-amber-50/70',
    borderColor: 'border-amber-200/80',
    textColor: 'text-amber-800',
    ledClass: '',
    chipClass:
      'bg-amber-50/80 border-amber-300/60 text-amber-800 shadow-[0_2px_10px_rgba(245,158,11,0.12)]',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-rose-500',
    bgColor: 'bg-rose-50/70',
    borderColor: 'border-rose-200/80',
    textColor: 'text-rose-800',
    ledClass: '',
    chipClass:
      'bg-rose-50/80 border-rose-300/60 text-rose-800 shadow-[0_2px_10px_rgba(244,63,94,0.12)]',
  },
  mass_bunk: {
    label: 'Mass Bunk',
    color: 'bg-rose-600',
    bgColor: 'bg-rose-100/80',
    borderColor: 'border-rose-400/80',
    textColor: 'text-rose-900',
    ledClass: '',
    chipClass:
      'bg-rose-100/90 border-rose-400/70 text-rose-900 shadow-[0_2px_12px_rgba(225,29,72,0.18)]',
  },
};

// Date formatting helpers
export function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateMonospace(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getAdjacentDate(dateStr: string, offset: number): string {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getRelativeDayLabel(dateStr: string): string {
  const today = getTodayDateString();
  if (dateStr === today) return 'Today';
  const yesterday = getAdjacentDate(today, -1);
  if (dateStr === yesterday) return 'Yesterday';
  const tomorrow = getAdjacentDate(today, 1);
  if (dateStr === tomorrow) return 'Tomorrow';
  return formatDateDisplay(dateStr);
}
