"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
// 只从零依赖的 media-limits 取常量：upload-core 带 node:crypto，不能进客户端包
import { MAX_IMAGES_PER_MOMENT } from "@/lib/media-limits";

/** 长边压到 2400px 以内、转 WebP 0.82——手机原图动辄 5MB，压完通常 300KB 上下 */
const MAX_EDGE = 2400;
const QUALITY = 0.82;

async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => {
    // 浏览器原生报错是英文的，统一换成站内中文文案
    throw new Error("这张图读不出来，换一张试试");
  });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("这个浏览器不支持 canvas");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", QUALITY)
  );
  if (!blob) throw new Error("压缩失败");
  return blob;
}

/**
 * 选图 → 压缩 → 上传，拿回站内路径。
 * 上传失败的图直接报出来，不静默丢掉——用户以为传上去了才是最糟的。
 */
export function ImagePicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setPending(true);
    const next = [...value];
    try {
      for (const file of Array.from(files)) {
        if (next.length >= MAX_IMAGES_PER_MOMENT) {
          setError(`最多 ${MAX_IMAGES_PER_MOMENT} 张`);
          break;
        }
        const blob = await compress(file);
        const form = new FormData();
        form.append(
          "file",
          new File([blob], "photo.webp", { type: "image/webp" })
        );
        let res: Response;
        try {
          res = await fetch("/api/uploads", { method: "POST", body: form });
        } catch {
          throw new Error("网络出错，图片没传上去");
        }
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.path) {
          setError(data?.error ?? "上传失败");
          break;
        }
        // 同一张图压缩后内容相同、服务端路径也相同，重复入列会撞 React key
        if (!next.includes(data.path)) next.push(data.path);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "图片没处理成功，再试一次");
    } finally {
      // 批量中途失败时保留已经传成功的图；一张都没加就不惊动父组件
      if (next.length !== value.length) onChange(next);
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {value.map((src) => (
          <div key={src} className="relative border border-rule">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="block size-20 object-cover" />
            <button
              type="button"
              aria-label="移除这张图"
              onClick={() => onChange(value.filter((x) => x !== src))}
              disabled={pending}
              className="absolute -right-2 -top-2 rounded-full border border-rule bg-background p-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

        {value.length < MAX_IMAGES_PER_MOMENT && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="flex size-20 items-center justify-center border border-dashed border-rule font-mono text-[10px] text-muted-foreground transition-colors hover:border-data hover:text-foreground disabled:opacity-50"
          >
            {pending ? "上传中" : "加图"}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/webp,image/jpeg,image/png"
        multiple
        className="sr-only"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {error && (
        <p className="mt-2 font-mono text-[11px] text-alert" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
