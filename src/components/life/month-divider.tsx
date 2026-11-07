/**
 * 月份分隔：粘在顶部，滚动时一直告诉你现在是几月。
 * 背景必须是不透明的纸色，否则下面的内容会透上来。
 */
export function MonthDivider({ label }: { label: string }) {
  return (
    <div className="sticky top-0 z-10 -mx-4 mb-8 flex items-baseline gap-3 bg-background px-4 py-2 sm:-mx-6 sm:px-6">
      <h2 className="font-heading text-[20px] font-bold tracking-tight">
        {label}
      </h2>
      <span aria-hidden className="h-px flex-1 bg-rule" />
    </div>
  );
}
