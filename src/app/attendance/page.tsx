import type { Metadata } from 'next';
import AttendanceClient from './AttendanceClient';
import { getTodayWithData } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Attendance Manager & Safe-to-Bunk — EEE Batch Pulse',
  description:
    'Per-class manual attendance tracking, safe-to-bunk calculations, subject-wise analytics, and recovery quotas for EEE students.',
};

export default async function AttendancePage() {
  const todayData = await getTodayWithData();
  const overrides = todayData?.schedule || [];

  return <AttendanceClient initialOverrides={overrides} />;
}
