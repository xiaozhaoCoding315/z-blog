import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getSessionUser } from "@/lib/session";
import { loginReady } from "@/lib/login-status";
import { getLettersForViewer } from "@/lib/letters-server";
import { getRecentComments } from "@/lib/comments-server";
import { getRecentMembers } from "@/lib/profile-server";
import { profileDisplayName, profileHref } from "@/lib/profile-core";
import { LetterCard } from "@/components/letters/letter-card";
import { LetterForm } from "@/components/letters/letter-form";
import { UserAvatar } from "@/components/site/user-avatar";

export const metadata: Metadata = { title: "留言板" };

// 读会话与数据库，每次请求现算
export const instant = false;

export default async function LettersPage() {
  await connection();
  const user = await getSessionUser();
  const [letters, members, recentComments] = await Promise.all([
    getLettersForViewer(user?.id ?? null),
    getRecentMembers(),
    getRecentComments(),
  ]);
  const ready = loginReady();

  // 读数只数已通过的；自己的待审另报，不能混进「已通过」
  const approvedCount = letters.letters.filter((letter) => !letter.pending).length;
  const pendingCount = letters.letters.filter((letter) => letter.pending).length;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <header>
        <p className="community-eyebrow">COMMUNITY · 公开可读</p>
        <h1 className="font-heading text-3xl font-bold">留言板</h1>
        <p className="mt-2 max-w-[42rem] text-[14px] leading-relaxed text-muted-foreground">
          这里的留言、评论和推荐都公开可见。点开一个名字，会看到他在站里留下的所有内容。
        </p>
        {letters.available && (
          <p className="mt-2 font-mono text-[11px] tabular-nums text-muted-foreground">
            {approvedCount} 封 · 已通过
            {pendingCount > 0 && ` · ${pendingCount} 封待审`}
          </p>
        )}
      </header>

      {members.available && members.members.length > 0 && (
        <section className="community-members" aria-labelledby="community-members-title">
          <header className="community-section-head">
            <h2 id="community-members-title">最近来过的人</h2>
            <span>{members.members.length} 位 · 点名字看主页</span>
          </header>
          <ul>
            {members.members.map((member) => {
              const href = profileHref(member.id);
              const name = profileDisplayName(member.displayName, member.login);
              return (
                <li key={member.id}>
                  <Link href={href ?? "/letters"} className="community-member">
                    <UserAvatar
                      name={name}
                      avatarUrl={member.avatarUrl}
                      size="md"
                    />
                    <span className="community-member-copy">
                      <span className="community-member-name">
                        {name}
                        {member.role === "owner" && <em>站长</em>}
                      </span>
                      <span className="community-member-bio">
                        {member.bio || `@${member.login}`}
                      </span>
                    </span>
                    <span aria-hidden="true">↗</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {!letters.available ? (
        <div className="mt-8 border border-rule bg-panel p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-wait">
            Not Available
          </p>
          <h2 className="mt-3 font-heading text-[19px] font-bold">留言板暂时读不到</h2>
          <p className="mt-2 max-w-[38rem] text-[14px] leading-relaxed text-muted-foreground">
            数据库现在连不上。已有的留言没有丢，过一会儿再刷新。
          </p>
        </div>
      ) : letters.letters.length === 0 ? (
        <p className="mt-8 border-y border-rule py-8 text-[14px] leading-relaxed text-muted-foreground">
          留言板还空着。第一条可以是你写的。
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {letters.letters.map((letter) => (
            <LetterCard key={letter.id} letter={letter} />
          ))}
        </div>
      )}

      <section className="community-recent-comments" aria-labelledby="community-comments-title">
        <header className="community-section-head">
          <h2 id="community-comments-title">最近的评论</h2>
          <Link href="/notes">去笔记里聊 ↗</Link>
        </header>
        {!recentComments.available ? (
          <p className="community-empty">评论暂时读不到。</p>
        ) : recentComments.comments.length === 0 ? (
          <p className="community-empty">
            笔记和动态下面还没有评论。登录后可以在任意一篇下留下第一句。
          </p>
        ) : (
          <ul className="community-comment-list">
            {recentComments.comments.map((comment) => {
              const href = profileHref(comment.authorId);
              return (
                <li key={comment.id}>
                  <div className="community-comment-head">
                    {href ? (
                      <Link href={href} className="comment-author">
                        <UserAvatar
                          name={comment.author}
                          avatarUrl={comment.avatarUrl}
                          size="sm"
                        />
                        <span>{comment.author}</span>
                      </Link>
                    ) : (
                      <span className="comment-author">
                        <UserAvatar
                          name={comment.author}
                          avatarUrl={comment.avatarUrl}
                          size="sm"
                        />
                        <span>{comment.author}</span>
                      </span>
                    )}
                    <time>{comment.date}</time>
                    <Link href={comment.href} className="community-comment-target">
                      {comment.targetTitle} ↗
                    </Link>
                  </div>
                  <p>{comment.body}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

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
