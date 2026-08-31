-- =========================================================
-- EEE Batch Pulse — Complete Master Database Setup Script
-- Safe to run on brand new or existing Supabase projects.
-- Copy and paste this into Supabase SQL Editor:
-- Dashboard → SQL Editor → New Query → Run
-- =========================================================

-- =========================================================
-- 1. MESSAGES TABLE (Live Community Chat)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL CHECK (char_length(trim(content)) > 0 AND char_length(content) <= 500),
  sender_name TEXT NOT NULL CHECK (char_length(trim(sender_name)) > 0 AND char_length(sender_name) <= 50),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at ASC);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Public read messages') THEN
    CREATE POLICY "Public read messages" ON public.messages FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Public insert messages') THEN
    CREATE POLICY "Public insert messages" ON public.messages FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- =========================================================
-- 2. ATTENDANCE SYSTEM TABLES
-- =========================================================

-- 2.1 Attendance Records Table
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

-- 2.2 Student Attendance Settings Table
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

-- 2.3 Student Holiday Calendar Table
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

-- Attendance Indexes
CREATE INDEX IF NOT EXISTS idx_att_records_student_date ON public.attendance_records(student_id, date);
CREATE INDEX IF NOT EXISTS idx_att_records_subject ON public.attendance_records(subject_id);
CREATE INDEX IF NOT EXISTS idx_att_settings_student ON public.student_attendance_settings(student_id);
CREATE INDEX IF NOT EXISTS idx_holidays_student_date ON public.student_holidays(student_id, date);

-- Attendance RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_holidays ENABLE ROW LEVEL SECURITY;

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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_attendance_settings' AND policyname = 'student_settings_all_policy') THEN
    CREATE POLICY "student_settings_all_policy" ON public.student_attendance_settings FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'student_holidays' AND policyname = 'student_holidays_all_policy') THEN
    CREATE POLICY "student_holidays_all_policy" ON public.student_holidays FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- =========================================================
-- 3. CORE APP TABLES (Admins, Days, Posts, Timetable, Push)
-- =========================================================

-- Admins table
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  whatsapp_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Days table
CREATE TABLE IF NOT EXISTS public.days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Posts table
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id UUID REFERENCES public.days(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('note','highlight','book_rec','review')),
  subject TEXT,
  content TEXT,
  image_urls TEXT[] DEFAULT '{}',
  posted_by UUID REFERENCES public.admins(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Schedule entries table
CREATE TABLE IF NOT EXISTS public.schedule_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id UUID REFERENCES public.days(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  scheduled_time TEXT,
  status TEXT NOT NULL CHECK (status IN ('happened','delayed','cancelled','mass_bunk')) DEFAULT 'happened',
  note TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Timetable table
CREATE TABLE IF NOT EXISTS public.timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  subject TEXT NOT NULL,
  faculty TEXT,
  room TEXT,
  batch TEXT,
  session_type TEXT CHECK (session_type IN ('lecture','lab','library','lunch')) DEFAULT 'lecture',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Push subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  batch_pref TEXT DEFAULT 'ALL',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Core Indexes
CREATE INDEX IF NOT EXISTS idx_days_date ON public.days(date);
CREATE INDEX IF NOT EXISTS idx_posts_day_id ON public.posts(day_id);
CREATE INDEX IF NOT EXISTS idx_posts_type ON public.posts(type);
CREATE INDEX IF NOT EXISTS idx_posts_subject ON public.posts(subject);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_day_id ON public.schedule_entries(day_id);
CREATE INDEX IF NOT EXISTS idx_timetable_day_of_week ON public.timetable(day_of_week);
CREATE INDEX IF NOT EXISTS idx_push_subs_endpoint ON public.push_subscriptions(endpoint);

-- Core RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'days' AND policyname = 'Public read days') THEN
    CREATE POLICY "Public read days" ON public.days FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'posts' AND policyname = 'Public read posts') THEN
    CREATE POLICY "Public read posts" ON public.posts FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedule_entries' AND policyname = 'Public read schedule') THEN
    CREATE POLICY "Public read schedule" ON public.schedule_entries FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admins' AND policyname = 'Public read admins') THEN
    CREATE POLICY "Public read admins" ON public.admins FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'timetable' AND policyname = 'Public read timetable') THEN
    CREATE POLICY "Public read timetable" ON public.timetable FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'push_subscriptions' AND policyname = 'Public insert push') THEN
    CREATE POLICY "Public insert push" ON public.push_subscriptions FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'push_subscriptions' AND policyname = 'Public read push') THEN
    CREATE POLICY "Public read push" ON public.push_subscriptions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'push_subscriptions' AND policyname = 'Public delete push') THEN
    CREATE POLICY "Public delete push" ON public.push_subscriptions FOR DELETE USING (true);
  END IF;
END $$;

-- =========================================================
-- 4. ENABLE REALTIME PUBLICATION
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'attendance_records') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'student_attendance_settings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_attendance_settings;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'student_holidays') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_holidays;
  END IF;
END $$;
