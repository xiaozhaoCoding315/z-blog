/**
 * 还没做出来的页面。说清它将来是什么、什么时候有，
 * 比一个 404 诚实，也比「敬请期待」有用。
 */
export function NotYetOpen({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <div className="border border-rule bg-panel p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-wait">
        Not Available
      </p>
      <h2 className="mt-3 font-heading text-[19px] font-bold">{title}</h2>
      <p className="mt-2 max-w-[38rem] text-[14px] leading-relaxed text-muted-foreground">
        {description}
      </p>
      <p className="mt-4 font-mono text-[11px] text-muted-foreground">
        {phase}
      </p>
    </div>
  );
}
