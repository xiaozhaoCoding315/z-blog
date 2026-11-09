"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { GalleryImage } from "@/lib/gallery";
import { formatDay } from "@/lib/life";

/**
 * 相册网格 + 灯箱。
 *
 * 页面版（`/gallery`）的灯箱 `fixed inset-0` 铺满视口，挂到 `document.body`
 * 上——`.os-main` 自带 stacking context，留在里面会被任务栏盖住底部。
 * 窗口版的 `absolute inset-0` 以最近定位祖先（`.os-window`）为边界，
 * 铺满整个窗口（含标题栏），不依赖窗口自身的滚动位置。
 * 两种变体都在打开时锁住各自的滚动容器，关闭时把焦点还给打开它的那张图。
 */
export function GalleryView({
  images,
  variant = "page",
}: {
  images: GalleryImage[];
  variant?: "page" | "window";
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const isOpen = openIndex !== null;
  const closeRef = useRef<HTMLButtonElement>(null);
  /** 打开灯箱的那张图；关闭时把焦点还给它 */
  const openerRef = useRef<HTMLButtonElement | null>(null);

  // 页面版灯箱要挂到 document.body；服务端没有 body，等挂载后再开 portal。
  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const close = useCallback(() => setOpenIndex(null), []);

  const step = useCallback(
    (delta: number) => {
      setOpenIndex((index) =>
        index === null
          ? null
          : (index + delta + images.length) % images.length
      );
    },
    [images.length]
  );

  useEffect(() => {
    if (!isOpen) return;

    const opener =
      openerRef.current ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);
    closeRef.current?.focus();

    // 页面版锁 body；窗口版锁窗口的滚动容器（窗口内容区自己滚动）。
    const scrollRoot =
      variant === "window"
        ? (closeRef.current?.closest<HTMLElement>(".os-window-body") ?? null)
        : document.body;
    const previousOverflow = scrollRoot?.style.overflow ?? "";
    if (scrollRoot) scrollRoot.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpenIndex(null);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      if (scrollRoot) scrollRoot.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [isOpen, step, variant]);

  if (images.length === 0) {
    return (
      <div className={variant === "window" ? "os-window-pane" : ""}>
        <p className="font-heading text-[15px] font-bold">还没有照片。</p>
        <Link href="/write" className="os-pane-link mt-3">
          <span>去写一条</span>
          <span aria-hidden>→</span>
        </Link>
      </div>
    );
  }

  const current = openIndex === null ? null : images[openIndex];

  const lightbox = current ? (
    <div
      className={`os-gallery-lightbox ${
        variant === "page" ? "fixed inset-0 z-[70]" : "absolute inset-0 z-30"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="照片预览"
    >
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-rule px-4 py-2">
          <span className="font-mono text-[11px] tabular-nums text-ink-dim">
            {formatDay(current.date)} · {(openIndex ?? 0) + 1} / {images.length}
          </span>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="关闭照片预览"
            className="os-gallery-nav size-7"
          >
            ×
          </button>
        </header>

        <div
          className="relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-3 sm:p-5"
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          {images.length > 1 && (
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="上一张"
              className="os-gallery-nav absolute left-2 top-1/2 z-10 size-9 -translate-y-1/2"
            >
              ‹
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current.src}
            alt={current.alt}
            className="max-h-full max-w-full object-contain"
          />
          {images.length > 1 && (
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="下一张"
              className="os-gallery-nav absolute right-2 top-1/2 z-10 size-9 -translate-y-1/2"
            >
              ›
            </button>
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-rule px-4 py-2.5 font-mono text-[11px]">
          <time dateTime={current.date} className="text-ink-dim">
            {formatDay(current.date)}
          </time>
          <Link
            href={`/life/${current.momentId}`}
            className="text-ink-dim transition-colors hover:text-phosphor focus-visible:text-phosphor"
          >
            查看动态 →
          </Link>
        </footer>
      </div>
    </div>
  ) : null;

  return (
    <div className={variant === "window" ? "p-4" : ""}>
      <div className="columns-2 gap-3 sm:columns-3">
        {images.map((image, index) => (
          <button
            key={image.src}
            type="button"
            onClick={(event) => {
              openerRef.current = event.currentTarget;
              setOpenIndex(index);
            }}
            className="os-gallery-tile mb-3 block w-full break-inside-avoid border border-rule bg-panel-2 transition-colors hover:border-data focus-visible:border-data focus-visible:outline-none"
            aria-label={`查看 ${image.alt}`}
            aria-haspopup="dialog"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.src}
              alt={image.alt}
              loading="lazy"
              decoding="async"
              className="block w-full"
            />
            <span aria-hidden className="os-gallery-tile-date">
              {formatDay(image.date)}
            </span>
          </button>
        ))}
      </div>

      {lightbox &&
        (variant === "window"
          ? lightbox
          : mounted
            ? createPortal(lightbox, document.body)
            : null)}
    </div>
  );
}
