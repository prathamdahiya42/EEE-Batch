// ============================================
// EEE Batch Pulse — Per-Class Attendance Engine
// ============================================

import type {
  AttendanceRecord,
  AttendanceSettings,
  AttendanceStatus,
  SubjectAttendanceStat,
  OverallAttendanceStat,
  MarkAttendanceResult,
  BatchOption,
  TimetableEntry,
  SemesterSettings,
  HolidayEntry,
} from './types';
import {
  DEFAULT_ATTENDANCE_SETTINGS,
  DEFAULT_SEMESTER_SETTINGS,
  DEFAULT_GAZETTED_HOLIDAYS,
  getTodayDateString,
  getAdjacentDate,
} from './constants';
import { WEEKLY_TIMETABLE, getTimetableForDay } from './timetable-data';

const STORAGE_KEY_RECORDS = 'eee_pulse_attendance_records_v1';
const STORAGE_KEY_SETTINGS = 'eee_pulse_attendance_settings_v1';
const STORAGE_KEY_BACKDATED_LOG = 'eee_pulse_attendance_backdated_log_v1';
const STORAGE_KEY_SEMESTER = 'eee_pulse_semester_settings_v1';
const STORAGE_KEY_HOLIDAYS = 'eee_pulse_holiday_entries_v1';

// Default student ID for anonymous single-user storage
export const DEFAULT_STUDENT_ID = 'student_default';

/**
 * Get start of current calendar week (Monday 00:00:00 local time)
 */
export function getStartOfCurrentWeek(): Date {
  const now = new Date();
  const day = now.getDay(); // 0 is Sunday, 1 is Monday
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * Load attendance settings from localStorage
 */
export function getAttendanceSettings(studentId: string = DEFAULT_STUDENT_ID): AttendanceSettings {
  if (typeof window === 'undefined') return DEFAULT_ATTENDANCE_SETTINGS;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_SETTINGS}_${studentId}`);
    if (!raw) return DEFAULT_ATTENDANCE_SETTINGS;
    return { ...DEFAULT_ATTENDANCE_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    console.warn('Failed to parse attendance settings:', err);
    return DEFAULT_ATTENDANCE_SETTINGS;
  }
}

/**
 * Save attendance settings to localStorage
 */
export function saveAttendanceSettings(
  settings: AttendanceSettings,
  studentId: string = DEFAULT_STUDENT_ID
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_KEY_SETTINGS}_${studentId}`, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save attendance settings:', err);
  }
}

/**
 * Load semester settings (start date, end date, target %)
 */
export function getSemesterSettings(studentId: string = DEFAULT_STUDENT_ID): SemesterSettings {
  if (typeof window === 'undefined') return DEFAULT_SEMESTER_SETTINGS;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_SEMESTER}_${studentId}`);
    if (!raw) return DEFAULT_SEMESTER_SETTINGS;
    return { ...DEFAULT_SEMESTER_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    console.warn('Failed to parse semester settings:', err);
    return DEFAULT_SEMESTER_SETTINGS;
  }
}

/**
 * Save semester settings
 */
export function saveSemesterSettings(
  settings: SemesterSettings,
  studentId: string = DEFAULT_STUDENT_ID
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_KEY_SEMESTER}_${studentId}`, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save semester settings:', err);
  }
}

/**
 * Load holiday calendar entries (Gazetted + Manual)
 */
export function getHolidayEntries(studentId: string = DEFAULT_STUDENT_ID): HolidayEntry[] {
  if (typeof window === 'undefined') return DEFAULT_GAZETTED_HOLIDAYS;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_HOLIDAYS}_${studentId}`);
    if (!raw) return DEFAULT_GAZETTED_HOLIDAYS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_GAZETTED_HOLIDAYS;
  } catch (err) {
    console.warn('Failed to parse holiday entries:', err);
    return DEFAULT_GAZETTED_HOLIDAYS;
  }
}

/**
 * Save holiday entries to localStorage
 */
export function saveHolidayEntries(
  holidays: HolidayEntry[],
  studentId: string = DEFAULT_STUDENT_ID
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_KEY_HOLIDAYS}_${studentId}`, JSON.stringify(holidays));
  } catch (err) {
    console.error('Failed to save holiday entries:', err);
  }
}

/**
 * Toggle a holiday on/off or add manual holiday override
 */
export function toggleHoliday(
  date: string,
  label: string = 'Holiday',
  type: 'gazetted' | 'manual' = 'manual',
  studentId: string = DEFAULT_STUDENT_ID
): HolidayEntry[] {
  const holidays = getHolidayEntries(studentId);
  const existingIdx = holidays.findIndex((h) => h.date === date);

  if (existingIdx >= 0) {
    // Toggle active state
    holidays[existingIdx].isHoliday = !holidays[existingIdx].isHoliday;
  } else {
    // Create new manual holiday
    holidays.push({
      id: `hol-${Date.now()}`,
      date,
      type,
      label,
      isHoliday: true,
    });
  }

  // Sort by date
  holidays.sort((a, b) => a.date.localeCompare(b.date));
  saveHolidayEntries(holidays, studentId);
  return holidays;
}

/**
 * Add a manual holiday or institute closure
 */
export function addManualHoliday(
  date: string,
  label: string,
  studentId: string = DEFAULT_STUDENT_ID
): HolidayEntry[] {
  const holidays = getHolidayEntries(studentId);
  const existingIdx = holidays.findIndex((h) => h.date === date);

  if (existingIdx >= 0) {
    holidays[existingIdx].label = label;
    holidays[existingIdx].isHoliday = true;
    holidays[existingIdx].type = 'manual';
  } else {
    holidays.push({
      id: `hol-${Date.now()}`,
      date,
      type: 'manual',
      label: label || 'Institute Holiday',
      isHoliday: true,
    });
  }

  holidays.sort((a, b) => a.date.localeCompare(b.date));
  saveHolidayEntries(holidays, studentId);
  return holidays;
}

/**
 * Check if a given calendar date is classified as a holiday
 */
export function isDateHoliday(date: string, holidays: HolidayEntry[] = DEFAULT_GAZETTED_HOLIDAYS): boolean {
  const entry = holidays.find((h) => h.date === date);
  return !!entry && entry.isHoliday;
}

/**
 * Check if a date falls within semester range and is NOT a holiday
 */
export function isEffectiveClassDate(
  date: string,
  semesterSettings: SemesterSettings = DEFAULT_SEMESTER_SETTINGS,
  holidays: HolidayEntry[] = DEFAULT_GAZETTED_HOLIDAYS
): boolean {
  if (date < semesterSettings.startDate || date > semesterSettings.endDate) {
    return false;
  }
  return !isDateHoliday(date, holidays);
}

/**
 * Load all attendance records for a student
 */
export function getAttendanceRecords(studentId: string = DEFAULT_STUDENT_ID): AttendanceRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_RECORDS}_${studentId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to parse attendance records:', err);
    return [];
  }
}

/**
 * Save all attendance records for a student
 */
export function saveAttendanceRecords(
  records: AttendanceRecord[],
  studentId: string = DEFAULT_STUDENT_ID
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_KEY_RECORDS}_${studentId}`, JSON.stringify(records));
  } catch (err) {
    console.error('Failed to save attendance records:', err);
  }
}

/**
 * Track backdated edit operations for weekly quota enforcement
 */
interface BackdatedLogEntry {
  timestamp: string; // ISO string of when the edit was made
  classDate: string;  // ISO YYYY-MM-DD of the backdated class
  classSlotId: string;
}

function getBackdatedLog(studentId: string = DEFAULT_STUDENT_ID): BackdatedLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_BACKDATED_LOG}_${studentId}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function recordBackdatedEdit(
  classDate: string,
  classSlotId: string,
  studentId: string = DEFAULT_STUDENT_ID
): void {
  if (typeof window === 'undefined') return;
  try {
    const log = getBackdatedLog(studentId);
    log.push({
      timestamp: new Date().toISOString(),
      classDate,
      classSlotId,
    });
    // Keep only last 100 entries
    const trimmed = log.slice(-100);
    localStorage.setItem(`${STORAGE_KEY_BACKDATED_LOG}_${studentId}`, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('Failed to record backdated edit log:', err);
  }
}

/**
 * Count backdated edits made in the current calendar week (Mon 00:00 onward)
 */
export function getBackdatedEditsCountThisWeek(studentId: string = DEFAULT_STUDENT_ID): number {
  const log = getBackdatedLog(studentId);
  const startOfWeek = getStartOfCurrentWeek().getTime();
  return log.filter((entry) => new Date(entry.timestamp).getTime() >= startOfWeek).length;
}

/**
 * Difference in calendar days between two YYYY-MM-DD date strings
 */
export function getDaysDifference(fromDateStr: string, toDateStr: string): number {
  const from = new Date(fromDateStr + 'T00:00:00');
  const to = new Date(toDateStr + 'T00:00:00');
  const diffTime = to.getTime() - from.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Mark attendance for an individual class slot following business rules & restrictions
 */
export function markAttendance(
  studentId: string = DEFAULT_STUDENT_ID,
  classSlotId: string,
  subjectId: string,
  date: string,
  status: AttendanceStatus,
  notes?: string
): MarkAttendanceResult {
  const today = getTodayDateString();
  const isFuture = date > today;
  const isBackdated = date < today;
  const daysDiff = getDaysDifference(date, today);
  const isFlagged = daysDiff > 2;


  // -------------------------------------------------------------
  // Upsert Record
  // -------------------------------------------------------------
  const records = getAttendanceRecords(studentId);
  const recordId = `${studentId}_${date}_${classSlotId}`;
  const nowISO = new Date().toISOString();

  const newRecord: AttendanceRecord = {
    id: recordId,
    studentId,
    subjectId,
    classSlotId,
    date,
    status,
    source: 'audit',
    flagged: isFlagged,
    notes: notes || undefined,
    markedAt: nowISO,
  };

  const existingIndex = records.findIndex(
    (r) => r.studentId === studentId && r.date === date && r.classSlotId === classSlotId
  );

  if (existingIndex >= 0) {
    records[existingIndex] = newRecord;
  } else {
    records.push(newRecord);
  }

  saveAttendanceRecords(records, studentId);

  // If this was a backdated action, log it
  if (isBackdated) {
    recordBackdatedEdit(date, classSlotId, studentId);
  }

  return {
    success: true,
    record: newRecord,
    flagged: isFlagged,
  };
}

/**
 * Manual / Bulk Editor (Bypass Mode):
 * Allows marking ANY date without rolling-window or quota limits.
 * Tags records with source: 'manual' and flagged: false.
 */
export function bulkSetAttendance(
  studentId: string = DEFAULT_STUDENT_ID,
  entries: Array<{
    subjectId: string;
    classSlotId: string;
    date: string;
    status: AttendanceStatus;
    notes?: string;
  }>
): { success: boolean; count: number; error?: string } {
  if (!entries || entries.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    const records = getAttendanceRecords(studentId);
    const nowISO = new Date().toISOString();
    let count = 0;

    for (const entry of entries) {
      const recordId = `${studentId}_${entry.date}_${entry.classSlotId}`;
      const manualRecord: AttendanceRecord = {
        id: recordId,
        studentId,
        subjectId: entry.subjectId,
        classSlotId: entry.classSlotId,
        date: entry.date,
        status: entry.status,
        source: 'manual',
        flagged: false, // manual mode does not flag
        notes: entry.notes || undefined,
        markedAt: nowISO,
      };

      const existingIndex = records.findIndex(
        (r) => r.studentId === studentId && r.date === entry.date && r.classSlotId === entry.classSlotId
      );

      if (existingIndex >= 0) {
        records[existingIndex] = manualRecord;
      } else {
        records.push(manualRecord);
      }
      count++;
    }

    saveAttendanceRecords(records, studentId);
    return { success: true, count };
  } catch (err) {
    console.error('Error in bulkSetAttendance:', err);
    return { success: false, count: 0, error: 'Failed to save bulk attendance records.' };
  }
}

/**
 * Delete a specific attendance record
 */
export function deleteAttendanceRecord(
  recordId: string,
  studentId: string = DEFAULT_STUDENT_ID
): boolean {
  try {
    const records = getAttendanceRecords(studentId);
    const filtered = records.filter((r) => r.id !== recordId);
    saveAttendanceRecords(filtered, studentId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear all attendance data for a student
 */
export function clearAllAttendance(studentId: string = DEFAULT_STUDENT_ID): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${STORAGE_KEY_RECORDS}_${studentId}`);
  localStorage.removeItem(`${STORAGE_KEY_BACKDATED_LOG}_${studentId}`);
}

/**
 * Get unique list of subjects from records + timetable
 */
/**
 * Check if a timetable slot applies to a specific batch ('B1' | 'B2' | 'ALL')
 */
export function isSlotForBatch(slot: TimetableEntry, batchPref: BatchOption = 'B1'): boolean {
  if (slot.session_type === 'lunch') return false;
  if (batchPref === 'ALL') return true;
  return !slot.batch || slot.batch === batchPref;
}

/**
 * Get unique list of subjects from records + timetable for a specific batch
 */
export function getAllDistinctSubjects(
  records: AttendanceRecord[],
  batchPref: BatchOption = 'B1',
  timetable: TimetableEntry[] = WEEKLY_TIMETABLE
): string[] {
  const subjectSet = new Set<string>();

  // Add all subjects from timetable belonging to this batch
  for (const slot of timetable) {
    if (isSlotForBatch(slot, batchPref)) {
      subjectSet.add(slot.subject);
    }
  }

  // Add any custom subjects found in records
  for (const record of records) {
    if (record.subjectId) {
      subjectSet.add(record.subjectId);
    }
  }

  return Array.from(subjectSet).sort();
}

/**
 * 3.1 VoltTrack Semester Duration Calculation (D_base)
 */
export function calculateVoltTrackBaseDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate || endDate < startDate) return 90;
  try {
    const startMs = new Date(startDate + 'T00:00:00').getTime();
    const endMs = new Date(endDate + 'T00:00:00').getTime();
    const diffDays = Math.ceil(Math.abs(endMs - startMs) / 86400000) + 1;
    return diffDays > 0 ? diffDays : 90;
  } catch {
    return 90;
  }
}

/**
 * 3.2 - 3.8 VoltTrack Mathematical Engine Core Metrics
 */
export function calculateVoltTrackMetrics(
  attendedCount: number,
  bunkCount: number,
  officialHolidaysCount: number,
  baseDays: number,
  targetPercentage: number
) {
  const tReq = targetPercentage <= 1 ? targetPercentage * 100 : targetPercentage;
  const dWorking = Math.max(1, baseDays - officialHolidaysCount);
  const pProjected = Math.round((attendedCount / dWorking) * 100);
  const nMinReq = Math.ceil(dWorking * (tReq / 100));
  const bMaxAllowed = Math.max(0, dWorking - nMinReq);
  const sShield = Math.max(0, bMaxAllowed - bunkCount);
  const isSafe = pProjected >= tReq || sShield > 0;
  const circumference = 251.2;
  const dashOffset = circumference - (Math.min(100, pProjected) / 100) * circumference;
  const attendedWidth = Math.min(100, (attendedCount / dWorking) * 100);
  const holidaysWidth = Math.min(100, (bunkCount / dWorking) * 100);

  return {
    dBase: baseDays,
    dWorking,
    nAttended: attendedCount,
    nBunk: bunkCount,
    nOfficial: officialHolidaysCount,
    pProjected,
    nMinReq,
    bMaxAllowed,
    sShield,
    isSafe,
    statusText: isSafe ? 'Safe' : 'Below Target',
    dashOffset,
    attendedWidth,
    holidaysWidth,
  };
}

/**
 * Exact calculation of elapsed scheduled classes from startDate up to min(today, endDate)
 * excluding holidays for a subject in the assigned batch.
 */


export function calculateElapsedScheduledClassesForSubject(
  subjectId: string,
  startDate: string,
  endDate: string,
  today: string,
  holidays: HolidayEntry[] = DEFAULT_GAZETTED_HOLIDAYS,
  batchPref: BatchOption = 'B1',
  timetable: TimetableEntry[] = WEEKLY_TIMETABLE
): number {
  const normSubject = subjectId.toLowerCase().trim();
  const effectiveEnd = today < endDate ? today : endDate;
  if (startDate > effectiveEnd) return 0;

  let count = 0;
  let curr = startDate;

  while (curr <= effectiveEnd) {
    if (!isDateHoliday(curr, holidays)) {
      const dObj = new Date(curr + 'T00:00:00');
      const dayOfWeek = dObj.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const slotsToday = timetable.filter((slot) => {
          if (slot.day_of_week !== dayOfWeek) return false;
          if (!isSlotForBatch(slot, batchPref)) return false;
          return slot.subject.toLowerCase().trim() === normSubject;
        });
        count += slotsToday.length;
      }
    }
    curr = getAdjacentDate(curr, 1);
  }
  return count;
}

/**
 * Exact calculation of total elapsed scheduled classes across ALL subjects
 * from startDate up to min(today, endDate) excluding holidays for a batch.
 */
export function calculateTotalElapsedScheduledClasses(
  startDate: string,
  endDate: string,
  today: string,
  holidays: HolidayEntry[] = DEFAULT_GAZETTED_HOLIDAYS,
  batchPref: BatchOption = 'B1',
  timetable: TimetableEntry[] = WEEKLY_TIMETABLE
): number {
  const effectiveEnd = today < endDate ? today : endDate;
  if (startDate > effectiveEnd) return 0;

  let count = 0;
  let curr = startDate;

  while (curr <= effectiveEnd) {
    if (!isDateHoliday(curr, holidays)) {
      const dObj = new Date(curr + 'T00:00:00');
      const dayOfWeek = dObj.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const slotsToday = timetable.filter((slot) => {
          if (slot.day_of_week !== dayOfWeek) return false;
          if (!isSlotForBatch(slot, batchPref)) return false;
          return true;
        });
        count += slotsToday.length;
      }
    }
    curr = getAdjacentDate(curr, 1);
  }
  return count;
}

/**
 * Calculate immediate consecutive safe-to-bunk buffer right now
 * k = floor((A - target * T) / target)
 */
export function calculateImmediateBunkBuffer(
  attended: number,
  totalConducted: number,
  targetPercent: number
): number {
  if (totalConducted === 0 || targetPercent <= 0) return 0;
  const currentPct = attended / totalConducted;
  if (currentPct < targetPercent) return 0;
  const num = attended - targetPercent * totalConducted;
  const k = Math.floor(num / targetPercent);
  return Math.max(0, k);
}

/**
 * Exact calculation of remaining scheduled classes (R) for a subject
 * in the semester range [tomorrow, endDate] excluding holidays for a batch.
 */
export function calculateRemainingClassesForSubject(
  subjectId: string,
  startDate: string,
  endDate: string,
  today: string,
  holidays: HolidayEntry[] = DEFAULT_GAZETTED_HOLIDAYS,
  batchPref: BatchOption = 'B1',
  timetable: TimetableEntry[] = WEEKLY_TIMETABLE
): number {
  const normSubject = subjectId.toLowerCase().trim();
  const tomorrow = getAdjacentDate(today, 1);
  if (tomorrow > endDate) return 0;

  let rCount = 0;
  let curr = tomorrow;

  while (curr <= endDate) {
    // Only count if within semester range and not a holiday
    if (curr >= startDate && !isDateHoliday(curr, holidays)) {
      const dObj = new Date(curr + 'T00:00:00');
      const dayOfWeek = dObj.getDay();

      // Only weekdays (1..5)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const slotsToday = timetable.filter((slot) => {
          if (slot.day_of_week !== dayOfWeek) return false;
          if (!isSlotForBatch(slot, batchPref)) return false;
          return slot.subject.toLowerCase().trim() === normSubject;
        });
        rCount += slotsToday.length;
      }
    }

    curr = getAdjacentDate(curr, 1);
  }

  return rCount;
}

/**
 * Exact calculation of remaining scheduled classes (R) across ALL subjects
 * in the semester range [tomorrow, endDate] excluding holidays for a batch.
 */
export function calculateTotalRemainingClasses(
  startDate: string,
  endDate: string,
  today: string,
  holidays: HolidayEntry[] = DEFAULT_GAZETTED_HOLIDAYS,
  batchPref: BatchOption = 'B1',
  timetable: TimetableEntry[] = WEEKLY_TIMETABLE
): number {
  const tomorrow = getAdjacentDate(today, 1);
  if (tomorrow > endDate) return 0;

  let rCount = 0;
  let curr = tomorrow;

  while (curr <= endDate) {
    if (curr >= startDate && !isDateHoliday(curr, holidays)) {
      const dObj = new Date(curr + 'T00:00:00');
      const dayOfWeek = dObj.getDay();

      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const slotsToday = timetable.filter((slot) => {
          if (slot.day_of_week !== dayOfWeek) return false;
          if (!isSlotForBatch(slot, batchPref)) return false;
          return true;
        });
        rCount += slotsToday.length;
      }
    }

    curr = getAdjacentDate(curr, 1);
  }

  return rCount;
}

/**
 * Mark all scheduled class slots for a day with one click for the student's batch
 */
export function markAllDaySlots(
  date: string,
  status: AttendanceStatus,
  batchPref: BatchOption = 'B1',
  studentId: string = DEFAULT_STUDENT_ID,
  timetable: TimetableEntry[] = WEEKLY_TIMETABLE
): { success: boolean; count: number; error?: string } {
  const dObj = new Date(date + 'T00:00:00');
  const dayOfWeek = dObj.getDay();

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { success: false, count: 0, error: 'No scheduled classes on weekends.' };
  }

  // Filter slots strictly for this batch

  const slots = getTimetableForDay(dayOfWeek, batchPref, timetable).filter(
    (s) => isSlotForBatch(s, batchPref)
  );

  if (slots.length === 0) {
    return { success: false, count: 0, error: 'No class slots found for your batch on this day.' };
  }

  const entries = slots.map((s) => ({
    subjectId: s.subject,
    classSlotId: s.id,
    date,
    status,
    notes: `Marked via one-click (${batchPref})`,
  }));

  const res = bulkSetAttendance(studentId, entries);
  return { success: res.success, count: res.count, error: res.error };
}

/**
 * Clear all attendance records for a specific date
 */
export function clearDaySlots(
  date: string,
  studentId: string = DEFAULT_STUDENT_ID
): { success: boolean; count: number } {
  try {
    const records = getAttendanceRecords(studentId);
    const beforeCount = records.length;
    const filtered = records.filter((r) => r.date !== date);
    const removedCount = beforeCount - filtered.length;
    saveAttendanceRecords(filtered, studentId);
    return { success: true, count: removedCount };
  } catch {
    return { success: false, count: 0 };
  }
}

/**
 * Calculate attendance statistics for a single subject, scoped to Semester Dates & Holidays
 */
export function calculateSubjectAttendance(
  records: AttendanceRecord[],
  subjectId: string,
  semesterSettings: SemesterSettings = DEFAULT_SEMESTER_SETTINGS,
  holidays: HolidayEntry[] = DEFAULT_GAZETTED_HOLIDAYS,
  batchPref: BatchOption = 'B1',
  timetable: TimetableEntry[] = WEEKLY_TIMETABLE,
  today: string = getTodayDateString()
): SubjectAttendanceStat {
  const normSubject = subjectId.toLowerCase().trim();

  // Filter records for this subject within effective semester dates <= today and NOT holidays
  const matching = records.filter((r) => {
    if (r.subjectId.toLowerCase().trim() !== normSubject) return false;
    // Must fall within semester start & end
    if (r.date < semesterSettings.startDate || r.date > semesterSettings.endDate) return false;
    // Must be conducted on or before today
    if (r.date > today) return false;
    // Exclude if marked on a day classified as holiday
    if (isDateHoliday(r.date, holidays)) return false;
    return true;
  });

  // T = conducted classes so far (present + absent)
  const conductedRecords = matching.filter(
    (r) => r.status === 'present' || r.status === 'absent'
  );
  const totalConducted = conductedRecords.length;

  // A = attended classes so far (present)
  const attendedRecords = matching.filter((r) => r.status === 'present');
  const attended = attendedRecords.length;

  const missed = matching.filter((r) => r.status === 'absent').length;
  const cancelled = matching.filter((r) => r.status === 'cancelled').length;
  const leave = matching.filter((r) => r.status === 'leave').length;

  // Percentage (present / total conducted) * 100; 0 if no conducted classes
  const loggedPercentage = totalConducted > 0 ? (attended / totalConducted) * 100 : 0;
  const hasConductedClasses = totalConducted > 0;

  // Target as decimal, e.g. 0.75
  const target = semesterSettings.targetPercent;
  const targetPct100 = target * 100;
  const benchmarkDelta = hasConductedClasses ? loggedPercentage - targetPct100 : 0;

  // Elapsed scheduled classes for this subject from startDate to today
  const elapsedScheduledClasses = calculateElapsedScheduledClassesForSubject(
    subjectId,
    semesterSettings.startDate,
    semesterSettings.endDate,
    today,
    holidays,
    batchPref,
    timetable
  );

  const realPercentage = elapsedScheduledClasses > 0 ? (attended / elapsedScheduledClasses) * 100 : 0;
  const totalMarked = attended + missed + cancelled + leave;
  const unmarkedClassesCount = Math.max(0, elapsedScheduledClasses - totalMarked);

  // Exact R: remaining classes scheduled in semester after today
  const remainingScheduledClasses = calculateRemainingClassesForSubject(
    subjectId,
    semesterSettings.startDate,
    semesterSettings.endDate,
    today,
    holidays,
    batchPref,
    timetable
  );

  const isAtOrAboveTarget = hasConductedClasses && attended / totalConducted >= target;

  let safeToBunkClasses = 0;
  let catchUpClassesNeeded = 0;
  const immediateSafeBunks = calculateImmediateBunkBuffer(attended, totalConducted, target);

  if (hasConductedClasses) {
    if (isAtOrAboveTarget) {
      // Full semester margin: m = R - ceil(target * (T + R) - A)
      const m =
        remainingScheduledClasses -
        Math.ceil(target * (totalConducted + remainingScheduledClasses) - attended);
      safeToBunkClasses = Math.max(0, m);
      catchUpClassesNeeded = 0;
    } else {
      // Catch up needed: x = ceil((target * T - A) / (1 - target))
      const numerator = target * totalConducted - attended;
      const denominator = 1 - target;
      const x = denominator > 0 ? Math.ceil(numerator / denominator) : 0;
      catchUpClassesNeeded = Math.max(1, x);
      safeToBunkClasses = 0;
    }
  }

  // Projected percentage if all remaining R classes are attended:
  const totalSemesterClasses = elapsedScheduledClasses + remainingScheduledClasses;
  const projectedPercentage =
    totalSemesterClasses > 0 ? ((attended + remainingScheduledClasses) / totalSemesterClasses) * 100 : 100;

  const hasWarning =
    hasConductedClasses &&
    (loggedPercentage < targetPct100 || projectedPercentage < targetPct100);

  const isSafeForLeave = immediateSafeBunks > 0 || safeToBunkClasses > 0;

  // VoltTrack Mathematical Engine Metrics
  const baseDays = calculateVoltTrackBaseDays(semesterSettings.startDate, semesterSettings.endDate);
  const officialHolidaysCount = holidays.filter(
    (h) => h.isHoliday && h.date >= semesterSettings.startDate && h.date <= semesterSettings.endDate
  ).length;
  const voltTrack = calculateVoltTrackMetrics(
    attended,
    missed + leave,
    officialHolidaysCount,
    baseDays,
    target
  );

  return {
    subjectId,
    subjectName: subjectId,
    totalConducted,
    attended,
    missed,
    cancelled,
    leave,
    percentage: loggedPercentage,
    loggedPercentage,
    realPercentage,
    elapsedScheduledClasses,
    unmarkedClassesCount,
    hasConductedClasses,
    benchmarkDelta,
    isAtOrAboveTarget,
    immediateSafeBunks,
    safeToBunkClasses,
    semesterSafeBunks: safeToBunkClasses,
    catchUpClassesNeeded,
    remainingScheduledClasses,
    totalSemesterClasses,
    projectedPercentage,
    hasWarning,
    isSafeForLeave,
    voltTrack,
  };
}


/**
 * Calculate overall attendance across ALL subjects, scoped to Semester Dates & Holidays
 */
export function calculateOverallAttendance(
  records: AttendanceRecord[],
  semesterSettings: SemesterSettings = DEFAULT_SEMESTER_SETTINGS,
  holidays: HolidayEntry[] = DEFAULT_GAZETTED_HOLIDAYS,
  batchPref: BatchOption = 'B1',
  timetable: TimetableEntry[] = WEEKLY_TIMETABLE,
  today: string = getTodayDateString()
): OverallAttendanceStat {
  const distinctSubjects = getAllDistinctSubjects(records, batchPref, timetable);
  const allowedSubjectSet = new Set(distinctSubjects.map((s) => s.toLowerCase().trim()));

  // Filter all records within effective semester dates <= today, NOT holidays, and matching batch subjects
  const effectiveRecords = records.filter((r) => {
    if (r.date < semesterSettings.startDate || r.date > semesterSettings.endDate) return false;
    if (r.date > today) return false;
    if (isDateHoliday(r.date, holidays)) return false;
    if (r.subjectId && !allowedSubjectSet.has(r.subjectId.toLowerCase().trim())) return false;
    return true;
  });

  const conducted = effectiveRecords.filter(
    (r) => r.status === 'present' || r.status === 'absent'
  );
  const totalConducted = conducted.length;
  const attended = effectiveRecords.filter((r) => r.status === 'present').length;
  const missed = effectiveRecords.filter((r) => r.status === 'absent').length;
  const cancelled = effectiveRecords.filter((r) => r.status === 'cancelled').length;
  const leave = effectiveRecords.filter((r) => r.status === 'leave').length;

  const hasConductedClasses = totalConducted > 0;
  const loggedPercentage = hasConductedClasses ? (attended / totalConducted) * 100 : 0;
  const target = semesterSettings.targetPercent;
  const targetPct100 = target * 100;
  const benchmarkDelta = hasConductedClasses ? loggedPercentage - targetPct100 : 0;

  // Elapsed scheduled classes across all subjects
  const elapsedScheduledClasses = calculateTotalElapsedScheduledClasses(
    semesterSettings.startDate,
    semesterSettings.endDate,
    today,
    holidays,
    batchPref,
    timetable
  );

  const realPercentage = elapsedScheduledClasses > 0 ? (attended / elapsedScheduledClasses) * 100 : 0;
  const totalMarked = attended + missed + cancelled + leave;
  const unmarkedClassesCount = Math.max(0, elapsedScheduledClasses - totalMarked);

  // Exact R across all subjects for this batch
  const remainingScheduledClasses = calculateTotalRemainingClasses(
    semesterSettings.startDate,
    semesterSettings.endDate,
    today,
    holidays,
    batchPref,
    timetable
  );

  const isAtOrAboveTarget = hasConductedClasses && attended / totalConducted >= target;

  let safeToBunkClasses = 0;
  let catchUpClassesNeeded = 0;
  const immediateSafeBunks = calculateImmediateBunkBuffer(attended, totalConducted, target);

  if (hasConductedClasses) {
    if (isAtOrAboveTarget) {
      const m =
        remainingScheduledClasses -
        Math.ceil(target * (totalConducted + remainingScheduledClasses) - attended);
      safeToBunkClasses = Math.max(0, m);
      catchUpClassesNeeded = 0;
    } else {
      const numerator = target * totalConducted - attended;
      const denominator = 1 - target;
      const x = denominator > 0 ? Math.ceil(numerator / denominator) : 0;
      catchUpClassesNeeded = Math.max(1, x);
      safeToBunkClasses = 0;
    }
  }

  const flaggedCount = records.filter((r) => r.flagged).length;

  // Calculate stats for each subject to find safe leave and at-risk subjects
  const safeLeaveSubjects: Array<{ subjectName: string; m: number; immediateM: number }> = [];
  const atRiskSubjects: Array<{ subjectName: string; x: number; currentPercent: number }> = [];

  for (const subject of distinctSubjects) {
    const stat = calculateSubjectAttendance(
      records,
      subject,
      semesterSettings,
      holidays,
      batchPref,
      timetable,
      today
    );

    if (stat.hasConductedClasses) {
      if (stat.immediateSafeBunks > 0 || stat.safeToBunkClasses > 0) {
        safeLeaveSubjects.push({
          subjectName: stat.subjectName,
          m: stat.safeToBunkClasses,
          immediateM: stat.immediateSafeBunks,
        });
      } else {
        atRiskSubjects.push({
          subjectName: stat.subjectName,
          x: stat.catchUpClassesNeeded,
          currentPercent: stat.percentage,
        });
      }
    }
  }

  const totalSemesterClasses = elapsedScheduledClasses + remainingScheduledClasses;
  const semesterProgressPercent =
    totalSemesterClasses > 0 ? (elapsedScheduledClasses / totalSemesterClasses) * 100 : 0;

  // VoltTrack Mathematical Engine Metrics
  const baseDays = calculateVoltTrackBaseDays(semesterSettings.startDate, semesterSettings.endDate);
  const officialHolidaysCount = holidays.filter(
    (h) => h.isHoliday && h.date >= semesterSettings.startDate && h.date <= semesterSettings.endDate
  ).length;
  const voltTrack = calculateVoltTrackMetrics(
    attended,
    missed + leave,
    officialHolidaysCount,
    baseDays,
    target
  );

  return {
    totalConducted,
    attended,
    missed,
    cancelled,
    leave,
    percentage: loggedPercentage,
    loggedPercentage,
    realPercentage,
    elapsedScheduledClasses,
    unmarkedClassesCount,
    hasConductedClasses,
    benchmarkDelta,
    isAtOrAboveTarget,
    immediateSafeBunks,
    safeToBunkClasses,
    semesterSafeBunks: safeToBunkClasses,
    catchUpClassesNeeded,
    remainingScheduledClasses,
    totalSemesterClasses,
    semesterProgressPercent,
    totalSubjects: distinctSubjects.length,
    flaggedCount,
    safeLeaveSubjects,
    atRiskSubjects,
    voltTrack,
  };
}




/**
 * Synthesize an audio alarm / chime using the Web Audio API
 */
export function playAlarmSound(type: 'warning' | 'chime' | 'success' = 'chime'): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    if (type === 'warning') {
      // Two-tone warning beep
      [0, 0.2].forEach((offset, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(idx === 0 ? 440 : 330, ctx.currentTime + offset);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.2);
      });
    } else if (type === 'success') {
      // Pleasant chord chime
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.08);
        osc.stop(ctx.currentTime + i * 0.08 + 0.45);
      });
    } else {
      // Standard notification bell chime (D5 -> A5 -> D6)
      [587.33, 880.0, 1174.66].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.1);
        osc.stop(ctx.currentTime + i * 0.1 + 0.4);
      });
    }
  } catch (err) {
    console.warn('Web Audio playback error:', err);
  }
}

/**
 * Trigger device vibration pattern if supported
 */
export function triggerVibration(pattern: number[] = [200, 100, 200, 100, 400]): void {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration errors
    }
  }
}

/**
 * Send local browser notification or service worker alert
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  url: string = '/attendance'
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'default') {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return false;
  }

  if (Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          const swOptions: NotificationOptions & { vibrate?: number[] } = {
            body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            vibrate: [200, 100, 200],
            data: { url },
          };
          await reg.showNotification(title, swOptions as NotificationOptions);
          return true;
        }
      }

      new Notification(title, {
        body,
        icon: '/icon-192.png',
        data: { url },
      });
      return true;
    } catch (err) {
      console.warn('Local notification error:', err);
      return false;
    }
  }

  return false;
}
