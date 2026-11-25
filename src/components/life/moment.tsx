import type { Moment as MomentData, MomentKind } from "@/lib/life";
import { MomentText } from "./moment-text";
import { MomentPhoto } from "./moment-photo";
import { MomentCard } from "./moment-card";

/**
 * 脊线上那个节点的颜色：它表示内容类型，不表示情绪。
 * 短记最轻，所以是无彩度的；其余按语义色分配，全站唯一一处用颜色分类。
 */
export const NODE_CLASS: Record<MomentKind, string> = {
  text: "bg-muted-foreground",
  photo: "bg-data",
  song: "bg-ok",
  shelf: "bg-wait",
  quote: "bg-data",
  link: "bg-data",
};

/**
 * 分发顺序：先看 moment.card，有则走卡片；再看 kind === "photo"，是则走图文；其余一律走短记。
 */
export function Moment({
  moment,
  linked = true,
}: {
  moment: MomentData;
  linked?: boolean;
}) {
  if (moment.card) return <MomentCard moment={moment} linked={linked} />;
  if (moment.kind === "photo") {
    return <MomentPhoto moment={moment} linked={linked} />;
  }
  return <MomentText moment={moment} linked={linked} />;
}
