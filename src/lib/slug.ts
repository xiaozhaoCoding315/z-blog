/** GitHub 风格标题 slug（与 rehype-slug 一致），用于生成标题锚点 */
export function githubSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}
