import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getDirectSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, keys, batch_pref } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: 'Missing required push subscription fields' },
        { status: 400 }
      );
    }

    const supabase = getDirectSupabase();
    if (!supabase) {
      return NextResponse.json({ success: true, message: 'Subscribed locally' });
    }

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        batch_pref: batch_pref || 'ALL',
      },
      { onConflict: 'endpoint' }
    );

    if (error) {
      console.error('Failed to save push subscription in Supabase:', error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Subscribed successfully' });
  } catch (err) {
    console.error('Error in /api/subscribe:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Missing endpoint' },
        { status: 400 }
      );
    }

    const supabase = getDirectSupabase();
    if (supabase) {
      await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    }

    return NextResponse.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (err) {
    console.error('Error in DELETE /api/subscribe:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
