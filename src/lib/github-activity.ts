export interface GithubEvent {
  type: string;
  created_at: string;
  payload?: { size?: unknown };
}

/**
 * 把事件序列按天聚合为提交数：只数 PushEvent，一条推送算 payload.size 次提交。
 *
 * 其余事件（IssuesEvent、WatchEvent、CreateEvent……）不是提交，计 0。
 * payload.size 缺失或不是有效数字时按 1 计——一条推送至少是一次推送，
 * 0 会把真实活动抹掉，所以下限是 1 而不是 0。
 */
export function countCommitsByDay(events: GithubEvent[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (event.type !== "PushEvent") continue;
    const day = event.created_at.slice(0, 10);
    const size = event.payload?.size;
    const commits =
      typeof size === "number" && Number.isFinite(size) && size >= 1 ? size : 1;
    counts.set(day, (counts.get(day) ?? 0) + commits);
  }
  return counts;
}
