// ============================================
// EEE Batch Pulse — Constants
// ============================================

import type {
  PostType,
  ScheduleStatus,
  AttendanceStatus,
  AttendanceSettings,
  SemesterSettings,
  HolidayEntry,
} from './types';

export const BATCH_NAME = 'EEE Batch Pulse';

export const DEFAULT_ATTENDANCE_SETTINGS: AttendanceSettings = {
  targetPercentage: 75,
  rollingWindowDays: 7,
  weeklyBackdatedLimit: 3,
  termRemainingWeeks: 12,
  notifyLowAttendance: true,
  classAlarmMinutesBefore: 10,
  alarmSoundEnabled: true,
  favoriteSubjectAlerts: [],
  batch: 'B1',
};

export const DEFAULT_SEMESTER_SETTINGS: SemesterSettings = {
  studentId: 'student_default',
  startDate: '2026-08-01',
  endDate: '2026-12-24',
  targetPercent: 0.75, // 75% default
  batch: 'B1',
};


export const DEFAULT_GAZETTED_HOLIDAYS: HolidayEntry[] = [
  { id: 'gh-1', date: '2026-08-15', type: 'gazetted', label: 'Independence Day', isHoliday: true },
  { id: 'gh-2', date: '2026-08-28', type: 'gazetted', label: 'Raksha Bandhan', isHoliday: true },
  { id: 'gh-3', date: '2026-09-04', type: 'gazetted', label: 'Janmashtami', isHoliday: true },
  { id: 'gh-4', date: '2026-09-16', type: 'gazetted', label: 'Milad-un-Nabi', isHoliday: true },
  { id: 'gh-5', date: '2026-10-02', type: 'gazetted', label: 'Mahatma Gandhi Jayanti', isHoliday: true },
  { id: 'gh-6', date: '2026-10-20', type: 'gazetted', label: 'Maha Navami / Dussehra Eve', isHoliday: true },
  { id: 'gh-7', date: '2026-10-21', type: 'gazetted', label: 'Dussehra (Vijaya Dashami)', isHoliday: true },
  { id: 'gh-8', date: '2026-11-08', type: 'gazetted', label: 'Diwali (Deepavali)', isHoliday: true },
  { id: 'gh-9', date: '2026-11-09', type: 'gazetted', label: 'Govardhan Puja', isHoliday: true },
  { id: 'gh-10', date: '2026-11-11', type: 'gazetted', label: 'Bhai Dooj', isHoliday: true },
  { id: 'gh-11', date: '2026-11-24', type: 'gazetted', label: 'Guru Nanak Jayanti', isHoliday: true },
  { id: 'gh-12', date: '2026-12-25', type: 'gazetted', label: 'Christmas Day', isHoliday: true },
];


export const ATTENDANCE_STATUS_CONFIG: Record<
  AttendanceStatus,
  {
    label: string;
    shortLabel: string;
    emoji: string;
    description: string;
    color: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    badgeClass: string;
    activeBtnClass: string;
    iconColor: string;
  }
> = {
  present: {
    label: 'Present',
    shortLabel: 'Attended',
    emoji: '✅',
    description: 'Attended class session',
    color: 'bg-emerald-500',
    bgColor: 'bg-emerald-50/80',
    borderColor: 'border-emerald-300',
    textColor: 'text-emerald-800',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    activeBtnClass: 'bg-emerald-600 text-white border-emerald-600 shadow-[0_4px_16px_rgba(5,150,105,0.35)] scale-[1.02]',
    iconColor: '#059669',
  },
  absent: {
    label: 'Absent',
    shortLabel: 'Missed',
    emoji: '❌',
    description: 'Missed or bunked class',
    color: 'bg-rose-500',
    bgColor: 'bg-rose-50/80',
    borderColor: 'border-rose-300',
    textColor: 'text-rose-800',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    activeBtnClass: 'bg-rose-600 text-white border-rose-600 shadow-[0_4px_16px_rgba(225,29,72,0.35)] scale-[1.02]',
    iconColor: '#E11D48',
  },
  cancelled: {
    label: 'Cancelled',
    shortLabel: 'Off',
    emoji: '⚪',
    description: 'Class cancelled / not held (excluded from %)',
    color: 'bg-slate-400',
    bgColor: 'bg-slate-50/80',
    borderColor: 'border-slate-300',
    textColor: 'text-slate-700',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    activeBtnClass: 'bg-slate-600 text-white border-slate-600 shadow-[0_4px_14px_rgba(71,85,105,0.25)] scale-[1.02]',
    iconColor: '#64748B',
  },
  leave: {
    label: 'Leave / OD',
    shortLabel: 'Duty Leave',
    emoji: '🟡',
    description: 'Official duty / approved leave (excluded from %)',
    color: 'bg-amber-500',
    bgColor: 'bg-amber-50/80',
    borderColor: 'border-amber-300',
    textColor: 'text-amber-800',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    activeBtnClass: 'bg-amber-500 text-white border-amber-500 shadow-[0_4px_14px_rgba(217,119,6,0.3)] scale-[1.02]',
    iconColor: '#D97706',
  },
};


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
