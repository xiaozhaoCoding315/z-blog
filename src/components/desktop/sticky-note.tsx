import Link from "next/link";
import { formatDay, momentText, type Moment } from "@/lib/life";

/**
 * 桌面便签：站长在后台钉选的一条动态。
 *
 * 只是入口，不是完整条目——日期 + 最多五行正文 + 打开链接。
 * 没有关闭按钮：取消钉选在后台完成，桌面上的纸头不承担设置功能。
 */
export function StickyNote({ moment }: { moment: Moment }) {
  return (
    <aside aria-label="桌面便签" className="os-sticky-note-card">
      <span aria-hidden className="os-sticky-note-pin" />
      <time className="os-sticky-note-date" dateTime={moment.publishedAt}>
        {formatDay(moment.publishedAt)}
      </time>
      <p className="os-sticky-note-body">{momentText(moment)}</p>
      <Link href={`/life/${moment.id}`} className="os-sticky-note-open">
        <span>打开</span>
        <span aria-hidden>→</span>
      </Link>
    </aside>
  );
}
