-- =========================================================
-- EEE Batch Pulse — Complete Supabase Database Setup Script
-- Safe to run on fresh or existing Supabase projects.
-- Paste this in Supabase Dashboard → SQL Editor → New Query → Run
-- =========================================================

-- =========================================================
-- 1. ATTENDANCE SYSTEM TABLES
-- =========================================================

-- 1.1 Attendance Records Table
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL DEFAULT 'default_student',
  subject_id TEXT NOT NULL,
  class_slot_id TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'cancelled', 'leave')),
  marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL CHECK (source IN ('daily', 'manual')) DEFAULT 'daily',
  flagged BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_attendance_student_slot_date UNIQUE (student_id, class_slot_id, date)
);

-- 1.2 Student Attendance Settings Table
CREATE TABLE IF NOT EXISTS public.student_attendance_settings (
  student_id TEXT PRIMARY KEY DEFAULT 'default_student',
  target_percent NUMERIC NOT NULL DEFAULT 0.80,
  rolling_window_days INT NOT NULL DEFAULT 7,
  weekly_backdated_limit INT NOT NULL DEFAULT 3,
  audit_gap_days INT NOT NULL DEFAULT 2,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  batch TEXT NOT NULL CHECK (batch IN ('B1', 'B2')) DEFAULT 'B1',
  start_date DATE NOT NULL DEFAULT '2026-08-17',
  end_date DATE NOT NULL DEFAULT '2026-12-29',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.3 Student Holiday Calendar Table
CREATE TABLE IF NOT EXISTS public.student_holidays (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL DEFAULT 'default_student',
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('gazetted', 'manual')) DEFAULT 'manual',
  label TEXT,
  is_holiday BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_holiday_student_date UNIQUE (student_id, date)
);

-- =========================================================
-- 2. INDEXES
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_att_records_student_date ON public.attendance_records(student_id, date);
CREATE INDEX IF NOT EXISTS idx_att_records_subject ON public.attendance_records(subject_id);
CREATE INDEX IF NOT EXISTS idx_att_settings_student ON public.student_attendance_settings(student_id);
CREATE INDEX IF NOT EXISTS idx_holidays_student_date ON public.student_holidays(student_id, date);

-- =========================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- =========================================================
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_holidays ENABLE ROW LEVEL SECURITY;

-- 3.1 Attendance Records Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attendance_records' AND policyname = 'attendance_records_select_policy') THEN
    CREATE POLICY "attendance_records_select_policy" ON public.attendance_records FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attendance_records' AND policyname = 'attendance_records_insert_policy') THEN
    CREATE POLICY "attendance_records_insert_policy" ON public.attendance_records FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attendance_records' AND policyname = 'attendance_records_update_policy') THEN
    CREATE POLICY "attendance_records_update_policy" ON public.attendance_records FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attendance_records' AND policyname = 'attendance_records_delete_policy') THEN
    CREATE POLICY "attendance_records_delete_policy" ON public.attendance_records FOR DELETE USING (true);
  END IF;
END $$;

-- 3.2 Student Attendance Settings Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_attendance_settings' AND policyname = 'student_settings_all_policy') THEN
    CREATE POLICY "student_settings_all_policy" ON public.student_attendance_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 3.3 Student Holidays Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_holidays' AND policyname = 'student_holidays_all_policy') THEN
    CREATE POLICY "student_holidays_all_policy" ON public.student_holidays FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- =========================================================
-- 4. ENABLE REALTIME REPLICATION
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'attendance_records'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'student_attendance_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_attendance_settings;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'student_holidays'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_holidays;
  END IF;
END $$;
