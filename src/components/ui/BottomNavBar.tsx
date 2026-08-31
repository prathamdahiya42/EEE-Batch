'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNavBar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Today', emoji: '⚡' },
    { href: '/timetable', label: 'Timetable', emoji: '🗓️' },
    { href: '/attendance', label: 'Attendance', emoji: '📊' },
    { href: '/chat', label: 'Chat', emoji: '💬' },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-3 inset-x-3 max-w-sm mx-auto z-40 sm:hidden transition-all duration-300"
    >
      <div className="glass-nav rounded-3xl p-1.5 shadow-[0_8px_32px_rgba(255,79,154,0.18)] border border-white/80 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 cursor-pointer
                ${
                  isActive
                    ? 'bg-[#FF4F9A] text-white shadow-xs scale-[1.05]'
                    : 'text-[#3D2C36]/70 hover:text-[#3D2C36] active:scale-95'
                }
              `}
            >
              <span className="text-base leading-tight">{item.emoji}</span>
              <span className="font-display text-[10px] font-bold tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
