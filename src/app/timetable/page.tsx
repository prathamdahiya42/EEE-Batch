import TimetableClient from './TimetableClient';
import { getTodayWithData } from '@/lib/queries';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Weekly Timetable — EEE Batch Pulse',
  description:
    'Full weekly recurring class schedule for Section EX, UIT RGPV Bhopal. Timings, rooms, faculty, and lab blocks.',
};

export default async function TimetablePage() {
  const todayData = await getTodayWithData();
  const overrides = todayData?.schedule || [];

  return (
    <div className="min-h-screen flex flex-col">
      <TimetableClient overrides={overrides} />
    </div>
  );
}
