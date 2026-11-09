import { cacheLife, cacheTag } from "next/cache";
import { codeToHtml, createCssVariablesTheme } from "shiki";
import { snippets } from "@/config/snippets";

/**
 * Shiki 高亮（仅服务端）。
 *
 * `shiki` 的默认 bundle 不包含名为 "css-variables" 的字符串主题，
 * 但 `createCssVariablesTheme()` 生成的正是同一套 `--shiki-*` 变量；
 * 颜色全部交给 `globals.css`，三套桌面预设自动生效。
 * 额外把数字映射到独立变量，满足「number 用 danger」的配色约定。
 */

const baseTheme = createCssVariablesTheme({ name: "css-variables" });

const cssVariablesTheme = {
  ...baseTheme,
  tokenColors: [
    ...(baseTheme.tokenColors ?? []),
    {
      scope: ["constant.numeric"],
      settings: { foreground: "var(--shiki-token-number)" },
    },
    {
      scope: ["keyword.operator"],
      settings: { foreground: "var(--shiki-token-operator)" },
    },
    {
      scope: ["variable"],
      settings: { foreground: "var(--shiki-token-variable)" },
    },
    {
      scope: ["variable.parameter"],
      settings: { foreground: "var(--shiki-token-parameter)" },
    },
  ],
};

export interface HighlightedSnippet {
  id: string;
  html: string;
}

/**
 * 六段代码全部高亮后一次返回。片段随代码发版，`max` 寿命 + tag
 * 足够；单条失败只影响那一条，客户端回退到未高亮的 `<pre><code>`。
 */
export async function highlightSnippets(): Promise<HighlightedSnippet[]> {
  "use cache";
  cacheLife("max");
  cacheTag("snippets");

  return Promise.all(
    snippets.map(async (snippet) => {
      try {
        const html = await codeToHtml(snippet.code, {
          lang: snippet.language,
          theme: cssVariablesTheme,
        });
        return { id: snippet.id, html };
      } catch (err) {
        console.error(`[snippets] ${snippet.id} 高亮失败：`, err);
        return { id: snippet.id, html: "" };
      }
    })
  );
}
