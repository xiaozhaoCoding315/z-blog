import type { Moment as MomentData } from "@/lib/life";
import { MomentText } from "./moment-text";
import { MomentPhoto } from "./moment-photo";
import { MomentCard } from "./moment-card";

/**
 * 分发顺序：先看 moment.card，有则走卡片；再看 kind === "photo"，是则走图文；其余一律走短记。
 */
export function Moment({ moment }: { moment: MomentData }) {
  if (moment.card) return <MomentCard moment={moment} />;
  if (moment.kind === "photo") return <MomentPhoto moment={moment} />;
  return <MomentText moment={moment} />;
}
