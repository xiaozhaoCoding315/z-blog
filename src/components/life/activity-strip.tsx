import type { GithubActivity } from "@/lib/github-server";

/**
 * 90 天密度格。一格一天，颜色深浅表示当天提交数。
 * 看不看得到数据由 available 决定——没源时整块显示 NOT AVAILABLE，
 * 不画一排空格冒充「那天没做事」；available 为真但零活动是真实读数，照常画格、照常报 0。
 */
export function ActivityStrip({ activity }: { activity: GithubActivity }) {
  if (!activity.available) {
    return (
      <p className="font-mono text-[11px] text-muted-foreground">
        NOT AVAILABLE
      </p>
    );
  }

  return (
    <div>
      <div
        className="flex flex-wrap gap-[3px]"
        role="img"
        aria-label={`近 90 天提交密度，共 ${activity.total90} 次`}
      >
        {activity.days.map((d) => (
          <span
            key={d.date}
            className="size-[7px] rounded-[1px] bg-data"
            style={{ opacity: d.count === 0 ? 0.12 : Math.min(0.3 + d.count * 0.18, 1) }}
          />
        ))}
      </div>
      <p className="mt-2 font-mono text-[11px] tabular-nums text-muted-foreground">
        {activity.total90} 次 / 90 天
      </p>
    </div>
  );
}
