import type { Metadata } from 'next';
import TopBar from '@/components/ui/TopBar';
import LiveChat from '@/components/ui/LiveChat';
import { getTodayDateString } from '@/lib/constants';
import { getAdjacentDayDates } from '@/lib/queries';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Batch Live Chat — EEE Batch Pulse',
  description: 'Public real-time community chat for the EEE batch. Connect with classmates, ask questions, and share instant updates.',
};

export const dynamic = 'force-dynamic';

export default async function ChatPage() {
  const today = getTodayDateString();
  const adjacentDates = await getAdjacentDayDates(today);

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar
        currentDate={today}
        prevDate={adjacentDates.prev}
        nextDate={adjacentDates.next}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 sm:py-6 flex flex-col justify-between">
        {/* Page Subtitle & Info */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="font-mono text-xs text-[#3D2C36]/60 hover:text-[#FF4F9A] transition-colors"
            >
              ← Back to Timeline
            </Link>
            <span className="text-[#3D2C36]/30">/</span>
            <span className="font-mono text-xs text-[#C2185B] font-semibold">
              Live Chat
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-[#3D2C36]/60 hidden sm:inline">
              Public & Anonymous
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        {/* Real-time Chat Box */}
        <LiveChat />
      </main>
    </div>
  );
}
