import { NextResponse } from 'next/server';
import { WEEKLY_TIMETABLE, timeToMinutes } from '@/lib/timetable-data';
import { sendPushNotificationToAll } from '@/lib/push-server';
import { createClient } from '@supabase/supabase-js';
import { getTodayDateString } from '@/lib/constants';

export const dynamic = 'force-dynamic';

function getDirectSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET() {
  try {
    // Current Indian Standard Time (UTC + 5:30)
    const now = new Date();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const istNow = new Date(utcTime + 5.5 * 3600000);

    const dayOfWeek = istNow.getDay();
    // No classes on weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return NextResponse.json({
        status: 'Weekend — no scheduled classes',
        dayOfWeek,
        timeIST: istNow.toLocaleTimeString('en-IN'),
      });
    }

    const currentMinutes = istNow.getHours() * 60 + istNow.getMinutes();

    // Query overrides from direct supabase if available
    let overrides: { subject: string; scheduled_time: string | null; status: string }[] = [];
    const supabase = getDirectSupabase();
    if (supabase) {
      const todayStr = getTodayDateString();
      const { data: day } = await supabase
        .from('days')
        .select('id')
        .eq('date', todayStr)
        .single();

      if (day) {
        const { data: entries } = await supabase
          .from('schedule_entries')
          .select('subject, scheduled_time, status')
          .eq('day_id', day.id);
        overrides = entries || [];
      }
    }

    const todaySlots = WEEKLY_TIMETABLE.filter(
      (slot) => slot.day_of_week === dayOfWeek && slot.session_type !== 'lunch'
    );

    const notificationsSent: string[] = [];

    for (const slot of todaySlots) {
      const startMins = timeToMinutes(slot.start_time);

      // Check if slot starts in 2 to 8 minutes
      const minsUntilStart = startMins - currentMinutes;
      if (minsUntilStart >= 2 && minsUntilStart <= 8) {
        // Check if overridden
        const override = overrides.find(
          (o) =>
            o.subject.toLowerCase() === slot.subject.toLowerCase() ||
            (o.scheduled_time &&
              Math.abs(timeToMinutes(o.scheduled_time) - startMins) <= 15)
        );

        if (override && (override.status === 'cancelled' || override.status === 'mass_bunk')) {
          continue;
        }

        const roomInfo = slot.room ? ` · ${slot.room}` : '';
        const facultyInfo = slot.faculty ? ` (${slot.faculty})` : '';
        const batchInfo = slot.batch ? ` [Batch ${slot.batch}]` : '';

        await sendPushNotificationToAll(
          {
            title: `🔔 Class Starting in ${minsUntilStart} min${batchInfo}`,
            body: `${slot.subject}${facultyInfo}${roomInfo} at ${slot.start_time}`,
            url: '/',
            tag: `start-${slot.id}-${istNow.toDateString()}`,
          },
          slot.batch || 'ALL'
        );

        notificationsSent.push(`Starting soon: ${slot.subject} (${minsUntilStart}m)`);
      }
    }

    return NextResponse.json({
      status: 'Check completed successfully',
      timeIST: istNow.toLocaleTimeString('en-IN'),
      dayOfWeek,
      totalSlotsToday: todaySlots.length,
      notificationsSent,
    });
  } catch (err) {
    console.error('Error in /api/cron/check-timetable:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
