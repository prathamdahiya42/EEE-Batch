// ============================================
// EEE Batch Pulse — TypeScript Types
// ============================================

export type PostType = 'note' | 'highlight' | 'book_rec' | 'review';

export type ScheduleStatus = 'happened' | 'delayed' | 'cancelled' | 'mass_bunk';

export type SessionType = 'lecture' | 'lab' | 'library' | 'lunch';

export type BatchOption = 'ALL' | 'B1' | 'B2';

export interface TimetableEntry {
  id: string;
  day_of_week: number; // 0=Sunday, 1=Monday ... 6=Saturday
  start_time: string; // '10:00' or '10:00:00'
  end_time: string; // '11:00' or '11:00:00'
  subject: string;
  faculty: string | null;
  room: string | null;
  batch: 'B1' | 'B2' | null;
  session_type: SessionType;
}

export interface Day {
  id: string;
  date: string; // YYYY-MM-DD
  created_at: string;
}

export interface Post {
  id: string;
  day_id: string;
  type: PostType;
  subject: string | null;
  content: string | null;
  image_urls: string[];
  posted_by: string | null;
  created_at: string;
  // Joined fields
  day?: Day;
  admin?: Admin;
}

export interface ScheduleEntry {
  id: string;
  day_id: string;
  subject: string;
  scheduled_time: string | null;
  status: ScheduleStatus;
  note: string | null;
  updated_at: string;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  whatsapp_number: string | null;
  created_at?: string;
}

export interface PushSubscriptionData {
  id?: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  batch_pref?: BatchOption;
  created_at?: string;
}

// Form / UI types
export interface PostFormData {
  type: PostType;
  subject: string;
  content: string;
  images: File[];
}

export interface ScheduleFormEntry {
  id?: string;
  subject: string;
  scheduled_time: string;
  status: ScheduleStatus;
  note: string;
}

// Day with all related data
export interface DayWithData {
  day: Day;
  posts: Post[];
  schedule: ScheduleEntry[];
}

// Live Current & Next slot computation result
export interface LiveSlotState {
  currentSlot: TimetableEntry | null;
  currentOverride: ScheduleEntry | null;
  nextSlot: TimetableEntry | null;
  nextOverride: ScheduleEntry | null;
  statusText: string;
  timeRemainingText: string | null;
  isLive: boolean;
  isBreak: boolean;
  isFreeDay: boolean;
  dayName: string;
}

// Real-time Chat message
export interface ChatMessage {
  id: string;
  content: string;
  sender_name: string;
  created_at: string;
}

// ============================================
// Attendance Tracking System Types
// ============================================

export type AttendanceStatus = 'present' | 'absent' | 'cancelled' | 'leave';

export type AttendanceSource = 'audit' | 'manual';

export interface AttendanceRecord {
  id: string;                     // unique id
  studentId: string;
  subjectId: string;              // links to existing subject/timetable entity
  classSlotId: string;            // which period/slot on that day
  date: string;                   // ISO date 'YYYY-MM-DD', actual calendar date of class
  status: AttendanceStatus;       // 'present' | 'absent' | 'cancelled' | 'leave'
  source: AttendanceSource;       // 'audit' = marked via normal flow, 'manual' = bulk/manual editor
  flagged: boolean;               // true if marked >2 days after the actual class date
  notes?: string;
  markedAt: string;               // timestamp when the record was created/updated
}

export interface AttendanceSettings {
  targetPercentage: number;       // default 75 (%)
  rollingWindowDays: number;      // default 7 (N)
  weeklyBackdatedLimit: number;   // default 3 (M)
  termRemainingWeeks: number;     // default 12 (estimate for R)
  notifyLowAttendance: boolean;   // default true
  classAlarmMinutesBefore: number; // default 10 (minutes)
  alarmSoundEnabled: boolean;     // default true
  favoriteSubjectAlerts: string[]; // subjects requiring strict alerts
  batch?: 'B1' | 'B2';            // student's assigned lab batch
}

export interface SemesterSettings {
  studentId: string;
  startDate: string;        // ISO date — first day of semester (e.g. '2026-08-01')
  endDate: string;          // ISO date — last day of semester (e.g. '2026-12-24')
  targetPercent: number;    // decimal, e.g. 0.75 / 0.80 / 0.90 — student-selectable
  batch?: 'B1' | 'B2';      // student's assigned lab batch (default B1)
}


export interface HolidayEntry {
  id: string;
  date: string;             // ISO date 'YYYY-MM-DD'
  type: 'gazetted' | 'manual';   // 'gazetted' = official holiday, 'manual' = student-added
  label?: string;            // e.g. "Diwali", "Gandhi Jayanti"
  isHoliday: boolean;        // true = excluded from math; false = student un-marked it
}

export interface SubjectAttendanceStat {
  subjectId: string;
  subjectName: string;
  totalConducted: number;         // T = present + absent
  attended: number;               // A = present
  missed: number;                 // absent
  cancelled: number;              // cancelled
  leave: number;                  // leave
  percentage: number;             // (A / T) * 100 or 0 when T=0
  loggedPercentage: number;       // percentage of marked classes
  realPercentage: number;         // (A / elapsedScheduledClasses) * 100
  elapsedScheduledClasses: number;// total classes scheduled from startDate to min(today, endDate)
  unmarkedClassesCount: number;   // elapsed - (A + missed + cancelled + leave)
  hasConductedClasses: boolean;   // true if T > 0
  benchmarkDelta: number;         // percentage - (target * 100)
  isAtOrAboveTarget: boolean;
  immediateSafeBunks: number;     // how many classes can be missed consecutive right now before dropping below target
  safeToBunkClasses: number;      // m = R - ceil(target * (T + R) - A) (full term)
  semesterSafeBunks: number;      // same as safeToBunkClasses
  catchUpClassesNeeded: number;   // x = ceil((target * T - A) / (1 - target))
  remainingScheduledClasses: number; // R
  totalSemesterClasses: number;   // elapsed + R
  projectedPercentage: number;    // if remaining classes are attended
  hasWarning: boolean;            // true if projected or current falls below target
  isSafeForLeave: boolean;        // true if immediateSafeBunks > 0 or safeToBunkClasses > 0
}

export interface OverallAttendanceStat {
  totalConducted: number;
  attended: number;
  missed: number;
  cancelled: number;
  leave: number;
  percentage: number;             // (A / T) * 100 or 0 when T=0
  loggedPercentage: number;
  realPercentage: number;
  elapsedScheduledClasses: number;
  unmarkedClassesCount: number;
  hasConductedClasses: boolean;   // true if T > 0
  benchmarkDelta: number;         // percentage - (target * 100)
  isAtOrAboveTarget: boolean;
  immediateSafeBunks: number;     // classes you can skip right now before dropping below target
  safeToBunkClasses: number;      // full semester safe bunks
  semesterSafeBunks: number;
  catchUpClassesNeeded: number;
  remainingScheduledClasses: number;
  totalSemesterClasses: number;   // elapsed + R
  semesterProgressPercent: number;// (elapsedScheduledClasses / totalSemesterClasses) * 100
  totalSubjects: number;
  flaggedCount: number;
  safeLeaveSubjects: Array<{ subjectName: string; m: number; immediateM: number }>;
  atRiskSubjects: Array<{ subjectName: string; x: number; currentPercent: number }>;
}


export interface MarkAttendanceResult {
  success: boolean;
  error?: string;
  record?: AttendanceRecord;
  flagged?: boolean;
}


