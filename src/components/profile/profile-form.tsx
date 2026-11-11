"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AvatarUploadField } from "@/components/profile/avatar-upload-field";
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
  const [bio, setBio] = useState(profile.bio);
  const [location, setLocation] = useState(profile.location);
  const [website, setWebsite] = useState(profile.website ?? "");
  const [githubUrl, setGithubUrl] = useState(profile.githubUrl ?? "");
  // 只把站内 /media/ 路径带进表单；旧外链只预览，保存时清掉。
  const [avatarUrl, setAvatarUrl] = useState(
    profile.avatarUrl?.startsWith("/media/") ? profile.avatarUrl : ""
  );
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [showGender, setShowGender] = useState(profile.showGender);
  const [showBirthday, setShowBirthday] = useState(profile.showBirthday);
  const [state, formAction, pending] = useActionState(
    (prev: ProfileFormState, formData: FormData) => updateProfile(prev, formData),
    initialState
  );

  const previewName = profileDisplayName(displayName, login);
  const previewMeta = [
    location.trim(),
    website.trim() ? "网站" : "",
    githubUrl.trim() ? "GitHub" : "",
  ].filter(Boolean);

  return (
    <form
      action={formAction}
      onReset={(event) => event.preventDefault()}
      className="profile-form profile-studio"
    >
      <aside className="profile-preview" aria-label="公开资料预览">
        <div className="profile-preview-head">
          <span className="profile-preview-label">公开预览</span>
          <span className="profile-preview-dot" aria-hidden="true" />
        </div>

        <AvatarUploadField
          previewName={previewName}
          value={avatarUrl}
          legacySrc={
            profile.avatarUrl && !profile.avatarUrl.startsWith("/media/")
              ? profile.avatarUrl
              : null
          }
          onChange={setAvatarUrl}
          onBusyChange={setAvatarBusy}
        />

        <div className="profile-preview-identity">
          <h2>{previewName}</h2>
          <p>@{login}</p>
        </div>

        <p className="profile-preview-bio">
          {bio.trim() || "还没有写签名。"}
        </p>

        {previewMeta.length > 0 && (
          <div className="profile-preview-meta">
            {previewMeta.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        )}

        <Link href={publicHref} className="profile-preview-link">
          打开公开主页 ↗
        </Link>
      </aside>

      <div className="profile-form-main">
        <section
          className="profile-form-section"
          aria-labelledby="profile-basic-title"
        >
          <header className="profile-form-section-head">
            <h2 id="profile-basic-title">基本信息</h2>
            <p>会公开显示在主页和留言旁边。</p>
          </header>

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
              <p className="profile-form-hint">留空显示 @{login}</p>
            </div>

            <div>
              <label htmlFor="location">所在地</label>
              <input
                id="location"
                name="location"
                type="text"
                maxLength={40}
                value={location}
                onChange={(event) => setLocation(event.target.value)}
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
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder="写一句话介绍自己。"
              />
              <p className="profile-form-hint">最多 160 字</p>
            </div>
          </div>
        </section>

        <section
          className="profile-form-section"
          aria-labelledby="profile-more-title"
        >
          <header className="profile-form-section-head">
            <h2 id="profile-more-title">更多信息</h2>
            <p>不填也可以。</p>
          </header>

          <div className="profile-form-grid">
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
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
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
                value={githubUrl}
                onChange={(event) => setGithubUrl(event.target.value)}
                placeholder="https://github.com/…"
              />
            </div>
          </div>
        </section>

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
          <p>生日和性别默认不公开，勾选后才会出现在主页。</p>
        </fieldset>

        {state.error && (
          <p className="profile-form-message is-error" role="alert">
            {state.error}
          </p>
        )}
        {state.ok && !pending && (
          <p className="profile-form-message is-ok" role="status">
            已保存。
          </p>
        )}

        <div className="profile-form-actions">
          <button
            type="submit"
            disabled={pending || avatarBusy}
            className="tactile"
          >
            {pending ? "保存中…" : avatarBusy ? "头像上传中…" : "保存资料"}
          </button>
        </div>
      </div>
    </form>
  );
}