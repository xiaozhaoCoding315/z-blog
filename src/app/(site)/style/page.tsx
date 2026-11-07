import { notFound } from "next/navigation";
import { Postmark } from "@/components/site/postmark";

/**
 * 样式走廊：只在开发环境存在，生产构建时直接 404。
 * 组件做完就在这里看一眼，不必等首页拼好。
 */
export default function StylePage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-heading text-2xl font-bold">样式走廊</h1>

      <section className="mt-10">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          邮戳
        </h2>
        <div className="mt-6 flex flex-wrap items-center gap-8">
          <Postmark date="11.03" label="南京西路" size="sm" />
          <Postmark date="11.03" label="南京西路" />
          <Postmark date="十一月" label="二〇二六" size="lg" />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          信笺与齿孔
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="paper-sheet p-5">
            <p className="text-sm leading-relaxed">
              一张信笺：2px 圆角，1px 格线，纸色比页面底浅一档。
            </p>
          </div>
          <div className="perforated flex aspect-[4/3] items-center justify-center bg-secondary">
            <span className="font-mono text-[11px] text-muted-foreground">
              照片
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
