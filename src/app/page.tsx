import TopBar from '@/components/ui/TopBar';
import ScheduleStrip from '@/components/ui/ScheduleStrip';
import PostFeed from '@/components/ui/PostFeed';
import { getTodayWithData } from '@/lib/queries';
import { getAdjacentDayDates } from '@/lib/queries';
import { getTodayDateString } from '@/lib/constants';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const today = getTodayDateString();
  const data = await getTodayWithData();
  const adjacentDates = data ? await getAdjacentDayDates(today) : { prev: null, next: null };

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar
        currentDate={today}
        prevDate={adjacentDates.prev}
        nextDate={adjacentDates.next}
      />

      {/* Schedule strip */}
      <ScheduleStrip entries={data?.schedule || []} />

      {/* Main content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">
        {/* Subject quick links */}
        {data && data.schedule.length > 0 && (
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

        {/* Posts feed */}
        <PostFeed
          posts={data?.posts || []}
          emptyMessage={
            data
              ? 'No posts for today yet. Check back later!'
              : 'No posts recorded for today yet.'
          }
        />

        {/* Empty state context when no day exists */}
        {!data && (
          <div className="mt-6 text-center">
            <p className="font-mono text-xs text-[#3D2C36]/50 tracking-wider">
              Waiting for admin to initialize today&apos;s schedule
            </p>
          </div>
        )}
      </main>

      {/* Glass footer */}
      <footer className="max-w-3xl w-full mx-auto px-4 py-8 mt-auto">
        <div className="glass-card px-6 py-3 flex items-center justify-center gap-6 text-center flex-wrap">
          <Link
            href="/timetable"
            className="font-display text-xs font-semibold text-[#3D2C36]/70 hover:text-[#FF4F9A]
                       transition-colors tracking-wide uppercase"
          >
            Timetable 🗓️
          </Link>
          <span className="w-1.5 h-1.5 rounded-full bg-[#FFD9E8]" />
          <Link
            href="/books"
            className="font-display text-xs font-semibold text-[#3D2C36]/70 hover:text-[#FF4F9A]
                       transition-colors tracking-wide uppercase"
          >
            Book Recs 📚
          </Link>
          <span className="w-1.5 h-1.5 rounded-full bg-[#FFD9E8]" />
          <Link
            href="/admin"
            className="font-display text-xs font-semibold text-[#3D2C36]/70 hover:text-[#FF4F9A]
                       transition-colors tracking-wide uppercase"
          >
            Admin Panel ⚙️
          </Link>
        </div>
      </footer>
    </div>
  );
}
