import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import type { BatchOption } from './types';

// Configure web-push
const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@eee-pulse.app';

if (publicVapidKey && privateVapidKey) {
  try {
    webpush.setVapidDetails(vapidSubject, publicVapidKey, privateVapidKey);
  } catch (err) {
    console.warn('Failed to initialize web-push VAPID details:', err);
  }
}

function getDirectSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
  data?: Record<string, unknown>;
  badge?: string;
}

/**
 * Send push notification to all subscribers matching batch preference
 */
export async function sendPushNotificationToAll(
  payload: PushNotificationPayload,
  batchTarget: BatchOption = 'ALL'
): Promise<{ successCount: number; failureCount: number }> {
  try {
    const supabase = getDirectSupabase();
    if (!supabase) {
      console.warn('Supabase credentials not configured in push-server.');
      return { successCount: 0, failureCount: 0 };
    }

    let query = supabase.from('push_subscriptions').select('*');
    if (batchTarget !== 'ALL') {
      // Send to matching batch or subscribers who opted for ALL
      query = query.or(`batch_pref.eq.ALL,batch_pref.eq.${batchTarget},batch_pref.is.null`);
    }

    const { data: subscriptions, error } = await query;
    if (error || !subscriptions || subscriptions.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    const payloadString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/',
      icon: payload.icon || '/icon-192.png',
      badge: payload.badge || '/icon-192.png',
      tag: payload.tag || 'class-alert',
      data: payload.data || {},
    });

    let successCount = 0;
    let failureCount = 0;
    const expiredEndpoints: string[] = [];

    await Promise.all(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, payloadString);
          successCount++;
        } catch (err: unknown) {
          failureCount++;
          const statusCode = (err as { statusCode?: number })?.statusCode;
          if (statusCode === 410 || statusCode === 404) {
            // Subscription has expired or unsubscribed
            expiredEndpoints.push(sub.endpoint);
          }
        }
      })
    );

    // Clean up expired subscriptions
    if (expiredEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expiredEndpoints);
    }

    return { successCount, failureCount };
  } catch (err) {
    console.error('Error in sendPushNotificationToAll:', err);
    return { successCount: 0, failureCount: 0 };
  }
}
