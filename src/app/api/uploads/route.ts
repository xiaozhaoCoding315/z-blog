import { NextResponse } from "next/server";
import { connection } from "next/server";
import { getSessionUser } from "@/lib/session";
import { MAX_IMAGE_BYTES } from "@/lib/media-limits";
import {
  contentHash,
  mediaDirName,
  mediaFileName,
  sniffImageType,
} from "@/lib/upload-core";
import { writeUpload } from "@/lib/uploads-server";

/** POST /api/uploads —— 只有站长能传图，一张一个请求 */
export async function POST(request: Request) {
  await connection();

  const user = await getSessionUser();
  if (!user || user.role !== "owner") {
    return NextResponse.json({ error: "只有站长能上传图片" }, { status: 403 });
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
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "单张图片不能超过 2MB" },
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
    console.error("[upload] 落盘失败：", err);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }

  return NextResponse.json({ path: `/media/${relPath}` });
}
