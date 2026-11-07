"use client";

import { useSyncExternalStore } from "react";

const fmt = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function subscribe(onTick: () => void) {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}

/**
 * 全站唯一走秒的地方。
 *
 * 服务端快照给 --:--:-- 而不是编一个时间：没有 JS 时它诚实地表示「这里本该有个钟」。
 * 用 useSyncExternalStore 而不是 effect 里 setState，避免水合不匹配与多渲染一次。
 */
export function LocalClock() {
  const text = useSyncExternalStore(
    subscribe,
    () => fmt.format(new Date()),
    () => "--:--:--"
  );

  return (
    <span
      className="font-mono text-[22px] leading-none tabular-nums text-data sm:text-[26px]"
      suppressHydrationWarning
    >
      {text}
    </span>
  );
}
