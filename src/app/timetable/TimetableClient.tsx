'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  WEEKLY_TIMETABLE,
  DAYS_OF_WEEK,
  getTimetableForDay,
  format12Hour,
  findMatchingOverride,
} from '@/lib/timetable-data';
import type { ScheduleEntry, BatchOption, TimetableEntry } from '@/lib/types';
import { SCHEDULE_STATUS_CONFIG } from '@/lib/constants';

interface TimetableClientProps {
  overrides: ScheduleEntry[];
}

export default function TimetableClient({ overrides }: TimetableClientProps) {
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [batchPref, setBatchPref] = useState<BatchOption>('ALL');
  const [currentDayOfWeek, setCurrentDayOfWeek] = useState<number>(1);

  useEffect(() => {
    const today = new Date().getDay();
    setCurrentDayOfWeek(today);
    // If weekday, select current day by default
    if (today >= 1 && today <= 5) {
      setSelectedDay(today);
    } else {
      setSelectedDay(1); // Default to Monday on weekends
    }

    const savedBatch = localStorage.getItem('eee_pulse_batch') as BatchOption;
    if (savedBatch && ['ALL', 'B1', 'B2'].includes(savedBatch)) {
      setBatchPref(savedBatch);
    }
  }, []);

  const handleBatchChange = (b: BatchOption) => {
    setBatchPref(b);
    localStorage.setItem('eee_pulse_batch', b);
  };

  const weekdays = DAYS_OF_WEEK.filter((d) => d.index >= 1 && d.index <= 5);
  const daySlots = getTimetableForDay(selectedDay, batchPref, WEEKLY_TIMETABLE);

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-nav">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 text-[#3D2C36]/70 hover:text-[#FF4F9A] transition-colors rounded-full
                         hover:bg-white/80 border border-transparent hover:border-[#FFD9E8]"
              aria-label="Back to home"
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
              <span className="text-xl">🗓️</span>
              <div>
                <h1 className="font-display text-base font-bold text-[#3D2C36]">
                  Weekly Timetable
                </h1>
                <p className="font-mono text-[10px] text-[#3D2C36]/55 tracking-wide">
                  Section EX · Room 106 · UIT RGPV
                </p>
              </div>
            </div>
          </div>

          {/* Right: Attendance and Batch Selector */}
          <div className="flex items-center gap-2">
            <Link
              href="/attendance"
              className="glass-btn-primary px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1 shadow-2xs"
            >
              <span>📊</span>
              <span className="hidden sm:inline">Mark Attendance</span>
            </Link>

            {/* Batch Selector */}
            <div className="flex items-center p-1 rounded-2xl bg-white/70 border border-[#FFD9E8] shadow-2xs">
              {(['ALL', 'B1', 'B2'] as BatchOption[]).map((b) => (
                <button
                  key={b}
                  onClick={() => handleBatchChange(b)}
                  className={`
                    px-2.5 sm:px-3 py-1 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer
                    ${
                      batchPref === b
                        ? 'bg-[#FF4F9A] text-white shadow-xs'
                        : 'text-[#3D2C36]/60 hover:text-[#3D2C36]'
                    }
                  `}
                >
                  {b === 'ALL' ? 'All' : `B${b.replace('B', '')}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Weekday Switcher Strip */}
      <div className="glass-strip sticky top-14 z-30">
        <div className="max-w-4xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between gap-1 sm:gap-2">
            {weekdays.map((day) => {
              const isSelected = selectedDay === day.index;
              const isToday = currentDayOfWeek === day.index;

              return (
                <button
                  key={day.index}
                  onClick={() => setSelectedDay(day.index)}
                  className={`
                    flex-1 py-2 px-1 sm:px-3 rounded-2xl font-display text-xs sm:text-sm font-bold
                    transition-all duration-200 cursor-pointer flex flex-col items-center gap-0.5
                    ${
                      isSelected
                        ? 'bg-[#FF4F9A] text-white shadow-[0_4px_16px_rgba(255,79,154,0.3)] scale-[1.02]'
                        : 'bg-white/50 text-[#3D2C36]/75 border border-[#FFD9E8] hover:bg-white/80'
                    }
                  `}
                >
                  <span className="tracking-tight">{day.short}</span>
                  {isToday && (
                    <span
                      className={`
                        text-[9px] font-mono uppercase tracking-wider px-1.5 rounded-full
                        ${isSelected ? 'bg-white/25 text-white' : 'bg-[#FF4F9A]/15 text-[#C2185B] font-bold'}
                      `}
                    >
                      Today
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Slots List */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="font-display text-base font-extrabold text-[#3D2C36] flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF4F9A]" />
            {DAYS_OF_WEEK.find((d) => d.index === selectedDay)?.name} Schedule
          </h2>
          <span className="font-mono text-xs font-semibold text-[#FF4F9A]">
            {daySlots.length} sessions
          </span>
        </div>

        {daySlots.length > 0 ? (
          <div className="space-y-3.5">
            {daySlots.map((slot) => {
              const isToday = currentDayOfWeek === selectedDay;
              const override = isToday ? findMatchingOverride(slot, overrides) : null;
              return (
                <TimetableSlotCard
                  key={slot.id}
                  slot={slot}
                  override={override}
                />
              );
            })}
          </div>
        ) : (
          <div className="glass-card p-12 text-center">
            <p className="font-display font-semibold text-[#3D2C36]/70">
              No sessions scheduled for this day/batch selection.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-4xl w-full mx-auto px-4 py-8 mt-auto">
        <div className="glass-card px-6 py-3 flex items-center justify-center gap-6 text-center">
          <Link
            href="/"
            className="font-display text-xs font-semibold text-[#3D2C36]/70 hover:text-[#FF4F9A] transition-colors tracking-wide uppercase"
          >
            ← Back to Today Feed
          </Link>
          <span className="w-1.5 h-1.5 rounded-full bg-[#FFD9E8]" />
          <Link
            href="/books"
            className="font-display text-xs font-semibold text-[#3D2C36]/70 hover:text-[#FF4F9A] transition-colors tracking-wide uppercase"
          >
            Book Recs 📚
          </Link>
        </div>
      </footer>
    </div>
  );
}

function TimetableSlotCard({
  slot,
  override,
}: {
  slot: TimetableEntry;
  override: ScheduleEntry | null;
}) {
  const isLunch = slot.session_type === 'lunch';
  const isLab = slot.session_type === 'lab';
  const isLibrary = slot.session_type === 'library';

  if (isLunch) {
    return (
      <div className="rounded-2xl p-3.5 bg-amber-50/70 border border-amber-200/80 backdrop-blur-md flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🍱</span>
          <div>
            <span className="font-display text-sm font-bold text-amber-900">
              Lunch Break
            </span>
            <span className="block font-mono text-[11px] text-amber-700/80">
              Recharge & Refresh
            </span>
          </div>
        </div>
        <span className="font-mono text-xs font-bold text-amber-800 px-2.5 py-1 rounded-full bg-amber-100/80">
          {format12Hour(slot.start_time)} – {format12Hour(slot.end_time)}
        </span>
      </div>
    );
  }

  const isOverrideActive = !!override;
  const isCancelledOrBunk =
    override && (override.status === 'cancelled' || override.status === 'mass_bunk');
  const isDelayed = override && override.status === 'delayed';

  return (
    <div
      className={`
        glass-card p-4 sm:p-5 transition-all duration-200
        ${
          isCancelledOrBunk
            ? 'border-rose-300 bg-rose-50/85 shadow-[0_4px_20px_rgba(225,29,72,0.12)]'
            : isDelayed
            ? 'border-amber-300 bg-amber-50/85'
            : 'hover:border-[#FF4F9A]/40'
        }
      `}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Time badge & Subject */}
        <div className="flex items-start gap-3.5">
          {/* Time block */}
          <div className="flex flex-col items-center justify-center px-3 py-2 rounded-2xl bg-white/70 border border-[#FFD9E8] shrink-0 min-w-[5.2rem] shadow-2xs">
            <span className="font-mono text-xs font-bold text-[#FF4F9A]">
              {format12Hour(slot.start_time)}
            </span>
            <span className="font-mono text-[10px] text-[#3D2C36]/50">
              to {format12Hour(slot.end_time)}
            </span>
          </div>

          {/* Subject info */}
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-display text-base font-bold text-[#3D2C36] tracking-tight">
                {slot.subject}
              </h3>

              {/* Session type badge */}
              <span
                className={`
                  font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider
                  ${
                    isLab
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : isLibrary
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-[#FF4F9A]/10 text-[#C2185B] border-[#FF4F9A]/20'
                  }
                `}
              >
                {isLab ? '🔬 Lab' : isLibrary ? '📖 Library' : '📚 Lecture'}
              </span>

              {/* Batch badge */}
              {slot.batch && (
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                  Batch {slot.batch}
                </span>
              )}
            </div>

            {/* Faculty & Room details */}
            <div className="flex items-center gap-3 text-xs text-[#3D2C36]/70 flex-wrap">
              {slot.faculty && (
                <span className="font-medium">
                  👤 {slot.faculty}
                </span>
              )}
              {slot.room && (
                <span className="font-mono text-[11px] font-semibold text-[#3D2C36]/60">
                  📍 {slot.room}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Live Override Badge if active today */}
        {isOverrideActive && (
          <div className="shrink-0 flex sm:flex-col items-end gap-1">
            <span
              className={`
                font-mono text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-xs
                ${
                  override.status === 'mass_bunk'
                    ? 'bg-rose-600 text-white'
                    : override.status === 'cancelled'
                    ? 'bg-rose-500 text-white'
                    : override.status === 'delayed'
                    ? 'bg-amber-500 text-white'
                    : 'bg-emerald-500 text-white'
                }
              `}
            >
              Today: {SCHEDULE_STATUS_CONFIG[override.status].label}
            </span>
            {override.note && (
              <span className="text-xs text-rose-900 font-medium italic">
                &ldquo;{override.note}&rdquo;
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
