import Link from 'next/link';
import { BATCH_NAME, formatDateMonospace, getRelativeDayLabel } from '@/lib/constants';

interface TopBarProps {
  currentDate: string;
  prevDate?: string | null;
  nextDate?: string | null;
}

export default function TopBar({ currentDate, prevDate, nextDate }: TopBarProps) {
  const relativeLabel = getRelativeDayLabel(currentDate);
  const monoDate = formatDateMonospace(currentDate);

  return (
    <header className="sticky top-0 z-40 glass-nav">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: Brand / Batch Name */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group transition-transform active:scale-95"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF4F9A] pulse-pink-glow shrink-0" />
          <h1 className="font-display text-base font-bold text-[#3D2C36] tracking-tight group-hover:text-[#FF4F9A] transition-colors">
            {BATCH_NAME}
          </h1>
        </Link>

        {/* Center: Date Readout with Glass Navigation */}
        <div className="flex items-center gap-1.5 text-center">
          {prevDate ? (
            <Link
              href={`/day/${prevDate}`}
              className="p-1.5 text-[#3D2C36]/70 hover:text-[#FF4F9A] transition-all rounded-full
                         hover:bg-white/80 active:scale-90 border border-transparent hover:border-[#FFD9E8]"
              aria-label="Previous day"
            >
              <svg
                width="16"
                height="16"
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
          ) : (
            <span className="p-1.5 w-7" />
          )}

          <div className="flex flex-col items-center px-3 py-1 rounded-2xl bg-white/40 border border-white/60 shadow-xs min-w-[7.2rem]">
            <span className="font-display text-xs font-semibold text-[#FF4F9A]">
              {relativeLabel}
            </span>
            <span className="font-mono text-[10px] text-[#3D2C36]/70 font-medium tracking-wider">
              {monoDate}
            </span>
          </div>

          {nextDate ? (
            <Link
              href={`/day/${nextDate}`}
              className="p-1.5 text-[#3D2C36]/70 hover:text-[#FF4F9A] transition-all rounded-full
                         hover:bg-white/80 active:scale-90 border border-transparent hover:border-[#FFD9E8]"
              aria-label="Next day"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          ) : (
            <span className="p-1.5 w-7" />
          )}
        </div>

        {/* Right: Nav Links */}
        <nav className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/chat"
            className="font-display text-xs font-semibold text-[#FF4F9A] hover:text-white
                       px-3 py-1.5 rounded-full bg-[#FF4F9A]/10 hover:bg-[#FF4F9A] border border-[#FF4F9A]/30
                       hover:border-[#FF4F9A] shadow-xs transition-all active:scale-95 flex items-center gap-1"
          >
            <span>💬</span>
            <span>Chat</span>
          </Link>

          <Link
            href="/timetable"
            className="font-display text-xs font-medium text-[#3D2C36]/80 hover:text-[#FF4F9A]
                       px-3 py-1.5 rounded-full bg-white/50 hover:bg-white/80 border border-white/80
                       hover:border-[#FFD9E8] shadow-xs transition-all active:scale-95 hidden sm:inline-flex items-center gap-1"
          >
            <span>🗓️</span>
            <span>Timetable</span>
          </Link>

          <Link
            href="/books"
            className="font-display text-xs font-medium text-[#3D2C36]/80 hover:text-[#FF4F9A]
                       px-3 py-1.5 rounded-full bg-white/50 hover:bg-white/80 border border-white/80
                       hover:border-[#FFD9E8] shadow-xs transition-all active:scale-95"
          >
            Books 📚
          </Link>
        </nav>
      </div>
    </header>
  );
}
