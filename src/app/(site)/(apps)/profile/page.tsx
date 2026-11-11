import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getOwnProfile } from "@/lib/profile-server";
import { profileHref } from "@/lib/profile-core";
import { ProfileForm } from "@/components/profile/profile-form";

export const metadata: Metadata = {
  title: "我的资料",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function ProfilePage() {
  await connection();
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-gate" data-reveal>
          <p className="profile-eyebrow">PROFILE · 需要登录</p>
          <h1>登录后编辑资料</h1>
          <p>用邮箱验证码登录，第一次登录会自动创建账号。</p>
          <div className="profile-gate-actions">
            <Link href="/login?next=/profile" className="profile-primary-link">
              登录 / 注册
            </Link>
            <Link href="/letters">先看看大家的留言</Link>
          </div>
        </div>
      </div>
    );
  }

  const own = await getOwnProfile(user.id);
  const href = profileHref(user.id) ?? "/profile";

  return (
    <div className="profile-page">
      <header className="profile-page-head" data-reveal>
        <div>
          <p className="profile-eyebrow">PROFILE</p>
          <h1>编辑资料</h1>
          <p>公开显示在主页，邮箱不会公开。</p>
        </div>
        <Link href={href} className="profile-page-public">
          看公开主页 ↗
        </Link>
      </header>

      {!own.available ? (
        <div className="profile-gate">
          <p className="profile-eyebrow">NOT AVAILABLE</p>
          <h2>资料暂时读不到</h2>
          <p>过一会儿再刷新。</p>
        </div>
      ) : !own.profile ? (
        <div className="profile-gate">
          <p className="profile-eyebrow">NOT AVAILABLE</p>
          <h2>找不到这个账号</h2>
          <p>重新登录一次试试。</p>
        </div>
      ) : (
        <div data-reveal>
          <ProfileForm profile={own.profile} login={user.login} publicHref={href} />
        </div>
      )}
    </div>
  );
}