'use client';

import { useState, useEffect } from 'react';
import type { BatchOption } from '@/lib/types';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [batchPref, setBatchPref] = useState<BatchOption>('ALL');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check if browser supports push notifications
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    // Check if already subscribed or dismissed
    const alreadySubscribed = localStorage.getItem('eee_push_subscribed');
    const dismissedUntil = localStorage.getItem('eee_push_dismissed_until');

    if (alreadySubscribed === 'true') {
      return;
    }

    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
      return;
    }

    // Delay soft prompt by 2.5 seconds for pleasant onboarding
    const timer = setTimeout(() => {
      if (Notification.permission !== 'granted') {
        setShowPrompt(true);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  async function handleSubscribe() {
    setLoading(true);
    try {
      // 1. Request native permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Notification permission was denied. You can enable it in browser site settings.');
        setShowPrompt(false);
        return;
      }

      // 2. Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // 3. Subscribe to push manager
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('Push notifications are not configured: NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing');
      }

      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      const subscriptionJSON = subscription.toJSON();

      // 4. Send to backend
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscriptionJSON.keys?.p256dh,
            auth: subscriptionJSON.keys?.auth,
          },
          batch_pref: batchPref,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to store push subscription on server');
      }

      localStorage.setItem('eee_push_subscribed', 'true');
      setSuccess(true);
      setTimeout(() => {
        setShowPrompt(false);
      }, 2500);
    } catch (err) {
      console.error('Error subscribing to push notifications:', err);
      alert('Could not enable push notifications. Please check connection and permissions.');
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    // Dismiss for 7 days
    localStorage.setItem(
      'eee_push_dismissed_until',
      (Date.now() + 7 * 24 * 60 * 60 * 1000).toString()
    );
    setShowPrompt(false);
  }

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-5 right-5 left-5 sm:left-auto sm:max-w-sm z-50 animate-fade-up">
      <div className="glass-card p-5 border-2 border-[#FFD9E8] shadow-2xl bg-white/95">
        {success ? (
          <div className="text-center py-2">
            <span className="text-3xl mb-2 inline-block">🎉</span>
            <h4 className="font-display font-bold text-base text-[#3D2C36]">
              Notifications Activated!
            </h4>
            <p className="font-mono text-xs text-[#FF4F9A] mt-1 font-semibold">
              You will receive live alerts for upcoming classes & mass bunks.
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FF4F9A]/15 border border-[#FF4F9A]/30 flex items-center justify-center text-xl shrink-0">
                🔔
              </div>
              <div className="flex-1">
                <h4 className="font-display font-bold text-sm text-[#3D2C36] leading-tight">
                  Instant Class & Bunk Alerts
                </h4>
                <p className="text-xs text-[#3D2C36]/70 mt-1">
                  Get notified on your phone/laptop 5 minutes before class starts, or immediately when an admin marks a Mass Bunk or Cancellation!
                </p>
              </div>
            </div>

            {/* Batch selector */}
            <div className="mb-4">
              <label className="block font-mono text-[10px] font-bold uppercase text-[#C2185B] mb-1.5">
                Your Batch for Lab Alerts
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['ALL', 'B1', 'B2'] as BatchOption[]).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBatchPref(b)}
                    className={`
                      py-1 rounded-xl font-mono text-xs font-bold border transition-all cursor-pointer
                      ${
                        batchPref === b
                          ? 'bg-[#FF4F9A] text-white border-[#FF4F9A] shadow-xs'
                          : 'bg-white/70 border-[#FFD9E8] text-[#3D2C36]/70 hover:bg-white'
                      }
                    `}
                  >
                    {b === 'ALL' ? 'All Classes' : `Batch ${b}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={loading}
                className="flex-1 py-2.5 glass-btn-primary font-display text-xs font-bold tracking-wide cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Enabling...' : 'Enable Alerts ⚡'}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-2.5 rounded-full text-xs font-medium text-[#3D2C36]/60 hover:text-[#3D2C36] hover:bg-black/5 transition-colors cursor-pointer"
              >
                Maybe Later
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
