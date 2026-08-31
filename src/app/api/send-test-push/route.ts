import { NextRequest, NextResponse } from 'next/server';
import { sendPushNotificationToAll } from '@/lib/push-server';
import type { BatchOption } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      title = '🚨 EEE Batch Pulse Alert',
      body: messageBody = 'This is a test notification from your EEE attendance system!',
      batch_pref = 'ALL',
      url = '/attendance',
      tag = `test-${Date.now()}`,
    } = body;

    const result = await sendPushNotificationToAll(
      {
        title,
        body: messageBody,
        url,
        tag,
      },
      (batch_pref as BatchOption) || 'ALL'
    );

    return NextResponse.json({
      success: true,
      message: `Notification dispatched: ${result.successCount} delivered, ${result.failureCount} failed`,
      result,
    });
  } catch (err: unknown) {
    console.error('Error sending test push notification:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to dispatch push notification' },
      { status: 500 }
    );
  }
}
