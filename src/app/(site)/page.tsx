import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { siteConfig } from "@/config/site";
import { getAllPosts, getTags } from "@/content";
import { PostCard, toCardData } from "@/components/blog/post-card";
import { TypeRotate } from "@/components/home/type-rotate";
import { OpenChatButton } from "@/components/chat/open-chat-button";
import { UpTimeDays } from "@/components/site/runtime-info";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";


const stack = [
  "Next.js 16",
  "React 19",
  "TailwindCSS v4",
  "TypeScript",
  "PostgreSQL",
  "pgvector",
  "Vercel AI SDK",
  "GLM-4",
  "Docker",
  "Drizzle ORM",
];

export default function HomePage() {
  const posts = getAllPosts();
  const tags = getTags();
  const pinned = posts.filter((p) => p.meta.pinned).slice(0, 2);
  const latest = posts
    .filter((p) => !p.meta.pinned)
    .slice(0, 4);

  return (
    <div className="w-full">
      {/* ============ Hero ============ */}
      <section className="bg-noise relative overflow-hidden">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black,transparent)]" />
        <div className="glow-orb animate-float-slow left-[-10%] top-[-15%] size-[480px]" style={{ background: "var(--glow-1)" }} />
        <div
          className="glow-orb animate-float-slow right-[-8%] top-[20%] size-[380px]"
          style={{ background: "var(--glow-2)", animationDelay: "-7s" }}
        />

        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 pb-20 pt-24 text-center sm:px-6 sm:pt-32">
          <span className="glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            热爱编程 · 乐于折腾 · 持续构建
          </span>

          <h1 className="max-w-3xl font-heading text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl">
            你好，我是 {siteConfig.author.name}
            <br />
            一个 <TypeRotate words={["热爱编程的程序员", "喜欢造轮子的工程师", "把想法写进代码的人", "边踩坑边记录的人"]} />
          </h1>

          <p className="mt-6 max-w-xl text-balance leading-relaxed text-muted-foreground sm:text-lg">
            {siteConfig.author.bio}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-full px-6">
              <Link href="/blog">
                浏览博客 <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full px-6"
            >
              <Link href="/about">了解我</Link>
            </Button>
            <OpenChatButton />
          </div>

          {/* 站点统计 */}
          <dl className="mt-14 grid w-full max-w-2xl grid-cols-3 divide-x divide-border/60 rounded-2xl border border-border/60 bg-card/40 backdrop-blur">
            {[
              { label: "文章", value: posts.length },
              { label: "标签", value: tags.length },
              { label: "运行天数", value: <UpTimeDays /> },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-1 py-5">
                <dd className="font-heading text-3xl font-extrabold tracking-tight">
                  {item.value}
                </dd>
                <dt className="text-xs text-muted-foreground">{item.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ============ 精选 ============ */}
      {pinned.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
          <SectionHeading title="精选文章" hint="值得从这开始" />
          <div className="grid gap-4 sm:grid-cols-2">
            {pinned.map((post) => (
              <PostCard key={post.slug} post={toCardData(post)} variant="featured" />
            ))}
          </div>
        </section>
      )}

      {/* ============ 最新文章 ============ */}
      <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <SectionHeading title="最新文章" hint="刚出炉的" href="/blog" />
        <div className="grid gap-4 sm:grid-cols-2">
          {latest.map((post) => (
            <PostCard key={post.slug} post={toCardData(post)} />
          ))}
        </div>
      </section>

      {/* ============ 技术栈 ============ */}
      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <Card className="glass overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">本站由这些技术驱动</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stack.map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-border/70 bg-secondary/50 px-3 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {tech}
                </span>
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              这个站点是我一行一行亲手搭起来的：写样式、写服务端、自己折腾部署，它跟着我的学习曲线一起迭代。
              右下角的 AI 助手读过站里的每一篇文章，有任何问题可以直接问它。
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function SectionHeading({
  title,
  hint,
  href,
}: {
  title: string;
  hint?: string;
  href?: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between">
      <div>
        <h2 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
          {title}
        </h2>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          查看全部 <ArrowRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}
