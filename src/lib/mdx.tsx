import type { ComponentPropsWithoutRef } from "react";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode, { type Options as PrettyCodeOptions } from "rehype-pretty-code";
import { Callout } from "@/components/mdx/callout";
import { PreBlock } from "@/components/mdx/pre-block";

const prettyCodeOptions: PrettyCodeOptions = {
  theme: {
    light: "github-light-default",
    dark: "github-dark-default",
  },
  keepBackground: false,
  defaultLang: "plaintext",
};

function Anchor({ href = "", ...rest }: ComponentPropsWithoutRef<"a">) {
  if (href.startsWith("/") || href.startsWith("#")) {
    return <Link href={href} {...rest} />;
  }
  return <a target="_blank" rel="noreferrer noopener" href={href} {...rest} />;
}

const components = {
  a: Anchor,
  pre: PreBlock,
  Callout,
};

export async function RenderMDX({ source }: { source: string }) {
  // MDX 编译（含 Shiki 高亮）开销较大，按 source 内容缓存，
  // 同时隔离编译器内部的时间调用与预渲染生命周期
  "use cache";
  return (
    <MDXRemote
      source={source}
      components={components}
      options={{
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [
            rehypeSlug,
            [
              rehypeAutolinkHeadings,
              {
                behavior: "wrap",
                properties: { className: ["heading-anchor"] },
              },
            ],
            [rehypePrettyCode, prettyCodeOptions],
          ],
        },
      }}
    />
  );
}
