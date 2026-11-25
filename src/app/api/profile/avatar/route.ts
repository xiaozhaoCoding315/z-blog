import { NextResponse } from "next/server";
import { connection } from "next/server";
import { getSessionUser } from "@/lib/session";
import { MAX_AVATAR_BYTES } from "@/lib/media-limits";
import {
  contentHash,
  mediaDirName,
  mediaFileName,
  sniffImageType,
} from "@/lib/upload-core";
import { writeUpload } from "@/lib/uploads-server";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/profile/avatar —— 登录用户上传自己的头像。
 *
 * 和站长专用的 /api/uploads 分开：头像入口对所有登录用户开放，
 * 所以限制更紧（512KB、每小时 6 次、每天 20 次），并只收真实图片。
 * 文件名仍是内容哈希，同一张图重复上传不会多占磁盘。
 */
export async function POST(request: Request) {
  await connection();

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "请先登录再换头像" }, { status: 401 });
  }

  if (
    !rateLimit(`avatar:m:${user.id}`, 6, 3_600_000) ||
    !rateLimit(`avatar:d:${user.id}`, 20, 86_400_000)
  ) {
    return NextResponse.json(
      { error: "换头像太频繁了，过一会儿再试" },
      { status: 429 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "没有收到文件" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "这个文件是空的" }, { status: 400 });
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json(
      { error: "头像不能超过 512KB，请换一张更小的图片" },
      { status: 413 }
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) {
    return NextResponse.json(
      { error: "只接受 WebP / JPEG / PNG" },
      { status: 415 }
    );
  }

  const dir = mediaDirName(new Date());
  const name = mediaFileName(contentHash(bytes), type);
  const relPath = `${dir}/${name}`;

  try {
    await writeUpload(relPath, bytes);
  } catch (err) {
    console.error("[avatar] 落盘失败：", err);
    return NextResponse.json({ error: "保存失败，稍后再试" }, { status: 500 });
  }

  return NextResponse.json({ path: `/media/${relPath}` });
}