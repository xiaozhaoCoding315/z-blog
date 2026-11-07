import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { rotateForSeed } from "@/lib/life";

const SIZES = { sm: 64, md: 88, lg: 112 } as const;

/**
 * 邮戳。全站只出现在四处：动态的日期、信箱的留言、月份分隔、404。
 * 日期本身另外用 <time> 输出给读屏软件，这里对辅助技术隐藏。
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
    </span>
  );
}
