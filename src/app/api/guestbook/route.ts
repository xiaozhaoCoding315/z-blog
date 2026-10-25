import { NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { guestbook } from "@/db/schema";

/** 简单内存限频：同一 IP 60 秒只能留一条（重启清零，足够拦住误触） */
const lastPostAt = new Map<string, number>();
const RATE_LIMIT_MS = 60_000;

export async function GET() {
  const db = getDb();
  if (!db) return NextResponse.json({ items: [] });

  try {
    const rows = await db
      .select({
        id: guestbook.id,
        name: guestbook.name,
        message: guestbook.message,
        createdAt: sql<string>`${guestbook.createdAt}::text`,
      })
      .from(guestbook)
      .orderBy(desc(guestbook.id))
      .limit(50);
    return NextResponse.json({ items: rows });
  } catch {
    return NextResponse.json({ items: [] });
  }
}

export async function POST(request: Request) {
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "数据库不可用" }, { status: 503 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const last = lastPostAt.get(ip) ?? 0;
  if (Date.now() - last < RATE_LIMIT_MS) {
    return NextResponse.json(
      { error: "留言太频繁了，喝口水再来说～" },
      { status: 429 }
    );
  }

  let body: { name?: string; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const name = (body.name ?? "").trim().slice(0, 20) || "匿名访客";
  const message = (body.message ?? "").trim().slice(0, 300);
  if (message.length < 2) {
    return NextResponse.json({ error: "留言至少 2 个字" }, { status: 400 });
  }

  try {
    const [row] = await db
      .insert(guestbook)
      .values({ name, message })
      .returning({
        id: guestbook.id,
        name: guestbook.name,
        message: guestbook.message,
        createdAt: sql<string>`${guestbook.createdAt}::text`,
      });
    lastPostAt.set(ip, Date.now());
    return NextResponse.json({ item: row });
  } catch {
    return NextResponse.json({ error: "保存失败，稍后再试" }, { status: 500 });
  }
}
