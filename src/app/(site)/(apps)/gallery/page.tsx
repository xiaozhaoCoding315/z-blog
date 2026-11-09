import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { GalleryView } from "@/components/gallery/gallery-view";
import { collectGalleryImages } from "@/lib/gallery";
import { getMoments } from "@/lib/moments-server";

export const metadata: Metadata = {
  title: "生活胶囊",
  description: "带照片的瞬间，按时间铺开。",
};

/**
 * 相册要读数据库，页面停在请求期；和 /life 一样关掉静态壳校验。
 * 读不到就显示 Not Available，不拿空相册冒充「还没发过」。
 */
export const instant = false;

export default async function GalleryPage() {
  await connection();
  const life = await getMoments();
  const images = life.available ? collectGalleryImages(life.moments) : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-[-0.02em]">
          生活胶囊
        </h1>
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
          {life.available
            ? `${images.length} 张照片 · 按时间倒序`
            : "照片存在数据库里，现在读不到"}
        </p>
      </header>

      {!life.available ? (
        <section className="border-t border-rule pt-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-wait">
            Not Available
          </p>
          <h2 className="mt-3 font-heading text-[17px] font-bold">
            生活胶囊暂时读不到
          </h2>
          <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
            照片和动态存在数据库里，现在连不上。不拿空相册冒充「还没发过」。
          </p>
          <Link href="/life" className="os-pane-link mt-4">
            <span>去完整日志页</span>
            <span aria-hidden>→</span>
          </Link>
        </section>
      ) : (
        <GalleryView images={images} variant="page" />
      )}
    </div>
  );
}
