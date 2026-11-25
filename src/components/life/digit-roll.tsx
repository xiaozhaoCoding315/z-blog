import type { CSSProperties } from "react";

const DIGITS = "0123456789".split("");

/**
 * 数字上翻：每一位是一条 0–9 的竖带，从 0 滚到自己的数字。
 *
 * 纯 CSS：目标位移写进 `--to`，基础样式就是终点，关键帧只写 from。
 * 没有 JS、没有 effect，关脚本时浏览器照样把动画跑完，终点就是读数本身。
 * 读屏读的是外层那份 `sr-only` 静态文本，这条带子是 `aria-hidden` 的。
 */
export function DigitRoll({ text }: { text: string }) {
  return (
    <span aria-hidden className="inline-flex items-start overflow-hidden">
      {[...text].map((ch, index) =>
        /\d/.test(ch) ? (
          <span
            key={`${ch}-${index}`}
            className="inline-block h-[1em] overflow-hidden"
          >
            <span
              className="moment-digit block"
              style={{ "--to": `-${Number(ch) * 10}%` } as CSSProperties}
            >
              {DIGITS.map((d) => (
                <span key={d} className="block h-[1em] leading-none">
                  {d}
                </span>
              ))}
            </span>
          </span>
        ) : (
          <span key={`${ch}-${index}`} className="inline-block">
            {ch}
          </span>
        )
      )}
    </span>
  );
}
