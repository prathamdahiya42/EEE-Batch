'use client';

import type { ScheduleStatus } from '@/lib/types';
import { SCHEDULE_STATUS_CONFIG } from '@/lib/constants';

interface StatusLEDProps {
  status: ScheduleStatus;
  size?: 'sm' | 'md' | 'lg';
}

export default function StatusLED({ status, size = 'md' }: StatusLEDProps) {
  const config = SCHEDULE_STATUS_CONFIG[status];

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3.5 h-3.5',
  };

  return (
    <span
      className={`
        inline-block rounded-full shrink-0
        ${sizeClasses[size]}
        ${config.color}
        ${config.ledClass}
      `}
      role="status"
      aria-label={config.label}
    />
  );
}
