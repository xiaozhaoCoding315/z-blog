import type { SongView } from "@/lib/songs-server";

export const PLATFORM_LABEL = {
  netease: "NETEASE",
  qq: "QQ MUSIC",
  other: "LINK",
} as const;

/**
 * 一行一首歌，整行是外链。
 *
 * 推荐人只在访客推荐上显示：读层对 owner 歌曲也会带出 users.login，
 * 但站长自己的歌不需要署一个「推荐人」。
 */
export function SongRow({ song }: { song: SongView }) {
  return (
    <a
      href={song.url}
      target="_blank"
      rel="noreferrer noopener"
      className="group flex items-baseline gap-3 border-b border-rule py-3 transition-colors hover:bg-panel"
    >
      <span className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {PLATFORM_LABEL[song.platform]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] group-hover:text-data">
          {song.title}
        </span>
        <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
          {song.artist}
          {song.note ? ` · ${song.note}` : ""}
          {song.source === "visitor" && song.recommender
            ? ` · 推荐人 ${song.recommender}`
            : ""}
        </span>
      </span>
      {song.pinned && (
        <span className="shrink-0 font-mono text-[10px] text-ok">PINNED</span>
      )}
      {song.pending && (
        <span className="shrink-0 font-mono text-[10px] text-wait">PENDING</span>
      )}
    </a>
  );
}
