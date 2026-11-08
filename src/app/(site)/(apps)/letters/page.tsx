import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getSessionUser } from "@/lib/session";
import { loginReady } from "@/lib/login-status";
import { getLettersForViewer } from "@/lib/letters-server";
import { LetterCard } from "@/components/letters/letter-card";
import { LetterForm } from "@/components/letters/letter-form";

export const metadata: Metadata = { title: "信箱" };

// 读会话与数据库，每次请求现算
export const instant = false;

export default async function LettersPage() {
  await connection();
  const user = await getSessionUser();
  const letters = await getLettersForViewer(user?.id ?? null);
  const ready = loginReady();

  // 读数只数已通过的；自己的待审另报，不能混进「已通过」
  const approvedCount = letters.letters.filter((letter) => !letter.pending).length;
  const pendingCount = letters.letters.filter((letter) => letter.pending).length;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <header>
        <h1 className="font-heading text-3xl font-bold">信箱</h1>
        {letters.available && (
          <p className="mt-2 font-mono text-[11px] tabular-nums text-muted-foreground">
            {approvedCount} 封 · 已通过
            {pendingCount > 0 && ` · ${pendingCount} 封待审`}
          </p>
        )}
      </header>

      {!letters.available ? (
        <div className="mt-8 border border-rule bg-panel p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-wait">
            Not Available
          </p>
          <h2 className="mt-3 font-heading text-[19px] font-bold">信箱暂时读不到</h2>
          <p className="mt-2 max-w-[38rem] text-[14px] leading-relaxed text-muted-foreground">
            数据库现在连不上。已有的留言没有丢，过一会儿再刷新。
          </p>
        </div>
      ) : letters.letters.length === 0 ? (
        <p className="mt-8 border-y border-rule py-8 text-[14px] leading-relaxed text-muted-foreground">
          信箱还空着。第一封可以是你写的。
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {letters.letters.map((letter) => (
            <LetterCard key={letter.id} letter={letter} />
          ))}
        </div>
      )}

      <section className="mt-12 border-t border-rule pt-8">
        <h2 className="font-heading text-[19px] font-bold">写一封</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          写一句话，可以顺手推荐一首歌。登录后提交，站长看过了才会挂出来。
        </p>
        <div className="mt-6">
          {user ? (
            <LetterForm />
          ) : ready ? (
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="border border-data px-3 py-1.5 font-mono text-[11px] text-data transition-colors hover:text-foreground"
              >
                去登录
              </Link>
              <span className="font-mono text-[10px] text-muted-foreground">
                投递需要登录；提交后待审
              </span>
            </div>
          ) : (
            <div className="border border-rule bg-panel p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-wait">
                Not Available
              </p>
              <h3 className="mt-3 font-heading text-[19px] font-bold">
                登录暂未开放
              </h3>
              <p className="mt-2 max-w-[38rem] text-[14px] leading-relaxed text-muted-foreground">
                服务器还没配置会话密钥（AUTH_SECRET / SYNC_SECRET）或发信账号（SMTP_USER / SMTP_PASS），暂时收不了新留言。浏览不受影响。
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
