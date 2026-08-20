import type { Metadata, Viewport } from 'next';
import './globals.css';
import NowNextBar from '@/components/ui/NowNextBar';
import NotificationPrompt from '@/components/ui/NotificationPrompt';
import { getTodayWithData } from '@/lib/queries';

export const metadata: Metadata = {
  title: 'EEE Batch Pulse — Live Class Timeline & Timetable',
  description:
    'Day-by-day class pulse & live timetable for the EEE batch. Real-time class status, push alerts, notes, and book recommendations.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch today's overrides for the server-rendered NowNextBar initial state
  const todayData = await getTodayWithData();
  const overrides = todayData?.schedule || [];

  return (
    <html lang="en" className="bg-[#FFF6FA]">
      <body className="min-h-screen relative text-[#3D2C36] antialiased bg-[#FFF6FA] selection:bg-[#FF4F9A]/20 selection:text-[#C2185B]">
        {/* Ambient Gradient Mesh Refraction Layer */}
        <div
          className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#FFF6FA]"
          aria-hidden="true"
        >
          <div className="ambient-gradient-blob-1" />
          <div className="ambient-gradient-blob-2" />
          <div className="ambient-gradient-blob-3" />
          <div className="ambient-gradient-blob-4" />
        </div>

        {/* Layout-level Live Now/Next Bar (Permanently visible on all routes) */}
        <NowNextBar initialOverrides={overrides} />

        {/* Soft Push Notification Permission Prompt */}
        <NotificationPrompt />

        {/* App Content */}
        <div className="relative z-0 min-h-[calc(100vh-60px)] flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
