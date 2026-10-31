#!/usr/bin/env node
/**
 * 面试题难度重标定 —— 用 LLM 判断（启发式不可靠的替代方案）
 *
 * ## 为什么不用规则
 * 第一版用「答案长度 + 代码块 + 题干关键词」打分，结果：
 *   - 「Java 是值传递还是引用传递」→ 判成「易」（其实是经典中场题）
 *   - 「Redis 单线程为什么还这么快」→ 判成「难」（其实是入门必背）
 * 难度是主观判断，规则引擎做不好。
 *
 * ## 做法
 * 分批（每组 10 题）发给模型，让它按「面试准备视角」评级：
 *  - 易：背一遍就能答，属于常识/入门
 *  - 中：要理解机制、能讲清因果，是面试的主力题
 *  - 难：要综合权衡、有多个取舍，或者本身就容易答错/被深挖
 *
 * 只发「题干 + 分类 + 答案前 400 字」——足够判断难度，也省 token。
 *
 * 用法：
 *   node scripts/classify-difficulty.mjs --dry     # 只跑前 10 题看效果
 *   node scripts/classify-difficulty.mjs           # 全量，输出建议
 *   node scripts/classify-difficulty.mjs --apply   # 全量并写回文件
 */

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const DIR = path.join(process.cwd(), "content", "interview");
const BATCH = 10;

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    const key = m[1];
    const value = m[2].replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function classifyBatch(items) {
  const apiKey = process.env.AI_API_KEY ?? process.env.ZHIPU_API_KEY;
  const baseUrl = process.env.AI_BASE_URL ?? "https://open.bigmodel.cn/api/paas/v4";
  const model = process.env.CHAT_MODEL ?? "glm-4.6";

  const payload = items.map((it, i) => ({
    no: i + 1,
    category: it.category,
    question: it.question,
    answerPreview: it.answer.slice(0, 400).replace(/\s+/g, " ").trim(),
  }));

  const prompt = `你是一位有十年经验的互联网大厂技术面试官。下面有 ${items.length} 道面试题，
请以「候选人备考优先级」的视角，为每道题重新评定难度。

评级标准：
- 易：属于常识或入门概念，看一遍就能在面试中答出来
- 中：需要理解机制、讲清因果链；面试中的主力题
- 难：需要综合权衡或多点串联，本身容易答错、或被深度追问的场景题/设计题

注意：
- 不要被答案长短影响（答案都是口语化叙述，篇幅不反映难度）
- 判断依据是「这道题让一个准备过的后端工程师答，他有多大概率卡住」
- 只能输出 easy / medium / hard

严格只输出 JSON 数组，不要任何解释或代码块标记：
[{"no":1,"difficulty":"easy"},{"no":2,"difficulty":"medium"}]

题目列表：
${JSON.stringify(payload, null, 1)}`;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      // 10 题 × 一条 JSON + 可能的推理开销；2000 不够，会被截断成非法 JSON
      max_tokens: 4000,
    }),
    signal: AbortSignal.timeout(180_000),
  });

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text.trim()) {
    const reason = data.choices?.[0]?.finish_reason ?? "empty";
    throw new Error(`模型返回空内容（finish_reason=${reason}）`);
  }

  // 容错：模型有时会包一层 ```json
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  const arr = JSON.parse(cleaned);

  const map = { easy: "易", medium: "中", hard: "难" };
  const out = [];
  for (const entry of arr) {
    const item = items[entry.no - 1];
    if (item && map[entry.difficulty]) {
      out.push({ slug: item.slug, difficulty: map[entry.difficulty] });
    }
  }
  return out;
}

/** 断点续跑：已评级的存这里，重跑时跳过 */
const CACHE = path.join(process.cwd(), "scripts", ".difficulty-cache.json");

function loadCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE, "utf-8"));
  } catch {
    return {};
  }
}

function saveCache(cache) {
  fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2), "utf-8");
}

function main() {
  loadEnv();
  const dry = process.argv.includes("--dry");
  const apply = process.argv.includes("--apply");

  if (!process.env.AI_API_KEY && !process.env.ZHIPU_API_KEY) {
    console.error("缺少 AI_API_KEY，无法调用模型");
    process.exit(1);
  }

  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".mdx"));
  let items = files.map((file) => {
    const slug = path.basename(file, ".mdx");
    const raw = fs.readFileSync(path.join(DIR, file), "utf-8");
    const { data, content } = matter(raw);
    return {
      slug,
      file,
      question: data.question ?? "",
      category: data.category ?? "",
      current: data.difficulty ?? "中",
      answer: content,
    };
  });

  if (dry) items = items.slice(0, BATCH);

  return (async () => {
    const cache = loadCache();
    const results = new Map(Object.entries(cache));
    const todo = items.filter((it) => !results.has(it.slug));

    console.log(`共 ${items.length} 题，已有缓存 ${results.size}，待处理 ${todo.length}`);

    const batches = [];
    for (let i = 0; i < todo.length; i += BATCH) {
      batches.push(todo.slice(i, i + BATCH));
    }
    console.log(`分 ${batches.length} 批...`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      let done = false;

      for (let attempt = 1; attempt <= 3 && !done; attempt++) {
        try {
          const out = await classifyBatch(batch);
          for (const r of out) results.set(r.slug, r.difficulty);
          saveCache(Object.fromEntries(results));
          console.log(
            `  批次 ${i + 1}/${batches.length} 完成（${out.length}/${batch.length} 题）`
          );
          done = true;
        } catch (err) {
          const last = attempt === 3;
          console.error(
            `  批次 ${i + 1} 第 ${attempt} 次失败：${err.message}${last ? "（跳过）" : "（重试）"}`
          );
          if (!last) await new Promise((r) => setTimeout(r, 1500 * attempt));
        }
      }
      // 温和限速，避免触发 RPM
      if (i < batches.length - 1) await new Promise((r) => setTimeout(r, 800));
    }

    // ---- 汇总 ----
    const rows = items
      .filter((it) => results.has(it.slug))
      .map((it) => ({ ...it, suggested: results.get(it.slug) }));

    const tally = (key) =>
      rows.reduce((acc, r) => {
        acc[r[key]] = (acc[r[key]] ?? 0) + 1;
        return acc;
      }, {});

    console.log(`\n成功评级 ${rows.length} / ${items.length} 题`);
    console.log("  当前分布：", tally("current"));
    console.log("  建议分布：", tally("suggested"));

    const changed = rows.filter((r) => r.current !== r.suggested);
    console.log(`  需要调整：${changed.length} 题`);

    console.log("\n--- 变化示例（前 12）---");
    changed.slice(0, 12).forEach((r) => {
      console.log(`  [${r.current} → ${r.suggested}] ${r.question.slice(0, 44)}`);
    });

    if (apply && !dry) {
      let written = 0;
      for (const r of changed) {
        const filePath = path.join(DIR, r.file);
        const raw = fs.readFileSync(filePath, "utf-8");
        const updated = raw.replace(
          /^difficulty:\s*.*$/m,
          `difficulty: ${r.suggested}`
        );
        if (updated !== raw) {
          fs.writeFileSync(filePath, updated, "utf-8");
          written++;
        }
      }
      console.log(`\n已写回 ${written} 个文件`);
    } else {
      console.log("\n（未写回；加 --apply 才会修改文件）");
    }
  })();
}

main();
