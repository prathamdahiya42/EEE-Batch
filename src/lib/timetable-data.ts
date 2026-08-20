// ============================================
// EEE Batch Pulse — Verified Timetable Data & Calculation
// UIT RGPV Bhopal, B.Tech I SEM, Section EX, Room 106
// ============================================

import type { TimetableEntry, ScheduleEntry, LiveSlotState, BatchOption } from './types';

export const WEEKLY_TIMETABLE: TimetableEntry[] = [
  // --------------------------------------------
  // MONDAY (day_of_week = 1)
  // --------------------------------------------
  {
    id: 'mon-1',
    day_of_week: 1,
    start_time: '10:00',
    end_time: '13:00',
    subject: 'Manufacturing Practices Lab',
    faculty: 'Dr. Prashant Sharma / Rajesh Tiwari',
    room: 'Lab',
    batch: 'B1',
    session_type: 'lab',
  },
  {
    id: 'mon-2',
    day_of_week: 1,
    start_time: '10:00',
    end_time: '13:00',
    subject: 'Engineering Graphics Lab',
    faculty: 'Dharmendra Singh Rajput (DSR)',
    room: 'Lab',
    batch: 'B2',
    session_type: 'lab',
  },
  {
    id: 'mon-lunch',
    day_of_week: 1,
    start_time: '13:00',
    end_time: '13:50',
    subject: 'Lunch Break',
    faculty: null,
    room: null,
    batch: null,
    session_type: 'lunch',
  },
  {
    id: 'mon-3',
    day_of_week: 1,
    start_time: '13:50',
    end_time: '15:40',
    subject: 'English Lab',
    faculty: 'Dr. Noeen Khaliq (NQ)',
    room: 'Lab',
    batch: 'B1',
    session_type: 'lab',
  },
  {
    id: 'mon-4',
    day_of_week: 1,
    start_time: '13:50',
    end_time: '15:40',
    subject: 'Engineering Science',
    faculty: 'Ravendra K Ray (RA)',
    room: 'Room 106',
    batch: 'B2',
    session_type: 'lecture',
  },
  {
    id: 'mon-5',
    day_of_week: 1,
    start_time: '15:40',
    end_time: '16:35',
    subject: 'Engineering Science',
    faculty: 'Ravendra K Ray (RA)',
    room: 'Room 106',
    batch: null,
    session_type: 'lecture',
  },
  {
    id: 'mon-6',
    day_of_week: 1,
    start_time: '16:35',
    end_time: '17:30',
    subject: 'Environmental Sciences',
    faculty: 'Bineet Khampariya (BK)',
    room: 'Room 106',
    batch: null,
    session_type: 'lecture',
  },

  // --------------------------------------------
  // TUESDAY (day_of_week = 2)
  // --------------------------------------------
  {
    id: 'tue-1',
    day_of_week: 2,
    start_time: '10:00',
    end_time: '11:00',
    subject: 'Renewable Energy Resources',
    faculty: 'Akansha Mercy Steele (AMS)',
    room: 'Room 106',
    batch: null,
    session_type: 'lecture',
  },
  {
    id: 'tue-2',
    day_of_week: 2,
    start_time: '11:00',
    end_time: '12:00',
    subject: 'Engineering Science',
    faculty: 'Ravendra K Ray (RA)',
    room: 'Room 106',
    batch: null,
    session_type: 'lecture',
  },
  {
    id: 'tue-3',
    day_of_week: 2,
    start_time: '12:00',
    end_time: '13:00',
    subject: 'Fundamentals of Electrical Engineering',
    faculty: 'Pankaj Sarsia (PS)',
    room: 'Room 106',
    batch: null,
    session_type: 'lecture',
  },
  {
    id: 'tue-lunch',
    day_of_week: 2,
    start_time: '13:00',
    end_time: '13:50',
    subject: 'Lunch Break',
    faculty: null,
    room: null,
    batch: null,
    session_type: 'lunch',
  },
  {
    id: 'tue-4',
    day_of_week: 2,
    start_time: '13:50',
    end_time: '14:45',
    subject: 'Mathematics – I',
    faculty: 'Dr. Rashmi Gupta (RG) / Bhawna Soni (BS)',
    room: 'Room 106',
    batch: null,
    session_type: 'lecture',
  },
  {
    id: 'tue-5',
    day_of_week: 2,
    start_time: '14:45',
    end_time: '15:40',
    subject: 'English',
    faculty: 'Dr. Noeen Khaliq (NQ)',
    room: 'Room 106',
    batch: null,
    session_type: 'lecture',
  },
  {
    id: 'tue-6',
    day_of_week: 2,
    start_time: '15:40',
    end_time: '17:30',
    subject: 'Engineering Science',
    faculty: 'Ravendra K Ray (RA)',
    room: 'Room 106',
    batch: 'B1',
    session_type: 'lecture',
  },
  {
    id: 'tue-7',
    day_of_week: 2,
    start_time: '15:40',
    end_time: '17:30',
    subject: 'Library',
    faculty: null,
    room: 'Library',
    batch: 'B2',
    session_type: 'library',
  },

  // --------------------------------------------
  // WEDNESDAY (day_of_week = 3)
  // --------------------------------------------
  {
    id: 'wed-1',
    day_of_week: 3,
    start_time: '10:00',
    end_time: '11:00',
    subject: 'Mathematics – I',
    faculty: 'Dr. Rashmi Gupta (RG) / Bhawna Soni (BS)',
    room: 'Room 106',
    batch: null,
    session_type: 'lecture',
  },
  {
    id: 'wed-2',
    day_of_week: 3,
    start_time: '11:00',
    end_time: '12:00',
    subject: 'Renewable Energy Resources',
    faculty: 'Akansha Mercy Steele (AMS)',
    room: 'Room 106',
    batch: null,
    session_type: 'lecture',
  },
  {
    id: 'wed-3',
    day_of_week: 3,
    start_time: '12:00',
    end_time: '13:00',
    subject: 'English',
    faculty: 'Dr. Noeen Khaliq (NQ)',
    room: 'Room 106',
    batch: null,
    session_type: 'lecture',
  },
  {
    id: 'wed-lunch',
    day_of_week: 3,
    start_time: '13:00',
    end_time: '13:50',
    subject: 'Lunch Break',
    faculty: null,
    room: null,
    batch: null,
    session_type: 'lunch',
  },
  {
    id: 'wed-4',
    day_of_week: 3,
    start_time: '13:50',
    end_time: '15:40',
    subject: 'Library',
    faculty: null,
    room: 'Library',
    batch: 'B1',
    session_type: 'library',
  },
  {
    id: 'wed-5',
    day_of_week: 3,
    start_time: '13:50',
    end_time: '15:40',
    subject: 'English Lab',
    faculty: 'Dr. Noeen Khaliq (NQ)',
    room: 'Lab',
    batch: 'B2',
    session_type: 'lab',
  },
  {
    id: 'wed-6',
    day_of_week: 3,
    start_time: '15:40',
    end_time: '16:35',
    subject: 'Engineering Science',
    faculty: 'Ravendra K Ray (RA)',
    room: 'Room 106',
    batch: null,
    session_type: 'lecture',
  },
  {
    id: 'wed-7',
    day_of_week: 3,
    start_time: '16:35',
    end_time: '17:30',
    subject: 'Fundamentals of Electrical Engineering',
    faculty: 'Pankaj Sarsia (PS)',
    room: 'Room 106',
    batch: null,
    session_type: 'lecture',
  },

  // --------------------------------------------
  // THURSDAY (day_of_week = 4)
  // --------------------------------------------
  {
    id: 'thu-1',
    day_of_week: 4,
    start_time: '10:00',
    end_time: '11:00',
    subject: 'English',
    faculty: 'Dr. Noeen Khaliq (NQ)',
    room: 'Room 106',
    batch: null,
    session_type: 'lecture',
  },
  {
    id: 'thu-2',
    day_of_week: 4,
    start_time: '11:00',
    end_time: '12:00',
    subject: 'Engineering Science',
    faculty: 'Ravendra K Ray (RA)',
    room: 'Room 106',
    batch: null,
    session_type: 'lecture',
  },
  {
    id: 'thu-3',
    day_of_week: 4,
    start_time: '12:00',
    end_time: '13:00',
    subject: 'Fundamentals of Electrical Engineering',
    faculty: 'Pankaj Sarsia (PS)',
    room: 'Room 106',
    batch: null,
    session_type: 'lecture',
  },
  {
    id: 'thu-lunch',
    day_of_week: 4,
    start_time: '13:00',
    end_time: '13:50',
    subject: 'Lunch Break',
    faculty: null,
    room: null,
    batch: null,
    session_type: 'lunch',
  },
  {
    id: 'thu-4',
    day_of_week: 4,
    start_time: '13:50',
    end_time: '14:45',
    subject: 'Mathematics – I',
    faculty: 'Dr. Rashmi Gupta (RG) / Bhawna Soni (BS)',
    room: 'Room 106',
    batch: null,
    session_type: 'lecture',
  },
  {
    id: 'thu-5',
    day_of_week: 4,
    start_time: '14:45',
    end_time: '17:30',
    subject: 'Engineering Graphics Lab',
    faculty: 'Dharmendra Singh Rajput (DSR)',
    room: 'Lab',
    batch: 'B1',
    session_type: 'lab',
  },
  {
    id: 'thu-6',
    day_of_week: 4,
    start_time: '14:45',
    end_time: '17:30',
    subject: 'Manufacturing Practices Lab',
    faculty: 'Dr. Prashant Sharma / Rajesh Tiwari',
    room: 'Lab',
    batch: 'B2',
    session_type: 'lab',
  },

  // --------------------------------------------
  // FRIDAY (day_of_week = 5)
  // --------------------------------------------
  {
    id: 'fri-1',
    day_of_week: 5,
    start_time: '10:00',
    end_time: '11:00',
    subject: 'English',
    faculty: 'Dr. Noeen Khaliq (NQ)',
    room: 'Room 106',
    batch: null,
    session_type: 'lecture',
  },
  {
    id: 'fri-2',
    day_of_week: 5,
    start_time: '11:00',
    end_time: '12:00',
    subject: 'Fundamentals of Electrical Engineering',
    faculty: 'Pankaj Sarsia (PS)',
    room: 'Room 106',
    batch: null,
    session_type: 'lecture',
  },
  {
    id: 'fri-3',
    day_of_week: 5,
    start_time: '12:00',
    end_time: '13:00',
    subject: 'Fundamentals of Electrical Engineering',
    faculty: 'Pankaj Sarsia (PS)',
    room: 'Room 106',
    batch: null,
    session_type: 'lecture',
  },
  {
    id: 'fri-lunch',
    day_of_week: 5,
    start_time: '13:00',
    end_time: '13:50',
    subject: 'Lunch Break',
    faculty: null,
    room: null,
    batch: null,
    session_type: 'lunch',
  },
  {
    id: 'fri-4',
    day_of_week: 5,
    start_time: '13:50',
    end_time: '14:45',
    subject: 'Renewable Energy Resources',
    faculty: 'Akansha Mercy Steele (AMS)',
    room: 'Room 106',
    batch: null,
    session_type: 'lecture',
  },
  {
    id: 'fri-5',
    day_of_week: 5,
    start_time: '14:45',
    end_time: '15:40',
    subject: 'Mathematics – I',
    faculty: 'Dr. Rashmi Gupta (RG) / Bhawna Soni (BS)',
    room: 'Room 106',
    batch: null,
    session_type: 'lecture',
  },
  {
    id: 'fri-6',
    day_of_week: 5,
    start_time: '15:40',
    end_time: '16:35',
    subject: 'Environmental Sciences',
    faculty: 'Bineet Khampariya (BK)',
    room: 'Room 106',
    batch: null,
    session_type: 'lecture',
  },
  {
    id: 'fri-7',
    day_of_week: 5,
    start_time: '16:35',
    end_time: '17:30',
    subject: 'Library',
    faculty: null,
    room: 'Library',
    batch: null,
    session_type: 'library',
  },
];

export const DAYS_OF_WEEK = [
  { index: 1, name: 'Monday', short: 'Mon' },
  { index: 2, name: 'Tuesday', short: 'Tue' },
  { index: 3, name: 'Wednesday', short: 'Wed' },
  { index: 4, name: 'Thursday', short: 'Thu' },
  { index: 5, name: 'Friday', short: 'Fri' },
  { index: 6, name: 'Saturday', short: 'Sat' },
  { index: 0, name: 'Sunday', short: 'Sun' },
];

/**
 * Helper to convert "HH:MM" (or "HH:MM:SS") to minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + (m || 0);
}

/**
 * Format 24-hour time to 12-hour AM/PM
 */
export function format12Hour(timeStr: string): string {
  const [hoursStr, minutesStr] = timeStr.split(':');
  let h = parseInt(hoursStr, 10);
  const m = minutesStr ? minutesStr.slice(0, 2) : '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

/**
 * Filter timetable entries for a given day and batch preference
 */
export function getTimetableForDay(
  dayOfWeek: number,
  batchPref: BatchOption = 'ALL',
  source: TimetableEntry[] = WEEKLY_TIMETABLE
): TimetableEntry[] {
  return source
    .filter((slot) => {
      if (slot.day_of_week !== dayOfWeek) return false;
      if (batchPref === 'ALL') return true;
      if (!slot.batch) return true;
      return slot.batch === batchPref;
    })
    .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
}

/**
 * Match a schedule override to a timetable entry by subject or scheduled time
 */
export function findMatchingOverride(
  slot: TimetableEntry,
  overrides: ScheduleEntry[]
): ScheduleEntry | null {
  if (!overrides || overrides.length === 0) return null;
  // Match by scheduled time if possible, or fuzzy subject match
  const timeMatch = overrides.find((o) => {
    if (!o.scheduled_time) return false;
    const oMins = timeToMinutes(o.scheduled_time);
    const slotMins = timeToMinutes(slot.start_time);
    return Math.abs(oMins - slotMins) <= 20;
  });
  if (timeMatch) return timeMatch;

  return (
    overrides.find(
      (o) =>
        o.subject.toLowerCase().trim() === slot.subject.toLowerCase().trim()
    ) || null
  );
}

/**
 * Computes live current and next slot state client-side or server-side
 */
export function computeLiveSlotState(
  now: Date = new Date(),
  batchPref: BatchOption = 'ALL',
  overrides: ScheduleEntry[] = [],
  source: TimetableEntry[] = WEEKLY_TIMETABLE
): LiveSlotState {
  const dayOfWeek = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const dayInfo = DAYS_OF_WEEK.find((d) => d.index === dayOfWeek) || {
    name: 'Weekend',
    short: 'Weekend',
  };

  // Weekend check
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    // Find next Monday slot
    const monSlots = getTimetableForDay(1, batchPref, source);
    const nextSlot = monSlots[0] || null;
    return {
      currentSlot: null,
      currentOverride: null,
      nextSlot,
      nextOverride: null,
      statusText: 'Weekend — No scheduled classes',
      timeRemainingText: null,
      isLive: false,
      isBreak: true,
      isFreeDay: true,
      dayName: dayInfo.name,
    };
  }

  const todaySlots = getTimetableForDay(dayOfWeek, batchPref, source);
  if (todaySlots.length === 0) {
    return {
      currentSlot: null,
      currentOverride: null,
      nextSlot: null,
      nextOverride: null,
      statusText: 'No classes scheduled for today',
      timeRemainingText: null,
      isLive: false,
      isBreak: true,
      isFreeDay: true,
      dayName: dayInfo.name,
    };
  }

  // Find current slot
  let currentSlot: TimetableEntry | null = null;
  let nextSlot: TimetableEntry | null = null;

  for (let i = 0; i < todaySlots.length; i++) {
    const slot = todaySlots[i];
    const startMins = timeToMinutes(slot.start_time);
    const endMins = timeToMinutes(slot.end_time);

    if (currentMinutes >= startMins && currentMinutes < endMins) {
      currentSlot = slot;
      // Next slot
      nextSlot = todaySlots[i + 1] || null;
      break;
    } else if (currentMinutes < startMins) {
      if (!nextSlot) {
        nextSlot = slot;
      }
    }
  }

  // Check overrides
  const currentOverride = currentSlot
    ? findMatchingOverride(currentSlot, overrides)
    : null;
  const nextOverride = nextSlot
    ? findMatchingOverride(nextSlot, overrides)
    : null;

  // Build status text & countdown
  let statusText = '';
  let timeRemainingText: string | null = null;
  let isLive = false;
  let isBreak = false;

  if (currentSlot) {
    const endMins = timeToMinutes(currentSlot.end_time);
    const minsLeft = endMins - currentMinutes;

    if (currentSlot.session_type === 'lunch') {
      isBreak = true;
      statusText = 'Lunch Break';
      timeRemainingText = `ends in ${minsLeft}m`;
    } else {
      isLive = true;
      timeRemainingText = `ends in ${minsLeft}m`;
      statusText = currentSlot.subject;
    }
  } else if (nextSlot) {
    const startMins = timeToMinutes(nextSlot.start_time);
    const minsUntil = startMins - currentMinutes;
    isBreak = true;
    if (minsUntil <= 60) {
      timeRemainingText = `starts in ${minsUntil}m`;
      statusText = `Next: ${nextSlot.subject}`;
    } else {
      timeRemainingText = `at ${format12Hour(nextSlot.start_time)}`;
      statusText = `Next: ${nextSlot.subject}`;
    }
  } else {
    // Day completed
    isBreak = true;
    statusText = 'Classes concluded for today';
  }

  return {
    currentSlot,
    currentOverride,
    nextSlot,
    nextOverride,
    statusText,
    timeRemainingText,
    isLive,
    isBreak,
    isFreeDay: false,
    dayName: dayInfo.name,
  };
}
