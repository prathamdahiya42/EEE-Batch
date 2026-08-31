import { createClient } from './client';
import { getSupabaseConfig } from './config';
import { DEFAULT_STUDENT_ID } from '@/lib/attendance';
import type { AttendanceRecord, SemesterSettings, HolidayEntry } from '@/lib/types';


/**
 * Check if real Supabase environment variables are configured
 */
export function isSupabaseConnected(): boolean {
  if (typeof window === 'undefined') return false;
  const config = getSupabaseConfig();
  return (
    config.isConfigured &&
    !config.url.includes('placeholder.supabase.co') &&
    !config.anonKey.includes('placeholder')
  );
}

/**
 * Fetch all attendance records from Supabase cloud
 */
export async function fetchAttendanceRecordsFromCloud(
  studentId: string = DEFAULT_STUDENT_ID
): Promise<AttendanceRecord[] | null> {
  if (!isSupabaseConnected()) return null;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('student_id', studentId)
      .order('date', { ascending: true });

    if (error) {
      console.warn('Supabase fetch error for attendance records:', error.message);
      return null;
    }

    if (!data) return [];

    return data.map((row) => ({
      id: row.id,
      studentId: row.student_id || studentId,
      subjectId: row.subject_id,
      classSlotId: row.class_slot_id,
      date: row.date,
      status: row.status,
      markedAt: row.marked_at,
      source: row.source,
      flagged: Boolean(row.flagged),
      notes: row.notes || undefined,
    }));

  } catch (err) {
    console.warn('Supabase network error fetching attendance:', err);
    return null;
  }
}

/**
 * Upsert records into Supabase cloud
 */
export async function upsertAttendanceRecordsToCloud(
  records: AttendanceRecord[],
  studentId: string = DEFAULT_STUDENT_ID
): Promise<boolean> {
  if (!isSupabaseConnected() || records.length === 0) return false;
  try {
    const supabase = createClient();
    const rows = records.map((r) => ({
      id: r.id,
      student_id: studentId,
      subject_id: r.subjectId,
      class_slot_id: r.classSlotId,
      date: r.date,
      status: r.status,
      marked_at: r.markedAt,
      source: r.source,
      flagged: r.flagged || false,
      notes: r.notes || null,
    }));

    const { error } = await supabase
      .from('attendance_records')
      .upsert(rows, { onConflict: 'student_id,class_slot_id,date' });

    if (error) {
      console.warn('Supabase upsert error for attendance records:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase network error upserting attendance:', err);
    return false;
  }
}

/**
 * Delete a single attendance record from Supabase cloud
 */
export async function deleteAttendanceRecordFromCloud(
  recordId: string,
  studentId: string = DEFAULT_STUDENT_ID
): Promise<boolean> {
  if (!isSupabaseConnected()) return false;
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('attendance_records')
      .delete()
      .eq('id', recordId)
      .eq('student_id', studentId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Fetch Semester Settings from Supabase cloud
 */
export async function fetchSemesterSettingsFromCloud(
  studentId: string = DEFAULT_STUDENT_ID
): Promise<SemesterSettings | null> {
  if (!isSupabaseConnected()) return null;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('student_attendance_settings')
      .select('*')
      .eq('student_id', studentId)
      .single();

    if (error || !data) return null;

    return {
      studentId: data.student_id || studentId,
      targetPercent: Number(data.target_percent) || 0.80,
      batch: (data.batch as 'B1' | 'B2') || 'B1',
      startDate: data.start_date || '2026-08-17',
      endDate: data.end_date || '2026-12-29',
    };

  } catch {
    return null;
  }
}

/**
 * Upsert Semester Settings to Supabase cloud
 */
export async function upsertSemesterSettingsToCloud(
  settings: SemesterSettings,
  studentId: string = DEFAULT_STUDENT_ID
): Promise<boolean> {
  if (!isSupabaseConnected()) return false;
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('student_attendance_settings')
      .upsert(
        {
          student_id: studentId,
          target_percent: settings.targetPercent,
          batch: settings.batch || 'B1',
          start_date: settings.startDate,
          end_date: settings.endDate,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id' }
      );

    return !error;
  } catch {
    return false;
  }
}

/**
 * Fetch Holiday Entries from Supabase cloud
 */
export async function fetchHolidaysFromCloud(
  studentId: string = DEFAULT_STUDENT_ID
): Promise<HolidayEntry[] | null> {
  if (!isSupabaseConnected()) return null;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('student_holidays')
      .select('*')
      .eq('student_id', studentId)
      .order('date', { ascending: true });

    if (error || !data) return null;

    return data.map((row) => ({
      id: row.id,
      date: row.date,
      type: row.type as 'gazetted' | 'manual',
      label: row.label || 'Holiday',
      isHoliday: Boolean(row.is_holiday),
    }));
  } catch {
    return null;
  }
}

/**
 * Upsert Holidays to Supabase cloud
 */
export async function upsertHolidaysToCloud(
  holidays: HolidayEntry[],
  studentId: string = DEFAULT_STUDENT_ID
): Promise<boolean> {
  if (!isSupabaseConnected() || holidays.length === 0) return false;
  try {
    const supabase = createClient();
    const rows = holidays.map((h) => ({
      id: h.id || `hol-${h.date}`,
      student_id: studentId,
      date: h.date,
      type: h.type,
      label: h.label || null,
      is_holiday: h.isHoliday,
    }));

    const { error } = await supabase
      .from('student_holidays')
      .upsert(rows, { onConflict: 'student_id,date' });

    return !error;
  } catch {
    return false;
  }
}

/**
 * Subscribe to realtime attendance updates from Supabase
 */
export function subscribeToAttendanceCloud(
  studentId: string = DEFAULT_STUDENT_ID,
  onRecordChange: () => void
) {
  if (!isSupabaseConnected()) return () => {};
  try {
    const supabase = createClient();
    const channel = supabase
      .channel(`attendance_sync_${studentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_records',
          filter: `student_id=eq.${studentId}`,
        },
        () => {
          onRecordChange();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
}
