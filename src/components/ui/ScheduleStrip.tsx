import type { ScheduleEntry } from '@/lib/types';
import { SCHEDULE_STATUS_CONFIG } from '@/lib/constants';

interface ScheduleStripProps {
  entries: ScheduleEntry[];
}

export default function ScheduleStrip({ entries }: ScheduleStripProps) {
  if (entries.length === 0) {
    return (
      <div className="w-full glass-strip py-3 px-4">
        <p className="font-mono text-xs text-[#3D2C36]/50 text-center tracking-wider uppercase font-medium">
          No schedule data for this day
        </p>
      </div>
    );
  }

  return (
    <div className="w-full glass-strip">
      <div className="max-w-3xl mx-auto px-4 py-2.5 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2.5 min-w-max py-1">
          {entries.map((entry) => {
            const config = SCHEDULE_STATUS_CONFIG[entry.status];
            return (
              <div
                key={entry.id}
                className={`
                  flex items-center gap-2.5 px-3.5 py-2 rounded-2xl
                  backdrop-blur-md border transition-all duration-200
                  hover:scale-[1.02]
                  ${config.chipClass}
                `}
              >
                {/* Glowing status indicator dot */}
                <span
                  className={`
                    w-2 h-2 rounded-full shrink-0
                    ${config.color}
                    ${config.ledClass}
                  `}
                />

                {/* Subject & time */}
                <div className="flex flex-col">
                  <span className="font-display text-xs font-bold tracking-tight text-[#3D2C36]">
                    {entry.subject}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {entry.scheduled_time && (
                      <span className="font-mono text-[10px] text-[#3D2C36]/65 font-medium">
                        {entry.scheduled_time}
                      </span>
                    )}
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider">
                      · {config.label}
                    </span>
                  </div>
                </div>

                {/* Optional note tooltip / small icon */}
                {entry.note && (
                  <span
                    className="text-[11px] ml-0.5 opacity-70"
                    title={entry.note}
                  >
                    💬
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
