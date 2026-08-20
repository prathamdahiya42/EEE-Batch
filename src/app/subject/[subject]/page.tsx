import PostFeed from '@/components/ui/PostFeed';
import { getPostsBySubject, getAllSubjectsWithPosts } from '@/lib/queries';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface SubjectPageProps {
  params: Promise<{ subject: string }>;
}

export async function generateMetadata({ params }: SubjectPageProps) {
  const { subject } = await params;
  const decoded = decodeURIComponent(subject);
  return {
    title: `${decoded} — EEE Batch Pulse`,
    description: `All notes, highlights, and reviews for ${decoded}`,
  };
}

export default async function SubjectPage({ params }: SubjectPageProps) {
  const { subject } = await params;
  const decoded = decodeURIComponent(subject);
  const posts = await getPostsBySubject(decoded);
  const allSubjects = await getAllSubjectsWithPosts();

  // Group posts by day date
  const groupedByDate: Record<string, typeof posts> = {};
  for (const post of posts) {
    const date = post.day?.date || 'unknown';
    if (!groupedByDate[date]) groupedByDate[date] = [];
    groupedByDate[date].push(post);
  }

  const sortedDates = Object.keys(groupedByDate).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-nav">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="p-1.5 text-[#3D2C36]/70 hover:text-[#FF4F9A] transition-colors rounded-full
                       hover:bg-white/80 border border-transparent hover:border-[#FFD9E8]"
            aria-label="Back to today"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF4F9A] pulse-pink-glow" />
            <h1 className="font-display text-base font-bold text-[#3D2C36]">
              {decoded}
            </h1>
          </div>

          <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/70 border border-[#FFD9E8] text-[#FF4F9A]">
            {posts.length} {posts.length === 1 ? 'post' : 'posts'}
          </span>
        </div>
      </header>

      {/* Subject navigation strip */}
      <div className="glass-strip">
        <div className="max-w-3xl mx-auto px-4">
          <div className="overflow-x-auto scrollbar-hide py-2.5 flex gap-2">
            {allSubjects.map((s) => (
              <Link
                key={s}
                href={`/subject/${encodeURIComponent(s)}`}
                className={`
                  font-mono text-[11px] font-medium tracking-wider uppercase whitespace-nowrap
                  px-3 py-1 rounded-full border transition-all shadow-2xs
                  ${
                    s === decoded
                      ? 'bg-[#FF4F9A] text-white border-[#FF4F9A] shadow-sm'
                      : 'bg-white/60 text-[#3D2C36]/70 border-[#FFD9E8] hover:bg-[#FF4F9A] hover:text-white hover:border-[#FF4F9A]'
                  }
                `}
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Posts grouped by date */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">
        {sortedDates.length > 0 ? (
          <div className="space-y-8">
            {sortedDates.map((date) => (
              <section key={date}>
                {/* Date header */}
                <div className="flex items-center gap-3 mb-3.5 px-1">
                  <span className="font-mono text-xs font-semibold text-[#FF4F9A] tracking-wider uppercase">
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <div className="flex-1 h-px bg-[#FFD9E8]" />
                  <Link
                    href={`/day/${date}`}
                    className="font-mono text-[11px] font-medium text-[#3D2C36]/50 hover:text-[#FF4F9A] transition-colors"
                  >
                    View day →
                  </Link>
                </div>

                <PostFeed posts={groupedByDate[date]} />
              </section>
            ))}
          </div>
        ) : (
          <PostFeed posts={[]} emptyMessage={`No posts for ${decoded} yet.`} />
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
            ← Back to Today
          </Link>
        </div>
      </footer>
    </div>
  );
}
