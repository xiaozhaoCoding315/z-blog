import type { CommentView } from "@/lib/comments-server";

/**
 * 评论列表：服务端组件。
 *
 * available === false 表示读层连不上库，显示 NOT AVAILABLE，
 * 不能拿「还没有评论」冒充——那会把故障说成常态。
 */
export function CommentList({
  comments,
  available,
}: {
  comments: CommentView[];
  available: boolean;
}) {
  if (!available) {
    return (
      <div className="border border-rule bg-panel p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-wait">
          Not Available
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          评论暂时读不到。数据库现在连不上，过一会儿再刷新。
        </p>
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <p className="border-y border-rule py-8 text-[14px] leading-relaxed text-muted-foreground">
        还没有评论
      </p>
    );
  }

  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {comments.map((comment) => (
        <li key={comment.id} className="py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="font-mono text-[11px]">{comment.author}</span>
            <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
              {comment.date}
            </span>
          </div>
          <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed">
            {comment.body}
          </p>
        </li>
      ))}
    </ul>
  );
}
