import { profileInitial } from "@/lib/profile-core";

/**
 * 站内头像：有图用图，没图用名字首字。
 *
 * 刻意不用 next/image：构建机是 Windows、运行镜像是 Alpine，
 * sharp 的平台包对不上；头像尺寸又被 CSS 固定，原生 img 足够。
 */
export function UserAvatar({
  name,
  avatarUrl,
  size = "sm",
  className = "",
}: {
  name: string;
  avatarUrl: string | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const classes = `user-avatar user-avatar-${size}${className ? ` ${className}` : ""}`;
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={`${name} 的头像`}
        loading="lazy"
        referrerPolicy="no-referrer"
        className={classes}
      />
    );
  }
  return (
    <span className={classes} aria-hidden="true">
      {profileInitial(name)}
    </span>
  );
}