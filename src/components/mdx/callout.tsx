import { Info, Lightbulb, TriangleAlert, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/utils";

type CalloutType = "info" | "tip" | "warning" | "danger";

const styles: Record<
  CalloutType,
  { icon: typeof Info; className: string; label: string }
> = {
  info: {
    icon: Info,
    label: "信息",
    className:
      "border-l-primary/70 bg-primary/[0.06] [--callout-fg:var(--primary)]",
  },
  tip: {
    icon: Lightbulb,
    label: "提示",
    className:
      "border-l-ok/70 bg-ok/[0.06] [--callout-fg:var(--ok)]",
  },
  warning: {
    icon: TriangleAlert,
    label: "注意",
    className:
      "border-l-warn/70 bg-warn/[0.06] [--callout-fg:var(--warn)]",
  },
  danger: {
    icon: OctagonAlert,
    label: "危险",
    className:
      "border-l-danger/70 bg-danger/[0.06] [--callout-fg:var(--danger)]",
  },
};

export function Callout({
  type = "info",
  title,
  children,
}: {
  type?: CalloutType;
  title?: string;
  children: React.ReactNode;
}) {
  const { icon: Icon, className, label } = styles[type] ?? styles.info;
  return (
    <aside
      className={cn(
        "my-6 rounded-r-lg border border-l-4 px-4 py-3 text-sm [&>p]:my-1",
        className
      )}
    >
      <div
        className="mb-1 flex items-center gap-2 font-medium"
        style={{ color: "var(--callout-fg)" }}
      >
        <Icon className="size-4" />
        <span>{title ?? label}</span>
      </div>
      <div className="text-muted-foreground [&_a]:text-foreground/90">
        {children}
      </div>
    </aside>
  );
}
