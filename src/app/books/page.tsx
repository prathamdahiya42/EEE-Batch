import PostFeed from '@/components/ui/PostFeed';
import { getBookRecommendations } from '@/lib/queries';
import Link from 'next/link';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Book Recommendations — EEE Batch Pulse',
  description: 'Curated book recommendations from the EEE batch',
};

export default async function BooksPage() {
  const books = await getBookRecommendations();

  // Group by subject
  const groupedBySubject: Record<string, typeof books> = {};
  for (const post of books) {
    const subject = post.subject || 'General';
    if (!groupedBySubject[subject]) groupedBySubject[subject] = [];
    groupedBySubject[subject].push(post);
  }

  const subjects = Object.keys(groupedBySubject).sort();

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
            <span className="text-lg">📚</span>
            <h1 className="font-display text-base font-bold text-[#3D2C36]">
              Book Recommendations
            </h1>
          </div>

          <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/70 border border-[#FFD9E8] text-[#FF4F9A]">
            {books.length} {books.length === 1 ? 'rec' : 'recs'}
          </span>
        </div>
      </header>

      {/* Subject filter strip */}
      {subjects.length > 1 && (
        <div className="glass-strip">
          <div className="max-w-3xl mx-auto px-4">
            <div className="overflow-x-auto scrollbar-hide py-2.5 flex gap-2">
              {subjects.map((s) => (
                <a
                  key={s}
                  href={`#${s.replace(/\s+/g, '-').toLowerCase()}`}
                  className="font-mono text-[11px] font-medium tracking-wider uppercase whitespace-nowrap
                             px-3 py-1 rounded-full bg-white/60 border border-[#FFD9E8] text-[#3D2C36]/70
                             hover:bg-[#FF4F9A] hover:text-white hover:border-[#FF4F9A] transition-all shadow-2xs"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Books grouped by subject */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">
        {subjects.length > 0 ? (
          <div className="space-y-8">
            {subjects.map((subject) => (
              <section
                key={subject}
                id={subject.replace(/\s+/g, '-').toLowerCase()}
                className="scroll-mt-20"
              >
                {/* Subject header */}
                <div className="flex items-center gap-3 mb-3.5 px-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF4F9A] shadow-xs" />
                  <span className="font-display text-sm font-bold text-[#3D2C36] tracking-wide uppercase">
                    {subject}
                  </span>
                  <div className="flex-1 h-px bg-[#FFD9E8]" />
                  <span className="font-mono text-xs font-semibold text-[#FF4F9A]">
                    {groupedBySubject[subject].length}
                  </span>
                </div>

                <PostFeed posts={groupedBySubject[subject]} showDate />
              </section>
            ))}
          </div>
        ) : (
          <PostFeed posts={[]} emptyMessage="No book recommendations yet." />
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
