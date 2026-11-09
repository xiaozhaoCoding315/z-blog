import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { mimeOf, sniffImageType } from "@/lib/upload-core";

/**
 * 上传目录的读写。
 *
 * 不写 `public/`：standalone 产物里的 public 是构建时拷进去的只读快照，
 * 运行期往里写既不会进镜像，也活不过下一次部署。所以挂在容器 volume 上，
 * 由 `/media/[...path]` 这个 Route Handler 读出来。
 */
export function uploadRoot(): string {
  return process.env.UPLOAD_DIR?.trim() || path.join(process.cwd(), "uploads");
}

async function sizeOf(p: string): Promise<number | null> {
  try {
    return (await stat(p)).size;
  } catch {
    return null;
  }
}

/** 写一张图；同内容已存在且大小一致就直接复用，不重写 */
export async function writeUpload(
  relPath: string,
  bytes: Uint8Array
): Promise<void> {
  const target = path.join(uploadRoot(), ...relPath.split("/"));
  // 只有大小完全一致才跳过：上次写到一半断掉的文件大小必然对不上，必须重写，
  // 否则同名图会永远指向那个截断的坏文件（/media 还带 immutable 长缓存）。
  if ((await sizeOf(target)) === bytes.byteLength) return;

  await mkdir(path.dirname(target), { recursive: true });
  // 先写同目录临时文件再改名：同目录 rename 是原子的，正式路径不会出现半截文件。
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  try {
    await writeFile(temp, bytes);
    await rename(temp, target);
  } catch (err) {
    // 临时文件清不掉也不该盖住真正的错误：吞掉清理异常，原错误照常抛出。
    await unlink(temp).catch(() => {});
    throw err;
  }
}

export async function readUpload(
  segments: string[]
): Promise<{ bytes: Uint8Array; mime: string } | null> {
  const target = path.join(uploadRoot(), ...segments);
  try {
    const buf = await readFile(target);
    const type = sniffImageType(buf);
    if (!type) return null;
    return { bytes: new Uint8Array(buf), mime: mimeOf(type) };
  } catch {
    return null;
  }
}
