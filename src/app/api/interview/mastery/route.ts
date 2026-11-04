import { NextResponse } from "next/server";
import { connection } from "next/server";
import { readProgress, saveProgress } from "@/lib/interview-progress";
import { getSessionUser } from "@/lib/session";
import { NO_STORE } from "@/app/api/_shared/no-store";

const LEVELS = [0, 1, 2, 3] as const;
type Level = (typeof LEVELS)[number];

/** GET /api/interview/mastery：返回当前用户全部掌握度，未登录返回空。 */
export async function GET() {
  await connection();

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { items: [], signedIn: false },
      { headers: NO_STORE }
    );
  }

  const progress = await readProgress(user.id);
  if (!progress.signedIn) {
    return NextResponse.json(
      { items: [], signedIn: true, error: "database-unavailable" },
      { headers: NO_STORE }
    );
  }

  return NextResponse.json(
    {
      items: progress.items,
      signedIn: true,
      user: { login: user.login, avatarUrl: user.avatarUrl },
    },
    { headers: NO_STORE }
  );
}

/** PUT /api/interview/mastery：保存单题掌握度，level=0 表示删除。 */
export async function PUT(request: Request) {
  await connection();

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "需要登录", code: "unauthenticated" },
      { status: 401, headers: NO_STORE }
    );
  }

  let body: { slug?: string; level?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "请求格式错误" },
      { status: 400, headers: NO_STORE }
    );
  }

  const slug = (body.slug ?? "").trim();
  const level = Number(body.level);
  if (!slug || slug.length > 120) {
    return NextResponse.json(
      { error: "slug 不合法" },
      { status: 400, headers: NO_STORE }
    );
  }
  if (!LEVELS.includes(level as Level)) {
    return NextResponse.json(
      { error: "level 必须是 0-3" },
      { status: 400, headers: NO_STORE }
    );
  }

  const result = await saveProgress(slug, level as 0 | 1 | 2 | 3);
  if (!result.ok) {
    return NextResponse.json(
      { error: "数据库不可用" },
      { status: 503, headers: NO_STORE }
    );
  }

  return NextResponse.json(
    { ok: true, slug, level },
    { headers: NO_STORE }
  );
}
