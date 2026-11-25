"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let current = 0;

function tick() {
  const next = Math.floor(Date.now() / 1000) * 1000;
  if (next === current) return;
  current = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    current = Math.floor(Date.now() / 1000) * 1000;
    timer = setInterval(tick, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const longFormat = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const shortFormat = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatClock(ms: number, withSeconds = true) {
  if (!ms) return withSeconds ? "--:--:--" : "--:--";
  return (withSeconds ? longFormat : shortFormat).format(new Date(ms));
}

/** 全站共用一个秒级心跳；任务栏和生活流时钟读同一个值。 */
export function useClockSeconds() {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => 0
  );
}
