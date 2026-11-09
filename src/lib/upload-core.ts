import { createHash } from "node:crypto";

/**
 * 图片上传的纯逻辑。
 *
 * 为什么自己嗅魔数而不是信 Content-Type：请求头是客户端说了算的，
 * 只按 MIME 放行等于让人随便往服务器塞任意字节。
 *
 * 注意这里**不 import `./media-limits`**：本文件要被 `node --test` 直接加载，
 * 而 Node 不解析无扩展名的相对导入（Next 的打包器能，Node 不能）。
 * 上限常量只在 media-limits.ts 定义，需要它的地方（路由、客户端组件）直接引那一份。
 */

export type ImageType = "webp" | "jpeg" | "png";

const EXT: Record<ImageType, string> = {
  webp: "webp",
  jpeg: "jpg",
  png: "png",
};

const MIME: Record<ImageType, string> = {
  webp: "image/webp",
  jpeg: "image/jpeg",
  png: "image/png",
};

export function mimeOf(type: ImageType): string {
  return MIME[type];
}

export function sniffImageType(bytes: Uint8Array): ImageType | null {
  // WebP: "RIFF" .... "WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  // JPEG: FF D8 FF
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }
  return null;
}

/** 文件名用内容哈希：同一张图传两次只占一份，也顺手做了去重 */
export function contentHash(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** 按北京时间分年月，和全站其余日期口径一致 */
export function mediaDirName(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")?.value ?? "1970";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${year}/${month}`;
}

export function mediaFileName(hash: string, type: ImageType): string {
  return `${hash.slice(0, 32)}.${EXT[type]}`;
}

const FILE = /^[a-f0-9]{32}\.(webp|jpg|png)$/;

/**
 * 只放行 `YYYY/MM/<32 位哈希>.<ext>` 这一种形状。
 * 拒绝 `..`、拒绝带斜杠的段、拒绝隐藏文件——路径拼接之前先过这一关。
 */
export function isSafeMediaPath(segments: string[]): boolean {
  if (segments.length !== 3) return false;
  const [year, month, file] = segments;
  if (!/^\d{4}$/.test(year)) return false;
  if (!/^\d{2}$/.test(month)) return false;
  return FILE.test(file);
}
