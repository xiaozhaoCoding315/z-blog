import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getSessionUser } from "@/lib/session";
import {
  getProfileActivity,
  getPublicProfile,
  type PublicProfile,
} from "@/lib/profile-server";
import { UserAvatar } from "@/components/site/user-avatar";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isSafeInteger(numeric) || numeric <= 0) {
    return { title: "个人主页", robots: { index: false, follow: false } };
  }
  const { profile } = await getPublicProfile(numeric);
  if (!profile) {
    return { title: "个人主页", robots: { index: false, follow: false } };
  }
  return {
    title: `${profile.displayName} 的主页`,
    description:
      profile.bio ||
      `${profile.displayName} 在站内的留言、评论与歌单推荐。`,
  };
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isSafeInteger(numeric) || numeric <= 0) notFound();

  const [viewer, profileResult, activity] = await Promise.all([
    getSessionUser(),
    getPublicProfile(numeric),
    getProfileActivity(numeric),
  ]);

  if (!profileResult.available) {
    return (
      <div className="profile-page">
        <div className="profile-gate">
          <p className="profile-eyebrow">NOT AVAILABLE</p>
          <h1>主页暂时读不到</h1>
          <p>数据库现在连不上。过一会儿再刷新，这个人的资料并没有丢。</p>
        </div>
      </div>
    );
  }
  if (!profileResult.profile) notFound();
  const profile = profileResult.profile;
  const isSelf = viewer?.id === profile.id;

  return (
    <div className="profile-page profile-public">
      <ProfileHero profile={profile} isSelf={isSelf} activity={activity} />

      <div className="profile-public-body">
        <section aria-labelledby="profile-comments-title">
          <header className="profile-section-head">
            <h2 id="profile-comments-title">评论</h2>
            <span>{activity.comments.length} 条</span>
          </header>
          {!activity.available ? (
            <NotAvailable what="评论" />
          ) : activity.comments.length === 0 ? (
            <p className="profile-empty">还没有留下评论。</p>
          ) : (
            <ul className="profile-activity">
              {activity.comments.map((comment) => (
                <li key={comment.id}>
                  <div className="profile-activity-meta">
                    <time>{comment.date}</time>
                    <Link href={comment.href}>{comment.targetTitle} ↗</Link>
                  </div>
                  <p>{comment.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="profile-letters-title">
          <header className="profile-section-head">
            <h2 id="profile-letters-title">留言</h2>
            <span>{activity.letters.length} 封</span>
          </header>
          {!activity.available ? (
            <NotAvailable what="留言" />
          ) : activity.letters.length === 0 ? (
            <p className="profile-empty">还没有公开留言。</p>
          ) : (
            <ul className="profile-activity">
              {activity.letters.map((letter) => (
                <li key={letter.id}>
                  <div className="profile-activity-meta">
                    <time>{letter.date}</time>
                    <Link href="/letters">留言板 ↗</Link>
                  </div>
                  <p>{letter.body}</p>
                  {letter.songTitle && (
                    <p className="profile-activity-song">
                      ♪ {letter.songTitle}
                      {letter.songArtist ? ` — ${letter.songArtist}` : ""}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="profile-songs-title">
          <header className="profile-section-head">
            <h2 id="profile-songs-title">推荐过的歌</h2>
            <span>{activity.recommendations.length} 首</span>
          </header>
          {!activity.available ? (
            <NotAvailable what="推荐" />
          ) : activity.recommendations.length === 0 ? (
            <p className="profile-empty">还没有公开推荐。</p>
          ) : (
            <ul className="profile-activity">
              {activity.recommendations.map((song) => (
                <li key={song.id}>
                  <div className="profile-activity-meta">
                    <time>{song.date}</time>
                    <Link href="/playlist">歌单 ↗</Link>
                  </div>
                  <p className="profile-activity-song-title">
                    {song.title}
                    <span> — {song.artist}</span>
                  </p>
                  {song.note && <p>{song.note}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function ProfileHero({
  profile,
  isSelf,
  activity,
}: {
  profile: PublicProfile;
  isSelf: boolean;
  activity: Awaited<ReturnType<typeof getProfileActivity>>;
}) {
  const meta = [
    profile.location,
    profile.gender === "male"
      ? "男"
      : profile.gender === "female"
        ? "女"
        : profile.gender === "other"
          ? "其他"
          : "",
    profile.birthday ? `生日 ${profile.birthday}` : "",
    `加入于 ${profile.joined}`,
  ].filter(Boolean);

  return (
    <section className="profile-public-hero">
      <div className="profile-public-identity">
        <UserAvatar
          name={profile.displayName}
          avatarUrl={profile.avatarUrl}
          size="lg"
        />
        <div>
          <p className="profile-eyebrow">
            {profile.role === "owner" ? "OWNER · 站长" : "MEMBER · 站内成员"}
          </p>
          <h1>{profile.displayName}</h1>
          <p className="profile-public-login">@{profile.login}</p>
        </div>
        {isSelf && (
          <Link href="/profile" className="profile-public-edit">
            编辑资料
          </Link>
        )}
      </div>

      {profile.bio && <p className="profile-public-bio">{profile.bio}</p>}

      <div className="profile-public-meta">
        {meta.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      {(profile.website || profile.githubUrl) && (
        <div className="profile-public-links">
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noreferrer noopener"
            >
              个人网站 ↗
            </a>
          )}
          {profile.githubUrl && (
            <a
              href={profile.githubUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              GitHub ↗
            </a>
          )}
        </div>
      )}

      <div className="profile-public-stats" aria-label="站内活动">
        <div>
          <strong>{activity.comments.length}</strong>
          <span>条评论</span>
        </div>
        <div>
          <strong>{activity.letters.length}</strong>
          <span>封留言</span>
        </div>
        <div>
          <strong>{activity.recommendations.length}</strong>
          <span>首推荐</span>
        </div>
      </div>
    </section>
  );
}

function NotAvailable({ what }: { what: string }) {
  return (
    <p className="profile-empty is-unavailable">
      <span>NOT AVAILABLE</span>
      {what}暂时读不到，过一会儿再刷新。
    </p>
  );
}