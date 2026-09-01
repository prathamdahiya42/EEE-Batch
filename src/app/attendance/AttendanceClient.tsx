'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  getAttendanceRecords,
  saveAttendanceRecords,
  getAttendanceSettings,
  saveAttendanceSettings,
  getSemesterSettings,
  saveSemesterSettings,
  getHolidayEntries,
  saveHolidayEntries,
  toggleHoliday,
  addManualHoliday,
  isDateHoliday,
  isSlotForBatch,
  markAttendance,
  markAllDaySlots,
  clearDaySlots,
  bulkSetAttendance,
  deleteAttendanceRecord,
  clearAllAttendance,
  calculateSubjectAttendance,
  calculateOverallAttendance,
  getAllDistinctSubjects,
  getBackdatedEditsCountThisWeek,
  getDaysDifference,
  playAlarmSound,
  triggerVibration,
  sendLocalNotification,
  DEFAULT_STUDENT_ID,
} from '@/lib/attendance';
import {
  isSupabaseConnected,
  fetchAttendanceRecordsFromCloud,
  upsertAttendanceRecordsToCloud,
  deleteAttendanceRecordFromCloud,
  fetchSemesterSettingsFromCloud,
  upsertSemesterSettingsToCloud,
  fetchHolidaysFromCloud,
  upsertHolidaysToCloud,
  subscribeToAttendanceCloud,
} from '@/lib/supabase/attendance-sync';
import {
  WEEKLY_TIMETABLE,
  getTimetableForDay,
  format12Hour,
  findMatchingOverride,
} from '@/lib/timetable-data';
import {
  ATTENDANCE_STATUS_CONFIG,
  DEFAULT_ATTENDANCE_SETTINGS,
  DEFAULT_SEMESTER_SETTINGS,
  DEFAULT_GAZETTED_HOLIDAYS,
  getTodayDateString,
  getAdjacentDate,
  formatDateDisplay,
  formatDateMonospace,
} from '@/lib/constants';
import type {
  AttendanceRecord,
  AttendanceSettings,
  AttendanceStatus,
  ScheduleEntry,
  SemesterSettings,
  HolidayEntry,
} from '@/lib/types';

interface AttendanceClientProps {
  initialOverrides: ScheduleEntry[];
}

type TabType = 'daily' | 'subjects' | 'holidays' | 'manual' | 'flagged' | 'settings';

export default function AttendanceClient({ initialOverrides }: AttendanceClientProps) {
  // Global State
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<AttendanceSettings>(DEFAULT_ATTENDANCE_SETTINGS);
  const [semesterSettings, setSemesterSettings] = useState<SemesterSettings>(DEFAULT_SEMESTER_SETTINGS);
  const [holidays, setHolidays] = useState<HolidayEntry[]>(DEFAULT_GAZETTED_HOLIDAYS);
  // Student batch is strictly B1 or B2 for personal attendance tracking
  const [batchPref, setBatchPref] = useState<'B1' | 'B2'>('B1');
  const [selectedTab, setSelectedTab] = useState<TabType>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [searchSubject, setSearchSubject] = useState('');
  const [bannerMessage, setBannerMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [pushStatus, setPushStatus] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default');
  const [cloudConnected, setCloudConnected] = useState<boolean>(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);

  // Manual Tab state
  const [manualDate, setManualDate] = useState<string>(getTodayDateString());
  const [manualSubject, setManualSubject] = useState<string>('Fundamentals of Electrical Engineering');
  const [manualSlotId, setManualSlotId] = useState<string>('custom-slot');
  const [manualStatus, setManualStatus] = useState<AttendanceStatus>('present');
  const [manualNotes, setManualNotes] = useState<string>('');

  // Quick Backfill state
  const [backfillSubject, setBackfillSubject] = useState<string>('Fundamentals of Electrical Engineering');
  const [backfillAttended, setBackfillAttended] = useState<number>(15);
  const [backfillTotal, setBackfillTotal] = useState<number>(20);

  // New Holiday state
  const [newHolidayDate, setNewHolidayDate] = useState<string>(getTodayDateString());
  const [newHolidayLabel, setNewHolidayLabel] = useState<string>('');

  const showBanner = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setBannerMessage({ text, type });
    setTimeout(() => {
      setBannerMessage(null);
    }, 5000);
  }, []);

  // Sync with Supabase Cloud
  const handleCloudSync = useCallback(async (quiet = false) => {
    if (!isSupabaseConnected()) {
      if (!quiet) showBanner('Supabase credentials not configured in .env.local', 'info');
      return;
    }

    setIsCloudSyncing(true);
    try {
      const [cloudRecs, cloudSem, cloudHols] = await Promise.all([
        fetchAttendanceRecordsFromCloud(DEFAULT_STUDENT_ID),
        fetchSemesterSettingsFromCloud(DEFAULT_STUDENT_ID),
        fetchHolidaysFromCloud(DEFAULT_STUDENT_ID),
      ]);

      const localRecs = getAttendanceRecords(DEFAULT_STUDENT_ID);

      if (cloudRecs && cloudRecs.length > 0) {
        saveAttendanceRecords(cloudRecs, DEFAULT_STUDENT_ID);
        setRecords(cloudRecs);
      } else if (localRecs.length > 0) {
        await upsertAttendanceRecordsToCloud(localRecs, DEFAULT_STUDENT_ID);
      }

      if (cloudSem) {
        saveSemesterSettings(cloudSem, DEFAULT_STUDENT_ID);
        setSemesterSettings(cloudSem);
        if (cloudSem.batch) setBatchPref(cloudSem.batch);
      }

      if (cloudHols && cloudHols.length > 0) {
        saveHolidayEntries(cloudHols, DEFAULT_STUDENT_ID);
        setHolidays(cloudHols);
      }

      if (!quiet) showBanner('Cloud sync completed with Supabase!', 'success');
    } catch {
      if (!quiet) showBanner('Cloud sync encountered network error; using offline cache', 'info');
    } finally {
      setIsCloudSyncing(false);
    }
  }, [showBanner]);

  // Load client data on mount & initialize Supabase sync
  useEffect(() => {
    const loadedRecords = getAttendanceRecords(DEFAULT_STUDENT_ID);
    const loadedSettings = getAttendanceSettings(DEFAULT_STUDENT_ID);
    const loadedSemester = getSemesterSettings(DEFAULT_STUDENT_ID);
    const loadedHolidays = getHolidayEntries(DEFAULT_STUDENT_ID);

    setRecords(loadedRecords);
    setSettings(loadedSettings);
    setSemesterSettings(loadedSemester);
    setHolidays(loadedHolidays);

    // Load saved batch profile ('B1' or 'B2')
    const savedBatch = (localStorage.getItem('eee_pulse_batch') || loadedSemester.batch || 'B1') as 'B1' | 'B2';
    if (savedBatch === 'B1' || savedBatch === 'B2') {
      setBatchPref(savedBatch);
    } else {
      setBatchPref('B1');
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushStatus(Notification.permission);
    } else {
      setPushStatus('unsupported');
    }

    const isConnected = isSupabaseConnected();
    setCloudConnected(isConnected);

    if (isConnected) {
      handleCloudSync(true);

      const unsubscribe = subscribeToAttendanceCloud(DEFAULT_STUDENT_ID, () => {
        fetchAttendanceRecordsFromCloud(DEFAULT_STUDENT_ID).then((cloudRecs) => {
          if (cloudRecs) {
            saveAttendanceRecords(cloudRecs, DEFAULT_STUDENT_ID);
            setRecords(cloudRecs);
          }
        });
      });
      return () => unsubscribe();
    }
  }, [handleCloudSync]);

  const today = getTodayDateString();

  // Switch student batch handler
  const handleBatchChange = (newBatch: 'B1' | 'B2') => {
    setBatchPref(newBatch);
    localStorage.setItem('eee_pulse_batch', newBatch);
    const updatedSemester = { ...semesterSettings, batch: newBatch };
    setSemesterSettings(updatedSemester);
    saveSemesterSettings(updatedSemester, DEFAULT_STUDENT_ID);
    upsertSemesterSettingsToCloud(updatedSemester, DEFAULT_STUDENT_ID);
    showBanner(`Switched attendance profile to Batch ${newBatch}`, 'info');
  };

  // Refresh records & holiday helper
  const refreshData = () => {
    const updatedRecords = getAttendanceRecords(DEFAULT_STUDENT_ID);
    const updatedHolidays = getHolidayEntries(DEFAULT_STUDENT_ID);
    const updatedSemester = getSemesterSettings(DEFAULT_STUDENT_ID);
    setRecords(updatedRecords);
    setHolidays(updatedHolidays);
    setSemesterSettings(updatedSemester);
  };

  // Overall and subject computations (Strictly Isolated to Student Batch B1/B2, Semester Dates & Holidays)
  const overallStats = useMemo(() => {
    return calculateOverallAttendance(
      records,
      semesterSettings,
      holidays,
      batchPref,
      WEEKLY_TIMETABLE,
      today
    );
  }, [records, semesterSettings, holidays, batchPref, today]);

  const distinctSubjects = useMemo(() => {
    return getAllDistinctSubjects(records, batchPref, WEEKLY_TIMETABLE);
  }, [records, batchPref]);

  const subjectStatsList = useMemo(() => {
    return distinctSubjects.map((sub) =>
      calculateSubjectAttendance(
        records,
        sub,
        semesterSettings,
        holidays,
        batchPref,
        WEEKLY_TIMETABLE,
        today
      )
    );
  }, [distinctSubjects, records, semesterSettings, holidays, batchPref, today]);

  const backdatedUsedThisWeek = useMemo(() => {
    return getBackdatedEditsCountThisWeek(DEFAULT_STUDENT_ID);
  }, [records]);

  // Timetable for selected day in Daily tab (Strictly filtered to student's batch)
  const selectedDateObj = new Date(selectedDate + 'T00:00:00');
  const selectedDayOfWeek = selectedDateObj.getDay();
  const daySlots = useMemo(() => {
    if (selectedDayOfWeek === 0 || selectedDayOfWeek === 6) return [];
    return getTimetableForDay(selectedDayOfWeek, batchPref, WEEKLY_TIMETABLE).filter(
      (slot) => isSlotForBatch(slot, batchPref) || slot.session_type === 'lunch'
    );
  }, [selectedDayOfWeek, batchPref]);

  const isSelectedDateHoliday = useMemo(() => {
    return isDateHoliday(selectedDate, holidays);
  }, [selectedDate, holidays]);

  const isSelectedDateOutsideSemester = useMemo(() => {
    return selectedDate < semesterSettings.startDate || selectedDate > semesterSettings.endDate;
  }, [selectedDate, semesterSettings]);

  // Map of records for selected date
  const recordsForSelectedDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    records
      .filter((r) => r.date === selectedDate)
      .forEach((r) => {
        map.set(r.classSlotId, r);
      });
    return map;
  }, [records, selectedDate]);

  // Handle Mark Attendance for a single class slot
  const handleMarkSlot = (
    classSlotId: string,
    subjectId: string,
    status: AttendanceStatus,
    notes?: string
  ) => {
    const res = markAttendance(
      DEFAULT_STUDENT_ID,
      classSlotId,
      subjectId,
      selectedDate,
      status,
      notes
    );

    if (!res.success) {
      playAlarmSound('warning');
      triggerVibration([100, 50, 100]);
      showBanner(res.error || 'Failed to mark attendance', 'error');
      return;
    }

    playAlarmSound('success');
    refreshData();

    if (res.record) {
      upsertAttendanceRecordsToCloud([res.record], DEFAULT_STUDENT_ID);
    }

    if (res.flagged) {
      showBanner('Marked attendance (Flagged as late entry > 2 days)', 'info');
    } else {
      showBanner(`Marked ${subjectId} as ${ATTENDANCE_STATUS_CONFIG[status].label}`, 'success');
    }
  };

  // Handle One-Click Bulk Day Actions ("I Attended All Classes" for assigned batch)
  const handleMarkAllDay = (status: AttendanceStatus) => {
    const res = markAllDaySlots(selectedDate, status, batchPref, DEFAULT_STUDENT_ID, WEEKLY_TIMETABLE);
    if (!res.success) {
      playAlarmSound('warning');
      showBanner(res.error || 'Failed to mark classes for this day', 'error');
      return;
    }

    playAlarmSound('success');
    refreshData();

    const updatedRecs = getAttendanceRecords(DEFAULT_STUDENT_ID).filter((r) => r.date === selectedDate);
    if (updatedRecs.length > 0) {
      upsertAttendanceRecordsToCloud(updatedRecs, DEFAULT_STUDENT_ID);
    }

    showBanner(
      `Marked all ${res.count} classes for Batch ${batchPref} as ${ATTENDANCE_STATUS_CONFIG[status].label}!`,
      'success'
    );
  };

  // Handle Clear Day Slots
  const handleClearDayAction = () => {
    const res = clearDaySlots(selectedDate, DEFAULT_STUDENT_ID);
    if (res.success) {
      refreshData();
      showBanner(`Cleared attendance records for ${selectedDate}`, 'info');
    }
  };

  // Handle Manual Single Entry
  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualSubject.trim()) {
      showBanner('Subject name is required', 'error');
      return;
    }

    const slotId = manualSlotId.trim() || `manual-${Date.now()}`;
    const newRecord: AttendanceRecord = {
      id: `manual-${Date.now()}`,
      studentId: DEFAULT_STUDENT_ID,
      subjectId: manualSubject.trim(),
      classSlotId: slotId,
      date: manualDate,
      status: manualStatus,
      markedAt: new Date().toISOString(),
      source: 'manual',
      flagged: false,
      notes: manualNotes.trim() || undefined,
    };

    const res = bulkSetAttendance(DEFAULT_STUDENT_ID, [
      {
        subjectId: manualSubject.trim(),
        classSlotId: slotId,
        date: manualDate,
        status: manualStatus,
        notes: manualNotes.trim() || undefined,
      },
    ]);

    if (res.success) {
      playAlarmSound('success');
      refreshData();
      upsertAttendanceRecordsToCloud([newRecord], DEFAULT_STUDENT_ID);
      showBanner(`Successfully added manual entry for ${manualSubject} on ${manualDate}`, 'success');
      setManualNotes('');
    } else {
      showBanner(res.error || 'Failed to add manual record', 'error');
    }
  };

  // Handle Quick Onboarding Backfill
  const handleQuickBackfill = (e: React.FormEvent) => {
    e.preventDefault();
    if (backfillTotal <= 0) {
      showBanner('Total classes must be greater than 0', 'error');
      return;
    }
    if (backfillAttended > backfillTotal) {
      showBanner('Attended classes cannot exceed total conducted classes', 'error');
      return;
    }

    const missed = backfillTotal - backfillAttended;
    const entries: Array<{
      subjectId: string;
      classSlotId: string;
      date: string;
      status: AttendanceStatus;
      notes?: string;
    }> = [];

    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() - backfillTotal - 1);

    for (let i = 0; i < backfillAttended; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      entries.push({
        subjectId: backfillSubject,
        classSlotId: `backfill-att-${i}-${Date.now()}`,
        date: dStr,
        status: 'present',
        notes: 'Initial backfilled attendance',
      });
    }

    for (let i = 0; i < missed; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + backfillAttended + i);
      const dStr = d.toISOString().split('T')[0];
      entries.push({
        subjectId: backfillSubject,
        classSlotId: `backfill-abs-${i}-${Date.now()}`,
        date: dStr,
        status: 'absent',
        notes: 'Initial backfilled missed',
      });
    }

    const res = bulkSetAttendance(DEFAULT_STUDENT_ID, entries);
    if (res.success) {
      playAlarmSound('success');
      refreshData();
      const allUpdated = getAttendanceRecords(DEFAULT_STUDENT_ID);
      upsertAttendanceRecordsToCloud(allUpdated, DEFAULT_STUDENT_ID);
      showBanner(
        `Backfilled ${backfillAttended}/${backfillTotal} classes for ${backfillSubject}!`,
        'success'
      );
    } else {
      showBanner(res.error || 'Failed to backfill records', 'error');
    }
  };

  // Handle Semester Settings Update (Instant Real-Time Reactivity)
  const handleUpdateSemester = (newSettings: Partial<SemesterSettings>) => {
    const updated = { ...semesterSettings, ...newSettings };
    setSemesterSettings(updated);
    saveSemesterSettings(updated, DEFAULT_STUDENT_ID);
    upsertSemesterSettingsToCloud(updated, DEFAULT_STUDENT_ID);
    showBanner('Semester settings updated in real time!', 'success');
  };

  // Handle Toggle Holiday
  const handleToggleHoliday = (date: string, label?: string, type?: 'gazetted' | 'manual') => {
    const updated = toggleHoliday(date, label || 'Holiday', type || 'manual', DEFAULT_STUDENT_ID);
    setHolidays(updated);
    upsertHolidaysToCloud(updated, DEFAULT_STUDENT_ID);
    showBanner(`Holiday updated for ${date}`, 'info');
  };

  // Handle Add Manual Holiday
  const handleAddManualHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayDate) return;
    const updated = addManualHoliday(
      newHolidayDate,
      newHolidayLabel.trim() || 'Institute Holiday / Mass Bunk',
      DEFAULT_STUDENT_ID
    );
    setHolidays(updated);
    upsertHolidaysToCloud(updated, DEFAULT_STUDENT_ID);
    setNewHolidayLabel('');
    showBanner(`Added holiday for ${newHolidayDate}`, 'success');
  };

  // Handle Settings Update
  const handleUpdateSettings = (newSettings: Partial<AttendanceSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveAttendanceSettings(updated, DEFAULT_STUDENT_ID);
    showBanner('Attendance settings updated successfully', 'success');
  };

  // Handle JSON Export
  const handleExportData = () => {
    const data = {
      version: 2,
      exportedAt: new Date().toISOString(),
      studentId: DEFAULT_STUDENT_ID,
      settings,
      semesterSettings,
      holidays,
      records,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eee_pulse_attendance_backup_${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showBanner('Attendance data exported to JSON file', 'success');
  };

  // Handle JSON Import
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.records && Array.isArray(json.records)) {
          saveAttendanceRecords(json.records, DEFAULT_STUDENT_ID);
          if (json.settings) saveAttendanceSettings(json.settings, DEFAULT_STUDENT_ID);
          if (json.semesterSettings) saveSemesterSettings(json.semesterSettings, DEFAULT_STUDENT_ID);
          if (json.holidays) saveHolidayEntries(json.holidays, DEFAULT_STUDENT_ID);
          refreshData();
          upsertAttendanceRecordsToCloud(json.records, DEFAULT_STUDENT_ID);
          showBanner(`Imported ${json.records.length} records successfully!`, 'success');
        } else {
          showBanner('Invalid backup file format', 'error');
        }
      } catch {
        showBanner('Failed to parse JSON file', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Handle Clear All Data
  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all your attendance records? This cannot be undone.')) {
      clearAllAttendance(DEFAULT_STUDENT_ID);
      refreshData();
      showBanner('All attendance records have been reset', 'info');
    }
  };

  // Send Test Push / Notification
  const handleSendTestNotification = async () => {
    playAlarmSound('chime');
    triggerVibration([200, 100, 200, 100, 400]);

    const title = '🔔 EEE Batch Attendance Alert';
    const body = overallStats.hasConductedClasses
      ? `Batch ${batchPref} Attendance: ${overallStats.loggedPercentage.toFixed(1)}% (${overallStats.attended}/${overallStats.totalConducted} marked). ${
          overallStats.isAtOrAboveTarget
            ? `You can miss up to ${overallStats.immediateSafeBunks} classes right now!`
            : `Attend next ${overallStats.catchUpClassesNeeded} classes in a row!`
        }`
      : `No attendance records logged yet for Batch ${batchPref}. Benchmark target is ${Math.round(semesterSettings.targetPercent * 100)}%.`;

    await sendLocalNotification(title, body);

    try {
      await fetch('/api/send-test-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          batch_pref: batchPref,
          url: '/attendance',
        }),
      });
    } catch {
      // Ignore background network push errors
    }

    showBanner('Test notification triggered on this device!', 'success');
  };

  const targetPctLabel = `${Math.round(semesterSettings.targetPercent * 100)}%`;

  return (
    <div className="flex-1 flex flex-col pb-12">
      {/* Top sticky navbar */}
      <header className="sticky top-0 z-40 glass-nav">
        <div className="max-w-4xl mx-auto px-4 py-2.5 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/"
              className="p-2 sm:p-1.5 text-[#3D2C36]/70 hover:text-[#FF4F9A] transition-colors rounded-full
                         hover:bg-white/80 border border-transparent hover:border-[#FFD9E8] active:scale-95 cursor-pointer"
              aria-label="Back to home"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </Link>

            <div className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl">📊</span>
              <div>
                <h1 className="font-display text-sm sm:text-base font-bold text-[#3D2C36] leading-tight">
                  Attendance Manager
                </h1>
                <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#3D2C36]/60 tracking-wide">
                  <span>Batch {batchPref} Profile</span>
                  <span>·</span>
                  <span className="flex items-center gap-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${cloudConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    <span className="hidden xs:inline">{cloudConnected ? 'Supabase Sync' : 'Local'}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Student Batch Selector (Strictly B1 vs B2) */}
          <div className="flex items-center gap-1.5">
            <span className="hidden md:inline font-mono text-[11px] font-bold text-[#3D2C36]/60">
              Lab Batch:
            </span>
            <div className="flex items-center p-0.5 sm:p-1 rounded-2xl bg-white/80 border border-[#FFD9E8] shadow-2xs">
              {(['B1', 'B2'] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => handleBatchChange(b)}
                  className={`
                    px-2.5 sm:px-3 py-1 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1 min-h-[36px] sm:min-h-0
                    ${
                      batchPref === b
                        ? 'bg-[#FF4F9A] text-white shadow-xs scale-[1.02]'
                        : 'text-[#3D2C36]/60 hover:text-[#3D2C36] active:scale-95'
                    }
                  `}
                >
                  <span>👤</span>
                  <span>{b}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Dynamic Alert Banner */}
      {bannerMessage && (
        <div className="max-w-4xl mx-auto w-full px-4 mt-3 animate-fade-up">
          <div
            className={`
              p-3 rounded-2xl text-xs font-semibold backdrop-blur-md flex items-center justify-between border shadow-xs
              ${
                bannerMessage.type === 'error'
                  ? 'bg-rose-100/90 text-rose-900 border-rose-300'
                  : bannerMessage.type === 'success'
                  ? 'bg-emerald-100/90 text-emerald-900 border-emerald-300'
                  : 'bg-pink-100/90 text-[#C2185B] border-[#FFD9E8]'
              }
            `}
          >
            <div className="flex items-center gap-2">
              <span>{bannerMessage.type === 'error' ? '⚠️' : bannerMessage.type === 'success' ? '✅' : 'ℹ️'}</span>
              <span>{bannerMessage.text}</span>
            </div>
            <button
              onClick={() => setBannerMessage(null)}
              className="text-xs opacity-70 hover:opacity-100 font-bold px-2 py-0.5 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-4xl w-full mx-auto px-3.5 sm:px-4 py-4 sm:py-5 space-y-5 sm:space-y-6 flex-1">
        {/* ========================================================= */}
        {/* EXECUTIVE REAL-TIME BENCHMARK & SUMMARY CARD */}
        {/* ========================================================= */}
        <section className="glass-card p-4 sm:p-6 border-[#FF4F9A]/35 bg-white/90 shadow-sm space-y-4 sm:space-y-5 rounded-3xl">
          {/* Top row: Gauge & Status Overview */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#FFD9E8]">
            <div className="flex items-center gap-3.5 sm:gap-4 w-full sm:w-auto">
              {/* Circular percentage badge */}
              <div
                className={`
                  w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center shrink-0 border-2 font-display font-extrabold shadow-sm
                  ${
                    !overallStats.hasConductedClasses
                      ? 'bg-slate-50 text-slate-700 border-slate-300'
                      : overallStats.isAtOrAboveTarget
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.18)]'
                      : 'bg-rose-50 text-rose-700 border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.18)]'
                  }
                `}
              >
                <span className="text-xl sm:text-2xl tracking-tight leading-tight">
                  {overallStats.hasConductedClasses ? `${overallStats.loggedPercentage.toFixed(1)}%` : '0.0%'}
                </span>
                <span className="font-mono text-[8px] sm:text-[9px] uppercase font-bold tracking-wider opacity-70">
                  {overallStats.hasConductedClasses ? `Batch ${batchPref}` : 'Unrecorded'}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                {/* Benchmark Pill Ticker */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1">
                  <span className="font-mono text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full bg-[#FF4F9A]/15 text-[#C2185B] border border-[#FF4F9A]/30">
                    Batch {batchPref}
                  </span>

                  {!overallStats.hasConductedClasses ? (
                    <span className="font-mono text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300">
                      ⚡ Ready to Log
                    </span>
                  ) : overallStats.isAtOrAboveTarget ? (
                    <span className="font-mono text-[10px] sm:text-[11px] font-extrabold px-2 sm:px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ✓ +{overallStats.benchmarkDelta.toFixed(1)}% Safe
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] sm:text-[11px] font-extrabold px-2 sm:px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                      ⚠️ {overallStats.benchmarkDelta.toFixed(1)}% Below
                    </span>
                  )}

                  <span className="font-mono text-[11px] sm:text-xs text-[#3D2C36]/70">
                    Target: <strong>{targetPctLabel}</strong>
                  </span>
                </div>

                <p className="font-display text-xs sm:text-base font-bold text-[#3D2C36] mt-1 leading-snug">
                  {!overallStats.hasConductedClasses ? (
                    <>No classes recorded yet for Batch {batchPref} this semester.</>
                  ) : overallStats.isAtOrAboveTarget ? (
                    <>
                      Attendance: <strong className="text-emerald-700">{overallStats.loggedPercentage.toFixed(1)}%</strong> ({overallStats.attended}/{overallStats.totalConducted} logged) — you can miss up to{' '}
                      <strong className="text-[#FF4F9A] text-sm sm:text-base">{overallStats.immediateSafeBunks}</strong> classes right now and stay above{' '}
                      <strong>{targetPctLabel}</strong>.
                    </>
                  ) : (
                    <>
                      Attendance: <strong className="text-rose-700">{overallStats.loggedPercentage.toFixed(1)}%</strong> — attend the next{' '}
                      <strong className="text-rose-700 text-sm sm:text-base">{overallStats.catchUpClassesNeeded}</strong> classes in a row to hit{' '}
                      <strong>{targetPctLabel}</strong>.
                    </>
                  )}
                </p>

                <p className="font-mono text-[10px] sm:text-[11px] text-[#3D2C36]/60 mt-0.5 truncate">
                  Semester: {semesterSettings.startDate} to {semesterSettings.endDate} · {overallStats.elapsedScheduledClasses} classes held to date ({overallStats.remainingScheduledClasses} remaining in term)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleCloudSync(false)}
                disabled={isCloudSyncing}
                className="flex-1 sm:flex-initial glass-btn-secondary px-3 py-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                title="Sync with Supabase"
              >
                <span>{isCloudSyncing ? '⏳' : '☁️'}</span>
                <span>{isCloudSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
              </button>

              <button
                onClick={handleSendTestNotification}
                className="flex-1 sm:flex-initial glass-btn-primary px-3.5 py-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <span>🔔</span>
                <span>Alert Phone</span>
              </button>
            </div>
          </div>

          {/* Unmarked Past Classes Warning Banner */}
          {overallStats.unmarkedClassesCount > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-300 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⚠️</span>
                <div>
                  <span className="font-display font-bold block">
                    {overallStats.unmarkedClassesCount} past classes are unrecorded since {semesterSettings.startDate}!
                  </span>
                  <span className="font-mono text-[11px] text-amber-800">
                    You logged {overallStats.totalConducted} classes out of {overallStats.elapsedScheduledClasses} held so far. Review past days to keep your percentage accurate.
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedTab('daily')}
                className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-display text-xs font-bold shadow-xs cursor-pointer shrink-0 text-center"
              >
                📅 Review Past Days
              </button>
            </div>
          )}

          {/* Benchmark Comparison Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#3D2C36]/70 font-semibold text-[11px] sm:text-xs">
                Batch {batchPref} Logged Attendance vs {targetPctLabel}
              </span>
              <span className="text-[#3D2C36]/60 text-[10px] sm:text-[11px]">
                {overallStats.attended}/{overallStats.totalConducted} marked
              </span>
            </div>

            <div className="relative w-full h-3.5 bg-slate-100 rounded-full overflow-hidden border border-[#FFD9E8]">
              <div
                className={`h-full transition-all duration-500 ${
                  !overallStats.hasConductedClasses
                    ? 'bg-slate-300'
                    : overallStats.isAtOrAboveTarget
                    ? 'bg-emerald-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, overallStats.loggedPercentage)}%` }}
              />
              {/* Benchmark Target Indicator */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-black/60 z-10 shadow-xs"
                style={{ left: `${semesterSettings.targetPercent * 100}%` }}
                title={`Target Benchmark: ${targetPctLabel}`}
              />
            </div>
            <div className="flex justify-between font-mono text-[9px] sm:text-[10px] text-[#3D2C36]/50">
              <span>0%</span>
              <span className="font-bold text-[#FF4F9A]">Target ({targetPctLabel})</span>
              <span>100%</span>
            </div>
          </div>

          {/* Line 2: Subjects where official leave / bunk is safe (m > 0) */}
          <div className="text-xs space-y-1.5 pt-1">
            <div className="flex items-start gap-2">
              <span className="font-display font-bold text-[#3D2C36] shrink-0 text-[11px] sm:text-xs">
                🏖️ Immediate Safe Buffer:
              </span>
              {overallStats.safeLeaveSubjects.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {overallStats.safeLeaveSubjects.map((sub) => (
                    <span
                      key={sub.subjectName}
                      className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[10px] sm:text-[11px] font-semibold"
                    >
                      {sub.subjectName} (<strong>+{sub.immediateM}</strong> now / +{sub.m} term)
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[#3D2C36]/60 italic font-mono text-[11px]">
                  {overallStats.hasConductedClasses
                    ? 'No buffer to spare — attend upcoming classes!'
                    : 'Will calculate buffer automatically as you log classes.'}
                </span>
              )}
            </div>

            {/* At risk / zero buffer subjects */}
            {overallStats.atRiskSubjects.length > 0 && (
              <div className="flex items-start gap-2 pt-1">
                <span className="font-display font-bold text-rose-800 shrink-0 text-[11px] sm:text-xs">
                  ⚠️ Priority / Below Target:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {overallStats.atRiskSubjects.map((sub) => (
                    <span
                      key={sub.subjectName}
                      className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-mono text-[10px] sm:text-[11px]"
                    >
                      {sub.subjectName} ({sub.currentPercent.toFixed(0)}%, need {sub.x} in a row)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ========================================================= */}
        {/* TAB SWITCHER (Horizontal Momentum Scroll for Mobile) */}
        {/* ========================================================= */}
        <nav className="flex items-center p-1.5 rounded-2xl bg-white/70 border border-[#FFD9E8] overflow-x-auto scrollbar-hide gap-1 shadow-2xs touch-pan-x -webkit-overflow-scrolling-touch">
          {[
            { id: 'daily', label: '📅 Daily Marking', badge: null },
            { id: 'subjects', label: '📊 Subjects', badge: distinctSubjects.length },
            { id: 'holidays', label: '🏖️ Holidays', badge: holidays.filter((h) => h.isHoliday).length },
            { id: 'manual', label: '🛠️ Manual', badge: null },
            { id: 'flagged', label: '🚩 Flagged', badge: overallStats.flaggedCount > 0 ? overallStats.flaggedCount : null },
            { id: 'settings', label: '⚙️ Settings', badge: null },
          ].map((tab) => {
            const isActive = selectedTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as TabType)}
                className={`
                  flex-1 min-w-max px-3 sm:px-3.5 py-2 rounded-xl font-display text-xs font-bold transition-all cursor-pointer
                  flex items-center justify-center gap-1.5 active:scale-95
                  ${
                    isActive
                      ? 'bg-[#FF4F9A] text-white shadow-xs scale-[1.01]'
                      : 'text-[#3D2C36]/70 hover:bg-white/80 hover:text-[#3D2C36]'
                  }
                `}
              >
                <span>{tab.label}</span>
                {tab.badge !== null && tab.badge > 0 && (
                  <span
                    className={`
                      px-1.5 py-0.2 rounded-full font-mono text-[10px]
                      ${isActive ? 'bg-white text-[#FF4F9A]' : 'bg-[#FFD9E8] text-[#C2185B]'}
                    `}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ========================================================= */}
        {/* TAB 1: DAILY CLASS MARKING & FULL SEMESTER CALENDAR */}
        {/* ========================================================= */}
        {selectedTab === 'daily' && (
          <section className="space-y-4 animate-fade-up">
            
            {/* Full Semester Month Quick Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide p-1 bg-white/70 rounded-2xl border border-[#FFD9E8] shadow-2xs">
              <span className="text-[11px] font-bold font-mono px-2 text-[#3D2C36]/70 shrink-0">Month:</span>
              {[
                { label: 'Aug', dateStr: '2026-08-17' },
                { label: 'Sep', dateStr: '2026-09-01' },
                { label: 'Oct', dateStr: '2026-10-01' },
                { label: 'Nov', dateStr: '2026-11-01' },
                { label: 'Dec', dateStr: '2026-12-01' },
              ].map((m) => {
                const isCurrentMonth = selectedDate.startsWith(m.dateStr.substring(0, 7));
                return (
                  <button
                    key={m.label}
                    onClick={() => {
                      // Jump to this month
                      const targetDate = m.dateStr < semesterSettings.startDate ? semesterSettings.startDate : m.dateStr;
                      setSelectedDate(targetDate);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer shrink-0 active:scale-95 ${
                      isCurrentMonth
                        ? 'bg-[#FF4F9A] text-white shadow-xs'
                        : 'bg-white/80 text-[#3D2C36]/80 hover:bg-white hover:text-[#3D2C36]'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* Date Navigator Strip */}
            <div className="glass-card p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <button
                  onClick={() => setSelectedDate(getAdjacentDate(selectedDate, -1))}
                  className="p-2 sm:p-1.5 text-[#3D2C36]/80 hover:text-[#FF4F9A] rounded-full hover:bg-white/80 border border-[#FFD9E8] cursor-pointer active:scale-90"
                  title="Previous Day"
                >
                  ◀
                </button>

                <div className="flex items-center gap-2 text-center">
                  <span className="font-display text-xs sm:text-sm font-bold text-[#3D2C36]">
                    {formatDateDisplay(selectedDate)}
                  </span>
                  <span className={`font-mono text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-semibold ${
                    selectedDate === today
                      ? 'bg-[#FF4F9A]/10 text-[#C2185B]'
                      : selectedDate > today
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {selectedDate === today ? 'Today' : selectedDate > today ? 'Future' : 'Past'}
                  </span>
                </div>

                <button
                  onClick={() => setSelectedDate(getAdjacentDate(selectedDate, 1))}
                  className="p-2 sm:p-1.5 rounded-full border border-[#FFD9E8] text-[#3D2C36]/80 hover:text-[#FF4F9A] hover:bg-white/80 cursor-pointer active:scale-90"
                  title="Next Day"
                >
                  ▶
                </button>
              </div>

              {/* Quick Jump Buttons & Date Input */}
              <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedDate(semesterSettings.startDate)}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-bold font-mono bg-white/80 text-[#3D2C36] hover:bg-white border border-[#FFD9E8] cursor-pointer active:scale-95"
                    title="Jump to Semester Start"
                  >
                    ⏮ Start
                  </button>
                  <button
                    onClick={() => setSelectedDate(today)}
                    className={`px-3 py-1 rounded-xl text-[11px] font-bold font-mono cursor-pointer active:scale-95 ${
                      selectedDate === today ? 'bg-[#FF4F9A] text-white' : 'bg-white/80 text-[#3D2C36] hover:bg-white border border-[#FFD9E8]'
                    }`}
                  >
                    ⚡ Today
                  </button>
                  <button
                    onClick={() => setSelectedDate(semesterSettings.endDate)}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-bold font-mono bg-white/80 text-[#3D2C36] hover:bg-white border border-[#FFD9E8] cursor-pointer active:scale-95"
                    title="Jump to Semester End"
                  >
                    ⏭ End
                  </button>
                </div>
                <input
                  type="date"
                  min={semesterSettings.startDate}
                  max={semesterSettings.endDate}
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(e.target.value);
                    }
                  }}
                  className="glass-input px-2.5 py-1 text-xs font-mono"
                />
              </div>
            </div>

            {/* Future Date Pre-Planning & Reminder Card */}
            {selectedDate > today && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/90 to-indigo-50/90 border border-blue-200 text-blue-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">⏰</span>
                  <div>
                    <span className="font-display font-bold block text-blue-900">
                      Upcoming Class Date: {formatDateDisplay(selectedDate)}
                    </span>
                    <span className="font-mono text-[11px] text-blue-800">
                      You can pre-plan attendance or set a reminder alarm so you are notified before classes start on this day.
                    </span>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    playAlarmSound('chime');
                    triggerVibration([200, 100, 200]);
                    await sendLocalNotification(
                      `⏰ Reminder: Classes for ${formatDateDisplay(selectedDate)}`,
                      `You have classes scheduled on this day for Batch ${batchPref}. Tap to view schedule.`
                    );
                    showBanner(`Alarm reminder set for ${formatDateDisplay(selectedDate)}!`, 'success');
                  }}
                  className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-display text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all text-center shrink-0"
                >
                  🔔 Set Reminder Alarm
                </button>
              </div>
            )}

            {/* One-Click Day Bulk Actions (Strictly for Student's Batch) */}
            {daySlots.length > 0 && !isSelectedDateHoliday && !isSelectedDateOutsideSemester && (
              <div className="glass-card p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-gradient-to-r from-white/90 to-pink-50/80 border-[#FF4F9A]/30 rounded-2xl">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">⚡</span>
                  <span className="font-display text-xs font-bold text-[#3D2C36]">
                    Batch {batchPref} Day Actions:
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
                  <button
                    onClick={() => handleMarkAllDay('present')}
                    className="col-span-2 sm:col-span-1 px-3.5 py-2.5 sm:py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-display text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1 active:scale-95 transition-all min-h-[44px] sm:min-h-0"
                  >
                    <span>✅</span>
                    <span>I Attended All (Batch {batchPref})</span>
                  </button>

                  <button
                    onClick={() => handleMarkAllDay('absent')}
                    className="px-3.5 py-2 sm:py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-display text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1 active:scale-95 transition-all min-h-[40px] sm:min-h-0"
                  >
                    <span>❌</span>
                    <span>Missed All</span>
                  </button>

                  <button
                    onClick={handleClearDayAction}
                    className="px-2.5 py-2 sm:py-1.5 rounded-xl bg-white text-[#3D2C36]/70 hover:text-[#3D2C36] border border-[#FFD9E8] font-display text-xs font-semibold cursor-pointer active:scale-95 transition-all flex items-center justify-center min-h-[40px] sm:min-h-0"
                    title="Reset markings for this date"
                  >
                    <span>🔄</span>
                    <span>Clear</span>
                  </button>
                </div>
              </div>
            )}

            {/* Holiday / Semester alert if applicable */}
            {isSelectedDateHoliday && (
              <div className="p-3 rounded-2xl bg-amber-100/90 border border-amber-300 text-amber-900 text-xs flex items-center justify-between">
                <span>
                  🏖️ <strong>Official Holiday:</strong> {selectedDate} is marked as a holiday. Classes on this day are automatically excluded from % math.
                </span>
                <button
                  onClick={() => handleToggleHoliday(selectedDate)}
                  className="font-bold underline text-amber-950 cursor-pointer"
                >
                  Unmark Holiday
                </button>
              </div>
            )}

            {isSelectedDateOutsideSemester && (
              <div className="p-3 rounded-2xl bg-slate-100/90 border border-slate-300 text-slate-800 text-xs">
                ℹ️ <strong>Outside Semester Range:</strong> {selectedDate} is outside your configured semester ({semesterSettings.startDate} to {semesterSettings.endDate}).
              </div>
            )}


            {/* List of class slots for this day (Strictly Batch-Filtered with 44px+ mobile touch targets) */}
            {daySlots.length > 0 ? (
              <div className="space-y-3">
                {daySlots.map((slot) => {
                  const isLunch = slot.session_type === 'lunch';
                  if (isLunch) {
                    return (
                      <div
                        key={slot.id}
                        className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200/60 flex items-center justify-between text-xs"
                      >
                        <span className="font-display font-bold text-amber-900">🍱 Lunch Break</span>
                        <span className="font-mono text-amber-800">
                          {format12Hour(slot.start_time)} – {format12Hour(slot.end_time)}
                        </span>
                      </div>
                    );
                  }

                  const currentRecord = recordsForSelectedDate.get(slot.id);
                  const isMarked = !!currentRecord;
                  const override = findMatchingOverride(slot, initialOverrides);
                  const subStat = calculateSubjectAttendance(
                    records,
                    slot.subject,
                    semesterSettings,
                    holidays,
                    batchPref,
                    WEEKLY_TIMETABLE,
                    today
                  );

                  return (
                    <div
                      key={slot.id}
                      className={`
                        glass-card p-4 sm:p-5 transition-all rounded-2xl sm:rounded-3xl
                        ${
                          isMarked
                            ? currentRecord.status === 'present'
                              ? 'border-emerald-300/80 bg-emerald-50/30'
                              : currentRecord.status === 'absent'
                              ? 'border-rose-300/80 bg-rose-50/30'
                              : 'border-slate-300/80'
                            : 'hover:border-[#FF4F9A]/40'
                        }
                      `}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Slot details */}
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center justify-center px-2.5 sm:px-3 py-2 rounded-2xl bg-white/80 border border-[#FFD9E8] shrink-0 min-w-[4.8rem] sm:min-w-[5.2rem]">
                            <span className="font-mono text-xs font-bold text-[#FF4F9A]">
                              {format12Hour(slot.start_time)}
                            </span>
                            <span className="font-mono text-[9px] sm:text-[10px] text-[#3D2C36]/50">
                              to {format12Hour(slot.end_time)}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1">
                              <h3 className="font-display text-sm sm:text-base font-bold text-[#3D2C36] leading-snug">
                                {slot.subject}
                              </h3>
                              <span className="font-mono text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF4F9A]/10 text-[#C2185B] border border-[#FF4F9A]/20 uppercase">
                                {slot.session_type === 'lab' ? '🔬 Lab' : slot.session_type === 'library' ? '📖 Library' : '📚 Lecture'}
                              </span>
                              {slot.batch && (
                                <span className="font-mono text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                                  Batch {slot.batch}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-[#3D2C36]/70 flex-wrap">
                              {slot.faculty && <span>👤 {slot.faculty}</span>}
                              {slot.room && <span className="font-mono text-[10px] sm:text-[11px]">📍 {slot.room}</span>}
                              <span className="font-mono text-[10px] sm:text-[11px] font-semibold text-[#FF4F9A]">
                                Current: {subStat.hasConductedClasses ? `${subStat.loggedPercentage.toFixed(0)}%` : '0%'} ({subStat.attended}/{subStat.totalConducted})
                              </span>
                            </div>

                            {/* Overrides / Flags */}
                            {override && (
                              <div className="mt-1 text-xs font-mono font-bold text-rose-800">
                                ⚡ Today Status: {override.status.toUpperCase()} {override.note ? `("${override.note}")` : ''}
                              </div>
                            )}
                            {currentRecord?.flagged && (
                              <div className="mt-1 text-[10px] sm:text-[11px] font-mono text-amber-700 font-semibold">
                                ⚠️ Marked late — for your own accuracy
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 4-way Status Selector Buttons (Responsive 2x2 Grid on Mobile for Thumb Ergonomics) */}
                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
                          {(['present', 'absent', 'cancelled', 'leave'] as AttendanceStatus[]).map((st) => {
                            const config = ATTENDANCE_STATUS_CONFIG[st];
                            const isSelected = currentRecord?.status === st;

                            return (
                              <button
                                key={st}
                                onClick={() => handleMarkSlot(slot.id, slot.subject, st)}
                                className={`
                                  py-2.5 sm:py-1.5 px-3 rounded-xl font-display text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 min-h-[44px] sm:min-h-0 active:scale-95
                                  ${
                                    isSelected
                                      ? config.activeBtnClass
                                      : 'bg-white/80 text-[#3D2C36]/75 border border-[#FFD9E8] hover:bg-white hover:border-[#FF4F9A]'
                                  }
                                `}
                              >
                                <span>{config.emoji}</span>
                                <span>{config.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass-card p-10 sm:p-12 text-center rounded-3xl">
                <span className="text-3xl block mb-2">🏖️</span>
                <p className="font-display font-bold text-[#3D2C36]">
                  No classes scheduled for Batch {batchPref} on {formatDateDisplay(selectedDate)}.
                </p>
                <p className="font-mono text-xs text-[#3D2C36]/60 mt-1">
                  Enjoy your free time or switch dates above to mark another day!
                </p>
              </div>
            )}
          </section>
        )}

        {/* ========================================================= */}
        {/* TAB 2: SUBJECTS & BUNK MATH (Strictly for Student's Batch) */}
        {/* ========================================================= */}
        {selectedTab === 'subjects' && (
          <section className="space-y-4 animate-fade-up">
            {/* Search filter */}
            <div className="glass-card p-3 flex items-center gap-2 rounded-2xl">
              <span className="text-sm">🔍</span>
              <input
                type="text"
                placeholder={`Search subject for Batch ${batchPref}...`}
                value={searchSubject}
                onChange={(e) => setSearchSubject(e.target.value)}
                className="w-full bg-transparent border-none text-xs font-display focus:outline-none text-[#3D2C36]"
              />
              {searchSubject && (
                <button
                  onClick={() => setSearchSubject('')}
                  className="text-xs opacity-60 hover:opacity-100 font-bold px-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* List of subject cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subjectStatsList
                .filter((s) => s.subjectName.toLowerCase().includes(searchSubject.toLowerCase()))
                .map((stat) => {
                  const pct = stat.loggedPercentage;
                  const isGood = stat.isAtOrAboveTarget;
                  const targetPctNum = semesterSettings.targetPercent * 100;

                  return (
                    <div
                      key={stat.subjectId}
                      className={`
                        glass-card p-4 sm:p-5 flex flex-col justify-between transition-all rounded-3xl
                        ${stat.hasWarning ? 'border-amber-300 shadow-[0_4px_20px_rgba(245,158,11,0.15)]' : 'hover:border-[#FF4F9A]/40'}
                      `}
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <h3 className="font-display text-sm font-bold text-[#3D2C36] tracking-tight">
                            {stat.subjectName}
                          </h3>
                          <span
                            className={`
                              font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-full shrink-0
                              ${
                                !stat.hasConductedClasses
                                  ? 'bg-slate-100 text-slate-700 border border-slate-300'
                                  : isGood
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }
                            `}
                          >
                            {stat.hasConductedClasses ? `${pct.toFixed(1)}%` : '0%'}
                          </span>
                        </div>

                        {/* Progress Bar with Target Marker */}
                        <div className="relative w-full h-3 bg-white/70 rounded-full overflow-hidden border border-[#FFD9E8] mb-3">
                          <div
                            className={`h-full transition-all duration-500 ${
                              !stat.hasConductedClasses
                                ? 'bg-slate-300'
                                : isGood
                                ? 'bg-emerald-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-black/40 z-10"
                            style={{ left: `${targetPctNum}%` }}
                            title={`Target: ${targetPctLabel}`}
                          />
                        </div>

                        {/* Counts */}
                        <div className="grid grid-cols-3 gap-2 text-center font-mono text-[11px] mb-3">
                          <div className="p-2 rounded-xl bg-white/60 border border-[#FFD9E8]">
                            <span className="block text-[#3D2C36]/50 text-[9px] uppercase">Attended</span>
                            <span className="font-bold text-emerald-700">{stat.attended}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-white/60 border border-[#FFD9E8]">
                            <span className="block text-[#3D2C36]/50 text-[9px] uppercase">Missed</span>
                            <span className="font-bold text-rose-700">{stat.missed}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-white/60 border border-[#FFD9E8]">
                            <span className="block text-[#3D2C36]/50 text-[9px] uppercase">Held to Date</span>
                            <span className="font-bold text-[#3D2C36]">{stat.elapsedScheduledClasses}</span>
                          </div>
                        </div>

                        {/* Safe-to-Bunk / Catch-Up Advice Message */}
                        <div
                          className={`
                            p-3 rounded-2xl text-xs font-semibold mb-3 border
                            ${
                              !stat.hasConductedClasses
                                ? 'bg-slate-50 border-slate-200 text-slate-800'
                                : isGood
                                ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                                : 'bg-rose-50/90 border-rose-200 text-rose-900'
                            }
                          `}
                        >
                          {!stat.hasConductedClasses ? (
                            <span>
                              ⚡ No classes logged for this subject yet.
                            </span>
                          ) : isGood ? (
                            <span>
                              🎉 You can miss up to <strong>{stat.immediateSafeBunks}</strong> classes right now (and {stat.semesterSafeBunks} in term) and stay above {targetPctLabel}.
                            </span>
                          ) : (
                            <span>
                              ⚠️ Attend the next <strong>{stat.catchUpClassesNeeded}</strong> classes in a row to get back to {targetPctLabel}.
                            </span>
                          )}
                        </div>

                        {/* Warning banner if projected end-of-term is low */}
                        {stat.hasWarning && (
                          <div className="p-2.5 rounded-xl bg-amber-100/80 border border-amber-300 text-amber-900 text-[11px] font-medium flex items-center gap-1.5">
                            <span>⚠️</span>
                            <span>
                              Projected term max: <strong>{stat.projectedPercentage.toFixed(1)}%</strong>. Watch out!
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Quick mark button */}
                      <div className="mt-4 pt-3 border-t border-[#FFD9E8]/70 flex items-center justify-between text-xs">
                        <span className="font-mono text-[10px] text-[#3D2C36]/60">
                          {stat.remainingScheduledClasses} classes left in term
                        </span>
                        <button
                          onClick={() => {
                            setSelectedTab('manual');
                            setManualSubject(stat.subjectName);
                          }}
                          className="font-display font-bold text-[#FF4F9A] hover:underline cursor-pointer"
                        >
                          Edit Records →
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* TAB 3: HOLIDAY CALENDAR */}
        {/* ========================================================= */}
        {selectedTab === 'holidays' && (
          <section className="space-y-6 animate-fade-up">
            <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs">
              <h3 className="font-display font-bold text-sm text-amber-950 mb-1 flex items-center gap-1.5">
                <span>🏖️</span>
                <span>Holiday Calendar (Gazetted & Manual Overrides)</span>
              </h3>
              <p>
                Days marked as holidays are completely excluded from attendance math and remaining class calculations ($R$).
                You can toggle off pre-populated Gazetted Holidays (<strong>GH</strong>) if classes occurred, or add custom mass bunks and institute closures.
              </p>
            </div>

            {/* Add Custom Holiday Form */}
            <div className="glass-card p-4 sm:p-5 rounded-3xl">
              <h3 className="font-display text-base font-bold text-[#3D2C36] mb-1 flex items-center gap-2">
                <span>➕</span>
                <span>Add Custom Holiday / Mass Bunk</span>
              </h3>
              <form onSubmit={handleAddManualHoliday} className="space-y-3 mt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-mono text-[11px] font-bold text-[#3D2C36]/70 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={newHolidayDate}
                      onChange={(e) => setNewHolidayDate(e.target.value)}
                      className="glass-input w-full px-3 py-2 text-xs font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[11px] font-bold text-[#3D2C36]/70 mb-1">
                      Holiday Name / Reason
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Mass Bunk / Tech Fest Holiday"
                      value={newHolidayLabel}
                      onChange={(e) => setNewHolidayLabel(e.target.value)}
                      className="glass-input w-full px-3 py-2 text-xs font-display"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="glass-btn-primary px-5 py-2 text-xs font-bold cursor-pointer"
                  >
                    🏖️ Add to Calendar
                  </button>
                </div>
              </form>
            </div>

            {/* Holidays List */}
            <div className="glass-card p-4 sm:p-5 rounded-3xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-base font-bold text-[#3D2C36]">
                  Calendar Holidays ({holidays.filter((h) => h.isHoliday).length} active)
                </h3>
              </div>

              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {holidays.map((h) => {
                  return (
                    <div
                      key={h.id || h.date}
                      className={`
                        p-3 rounded-2xl border flex items-center justify-between text-xs transition-all
                        ${
                          h.isHoliday
                            ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                            : 'bg-slate-50/60 border-slate-200 text-slate-500 opacity-60'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-base">{h.isHoliday ? '🏖️' : '⚪'}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-display font-bold">
                              {h.label || 'Holiday'}
                            </span>
                            <span
                              className={`
                                font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase
                                ${h.type === 'gazetted' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}
                              `}
                            >
                              {h.type === 'gazetted' ? 'GH' : 'Manual'}
                            </span>
                          </div>
                          <span className="font-mono text-[10px] opacity-75">
                            {formatDateDisplay(h.date)} ({formatDateMonospace(h.date)})
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleHoliday(h.date, h.label, h.type)}
                          className={`
                            px-3 py-1.5 rounded-xl font-display text-xs font-bold cursor-pointer transition-all active:scale-95
                            ${
                              h.isHoliday
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }
                          `}
                        >
                          {h.isHoliday ? 'Active Holiday' : 'Turned Off'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* TAB 4: MANUAL & BULK EDITOR (BYPASS MODE) */}
        {/* ========================================================= */}
        {selectedTab === 'manual' && (
          <section className="space-y-6 animate-fade-up">
            <div className="p-4 rounded-2xl bg-sky-50/90 border border-sky-200 text-sky-900 text-xs">
              <h3 className="font-display font-bold text-sm text-sky-950 mb-1 flex items-center gap-1.5">
                <span>🛠️</span>
                <span>Manual Entry Mode (Bypass Mode)</span>
              </h3>
              <p>
                Use this screen for initial semester onboarding, backfilling history, or fixing mistakes.
                Records saved here have <strong>no rolling-window limits</strong>, <strong>no weekly quotas</strong>, and are tagged with <code>source: &apos;manual&apos;</code>.
              </p>
            </div>

            {/* Quick Backfill */}
            <div className="glass-card p-4 sm:p-5 rounded-3xl">
              <h3 className="font-display text-base font-bold text-[#3D2C36] mb-1 flex items-center gap-2">
                <span>⚡</span>
                <span>Quick Subject Backfiller (Onboarding)</span>
              </h3>
              <form onSubmit={handleQuickBackfill} className="space-y-4 mt-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-mono text-[11px] font-bold text-[#3D2C36]/70 mb-1">
                      Subject
                    </label>
                    <select
                      value={backfillSubject}
                      onChange={(e) => setBackfillSubject(e.target.value)}
                      className="glass-input w-full px-3 py-2 text-xs font-display"
                    >
                      {distinctSubjects.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-mono text-[11px] font-bold text-[#3D2C36]/70 mb-1">
                      Classes Attended
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={backfillTotal}
                      value={backfillAttended}
                      onChange={(e) => setBackfillAttended(parseInt(e.target.value) || 0)}
                      className="glass-input w-full px-3 py-2 text-xs font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[11px] font-bold text-[#3D2C36]/70 mb-1">
                      Total Conducted Classes
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={backfillTotal}
                      onChange={(e) => setBackfillTotal(parseInt(e.target.value) || 1)}
                      className="glass-input w-full px-3 py-2 text-xs font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="font-mono text-xs text-[#3D2C36]/70">
                    Resulting %:{' '}
                    <strong>{backfillTotal > 0 ? ((backfillAttended / backfillTotal) * 100).toFixed(1) : 0}%</strong>
                  </span>
                  <button
                    type="submit"
                    className="glass-btn-primary px-5 py-2 text-xs font-bold cursor-pointer active:scale-95"
                  >
                    ⚡ Backfill Subject
                  </button>
                </div>
              </form>
            </div>

            {/* Single Manual Entry */}
            <div className="glass-card p-4 sm:p-5 rounded-3xl">
              <h3 className="font-display text-base font-bold text-[#3D2C36] mb-1 flex items-center gap-2">
                <span>📝</span>
                <span>Single Manual Record Creator</span>
              </h3>
              <form onSubmit={handleManualAdd} className="space-y-4 mt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-mono text-[11px] font-bold text-[#3D2C36]/70 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      className="glass-input w-full px-3 py-2 text-xs font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[11px] font-bold text-[#3D2C36]/70 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={manualSubject}
                      onChange={(e) => setManualSubject(e.target.value)}
                      placeholder="e.g. Mathematics – I"
                      className="glass-input w-full px-3 py-2 text-xs font-display"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[11px] font-bold text-[#3D2C36]/70 mb-1">
                      Status
                    </label>
                    <select
                      value={manualStatus}
                      onChange={(e) => setManualStatus(e.target.value as AttendanceStatus)}
                      className="glass-input w-full px-3 py-2 text-xs font-display"
                    >
                      <option value="present">✅ Present (Attended)</option>
                      <option value="absent">❌ Absent (Missed)</option>
                      <option value="cancelled">⚪ Cancelled (Excluded)</option>
                      <option value="leave">🟡 Leave / OD (Duty Leave)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-mono text-[11px] font-bold text-[#3D2C36]/70 mb-1">
                      Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={manualNotes}
                      onChange={(e) => setManualNotes(e.target.value)}
                      placeholder="e.g. Lab experiment 4"
                      className="glass-input w-full px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="glass-btn-primary px-5 py-2 text-xs font-bold cursor-pointer active:scale-95"
                  >
                    💾 Save Manual Record
                  </button>
                </div>
              </form>
            </div>

            {/* Records History Table */}
            <div className="glass-card p-4 sm:p-5 rounded-3xl">
              <h3 className="font-display text-base font-bold text-[#3D2C36] mb-3">
                All Recorded Entries ({records.length})
              </h3>
              {records.length > 0 ? (
                <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                  {records
                    .slice()
                    .reverse()
                    .map((rec) => {
                      const config = ATTENDANCE_STATUS_CONFIG[rec.status];
                      return (
                        <div
                          key={rec.id}
                          className="p-3 rounded-2xl bg-white/70 border border-[#FFD9E8] flex items-center justify-between text-xs gap-2"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-base">{config.emoji}</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-display font-bold text-[#3D2C36]">
                                  {rec.subjectId}
                                </span>
                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                  {rec.source}
                                </span>
                                {rec.flagged && (
                                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                                    Flagged
                                  </span>
                                )}
                              </div>
                              <div className="font-mono text-[10px] text-[#3D2C36]/60">
                                Date: {rec.date} · Marked: {new Date(rec.markedAt).toLocaleDateString('en-IN')}
                                {rec.notes && ` · "${rec.notes}"`}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full ${config.badgeClass}`}>
                              {config.label}
                            </span>
                            <button
                              onClick={() => {
                                deleteAttendanceRecord(rec.id, DEFAULT_STUDENT_ID);
                                deleteAttendanceRecordFromCloud(rec.id, DEFAULT_STUDENT_ID);
                                refreshData();
                                showBanner('Record deleted', 'info');
                              }}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="Delete record"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-center py-6 font-mono text-xs text-[#3D2C36]/50">
                  No attendance records logged yet.
                </p>
              )}
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* TAB 5: FLAGGED ENTRIES VIEW */}
        {/* ========================================================= */}
        {selectedTab === 'flagged' && (
          <section className="space-y-4 animate-fade-up">
            <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs">
              <h3 className="font-display font-bold text-sm text-amber-950 mb-1 flex items-center gap-1.5">
                <span>🚩</span>
                <span>Flagged Late Entries View</span>
              </h3>
              <p>
                <strong>Marked late — for your own accuracy.</strong> These entries were marked more than 2 days after the class occurred.
                This is non-punitive and does not affect your percentage calculation.
              </p>
            </div>

            {records.filter((r) => r.flagged).length > 0 ? (
              <div className="space-y-3">
                {records
                  .filter((r) => r.flagged)
                  .map((rec) => {
                    const config = ATTENDANCE_STATUS_CONFIG[rec.status];
                    return (
                      <div
                        key={rec.id}
                        className="glass-card p-4 flex items-center justify-between border-amber-200 bg-amber-50/40 rounded-2xl"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">⚠️</span>
                          <div>
                            <h4 className="font-display font-bold text-sm text-[#3D2C36]">
                              {rec.subjectId}
                            </h4>
                            <p className="font-mono text-xs text-[#3D2C36]/70">
                              Class date: <strong>{rec.date}</strong> · Marked on:{' '}
                              <strong>{new Date(rec.markedAt).toLocaleDateString('en-IN')}</strong> (
                              {getDaysDifference(rec.date, rec.markedAt.split('T')[0])} days later)
                            </p>
                          </div>
                        </div>

                        <span className={`font-mono text-xs font-bold px-3 py-1 rounded-full ${config.badgeClass}`}>
                          {config.label}
                        </span>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="glass-card p-10 sm:p-12 text-center rounded-3xl">
                <span className="text-3xl block mb-2">✨</span>
                <p className="font-display font-bold text-[#3D2C36]">
                  No flagged late entries!
                </p>
                <p className="font-mono text-xs text-[#3D2C36]/60 mt-1">
                  You are regularly logging your attendance on time.
                </p>
              </div>
            )}
          </section>
        )}

        {/* ========================================================= */}
        {/* TAB 6: SETTINGS & SUPABASE CLOUD STATUS */}
        {/* ========================================================= */}
        {selectedTab === 'settings' && (
          <section className="space-y-6 animate-fade-up">
            {/* Supabase Cloud Connection Card */}
            <div className="glass-card p-4 sm:p-5 rounded-3xl border-[#FF4F9A]/30">
              <div className="flex items-center justify-between gap-3 mb-2">
                <h3 className="font-display text-base font-bold text-[#3D2C36] flex items-center gap-2">
                  <span>☁️</span>
                  <span>Supabase Cloud Integration</span>
                </h3>
                <span
                  className={`
                    font-mono text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5
                    ${
                      cloudConnected
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }
                  `}
                >
                  <span className={`w-2 h-2 rounded-full ${cloudConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span>{cloudConnected ? 'Cloud Sync Active' : 'Local Storage Only'}</span>
                </span>
              </div>

              <p className="font-mono text-xs text-[#3D2C36]/70 mb-4">
                {cloudConnected
                  ? 'Your attendance records, semester dates, and holidays are automatically synced in real time across all your phones and browsers via Supabase.'
                  : 'Currently operating in offline/localStorage mode. Add your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local to enable multi-device sync.'}
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => handleCloudSync(false)}
                  disabled={isCloudSyncing}
                  className="glass-btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span>{isCloudSyncing ? '⏳' : '🔄'}</span>
                  <span>{isCloudSyncing ? 'Syncing...' : 'Sync with Supabase Now'}</span>
                </button>
              </div>
            </div>

            {/* Student Batch Assignment */}
            <div className="glass-card p-4 sm:p-5 rounded-3xl">
              <h3 className="font-display text-base font-bold text-[#3D2C36] mb-1 flex items-center gap-2">
                <span>👤</span>
                <span>Assigned Lab Batch Profile</span>
              </h3>
              <p className="font-mono text-xs text-[#3D2C36]/60 mb-4">
                Select your assigned batch (B1 or B2). Your timetable and attendance counts will strictly include only classes scheduled for this batch.
              </p>

              <div className="flex items-center gap-3">
                {(['B1', 'B2'] as const).map((b) => {
                  const isSelected = batchPref === b;
                  return (
                    <button
                      key={b}
                      onClick={() => handleBatchChange(b)}
                      className={`
                        flex-1 p-3.5 rounded-2xl border-2 font-display text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95
                        ${
                          isSelected
                            ? 'bg-[#FF4F9A] text-white border-[#FF4F9A] shadow-md scale-[1.01]'
                            : 'bg-white/80 text-[#3D2C36] border-[#FFD9E8] hover:bg-white'
                        }
                      `}
                    >
                      <span className="text-lg">👤</span>
                      <span>Batch {b}</span>
                      {isSelected && <span className="ml-1 text-xs font-mono">✓ Active</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Semester Configuration */}
            <div className="glass-card p-4 sm:p-5 rounded-3xl">
              <h3 className="font-display text-base font-bold text-[#3D2C36] mb-1 flex items-center gap-2">
                <span>🗓️</span>
                <span>Semester Range & Target %</span>
              </h3>
              <p className="font-mono text-xs text-[#3D2C36]/60 mb-4">
                Define the official dates and minimum required percentage for this semester.
              </p>

              <div className="space-y-4">
                {/* Target % Quick Pills */}
                <div>
                  <label className="block font-display text-xs font-bold text-[#3D2C36] mb-2">
                    Target Attendance Benchmark: {targetPctLabel}
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[0.75, 0.80, 0.85, 0.90].map((tgt) => {
                      const isSelected = semesterSettings.targetPercent === tgt;
                      return (
                        <button
                          key={tgt}
                          onClick={() => handleUpdateSemester({ targetPercent: tgt })}
                          className={`
                            px-4 py-2 rounded-2xl font-mono text-xs font-bold transition-all cursor-pointer active:scale-95
                            ${
                              isSelected
                                ? 'bg-[#FF4F9A] text-white shadow-xs scale-[1.02]'
                                : 'bg-white/80 text-[#3D2C36]/70 border border-[#FFD9E8] hover:bg-white'
                            }
                          `}
                        >
                          {Math.round(tgt * 100)}%
                        </button>
                      );
                    })}

                    <div className="flex items-center gap-1.5 ml-auto">
                      <span className="font-mono text-[11px] text-[#3D2C36]/60">Custom:</span>
                      <input
                        type="number"
                        min={50}
                        max={99}
                        value={Math.round(semesterSettings.targetPercent * 100)}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 75;
                          handleUpdateSemester({ targetPercent: val / 100 });
                        }}
                        className="glass-input w-16 px-2 py-1 text-xs font-mono text-center"
                      />
                      <span className="font-mono text-xs">%</span>
                    </div>
                  </div>
                </div>

                {/* Semester Start and End Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block font-mono text-[11px] font-bold text-[#3D2C36]/70 mb-1">
                      Semester Start Date
                    </label>
                    <input
                      type="date"
                      value={semesterSettings.startDate}
                      onChange={(e) => handleUpdateSemester({ startDate: e.target.value })}
                      className="glass-input w-full px-3 py-2 text-xs font-mono"
                    />
                    <span className="block font-mono text-[9px] text-[#3D2C36]/50 mt-0.5">
                      First day of semester lectures
                    </span>
                  </div>

                  <div>
                    <label className="block font-mono text-[11px] font-bold text-[#3D2C36]/70 mb-1">
                      Semester End Date
                    </label>
                    <input
                      type="date"
                      value={semesterSettings.endDate}
                      onChange={(e) => handleUpdateSemester({ endDate: e.target.value })}
                      className="glass-input w-full px-3 py-2 text-xs font-mono"
                    />
                    <span className="block font-mono text-[9px] text-[#3D2C36]/50 mt-0.5">
                      Last day before end-semester exams
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Mode Limits */}
            <div className="glass-card p-4 sm:p-5 rounded-3xl">
              <h3 className="font-display text-base font-bold text-[#3D2C36] mb-1 flex items-center gap-2">
                <span>🛡️</span>
                <span>Anti-Gaming Rules & Quotas</span>
              </h3>
              <p className="font-mono text-xs text-[#3D2C36]/60 mb-4">
                Rolling window and backdated edit limits for standard daily marking mode.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[11px] font-bold text-[#3D2C36]/70 mb-1">
                    Rolling Window (N days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={settings.rollingWindowDays}
                    onChange={(e) =>
                      handleUpdateSettings({ rollingWindowDays: parseInt(e.target.value) || 7 })
                    }
                    className="glass-input w-full px-3 py-2 text-xs font-mono"
                  />
                  <span className="block font-mono text-[9px] text-[#3D2C36]/50 mt-0.5">
                    Days allowed back in daily mode
                  </span>
                </div>

                <div>
                  <label className="block font-mono text-[11px] font-bold text-[#3D2C36]/70 mb-1">
                    Weekly Backdated Quota (M edits)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={settings.weeklyBackdatedLimit}
                    onChange={(e) =>
                      handleUpdateSettings({ weeklyBackdatedLimit: parseInt(e.target.value) || 3 })
                    }
                    className="glass-input w-full px-3 py-2 text-xs font-mono"
                  />
                  <span className="block font-mono text-[9px] text-[#3D2C36]/50 mt-0.5">
                    Edits allowed per calendar week
                  </span>
                </div>
              </div>
            </div>

            {/* Notification & Phone Alert Options */}
            <div className="glass-card p-4 sm:p-5 rounded-3xl">
              <h3 className="font-display text-base font-bold text-[#3D2C36] mb-1 flex items-center gap-2">
                <span>🔔</span>
                <span>Phone Push Notifications & Alarms</span>
              </h3>
              <p className="font-mono text-xs text-[#3D2C36]/60 mb-4">
                Receive push notifications directly on your phone when attendance drops or classes start.
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/70 border border-[#FFD9E8]">
                  <div>
                    <span className="font-display text-xs font-bold text-[#3D2C36] block">
                      Audio Alarm Tone & Vibration
                    </span>
                    <span className="font-mono text-[10px] text-[#3D2C36]/60">
                      Play multi-tone chime when actions fire
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      playAlarmSound('chime');
                      triggerVibration([200, 100, 200]);
                      showBanner('Played chime sound & vibration', 'success');
                    }}
                    className="glass-btn-primary px-3 py-1.5 text-xs font-bold cursor-pointer active:scale-95"
                  >
                    🔊 Test Sound
                  </button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/70 border border-[#FFD9E8]">
                  <div>
                    <span className="font-display text-xs font-bold text-[#3D2C36] block">
                      Browser / Phone Push Notification
                    </span>
                    <span className="font-mono text-[10px] text-[#3D2C36]/60">
                      Permission status: <strong>{pushStatus}</strong>
                    </span>
                  </div>
                  <button
                    onClick={handleSendTestNotification}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 text-white font-display text-xs font-bold hover:bg-purple-700 cursor-pointer shadow-xs active:scale-95"
                  >
                    📱 Test Push
                  </button>
                </div>
              </div>
            </div>

            {/* Backup, Restore, and Reset */}
            <div className="glass-card p-4 sm:p-5 rounded-3xl">
              <h3 className="font-display text-base font-bold text-[#3D2C36] mb-1 flex items-center gap-2">
                <span>💾</span>
                <span>Backup & Data Management</span>
              </h3>
              <p className="font-mono text-xs text-[#3D2C36]/60 mb-4">
                Export your attendance history as a JSON file or restore from a previous backup.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleExportData}
                  className="glass-btn-primary px-4 py-2 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
                >
                  <span>📥</span>
                  <span>Export Backup</span>
                </button>

                <label className="px-4 py-2 rounded-full bg-white/80 border border-[#FFD9E8] hover:bg-white text-xs font-bold text-[#3D2C36] cursor-pointer inline-flex items-center gap-1.5 shadow-2xs active:scale-95">
                  <span>📤</span>
                  <span>Import Backup</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportData}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={handleClearData}
                  className="px-4 py-2 rounded-full bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 ml-auto active:scale-95"
                >
                  <span>🗑️</span>
                  <span>Reset All</span>
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto px-4 py-4 mt-auto hidden sm:block">
        <div className="glass-card px-6 py-3 flex items-center justify-center gap-6 text-center text-xs font-semibold uppercase tracking-wider text-[#3D2C36]/70">
          <Link href="/" className="hover:text-[#FF4F9A]">
            Today Feed ⚡
          </Link>
          <span className="w-1.5 h-1.5 rounded-full bg-[#FFD9E8]" />
          <Link href="/timetable" className="hover:text-[#FF4F9A]">
            Timetable 🗓️
          </Link>
          <span className="w-1.5 h-1.5 rounded-full bg-[#FFD9E8]" />
          <Link href="/chat" className="hover:text-[#FF4F9A]">
            Batch Chat 💬
          </Link>
        </div>
      </footer>
    </div>
  );
}
