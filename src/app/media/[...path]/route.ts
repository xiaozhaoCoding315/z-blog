import { NextResponse } from "next/server";
import { connection } from "next/server";
import { isSafeMediaPath } from "@/lib/upload-core";
import { readUpload } from "@/lib/uploads-server";

/**
 * GET /media/2026/11/<hash>.webp —— 把上传目录里的图读出来。
 *
 * 文件名是内容哈希，所以可以放心 immutable 长缓存。
 * 路径先过白名单：`..`、隐藏文件、多层嵌套一律 404，绝不拼进文件系统。
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  await connection();
  const { path: segments } = await params;

  if (!isSafeMediaPath(segments)) {
    return new NextResponse(null, { status: 404 });
  }

  const file = await readUpload(segments);
  if (!file) return new NextResponse(null, { status: 404 });

  // 先拷成独立的 ArrayBuffer 再交给 Response，类型上不需要强转
  const copy = new Uint8Array(file.bytes.byteLength);
  copy.set(file.bytes);
  return new NextResponse(copy.buffer, {
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
