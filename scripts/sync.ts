/**
 * 博客同步 CLI：npm run blog:sync [-- --force]
 * 读取项目根目录的 .env（不覆盖已有环境变量），执行增量同步。
 */
import fs from "node:fs";
import path from "node:path";

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = rawValue.replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function main() {
  loadEnvFile();

  const force = process.argv.includes("--force");
  const { syncPosts } = await import("../src/lib/sync");
  const { closeDb } = await import("../src/db/client");
  try {
    const result = await syncPosts({ force });
    console.log(JSON.stringify(result));
  } finally {
    await closeDb();
  }
}

main().catch((err) => {
  console.error("[sync] 同步失败：", err);
  process.exit(1);
});
