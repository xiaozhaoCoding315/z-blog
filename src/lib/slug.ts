import { slug } from "github-slugger";

/**
 * GitHub 风格标题 slug，与正文 rehype-slug 使用同一实现。
 * 不要自己写正则替换：下划线、加号和重复标题的处理都会和正文对不上。
 */
export function githubSlug(text: string): string {
  return slug(text);
}