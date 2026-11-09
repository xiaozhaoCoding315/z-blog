"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export interface DeskObjectsProps {
  /** 最新一张真实照片；没有照片时不渲染拍立得，不放占位图 */
  photo: { src: string } | null;
}

/**
 * 桌面角落的三件小东西。
 *
 * 咖啡杯自己发 `z-os:coffee`，也监听同一个事件——终端里的 `coffee`
 * 命令派发它，这里就跟着冒热气。拍立得只显示最新真实照片；磁带是
 * 去歌单的普通链接，标签固定写 mixtape，不冒充正在播放。
 *
 * 整个组件是客户端岛：事件和动画需要浏览器，照片路径由服务端传进来。
 */
export function DeskObjects({ photo }: DeskObjectsProps) {
  const [steaming, setSteaming] = useState(false);
  const [steamKey, setSteamKey] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const brew = useCallback(() => {
    // key 变化让热气重新挂载，连续点击也能从头播放
    setSteamKey((key) => key + 1);
    setSteaming(true);
    if (timer.current !== null) clearTimeout(timer.current);
    // 三股热气最后一组 320ms 延迟 + 2s 动画，留一点余量再收掉
    timer.current = setTimeout(() => setSteaming(false), 2400);
  }, []);

  useEffect(() => {
    window.addEventListener("z-os:coffee", brew);
    return () => {
      window.removeEventListener("z-os:coffee", brew);
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, [brew]);

  return (
    <div className="os-objects">
      <button
        type="button"
        className="os-coffee"
        aria-label="冲一杯咖啡"
        title="冲一杯咖啡"
        onClick={() => window.dispatchEvent(new Event("z-os:coffee"))}
      >
        {steaming && (
          <span key={steamKey} aria-hidden className="os-coffee-steam">
            <span />
            <span />
            <span />
          </span>
        )}
        <span aria-hidden className="os-coffee-cup">
          <span className="os-coffee-liquid" />
        </span>
        <span aria-hidden className="os-coffee-saucer" />
      </button>

      {photo && (
        <Link
          href="/gallery"
          className="os-polaroid"
          aria-label="打开生活胶囊"
          title="生活胶囊"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.src}
            alt=""
            loading="lazy"
            decoding="async"
            className="os-polaroid-photo"
          />
          <span aria-hidden className="os-polaroid-label">
            GALLERY
          </span>
        </Link>
      )}

      <Link
        href="/playlist"
        className="os-mixtape"
        aria-label="打开歌单"
        title="歌单"
      >
        <span aria-hidden className="os-mixtape-body">
          <span className="os-mixtape-reel" />
          <span className="os-mixtape-reel" />
        </span>
        <span aria-hidden className="os-mixtape-label">
          mixtape
        </span>
      </Link>
    </div>
  );
}
