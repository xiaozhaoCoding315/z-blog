import { NextResponse } from "next/server";
import { getRawNote } from "@/lib/content-core";

/**
 * 旧链接兜底：保留的笔记跳新地址，归档文章统一回 /notes。
 *
 * 用 Route Handler 而不是 page：Cache Components 下页面的重定向发生在
 * 流式渲染里，响应头已经是 200，只能靠客户端 meta 跳转；这里直接返回
 * 308（permanentRedirect 的等价状态码），爬虫能读到真正的重定向。
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const target = getRawNote(slug) ? `/notes/${slug}` : "/notes";
  // 用相对 Location，避免反向代理下 request.url 的内网主机名泄露到跳转地址
  return new NextResponse(null, { status: 308, headers: { Location: target } });
}
