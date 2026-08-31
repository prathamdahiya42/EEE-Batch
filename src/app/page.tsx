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
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-5 space-y-5">
        {/* Attendance & Bunk Manager Quick Access Card */}
        <div className="glass-card p-4 flex items-center justify-between gap-4 border-[#FF4F9A]/30 bg-white/70 shadow-xs hover:border-[#FF4F9A] transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF4F9A]/15 border border-[#FF4F9A]/30 flex items-center justify-center text-xl shrink-0">
              📊
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-[#3D2C36]">
                Per-Class Attendance & Bunk Math
              </h2>
              <p className="font-mono text-[11px] text-[#3D2C36]/60">
                Log today&apos;s classes, check safe-to-bunk quotas, and set alarms
              </p>
            </div>
          </div>

          <Link
            href="/attendance"
            className="glass-btn-primary px-4 py-2 text-xs font-bold shrink-0 inline-flex items-center gap-1 shadow-sm"
          >
            <span>Mark Today</span>
            <span>→</span>
          </Link>
        </div>

        {/* Subject quick links */}
        {data && data.schedule.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
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
        <div className="glass-card px-6 py-3 flex items-center justify-center gap-5 text-center flex-wrap">
          <Link
            href="/attendance"
            className="font-display text-xs font-bold text-[#FF4F9A] hover:text-[#C2185B]
                       transition-colors tracking-wide uppercase flex items-center gap-1"
          >
            <span>📊</span>
            <span>Attendance</span>
          </Link>
          <span className="w-1.5 h-1.5 rounded-full bg-[#FFD9E8]" />
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
