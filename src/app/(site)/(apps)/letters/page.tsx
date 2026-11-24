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

/**
 * 页面内可用的留言模板。友链交换直接带到这里，
 * 访客不用先理解「留言板 / GitHub / 邮件」三选一。
 */
const TEMPLATES: Record<string, string> = {
  friend: [
    "站点名：",
    "网址：",
    "一句话介绍：",
    "",
    "（可选：头像地址，最多 3 个标签）",
  ].join("\n"),
};

export default async function LettersPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string | string[] }>;
}) {
  await connection();
  const user = await getSessionUser();
  const query = await searchParams;
  const templateKey = Array.isArray(query.template)
    ? query.template[0]
    : query.template;
  const initialBody = (templateKey && TEMPLATES[templateKey]) || "";

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
    <div className="letters-page">
      <header className="letters-head" data-reveal>
        <p className="community-eyebrow">COMMUNITY · 公开可读</p>
        <h1>留言板</h1>
        <p className="letters-lede">
          留一句话，也可以顺手推荐一首歌或交换友链。写下的内容会先给站长看一眼，
          通过后公开；点开一个名字，能看到他在站里留下的所有内容。
        </p>
        {letters.available && (
          <p className="letters-readout">
            {approvedCount} 封 · 已通过
            {pendingCount > 0 && ` · ${pendingCount} 封待审`}
          </p>
        )}
      </header>

      <section
        className="letters-write"
        id="letter-form"
        aria-labelledby="letters-write-title"
        data-reveal
        data-spotlight
      >
        <div className="letters-write-head">
          <h2 id="letters-write-title">写一封</h2>
          <p>一句话就够，不用先想好结构。</p>
        </div>
        {!ready ? (
          <div className="letters-unavailable">
            <p className="community-eyebrow">NOT AVAILABLE</p>
            <p>
              服务器还没配置会话密钥或发信账号，暂时收不了新留言。浏览不受影响。
            </p>
          </div>
        ) : (
          <LetterForm loggedIn={Boolean(user)} initialBody={initialBody} />
        )}
      </section>

      <section
        className="letters-feed"
        aria-labelledby="letters-feed-title"
        data-reveal
      >
        <header className="community-section-head">
          <h2 id="letters-feed-title">最近留言</h2>
          <span>{letters.available ? `${approvedCount} 封` : "暂时读不到"}</span>
        </header>

        {!letters.available ? (
          <p className="community-empty">
            数据库现在连不上。已有的留言没有丢，过一会儿再刷新。
          </p>
        ) : letters.letters.length === 0 ? (
          <p className="community-empty">留言板还空着。第一条可以是你写的。</p>
        ) : (
          <div className="letters-grid">
            {letters.letters.map((letter) => (
              <LetterCard key={letter.id} letter={letter} />
            ))}
          </div>
        )}
      </section>

      <section
        className="letters-exchange"
        aria-labelledby="letters-exchange-title"
        data-reveal
        data-spotlight
      >
        <div>
          <p className="community-eyebrow">FRIENDS · 交换友链</p>
          <h2 id="letters-exchange-title">想把你的站点放进来？</h2>
          <p>
            把站点名、网址和一句话介绍写在下面，站长会先去看看。
            GitHub 也可以，两条路都行。
          </p>
        </div>
        <div className="letters-exchange-actions">
          <Link href="/letters?template=friend#letter-form" className="letters-exchange-primary">
            用模板写一封
          </Link>
          <Link href="/friends" className="letters-exchange-secondary">
            先看看已有友链
          </Link>
        </div>
      </section>

      {/* 次要内容默认折叠：新访客先看到「写」和「读」，不先面对一堆索引。 */}
      <details className="letters-more" data-reveal>
        <summary>
          <span>最近来过的人与评论</span>
          <small>展开</small>
        </summary>
        <div className="letters-more-body">
          {members.available && members.members.length > 0 && (
            <section
              className="community-members"
              aria-labelledby="community-members-title"
            >
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
                      <Link
                        href={href ?? "/letters"}
                        className="community-member"
                        data-spotlight
                      >
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

          <section
            className="community-recent-comments"
            aria-labelledby="community-comments-title"
          >
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
        </div>
      </details>
    </div>
  );
}
