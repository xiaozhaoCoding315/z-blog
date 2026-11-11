import { useRef, useState, type ChangeEvent } from "react";
import { UserAvatar } from "@/components/site/user-avatar";
import { MAX_AVATAR_BYTES } from "@/lib/media-limits";

/**
 * 头像上传：本地选图 → 居中裁方 → 512px WebP → /api/profile/avatar。
 * 表单只提交隐藏的 /media/ 路径，不再接受手填外链。
 */

const MAX_INPUT_BYTES = 12 * 1024 * 1024;
const AVATAR_EDGE = 512;

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

async function compressAvatar(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function") {
    // 老浏览器没有解码 API：小图原样上传，大图明确拒绝，不偷偷放行。
    if (file.size <= MAX_AVATAR_BYTES) return file;
    throw new Error("当前浏览器不支持图片压缩，请选择 512KB 以内的图片");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const edge = Math.min(bitmap.width, bitmap.height);
    if (edge <= 0) throw new Error("这张图片读不出尺寸");
    const size = Math.min(AVATAR_EDGE, edge);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("浏览器无法处理这张图片");
    context.imageSmoothingQuality = "high";
    context.drawImage(
      bitmap,
      (bitmap.width - edge) / 2,
      (bitmap.height - edge) / 2,
      edge,
      edge,
      0,
      0,
      size,
      size
    );
    const blob =
      (await toBlob(canvas, "image/webp", 0.86)) ??
      (await toBlob(canvas, "image/jpeg", 0.88));
    if (!blob) throw new Error("图片压缩失败，请换一张试试");
    return new File([blob], "avatar.webp", { type: blob.type });
  } finally {
    bitmap.close?.();
  }
}

export function AvatarUploadField({
  previewName,
  value,
  legacySrc,
  onChange,
  onBusyChange,
}: {
  previewName: string;
  value: string;
  /** 旧资料里的外链头像：只用于预览，保存时会被清掉 */
  legacySrc?: string | null;
  onChange: (value: string) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = value || legacySrc || "";

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    if (!/^image\/(webp|jpeg|png)$/i.test(file.type)) {
      setError("只支持 JPG、PNG、WebP 图片");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      setError("原图不能超过 12MB，请先压缩或换一张");
      return;
    }

    setUploading(true);
    onBusyChange?.(true);
    try {
      const compressed = await compressAvatar(file);
      const body = new FormData();
      body.append("file", compressed);
      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body,
      });
      const data = (await response.json().catch(() => null)) as
        | { path?: unknown; error?: unknown }
        | null;
      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "上传失败，稍后再试"
        );
      }
      if (typeof data?.path !== "string" || !data.path.startsWith("/media/")) {
        throw new Error("服务器没有返回头像地址");
      }
      onChange(data.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败，稍后再试");
    } finally {
      setUploading(false);
      onBusyChange?.(false);
    }
  };

  return (
    <div className="profile-form-avatar">
      <UserAvatar name={previewName} avatarUrl={preview || null} size="lg" />
      <div className="profile-form-avatar-fields">
        <span className="profile-form-avatar-label">头像</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/webp,image/jpeg,image/png"
          hidden
          onChange={handleFile}
        />
        <div className="profile-avatar-actions">
          <button
            type="button"
            className="profile-avatar-upload"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            aria-busy={uploading}
          >
            {uploading ? "上传中…" : value ? "换一张" : "上传本地图片"}
          </button>
          {value && (
            <button
              type="button"
              className="profile-avatar-remove"
              onClick={() => onChange("")}
              disabled={uploading}
            >
              移除
            </button>
          )}
          <input type="hidden" name="avatarUrl" value={value} />
        </div>
        <p className="profile-form-hint">
          支持 JPG / PNG / WebP，自动裁成正方形。
        </p>
        {legacySrc && !value && (
          <p className="profile-avatar-note">
            当前还是旧的外链头像，保存资料后会清除，请重新上传一张。
          </p>
        )}
        {error && (
          <p className="profile-avatar-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}