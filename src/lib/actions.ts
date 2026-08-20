// ============================================
// EEE Batch Pulse — Server Actions
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { getTodayDateString } from '@/lib/constants';
import { sendPushNotificationToAll } from '@/lib/push-server';
import { revalidatePath } from 'next/cache';
import type { PostType, ScheduleStatus } from '@/lib/types';

// Ensure today's day record exists, return its ID
export async function ensureTodayExists(): Promise<string> {
  const supabase = await createClient();
  const today = getTodayDateString();

  // Try to get existing
  const { data: existing } = await supabase
    .from('days')
    .select('id')
    .eq('date', today)
    .single();

  if (existing) return existing.id;

  // Create new
  const { data: created, error } = await supabase
    .from('days')
    .insert({ date: today })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create day: ${error.message}`);
  return created!.id;
}

// Create a post
export async function createPost(formData: FormData) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check admin status
  const { data: admin } = await supabase
    .from('admins')
    .select('id, name')
    .eq('email', user.email)
    .single();

  if (!admin) throw new Error('Not authorized');

  const type = formData.get('type') as PostType;
  const subject = formData.get('subject') as string;
  const content = formData.get('content') as string;

  // Ensure day exists
  const dayId = await ensureTodayExists();

  // Upload images
  const imageUrls: string[] = [];
  const images = formData.getAll('images') as File[];

  for (const image of images) {
    if (image.size === 0) continue;

    const fileExt = image.name.split('.').pop() || 'png';
    const fileName = `${dayId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(fileName, image);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      continue;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('post-images').getPublicUrl(fileName);

    imageUrls.push(publicUrl);
  }

  // Insert post
  const { error } = await supabase.from('posts').insert({
    day_id: dayId,
    type,
    subject: subject || null,
    content: content || null,
    image_urls: imageUrls,
    posted_by: admin.id,
  });

  if (error) throw new Error(`Failed to create post: ${error.message}`);

  // Send push notification for important highlights / notes
  if (type === 'highlight' || type === 'note') {
    try {
      await sendPushNotificationToAll({
        title: `📝 New ${type === 'highlight' ? 'Highlight' : 'Note'}: ${subject || 'EEE Batch'}`,
        body: content ? (content.length > 100 ? content.slice(0, 97) + '...' : content) : 'New note uploaded by admin',
        url: '/',
        tag: `post-${Date.now()}`,
      });
    } catch (pushErr) {
      console.warn('Push notification warning:', pushErr);
    }
  }

  revalidatePath('/');
  revalidatePath('/timetable');
  revalidatePath(`/day/${getTodayDateString()}`);
  if (subject) revalidatePath(`/subject/${encodeURIComponent(subject)}`);
  if (type === 'book_rec') revalidatePath('/books');

  return { success: true };
}

// Update a schedule entry status & send instant push notification
export async function updateScheduleEntry(
  entryId: string,
  status: ScheduleStatus,
  note: string
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Fetch current entry details for push notification context
  const { data: currentEntry } = await supabase
    .from('schedule_entries')
    .select('subject, scheduled_time')
    .eq('id', entryId)
    .single();

  const { error } = await supabase
    .from('schedule_entries')
    .update({ status, note: note || null, updated_at: new Date().toISOString() })
    .eq('id', entryId);

  if (error) throw new Error(`Failed to update: ${error.message}`);

  // Send immediate high-priority push alert for overrides
  if (currentEntry) {
    let title = `Class Update: ${currentEntry.subject}`;
    let body = `${currentEntry.subject} status changed to ${status}`;

    if (status === 'mass_bunk') {
      title = `🔴 Mass Bunk: ${currentEntry.subject}`;
      body = note ? `Mass Bunk marked: ${note}` : `${currentEntry.subject} is on Mass Bunk for today!`;
    } else if (status === 'cancelled') {
      title = `❌ Cancelled: ${currentEntry.subject}`;
      body = note ? `Class cancelled: ${note}` : `${currentEntry.subject} lecture/lab has been cancelled.`;
    } else if (status === 'delayed') {
      title = `⚠️ Delayed: ${currentEntry.subject}`;
      body = note ? `Class delayed: ${note}` : `${currentEntry.subject} is running late.`;
    } else if (status === 'happened') {
      title = `✅ Happening: ${currentEntry.subject}`;
      body = note ? `Status updated: ${note}` : `${currentEntry.subject} class is in progress.`;
    }

    try {
      await sendPushNotificationToAll({
        title,
        body,
        url: '/',
        tag: `override-${entryId}-${status}`,
      });
    } catch (pushErr) {
      console.warn('Instant push notification error:', pushErr);
    }
  }

  revalidatePath('/');
  revalidatePath('/timetable');
  revalidatePath(`/day/${getTodayDateString()}`);

  return { success: true };
}

// Initialize schedule entries for today from timetable defaults
export async function initScheduleForToday(
  entries: { subject: string; scheduled_time: string }[]
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const dayId = await ensureTodayExists();

  // Check if entries already exist for today
  const { data: existing } = await supabase
    .from('schedule_entries')
    .select('id')
    .eq('day_id', dayId);

  if (existing && existing.length > 0) {
    return { success: true, message: 'Schedule already exists for today' };
  }

  const rows = entries.map((e) => ({
    day_id: dayId,
    subject: e.subject,
    scheduled_time: e.scheduled_time,
    status: 'happened' as ScheduleStatus,
  }));

  const { error } = await supabase.from('schedule_entries').insert(rows);

  if (error) throw new Error(`Failed to init schedule: ${error.message}`);

  revalidatePath('/');
  revalidatePath('/timetable');
  revalidatePath(`/day/${getTodayDateString()}`);

  return { success: true };
}

// Delete a post
export async function deletePost(postId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('posts').delete().eq('id', postId);

  if (error) throw new Error(`Failed to delete: ${error.message}`);

  revalidatePath('/');
  revalidatePath('/books');
  revalidatePath('/timetable');

  return { success: true };
}

// Admin login
export async function adminLogin(email: string, password: string) {
  const supabase = await createClient();

  // First check if email is in admins table
  const { data: admin } = await supabase
    .from('admins')
    .select('id')
    .eq('email', email)
    .single();

  if (!admin) {
    return { error: 'You are not an authorized admin.' };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

// Admin logout
export async function adminLogout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/admin');
}
