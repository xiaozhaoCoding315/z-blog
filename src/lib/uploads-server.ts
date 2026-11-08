import { mkdir, readFile, writeFile, access } from "node:fs/promises";
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

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** 写一张图；同内容已存在就直接复用，不重写 */
export async function writeUpload(
  relPath: string,
  bytes: Uint8Array
): Promise<void> {
  const target = path.join(uploadRoot(), ...relPath.split("/"));
  if (await exists(target)) return;
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
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
