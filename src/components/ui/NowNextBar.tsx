'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  computeLiveSlotState,
  format12Hour,
  WEEKLY_TIMETABLE,
} from '@/lib/timetable-data';
import type { ScheduleEntry, BatchOption, LiveSlotState } from '@/lib/types';
import { SCHEDULE_STATUS_CONFIG } from '@/lib/constants';

interface NowNextBarProps {
  initialOverrides?: ScheduleEntry[];
}

export default function NowNextBar({ initialOverrides = [] }: NowNextBarProps) {
  const [batchPref, setBatchPref] = useState<BatchOption>('ALL');
  const [mounted, setMounted] = useState(false);
  const [liveState, setLiveState] = useState<LiveSlotState>(() =>
    computeLiveSlotState(new Date(), 'ALL', initialOverrides, WEEKLY_TIMETABLE)
  );
  const [overrides] = useState<ScheduleEntry[]>(initialOverrides);

  // Load batch preference from localStorage
  useEffect(() => {
    setMounted(true);
    const savedBatch = localStorage.getItem('eee_pulse_batch') as BatchOption;
    if (savedBatch && ['ALL', 'B1', 'B2'].includes(savedBatch)) {
      setBatchPref(savedBatch);
    }
  }, []);

  const updateState = useCallback(() => {
    const state = computeLiveSlotState(new Date(), batchPref, overrides, WEEKLY_TIMETABLE);
    setLiveState(state);
  }, [batchPref, overrides]);

  // Update batch preference
  const handleBatchChange = (newBatch: BatchOption) => {
    setBatchPref(newBatch);
    localStorage.setItem('eee_pulse_batch', newBatch);
  };

  // Live timer tick every 30 seconds
  useEffect(() => {
    updateState();
    const interval = setInterval(updateState, 30000);
    return () => clearInterval(interval);
  }, [updateState]);

  const { currentSlot, currentOverride, nextSlot, nextOverride, isLive, timeRemainingText, dayName } = liveState;

  // Determine if there is a severe override on current slot
  const isCurrentCancelledOrBunk =
    currentOverride && (currentOverride.status === 'cancelled' || currentOverride.status === 'mass_bunk');
  const isCurrentDelayed = currentOverride && currentOverride.status === 'delayed';

  return (
    <div className="sticky top-0 z-50 w-full transition-all duration-300">
      <div
        className={`
          w-full px-3 py-2.5 backdrop-blur-xl border-b transition-all duration-300 shadow-md
          ${
            isCurrentCancelledOrBunk
              ? 'bg-rose-50/92 border-rose-300 text-rose-950 shadow-[0_4px_24px_rgba(225,29,72,0.18)]'
              : isCurrentDelayed
              ? 'bg-amber-50/92 border-amber-300 text-amber-950 shadow-[0_4px_20px_rgba(245,158,11,0.15)]'
              : isLive
              ? 'bg-white/88 border-[#FFD9E8] text-[#3D2C36] shadow-[0_4px_24px_rgba(255,79,154,0.12)]'
              : 'bg-white/80 border-[#FFD9E8]/80 text-[#3D2C36]'
          }
        `}
      >
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5">
          {/* Main "NOW" Display */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Status indicator badge / dot */}
            <div className="shrink-0 flex items-center">
              {isCurrentCancelledOrBunk ? (
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-mono text-[10px] font-bold tracking-wider uppercase animate-pulse">
                  {currentOverride?.status === 'mass_bunk' ? '🔴 MASS BUNK' : '❌ CANCELLED'}
                </span>
              ) : isCurrentDelayed ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-mono text-[10px] font-bold tracking-wider uppercase">
                  ⚠️ DELAYED
                </span>
              ) : isLive ? (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FF4F9A]/15 border border-[#FF4F9A]/30 text-[#C2185B]">
                  <span className="w-2 h-2 rounded-full bg-[#FF4F9A] pulse-pink-glow shrink-0" />
                  <span className="font-mono text-[10px] font-bold tracking-wider uppercase">
                    LIVE NOW
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[#3D2C36]/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                  <span className="font-mono text-[10px] font-bold tracking-wider uppercase">
                    {dayName}
                  </span>
                </div>
              )}
            </div>

            {/* Current subject details */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display text-sm md:text-base font-extrabold tracking-tight truncate text-[#3D2C36]">
                  {currentSlot ? currentSlot.subject : liveState.statusText}
                </span>

                {currentSlot?.batch && (
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FF4F9A]/10 text-[#C2185B] border border-[#FF4F9A]/20">
                    Batch {currentSlot.batch}
                  </span>
                )}

                {currentSlot?.room && (
                  <span className="font-mono text-[10px] text-[#3D2C36]/60 font-medium hidden sm:inline-block">
                    📍 {currentSlot.room}
                  </span>
                )}

                {timeRemainingText && (
                  <span
                    className={`
                      font-mono text-xs font-bold px-2 py-0.5 rounded-full
                      ${
                        isCurrentCancelledOrBunk
                          ? 'bg-rose-200/80 text-rose-900'
                          : isLive
                          ? 'bg-[#FF4F9A] text-white shadow-xs'
                          : 'bg-white/80 border border-[#FFD9E8] text-[#FF4F9A]'
                      }
                    `}
                  >
                    {timeRemainingText}
                  </span>
                )}
              </div>

              {/* Faculty or override note */}
              <div className="flex items-center gap-2 text-xs text-[#3D2C36]/70 truncate mt-0.5">
                {currentOverride?.note ? (
                  <span className="font-medium text-rose-800 italic">
                    Note: {currentOverride.note}
                  </span>
                ) : currentSlot?.faculty ? (
                  <span className="font-medium truncate">
                    Prof. {currentSlot.faculty}
                  </span>
                ) : null}

                {currentSlot && (
                  <span className="font-mono text-[10px] text-[#3D2C36]/50">
                    ({format12Hour(currentSlot.start_time)} – {format12Hour(currentSlot.end_time)})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right section: "UP NEXT" preview + Batch Selector + Timetable link */}
          <div className="flex items-center justify-between w-full md:w-auto gap-3 shrink-0 pt-1.5 md:pt-0 border-t md:border-t-0 border-[#FFD9E8]/60">
            {/* Up Next Slot preview */}
            {nextSlot && (
              <div className="flex items-center gap-1.5 text-xs bg-white/70 px-2.5 py-1 rounded-xl border border-[#FFD9E8] shadow-2xs max-w-[210px] sm:max-w-none">
                <span className="font-mono text-[10px] font-bold text-[#FF4F9A] uppercase tracking-wider">
                  Next:
                </span>
                <span className="font-display font-semibold truncate text-[#3D2C36] max-w-[110px] sm:max-w-[140px]">
                  {nextSlot.subject}
                </span>
                <span className="font-mono text-[10px] text-[#3D2C36]/60">
                  {format12Hour(nextSlot.start_time)}
                </span>
                {nextOverride && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title={`Override: ${SCHEDULE_STATUS_CONFIG[nextOverride.status].label}`} />
                )}
              </div>
            )}

            {/* Batch Filter Buttons (B1 / B2 / All) */}
            {mounted && (
              <div className="flex items-center p-0.5 rounded-xl bg-white/70 border border-[#FFD9E8] shadow-2xs">
                {(['ALL', 'B1', 'B2'] as BatchOption[]).map((b) => (
                  <button
                    key={b}
                    onClick={() => handleBatchChange(b)}
                    className={`
                      px-2 py-0.5 rounded-lg font-mono text-[10px] font-bold transition-all cursor-pointer
                      ${
                        batchPref === b
                          ? 'bg-[#FF4F9A] text-white shadow-2xs'
                          : 'text-[#3D2C36]/60 hover:text-[#3D2C36]'
                      }
                    `}
                    title={`Filter timetable for ${b === 'ALL' ? 'All Batches' : `Batch ${b}`}`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}

            {/* Link to Full Timetable View */}
            <Link
              href="/timetable"
              className="px-2.5 py-1 rounded-xl bg-white/70 hover:bg-[#FF4F9A] hover:text-white border border-[#FFD9E8]
                         text-[#3D2C36] font-display text-xs font-bold transition-all shadow-2xs flex items-center gap-1 active:scale-95 whitespace-nowrap"
            >
              <span>🗓️</span>
              <span className="hidden sm:inline">Full Timetable</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
