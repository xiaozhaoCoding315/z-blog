"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { UserAvatar } from "@/components/site/user-avatar";
import { GENDER_LABEL, GENDERS, profileDisplayName } from "@/lib/profile-core";
import type { OwnProfile } from "@/lib/profile-server";
import {
  updateProfile,
  type ProfileFormState,
} from "@/app/(site)/(apps)/profile/actions";

const initialState: ProfileFormState = {};

export function ProfileForm({
  profile,
  login,
  publicHref,
}: {
  profile: OwnProfile;
  login: string;
  publicHref: string;
}) {
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");
  const [showGender, setShowGender] = useState(profile.showGender);
  const [showBirthday, setShowBirthday] = useState(profile.showBirthday);
  const [state, formAction, pending] = useActionState(
    (prev: ProfileFormState, formData: FormData) => updateProfile(prev, formData),
    initialState
  );

  const previewName = profileDisplayName(displayName, login);

  return (
    <form action={formAction} onReset={(event) => event.preventDefault()}>
      <div className="profile-form-avatar">
        <UserAvatar name={previewName} avatarUrl={avatarUrl} size="lg" />
        <div className="profile-form-avatar-fields">
          <label htmlFor="avatarUrl">头像地址</label>
          <input
            id="avatarUrl"
            name="avatarUrl"
            type="text"
            maxLength={500}
            value={avatarUrl}
            onChange={(event) => setAvatarUrl(event.target.value)}
            placeholder="https://… 不填就用昵称首字生成"
          />
        </div>
      </div>

      <div className="profile-form-grid">
        <div>
          <label htmlFor="displayName">昵称</label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            maxLength={24}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder={login}
          />
          <p className="profile-form-hint">
            留空就显示登录名 @{login} · 最多 24 字
          </p>
        </div>

        <div>
          <label htmlFor="location">所在地</label>
          <input
            id="location"
            name="location"
            type="text"
            maxLength={40}
            defaultValue={profile.location}
            placeholder="北京"
          />
        </div>

        <div className="profile-form-wide">
          <label htmlFor="bio">个性签名</label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            maxLength={160}
            defaultValue={profile.bio}
            placeholder="一句话说清你在做什么、喜欢什么。"
          />
          <p className="profile-form-hint">最多 160 字，公开显示在主页和名字旁。</p>
        </div>

        <div>
          <label htmlFor="gender">性别</label>
          <select
            id="gender"
            name="gender"
            defaultValue={profile.gender ?? ""}
          >
            <option value="">不填</option>
            {GENDERS.map((gender) => (
              <option key={gender} value={gender}>
                {GENDER_LABEL[gender]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="birthday">生日</label>
          <input
            id="birthday"
            name="birthday"
            type="date"
            defaultValue={profile.birthday ?? ""}
          />
        </div>

        <div>
          <label htmlFor="website">个人网站</label>
          <input
            id="website"
            name="website"
            type="text"
            maxLength={300}
            defaultValue={profile.website ?? ""}
            placeholder="https://…"
          />
        </div>

        <div>
          <label htmlFor="githubUrl">GitHub</label>
          <input
            id="githubUrl"
            name="githubUrl"
            type="text"
            maxLength={300}
            defaultValue={profile.githubUrl ?? ""}
            placeholder="https://github.com/…"
          />
        </div>
      </div>

      <fieldset className="profile-form-privacy">
        <legend>公开范围</legend>
        <label>
          <input
            type="checkbox"
            name="showGender"
            checked={showGender}
            onChange={(event) => setShowGender(event.target.checked)}
          />
          <span>在主页显示性别</span>
        </label>
        <label>
          <input
            type="checkbox"
            name="showBirthday"
            checked={showBirthday}
            onChange={(event) => setShowBirthday(event.target.checked)}
          />
          <span>在主页显示生日</span>
        </label>
        <p>
          默认都关闭。签名、昵称、所在地和链接填了就会公开；生日与性别只有勾选后才出现。
        </p>
      </fieldset>

      {state.error && (
        <p className="profile-form-message is-error" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && !pending && (
        <p className="profile-form-message is-ok" role="status">
          已保存。个人主页已经更新。
        </p>
      )}

      <div className="profile-form-actions">
        <button type="submit" disabled={pending} className="tactile">
          {pending ? "保存中…" : "保存资料"}
        </button>
        <Link href={publicHref}>看我的主页 ↗</Link>
      </div>
    </form>
  );
}