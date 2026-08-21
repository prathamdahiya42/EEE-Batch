-- ============================================
-- EEE Batch Pulse — Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================

-- 1. Admins table (create first — referenced by posts)
create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  whatsapp_number text,
  created_at timestamptz default now()
);

-- 2. Days table
create table if not exists public.days (
  id uuid primary key default gen_random_uuid(),
  date date unique not null,
  created_at timestamptz default now()
);

-- 3. Posts table
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  day_id uuid references public.days(id) on delete cascade,
  type text not null check (type in ('note','highlight','book_rec','review')),
  subject text,
  content text,
  image_urls text[] default '{}',
  posted_by uuid references public.admins(id),
  created_at timestamptz default now()
);

-- 4. Schedule entries table (Live Overrides Layer)
create table if not exists public.schedule_entries (
  id uuid primary key default gen_random_uuid(),
  day_id uuid references public.days(id) on delete cascade,
  subject text not null,
  scheduled_time text,
  status text not null check (status in ('happened','delayed','cancelled','mass_bunk')) default 'happened',
  note text,
  updated_at timestamptz default now()
);

-- 5. Timetable table (Recurring weekly schedule — source of truth)
create table if not exists public.timetable (
  id uuid primary key default gen_random_uuid(),
  day_of_week int not null,        -- 0=Sunday .. 6=Saturday
  start_time time not null,
  end_time time not null,
  subject text not null,
  faculty text,
  room text,
  batch text,                       -- nullable; 'B1'/'B2' when a slot has parallel batches
  session_type text check (session_type in ('lecture','lab','library','lunch')) default 'lecture',
  created_at timestamptz default now()
);

-- 6. Push subscriptions table (Anonymous per-device push notification endpoints)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  batch_pref text default 'ALL',   -- 'ALL', 'B1', or 'B2'
  created_at timestamptz default now()
);

-- 7. Messages table (Public Real-time Community Chat)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  content text not null check (char_length(trim(content)) > 0 and char_length(content) <= 500),
  sender_name text not null check (char_length(trim(sender_name)) > 0 and char_length(sender_name) <= 50),
  created_at timestamptz default now()
);

-- ============================================
-- Indexes
-- ============================================
create index if not exists idx_days_date on public.days(date);
create index if not exists idx_posts_day_id on public.posts(day_id);
create index if not exists idx_posts_type on public.posts(type);
create index if not exists idx_posts_subject on public.posts(subject);
create index if not exists idx_schedule_entries_day_id on public.schedule_entries(day_id);
create index if not exists idx_timetable_day_of_week on public.timetable(day_of_week);
create index if not exists idx_push_subs_endpoint on public.push_subscriptions(endpoint);
create index if not exists idx_messages_created_at on public.messages(created_at asc);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
alter table public.admins enable row level security;
alter table public.days enable row level security;
alter table public.posts enable row level security;
alter table public.schedule_entries enable row level security;
alter table public.timetable enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.messages enable row level security;

-- Public read access for all tables (no login required to view)
create policy "Public read access" on public.days
  for select using (true);

create policy "Public read access" on public.posts
  for select using (true);

create policy "Public read access" on public.schedule_entries
  for select using (true);

create policy "Public read access" on public.admins
  for select using (true);

create policy "Public read access" on public.timetable
  for select using (true);

-- Push subscriptions: public can insert & delete their own subscription
create policy "Public subscribe push" on public.push_subscriptions
  for insert with check (true);

create policy "Public read push" on public.push_subscriptions
  for select using (true);

create policy "Public delete push" on public.push_subscriptions
  for delete using (true);

-- Messages: public can read and insert messages
create policy "Public read messages" on public.messages
  for select using (true);

create policy "Public insert messages" on public.messages
  for insert with check (true);

-- Realtime Publication for live updates
alter publication supabase_realtime add table public.messages;

-- Admin write access (only authenticated users whose email is in admins table)
create policy "Admin insert" on public.posts
  for insert with check (
    auth.uid() is not null
    and exists (
      select 1 from public.admins where email = auth.jwt()->>'email'
    )
  );

create policy "Admin update" on public.posts
  for update using (
    auth.uid() is not null
    and exists (
      select 1 from public.admins where email = auth.jwt()->>'email'
    )
  );

create policy "Admin delete" on public.posts
  for delete using (
    auth.uid() is not null
    and exists (
      select 1 from public.admins where email = auth.jwt()->>'email'
    )
  );

-- Days: admins can insert/update
create policy "Admin insert" on public.days
  for insert with check (
    auth.uid() is not null
    and exists (
      select 1 from public.admins where email = auth.jwt()->>'email'
    )
  );

create policy "Admin update" on public.days
  for update using (
    auth.uid() is not null
    and exists (
      select 1 from public.admins where email = auth.jwt()->>'email'
    )
  );

-- Schedule entries: admins can insert/update/delete
create policy "Admin insert" on public.schedule_entries
  for insert with check (
    auth.uid() is not null
    and exists (
      select 1 from public.admins where email = auth.jwt()->>'email'
    )
  );

create policy "Admin update" on public.schedule_entries
  for update using (
    auth.uid() is not null
    and exists (
      select 1 from public.admins where email = auth.jwt()->>'email'
    )
  );

create policy "Admin delete" on public.schedule_entries
  for delete using (
    auth.uid() is not null
    and exists (
      select 1 from public.admins where email = auth.jwt()->>'email'
    )
  );

-- Timetable: admins can insert/update/delete
create policy "Admin insert" on public.timetable
  for insert with check (
    auth.uid() is not null
    and exists (
      select 1 from public.admins where email = auth.jwt()->>'email'
    )
  );

create policy "Admin update" on public.timetable
  for update using (
    auth.uid() is not null
    and exists (
      select 1 from public.admins where email = auth.jwt()->>'email'
    )
  );

create policy "Admin delete" on public.timetable
  for delete using (
    auth.uid() is not null
    and exists (
      select 1 from public.admins where email = auth.jwt()->>'email'
    )
  );

-- ============================================
-- Storage bucket for post images
-- ============================================
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

-- Storage policies: anyone can read, admins can upload
create policy "Public read" on storage.objects
  for select using (bucket_id = 'post-images');

create policy "Admin upload" on storage.objects
  for insert with check (
    bucket_id = 'post-images'
    and auth.uid() is not null
    and exists (
      select 1 from public.admins where email = auth.jwt()->>'email'
    )
  );

create policy "Admin delete" on storage.objects
  for delete using (
    bucket_id = 'post-images'
    and auth.uid() is not null
    and exists (
      select 1 from public.admins where email = auth.jwt()->>'email'
    )
  );

-- ============================================
-- Timetable Weekly Seed Data (UIT RGPV Bhopal, B.Tech I SEM, Section EX)
-- ============================================
insert into public.timetable (day_of_week, start_time, end_time, subject, faculty, room, batch, session_type) values
  -- MONDAY (1)
  (1, '10:00', '13:00', 'Manufacturing Practices Lab', 'Dr. Prashant Sharma / Rajesh Tiwari', 'Lab', 'B1', 'lab'),
  (1, '10:00', '13:00', 'Engineering Graphics Lab', 'Dharmendra Singh Rajput (DSR)', 'Lab', 'B2', 'lab'),
  (1, '13:00', '13:50', 'Lunch Break', null, null, null, 'lunch'),
  (1, '13:50', '15:40', 'English Lab', 'Dr. Noeen Khaliq (NQ)', 'Lab', 'B1', 'lab'),
  (1, '13:50', '15:40', 'Engineering Science', 'Ravendra K Ray (RA)', 'Room 106', 'B2', 'lecture'),
  (1, '15:40', '16:35', 'Engineering Science', 'Ravendra K Ray (RA)', 'Room 106', null, 'lecture'),
  (1, '16:35', '17:30', 'Environmental Sciences', 'Bineet Khampariya (BK)', 'Room 106', null, 'lecture'),

  -- TUESDAY (2)
  (2, '10:00', '11:00', 'Renewable Energy Resources', 'Akansha Mercy Steele (AMS)', 'Room 106', null, 'lecture'),
  (2, '11:00', '12:00', 'Engineering Science', 'Ravendra K Ray (RA)', 'Room 106', null, 'lecture'),
  (2, '12:00', '13:00', 'Fundamentals of Electrical Engineering', 'Pankaj Sarsia (PS)', 'Room 106', null, 'lecture'),
  (2, '13:00', '13:50', 'Lunch Break', null, null, null, 'lunch'),
  (2, '13:50', '14:45', 'Mathematics – I', 'Dr. Rashmi Gupta (RG) / Bhawna Soni (BS)', 'Room 106', null, 'lecture'),
  (2, '14:45', '15:40', 'English', 'Dr. Noeen Khaliq (NQ)', 'Room 106', null, 'lecture'),
  (2, '15:40', '17:30', 'Engineering Science', 'Ravendra K Ray (RA)', 'Room 106', 'B1', 'lecture'),
  (2, '15:40', '17:30', 'Library', null, 'Library', 'B2', 'library'),

  -- WEDNESDAY (3)
  (3, '10:00', '11:00', 'Mathematics – I', 'Dr. Rashmi Gupta (RG) / Bhawna Soni (BS)', 'Room 106', null, 'lecture'),
  (3, '11:00', '12:00', 'Renewable Energy Resources', 'Akansha Mercy Steele (AMS)', 'Room 106', null, 'lecture'),
  (3, '12:00', '13:00', 'English', 'Dr. Noeen Khaliq (NQ)', 'Room 106', null, 'lecture'),
  (3, '13:00', '13:50', 'Lunch Break', null, null, null, 'lunch'),
  (3, '13:50', '15:40', 'Library', null, 'Library', 'B1', 'library'),
  (3, '13:50', '15:40', 'English Lab', 'Dr. Noeen Khaliq (NQ)', 'Lab', 'B2', 'lab'),
  (3, '15:40', '16:35', 'Engineering Science', 'Ravendra K Ray (RA)', 'Room 106', null, 'lecture'),
  (3, '16:35', '17:30', 'Fundamentals of Electrical Engineering', 'Pankaj Sarsia (PS)', 'Room 106', null, 'lecture'),

  -- THURSDAY (4)
  (4, '10:00', '11:00', 'English', 'Dr. Noeen Khaliq (NQ)', 'Room 106', null, 'lecture'),
  (4, '11:00', '12:00', 'Engineering Science', 'Ravendra K Ray (RA)', 'Room 106', null, 'lecture'),
  (4, '12:00', '13:00', 'Fundamentals of Electrical Engineering', 'Pankaj Sarsia (PS)', 'Room 106', null, 'lecture'),
  (4, '13:00', '13:50', 'Lunch Break', null, null, null, 'lunch'),
  (4, '13:50', '14:45', 'Mathematics – I', 'Dr. Rashmi Gupta (RG) / Bhawna Soni (BS)', 'Room 106', null, 'lecture'),
  (4, '14:45', '17:30', 'Engineering Graphics Lab', 'Dharmendra Singh Rajput (DSR)', 'Lab', 'B1', 'lab'),
  (4, '14:45', '17:30', 'Manufacturing Practices Lab', 'Dr. Prashant Sharma / Rajesh Tiwari', 'Lab', 'B2', 'lab'),

  -- FRIDAY (5)
  (5, '10:00', '11:00', 'English', 'Dr. Noeen Khaliq (NQ)', 'Room 106', null, 'lecture'),
  (5, '11:00', '12:00', 'Fundamentals of Electrical Engineering', 'Pankaj Sarsia (PS)', 'Room 106', null, 'lecture'),
  (5, '12:00', '13:00', 'Fundamentals of Electrical Engineering', 'Pankaj Sarsia (PS)', 'Room 106', null, 'lecture'),
  (5, '13:00', '13:50', 'Lunch Break', null, null, null, 'lunch'),
  (5, '13:50', '14:45', 'Renewable Energy Resources', 'Akansha Mercy Steele (AMS)', 'Room 106', null, 'lecture'),
  (5, '14:45', '15:40', 'Mathematics – I', 'Dr. Rashmi Gupta (RG) / Bhawna Soni (BS)', 'Room 106', null, 'lecture'),
  (5, '15:40', '16:35', 'Environmental Sciences', 'Bineet Khampariya (BK)', 'Room 106', null, 'lecture'),
  (5, '16:35', '17:30', 'Library', null, 'Library', null, 'library');
