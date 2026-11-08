"use client";

import { formatClock, useClockSeconds } from "./clock-store";

export function Clock({
  withSeconds = true,
  className,
}: {
  withSeconds?: boolean;
  className?: string;
}) {
  const ms = useClockSeconds();
  return (
    <time
      className={className}
      dateTime={ms ? new Date(ms).toISOString() : undefined}
      suppressHydrationWarning
    >
      {formatClock(ms, withSeconds)}
    </time>
  );
}
