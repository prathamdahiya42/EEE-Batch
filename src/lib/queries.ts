// ============================================
// EEE Batch Pulse — Server-side Queries
// ============================================

import { createClient } from '@/lib/supabase/server';
import type { Day, Post, ScheduleEntry, DayWithData } from '@/lib/types';
import { getTodayDateString } from '@/lib/constants';

export async function getDayByDate(date: string): Promise<DayWithData | null> {
  try {
    const supabase = await createClient();

    const { data: day, error: dayError } = await supabase
      .from('days')
      .select('*')
      .eq('date', date)
      .single();

    if (dayError || !day) return null;

    const [postsResult, scheduleResult] = await Promise.all([
      supabase
        .from('posts')
        .select('*, admin:admins(name)')
        .eq('day_id', day.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('schedule_entries')
        .select('*')
        .eq('day_id', day.id)
        .order('scheduled_time', { ascending: true }),
    ]);

    return {
      day: day as Day,
      posts: (postsResult.data || []) as Post[],
      schedule: (scheduleResult.data || []) as ScheduleEntry[],
    };
  } catch (err) {
    console.warn('Error fetching day data:', err);
    return null;
  }
}

export async function getTodayWithData(): Promise<DayWithData | null> {
  return getDayByDate(getTodayDateString());
}

export async function getPostsBySubject(subject: string): Promise<Post[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('posts')
      .select('*, day:days(date), admin:admins(name)')
      .eq('subject', subject)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching posts by subject:', error.message);
      return [];
    }

    return (data || []) as Post[];
  } catch (err) {
    console.warn('Error in getPostsBySubject:', err);
    return [];
  }
}

export async function getBookRecommendations(): Promise<Post[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('posts')
      .select('*, day:days(date), admin:admins(name)')
      .eq('type', 'book_rec')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching book recommendations:', error.message);
      return [];
    }

    return (data || []) as Post[];
  } catch (err) {
    console.warn('Error in getBookRecommendations:', err);
    return [];
  }
}

export async function getAllSubjectsWithPosts(): Promise<string[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('posts')
      .select('subject')
      .not('subject', 'is', null)
      .order('subject');

    if (error || !data) return [];

    const unique = [...new Set(data.map((d) => d.subject as string))];
    return unique;
  } catch (err) {
    console.warn('Error in getAllSubjectsWithPosts:', err);
    return [];
  }
}

export async function getRecentDays(limit = 30): Promise<Day[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('days')
      .select('*')
      .order('date', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('Error fetching recent days:', error.message);
      return [];
    }

    return (data || []) as Day[];
  } catch (err) {
    console.warn('Error in getRecentDays:', err);
    return [];
  }
}

export async function getAdjacentDayDates(
  currentDate: string
): Promise<{ prev: string | null; next: string | null }> {
  try {
    const supabase = await createClient();

    const [prevResult, nextResult] = await Promise.all([
      supabase
        .from('days')
        .select('date')
        .lt('date', currentDate)
        .order('date', { ascending: false })
        .limit(1),
      supabase
        .from('days')
        .select('date')
        .gt('date', currentDate)
        .order('date', { ascending: true })
        .limit(1),
    ]);

    return {
      prev: prevResult.data?.[0]?.date || null,
      next: nextResult.data?.[0]?.date || null,
    };
  } catch (err) {
    console.warn('Error in getAdjacentDayDates:', err);
    return { prev: null, next: null };
  }
}
