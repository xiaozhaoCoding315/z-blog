"use client";

import { useId, useState } from "react";
import { siteConfig } from "@/config/site";
import type { GithubActivity } from "@/lib/github-server";
import type { Weather } from "@/lib/weather-server";
import { Clock } from "./clock";
import { useClockSeconds } from "./clock-store";

export interface StatusWidgetProps {
  /** 服务端取好的天气；null 表示这次真的没取到 */
  weather: Weather | null;
  /** portfolio.now.listening，站长手填 */
  listening: string;
  /** portfolio.now.reading，站长手填 */
  reading: string[];
  activity: GithubActivity;
  /** 最近 14 天的提交数（服务端从 activity.days 求和） */
  commits14: number;
  /** portfolio.now.updatedAt，手动字段的更新日期 */
  updatedAt: string;
}

const dateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatDate(ms: number): string {
  if (!ms) return "----.--.--";
  return dateFormat.format(new Date(ms)).replaceAll("-", ".");
}

function CommitReading({
  activity,
  commits14,
}: {
  activity: GithubActivity;
  commits14: number;
}) {
  if (!activity.available) {
    return <span className="os-status-na">NOT AVAILABLE</span>;
  }
  return (
    <>
      {activity.truncated ? "≥" : ""}
      {commits14} 次
    </>
  );
}

/**
 * 右下角的实时状态组件：时钟走秒，读数全部由服务端算好传进来。
 *
 * 客户端只负责展开/收起和共享时钟。没有数据源就写 NOT AVAILABLE，
 * 不显示在线心跳；在听/在读是站长手填的，永远带「手动」标注。
 */
export function StatusWidget({
  weather,
  listening,
  reading,
  activity,
  commits14,
  updatedAt,
}: StatusWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const ms = useClockSeconds();

  return (
    <section
      className="os-status-card"
      data-expanded={expanded ? "true" : "false"}
      aria-label="实时状态"
    >
      <button
        type="button"
        className="os-status-toggle"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="os-status-clockline">
          <Clock withSeconds className="os-status-clock" />
          <span className="os-status-date" suppressHydrationWarning>
            {formatDate(ms)}
          </span>
          <span aria-hidden className="os-status-chevron">
            {expanded ? "▾" : "▸"}
          </span>
        </span>
        <span className="os-status-readings">
          <span>
            {siteConfig.weather.city}{" "}
            {weather
              ? `${weather.temperature}° ${weather.label}`
              : "NOT AVAILABLE"}
          </span>
          <span aria-hidden>·</span>
          <span>
            14D 提交{" "}
            {activity.available ? (
              <>
                {activity.truncated ? "≥" : ""}
                {commits14}
              </>
            ) : (
              "NOT AVAILABLE"
            )}
          </span>
        </span>
      </button>

      {expanded && (
        <div id={panelId} className="os-status-panel">
          <div className="os-status-group">
            <p className="os-status-label">Weather</p>
            <p className="os-status-value">
              {weather ? (
                `${weather.temperature}° ${weather.label}`
              ) : (
                <span className="os-status-na">NOT AVAILABLE</span>
              )}
            </p>
          </div>

          <div className="os-status-group">
            <p className="os-status-label">
              <span>Now Playing</span>
              <span className="os-status-manual">手动</span>
            </p>
            <p className="os-status-value">
              {listening.trim() ? (
                listening
              ) : (
                <span className="os-status-na">NOT AVAILABLE</span>
              )}
            </p>
          </div>

          <div className="os-status-group">
            <p className="os-status-label">
              <span>Reading</span>
              <span className="os-status-manual">手动</span>
            </p>
            {reading.length > 0 ? (
              <ul className="os-status-list">
                {reading.map((item, index) => (
                  <li key={`${index}-${item}`} className="os-status-value">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="os-status-value">
                <span className="os-status-na">NOT AVAILABLE</span>
              </p>
            )}
          </div>

          <div className="os-status-group">
            <p className="os-status-label">Commits · 14D</p>
            <p className="os-status-value">
              <CommitReading activity={activity} commits14={commits14} />
            </p>
          </div>

          <p className="os-status-updated">
            手动字段更新于 {updatedAt}
          </p>
        </div>
      )}
    </section>
  );
}
