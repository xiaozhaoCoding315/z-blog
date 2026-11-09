/**
 * 脊线上的月份刻度：宋体标题 + 条数 + 一条横线。
 * 粘在顶部，滚动时一直告诉你现在是几月。
 */
export function MonthTick({ label, count }: { label: string; count: number }) {
  return (
    <div className="sticky top-0 z-10 -ml-6 flex items-baseline gap-3 bg-background py-2 sm:-ml-8">
      <h2 className="font-heading text-[19px] font-bold tracking-tight">
        {label}
      </h2>
      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
        {count} 条
      </span>
      <span aria-hidden className="h-px flex-1 bg-rule" />
    </div>
  );
}
