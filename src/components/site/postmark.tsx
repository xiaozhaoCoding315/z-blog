import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { rotateForSeed } from "@/lib/life";

const SIZES = { sm: 64, md: 88, lg: 112 } as const;

/**
 * 邮戳。全站只出现在三处：动态的日期、信箱的留言、404。
 * 日期本身另外用 <time> 输出给读屏软件，这里对辅助技术隐藏。
 * 64px 的小章只放日期和地点；缩写字 ZXY 刻在中大号上，小章塞不下第三行。
 */
export function Postmark({
  date,
  label,
  size = "md",
  rotate,
  className,
}: {
  date: string;
  label: string;
  size?: keyof typeof SIZES;
  rotate?: number;
  className?: string;
}) {
  const deg = rotate ?? rotateForSeed(`${date}${label}`);
  return (
    <span
      aria-hidden
      className={cn("postmark", className)}
      style={
        {
          "--pm-size": `${SIZES[size]}px`,
          "--pm-rotate": `${deg}deg`,
        } as CSSProperties
      }
    >
      <span className="postmark-date">{date}</span>
      <span className="postmark-label">{label}</span>
      {size !== "sm" && <span className="postmark-monogram">ZXY</span>}
    </span>
  );
}
