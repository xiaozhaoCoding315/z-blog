/**
 * 笔记 frontmatter 校验：构建前把内容层的问题抓出来。
 *
 * 为什么需要单独一个脚本：笔记不是代码，构建期才发现问题太晚——
 * YAML 解析失败会让整次构建挂掉（就像那次标题以单引号开头的笔记），
 * 而日期写成未来、tags 写成字符串这类问题，构建能过但语义是错的。
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const NOTES_DIR = path.join(process.cwd(), "content", "notes");
const STARTED_AT = process.env.NEXT_PUBLIC_SITE_START_DATE || "2026-07-02";

/** 今天：允许写「今天」的笔记，但不允许写未来 */
const TODAY = new Date().toISOString().slice(0, 10);

const errors = [];
const warnings = [];

function fail(file, message) {
  errors.push(`${file}: ${message}`);
}

const files = fs.readdirSync(NOTES_DIR).filter((f) => f.endsWith(".mdx"));

if (files.length === 0) {
  fail("content/notes", "目录下没有笔记");
}

// 阶段 5 保留 10 篇；站长以后调整篇数时只提醒，不拦构建
if (files.length !== 10) {
  warnings.push(`笔记数为 ${files.length}，与预期的 10 篇不同`);
}

const seenDates = new Map();

for (const file of files) {
  let data, content;
  try {
    ({ data, content } = matter(fs.readFileSync(path.join(NOTES_DIR, file), "utf-8")));
  } catch (e) {
    // YAML 解析失败就是硬错误：构建一定挂
    fail(file, `YAML 解析失败：${e.message.split("\n")[0]}`);
    continue;
  }

  if (!data.title || typeof data.title !== "string") {
    fail(file, "缺少 title");
  }

  if (!data.date) {
    fail(file, "缺少 date");
  } else {
    const date =
      data.date instanceof Date
        ? data.date.toISOString().slice(0, 10)
        : String(data.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      fail(file, `date 格式应为 YYYY-MM-DD，实际是 ${date}`);
    } else if (date > TODAY) {
      // 未来日期：文章会出现在列表顶部，但读者看到的是一篇「还没写」的文章
      fail(file, `date ${date} 晚于今天 ${TODAY}`);
    } else if (date < STARTED_AT) {
      fail(file, `date ${date} 早于建站日 ${STARTED_AT}`);
    }
    seenDates.set(date, (seenDates.get(date) ?? 0) + 1);
  }

  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags)) {
      fail(file, "tags 必须是数组，例如 tags: [AI, Agent]");
    } else if (data.tags.length === 0) {
      warnings.push(`${file}: tags 为空，标签筛选在笔记列表页内完成`);
    } else if (data.tags.length > 5) {
      warnings.push(`${file}: tags 有 ${data.tags.length} 个，卡片上只显示前 3 个`);
    }
  }

  if (data.draft !== undefined && typeof data.draft !== "boolean") {
    fail(file, "draft 必须是 true 或 false");
  }
  if (data.pinned !== undefined && typeof data.pinned !== "boolean") {
    fail(file, "pinned 必须是 true 或 false");
  }

  if (!data.description) {
    warnings.push(`${file}: 没有 description，列表页会退回 AI 摘要或正文首段`);
  }

  // 正文里的图片必须真实存在，否则线上是裂图
  for (const match of content.matchAll(/!\[[^\]]*\]\((\/images\/[^)\s]+)\)/g)) {
    const asset = path.join(process.cwd(), "public", match[1]);
    if (!fs.existsSync(asset)) {
      fail(file, `引用的图片不存在：${match[1]}`);
    }
  }

  if (content.trim().length === 0) {
    fail(file, "正文为空");
  }
}

// 同一天发多篇没问题，但值得提醒：归档页按天分组，读者会看到一天挤了多篇
for (const [date, count] of seenDates) {
  if (count > 1) {
    warnings.push(`${date} 有 ${count} 篇笔记`);
  }
}

for (const w of warnings) console.warn(`⚠️  ${w}`);
for (const e of errors) console.error(`❌ ${e}`);

console.log(
  `\n检查了 ${files.length} 篇笔记：${errors.length} 个错误，${warnings.length} 个提醒`
);

if (errors.length > 0) process.exit(1);
