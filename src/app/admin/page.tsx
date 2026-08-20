import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getTodayDateString } from '@/lib/constants';
import AdminDashboardClient from './AdminDashboardClient';
import type { ScheduleEntry } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  // Get today's schedule entries
  const today = getTodayDateString();
  const { data: dayData } = await supabase
    .from('days')
    .select('id')
    .eq('date', today)
    .single();

  let scheduleEntries: ScheduleEntry[] = [];

  if (dayData) {
    const { data: entries } = await supabase
      .from('schedule_entries')
      .select('*')
      .eq('day_id', dayData.id)
      .order('scheduled_time', { ascending: true });

    scheduleEntries = (entries || []) as ScheduleEntry[];
  }

  return <AdminDashboardClient scheduleEntries={scheduleEntries} />;
}
