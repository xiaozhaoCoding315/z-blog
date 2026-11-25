"use client";

import { usePathname, useRouter } from "next/navigation";

/**
 * 导入完成后的友好回执。
 *
 * 数字来自服务端真实导入结果：可播校验成功时告诉用户跳过多少首，
 * 校验失败时如实说没校验，不把「未知」说成「全部可播」。
 */
export function ImportNotice({
  imported,
  skipped,
  checked,
}: {
  imported: number;
  skipped: number;
  checked: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const detail = !checked
    ? "本次没能向平台校验匿名可播性，曲目已原样保留。"
    : skipped > 0
      ? `已跳过 ${skipped} 首 VIP / 版权受限曲目，访客点开就能听。`
      : "这张歌单的曲目全部可免费播放。";

  return (
    <div className="playlist-import-notice" role="status">
      <span className="playlist-import-notice-mark" aria-hidden="true">
        ✓
      </span>
      <p>
        已导入 <strong>{imported}</strong> 首{checked ? "可免费播放的曲目" : "曲目"}。
        {detail}
      </p>
      <button
        type="button"
        onClick={() => router.replace(pathname, { scroll: false })}
        aria-label="关闭导入提示"
      >
        知道了
      </button>
    </div>
  );
}