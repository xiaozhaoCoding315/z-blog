import { notFound } from "next/navigation";
import { Moment } from "@/components/life/moment";
import { MonthTick } from "@/components/life/month-tick";
import { ObservBar } from "@/components/site/observ-bar";
import { NotYetOpen } from "@/components/site/not-yet-open";
import { AppIcon } from "@/components/desktop/icons";
import { now as portfolioNow } from "@/config/portfolio";
import { siteConfig } from "@/config/site";
import { daysSince } from "@/lib/uptime";
import { ICON_KEYS } from "@/config/apps";

/**
 * 样式走廊：只在开发环境存在，生产构建时直接 404。
 * 组件做完就在这里看一眼，不必等首页拼好。
 *
 * 走廊里的静态示例一律标注「示例」；读数没有真实数据源时显示
 * NOT AVAILABLE，不写占位数字。
 */
export default function StylePage() {
  if (process.env.NODE_ENV === "production") notFound();

  // Days 是唯一能在走廊里真实计算的读数；其余读数依赖数据库或网络。
  const uptimeDays = daysSince(siteConfig.startedAt);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-heading text-2xl font-bold">样式走廊</h1>

      <section className="mt-10">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          桌面图标
        </h2>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {ICON_KEYS.map((name) => (
            <div
              key={name}
              className="flex flex-col items-center gap-2 border border-rule bg-panel p-3"
            >
              <AppIcon name={name} className="size-5 text-data" />
              <span className="font-mono text-[10px] text-muted-foreground">
                {name}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          观测条
        </h2>
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">
          示例 · Days 由 siteConfig.startedAt 实时计算；其余读数在走廊里不接入数据源。
        </p>
        <div className="mt-6">
          <ObservBar
            readings={[
              {
                label: "Days",
                value: uptimeDays === null ? "" : String(uptimeDays),
                unit: "建站",
                available: uptimeDays !== null,
              },
              { label: "Moments", value: "", unit: "条", available: false },
              { label: "Month", value: "", unit: "本月", available: false },
              { label: "Commits", value: "", unit: "90 天", available: false },
              { label: "Weather", value: "", unit: "度", available: false },
            ]}
          />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          窗口框
        </h2>
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">
          示例 · 静态窗口框，不可拖拽；标题栏与内容区共用线上窗口的 token。
        </p>
        <div className="relative mt-6 h-[210px] overflow-hidden border border-dashed border-rule/70">
          <div
            aria-hidden="true"
            className="os-window is-open"
            data-focused="true"
            style={{
              left: 12,
              top: 12,
              width: "calc(100% - 24px)",
              maxWidth: 460,
              height: 180,
            }}
          >
            <div className="os-window-titlebar">
              <AppIcon name="terminal" className="os-window-icon" />
              <span className="os-window-title">终端</span>
              <span className="os-window-path">~/terminal</span>
              <div className="os-window-controls">
                <span className="os-window-control">↗</span>
                <span className="os-window-control">—</span>
                <span className="os-window-control">□</span>
                <span className="os-window-control is-close">×</span>
              </div>
            </div>
            <div className="os-window-body">
              <div className="os-window-pane">
                <p className="os-pane-label">Focused Window</p>
                <p className="text-[13px] leading-6 text-muted-foreground">
                  标题栏、焦点态与内容区。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          终端行
        </h2>
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">
          示例 · 静态输出，三种行类型与提示符。
        </p>
        <div
          aria-hidden="true"
          className="os-terminal mt-6 h-56 overflow-hidden border border-rule"
        >
          <div className="os-terminal-output">
            <div className="os-terminal-line" data-kind="output">
              zsh — guest@z-os
            </div>
            <div className="os-terminal-line" data-kind="output">
              <span className="os-terminal-prompt">guest@z-os ~ %</span>{" "}
              neofetch
            </div>
            <div className="os-terminal-line" data-kind="output">
              OS: Z·OS
            </div>
            <div className="os-terminal-line" data-kind="hint">
              提示：输入 help 查看可用命令。
            </div>
            <div className="os-terminal-line" data-kind="error">
              zsh: command not found: rm
            </div>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          标签
        </h2>
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">
          示例 · 与 /life 过滤条同一套样式，静态展示，不可点击。
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <span className="inline-flex items-baseline gap-1.5 border border-data px-2 py-1 font-mono text-[11px] text-data">
            #示例
          </span>
          <span className="inline-flex items-baseline gap-1.5 border border-rule px-2 py-1 font-mono text-[11px] text-muted-foreground">
            #夜班
          </span>
          <span className="inline-flex items-baseline gap-1.5 border border-rule px-2 py-1 font-mono text-[11px] text-muted-foreground">
            #标签
          </span>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          状态组件
        </h2>
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">
          示例 · 时钟不启动；Now Playing / Reading 来自 portfolio.now 的真实配置，
          其余读数显示 NOT AVAILABLE。
        </p>
        <div aria-hidden="true" className="mt-6 max-w-[360px]">
          <div className="os-status-card">
            <div className="os-status-toggle">
              <span className="os-status-clockline">
                <span className="os-status-clock">--:--:--</span>
                <span className="os-status-date">----.--.--</span>
                <span className="os-status-chevron">▸</span>
              </span>
              <span className="os-status-readings">
                <span>杭州 NOT AVAILABLE</span>
                <span>·</span>
                <span>14D 提交 NOT AVAILABLE</span>
              </span>
            </div>
            <div className="os-status-panel">
              <div className="os-status-group">
                <p className="os-status-label">Weather</p>
                <p className="os-status-value">
                  <span className="os-status-na">NOT AVAILABLE</span>
                </p>
              </div>
              <div className="os-status-group">
                <p className="os-status-label">
                  <span>Now Playing</span>
                  <span className="os-status-manual">手动</span>
                </p>
                <p className="os-status-value">{portfolioNow.listening}</p>
              </div>
              <div className="os-status-group">
                <p className="os-status-label">
                  <span>Reading</span>
                  <span className="os-status-manual">手动</span>
                </p>
                <ul className="os-status-list">
                  {portfolioNow.reading.map((item) => (
                    <li key={item} className="os-status-value">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="os-status-group">
                <p className="os-status-label">Commits · 14D</p>
                <p className="os-status-value">
                  <span className="os-status-na">NOT AVAILABLE</span>
                </p>
              </div>
              <p className="os-status-updated">
                手动字段更新于 {portfolioNow.updatedAt}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          语义色
        </h2>
        <div className="mt-6 flex flex-wrap gap-6">
          {[
            ["完成 / 成立", "bg-ok"],
            ["读数 / 链接", "bg-data"],
            ["待审 / 进行中", "bg-wait"],
            ["告警 / 未读", "bg-alert"],
          ].map(([label, cls]) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`size-3 rounded-full ${cls}`} />
              <span className="font-mono text-[11px] text-muted-foreground">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          动态的三种形态与主脊线
        </h2>
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">
          示例 · 静态内容，不代表线上动态。
        </p>
        <div className="relative mt-6 min-w-0 pl-6 sm:pl-8">
          <div aria-hidden className="life-spine">
            <span className="life-spine-fill" />
          </div>
          <MonthTick label="十一月" count={3} />
          <ul className="mt-6 flex flex-col gap-10">
            <li className="relative">
              <span aria-hidden className="absolute -left-6 top-[6px] size-2 -translate-x-1/2 rounded-full bg-muted-foreground sm:-left-8" />
              <Moment
                moment={{
                  id: "s1",
                  kind: "text",
                  publishedAt: "2026-11-05T21:40:00+08:00",
                  body: "降温了。把阳台上的薄荷搬进屋，顺手给自己煮了碗面。",
                  weather: "阴",
                  place: "杭州",
                  mood: "安静",
                }}
              />
            </li>
            <li className="relative">
              <span aria-hidden className="absolute -left-6 top-[6px] size-2 -translate-x-1/2 rounded-full bg-data sm:-left-8" />
              <Moment
                moment={{
                  id: "s2",
                  kind: "photo",
                  publishedAt: "2026-11-03T16:20:00+08:00",
                  body: "城南那家旧书店，二楼靠窗的位置还在。老板换了台唱片机。",
                  place: "南京西路",
                }}
              />
            </li>
            <li className="relative">
              <span aria-hidden className="absolute -left-6 top-[6px] size-2 -translate-x-1/2 rounded-full bg-ok sm:-left-8" />
              <Moment
                moment={{
                  id: "s3",
                  kind: "song",
                  publishedAt: "2026-11-01T23:10:00+08:00",
                  body: "十一月的第一首歌。",
                  card: {
                    title: "Merry Christmas Mr. Lawrence",
                    meta: "坂本龍一",
                    note: "每年入冬都会翻出来听一遍。",
                  },
                }}
              />
            </li>
          </ul>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          未开放面板
        </h2>
        <div className="mt-6">
          <NotYetOpen
            title="书、影、音，按时间倒序"
            description="读过的书、看过的电影、反复听的专辑，每一条一句话短评。"
            phase="示例 · 组件展示"
          />
        </div>
      </section>
    </div>
  );
}
