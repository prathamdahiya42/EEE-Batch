import TopBar from '@/components/ui/TopBar';
import ScheduleStrip from '@/components/ui/ScheduleStrip';
import PostFeed from '@/components/ui/PostFeed';
import { getDayByDate, getAdjacentDayDates } from '@/lib/queries';
import { formatDateDisplay } from '@/lib/constants';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface DayPageProps {
  params: Promise<{ date: string }>;
}

export async function generateMetadata({ params }: DayPageProps) {
  const { date } = await params;
  return {
    title: `${formatDateDisplay(date)} — EEE Batch Pulse`,
    description: `Class timeline for ${formatDateDisplay(date)}`,
  };
}

export default async function DayPage({ params }: DayPageProps) {
  const { date } = await params;

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    notFound();
  }

  const data = await getDayByDate(date);
  const adjacentDates = await getAdjacentDayDates(date);

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar
        currentDate={date}
        prevDate={adjacentDates.prev}
        nextDate={adjacentDates.next}
      />

      {/* Schedule strip */}
      <ScheduleStrip entries={data?.schedule || []} />

      {/* Main content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">
        {data ? (
          <>
            {/* Subject quick links */}
            {data.schedule.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {[...new Set(data.posts.map((p) => p.subject).filter(Boolean))].map(
                  (subject) => (
                    <Link
                      key={subject}
                      href={`/subject/${encodeURIComponent(subject!)}`}
                      className="font-mono text-[11px] font-medium text-[#C2185B]
                                 px-3 py-1 rounded-full bg-white/70 border border-[#FFD9E8]
                                 hover:bg-[#FF4F9A] hover:text-white hover:border-[#FF4F9A]
                                 shadow-xs transition-all tracking-wider uppercase active:scale-95"
                    >
                      {subject}
                    </Link>
                  )
                )}
              </div>
            )}

            <PostFeed
              posts={data.posts}
              emptyMessage="No posts recorded for this day."
            />
          </>
        ) : (
          <div className="glass-card flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-white/70 border border-[#FFD9E8]
                            flex items-center justify-center mb-4 shadow-sm">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-[#FF4F9A]"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <p className="font-display text-base font-semibold text-[#3D2C36] mb-1">
              No Data Recorded
            </p>
            <p className="font-mono text-xs text-[#3D2C36]/50 tracking-wide mb-6">
              No entries found for {formatDateDisplay(date)}
            </p>
            <Link
              href="/"
              className="glass-btn-primary px-5 py-2 text-xs font-semibold tracking-wide uppercase inline-flex items-center gap-1.5"
            >
              ← Back to today
            </Link>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-3xl w-full mx-auto px-4 py-8 mt-auto">
        <div className="glass-card px-6 py-3 flex items-center justify-center gap-6 text-center">
          <Link
            href="/"
            className="font-display text-xs font-semibold text-[#3D2C36]/70 hover:text-[#FF4F9A]
                       transition-colors tracking-wide uppercase"
          >
            Today ⚡
          </Link>
          <span className="w-1.5 h-1.5 rounded-full bg-[#FFD9E8]" />
          <Link
            href="/books"
            className="font-display text-xs font-semibold text-[#3D2C36]/70 hover:text-[#FF4F9A]
                       transition-colors tracking-wide uppercase"
          >
            Book Recs 📚
          </Link>
        </div>
      </footer>
    </div>
  );
}
