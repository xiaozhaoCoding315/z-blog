import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { FriendsCopy } from "@/components/friends/friends-copy";
import { GithubIcon } from "@/components/icons/github";
import { friends, type FriendLink } from "@/config/portfolio";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "友链",
  description: "常读的站点，以及交换友链的方式。",
};

type RainStyle = CSSProperties & { "--rain-index": number };

const TICKER = [
  "FRIEND LINKS",
  "只放会点开的站",
  "交换开放",
  "真实内容 · 不摆占位",
  "潮汐 · 友链",
];

const RAIN = Array.from({ length: 24 }, (_, index) => index);

function FriendCard({ friend, index }: { friend: FriendLink; index: number }) {
  // 入场与 hover 都改 transform：分层到外层容器，两者互不覆盖。
  return (
    <div
      className="friend-reveal"
      data-reveal
      style={{ "--reveal-delay": `${index * 60}ms` } as CSSProperties}
    >
      <a
        className="friend-card"
        href={friend.url}
        target="_blank"
        rel="noreferrer noopener"
        data-spotlight
      >
        <span className="friend-card-index" aria-hidden="true">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="friend-avatar" aria-hidden="true">
          {friend.avatar ? (
            <img
              src={friend.avatar}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span>{friend.name.trim().slice(0, 1)}</span>
          )}
        </span>
        <span className="friend-main">
          <span className="friend-head">
            <span className="friend-name">{friend.name}</span>
            <span className="friend-arrow" aria-hidden="true">
              ↗
            </span>
          </span>
          <span className="friend-desc">{friend.description}</span>
          {friend.tags?.length ? (
            <span className="friend-tags">
              {friend.tags.map((tag) => (
                <span className="friend-tag" key={tag}>
                  {tag}
                </span>
              ))}
            </span>
          ) : null}
        </span>
      </a>
    </div>
  );
}

export default function FriendsPage() {
  const hasFriends = friends.length > 0;
  const exchangeText = [
    siteConfig.name,
    siteConfig.url,
    siteConfig.description,
  ].join("\n");

  return (
    <div className="friends-page">
      <section className="friends-hero" aria-labelledby="friends-title">
        <div className="home-weather" aria-hidden="true">
          <div className="home-weather-glow" />
          <div className="home-weather-orb" />
          <div className="home-weather-cloud-a" />
          <div className="home-weather-cloud-b" />
          <div className="home-weather-ring" />
          <div className="home-weather-tide-a" />
          <div className="home-weather-tide-b" />
          <div className="home-weather-tide-flow home-tide-flow" />
          <div className="home-weather-rain">
            {RAIN.map((index) => (
              <span
                key={index}
                style={{ "--rain-index": index } as RainStyle}
              />
            ))}
          </div>
        </div>

        <div className="friends-hero-inner">
          <p className="friends-kicker" data-reveal>
            FRIENDS / 常读站点
          </p>
          <h1 id="friends-title" className="friends-title" data-reveal>
            把常读的站点，
            <br />
            锚在这条潮汐线上
          </h1>
          <p className="friends-lede" data-reveal>
            这里只放我确实会点开的站：可能是一个人的随笔、一间小工作室，
            或者某个把问题讲清楚的技术博客。没有互挂任务，也不凑数量。
          </p>
          <div className="friends-hero-meta" data-reveal>
            <span>{hasFriends ? `${friends.length} 个友链` : "友链还在积累"}</span>
            <span aria-hidden="true">·</span>
            <span>交换开放</span>
            <span aria-hidden="true">·</span>
            <span>只放真实站点</span>
          </div>
          <a className="friends-cue" href="#friends-list" data-reveal>
            <span>沿潮汐线看看</span>
            <span className="friends-cue-line" aria-hidden="true">
              <span />
            </span>
          </a>
        </div>

        <div className="friends-hero-foot" aria-hidden="true">
          <span>LINK / {String(friends.length).padStart(2, "0")}</span>
          <span>NORTH · {siteConfig.weather.city}</span>
        </div>
        <div className="home-tide-line home-tide-breathe" aria-hidden="true">
          <span />
        </div>
      </section>

      <div className="home-ticker friends-ticker" aria-hidden="true">
        <div className="home-ticker-track">
          {Array.from({ length: 2 }, (_, copy) => (
            <span key={copy}>
              {TICKER.map((label) => (
                <span key={label}>
                  <i />
                  {label}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <div className="friends-body" id="friends-list">
        <header className="friends-list-head" data-reveal>
          <div>
            <p className="friends-eyebrow">
              DIRECTORY / {String(friends.length).padStart(2, "0")}
            </p>
            <h2>常读的站点</h2>
            <p>没有排序权重，也没有互相挂链的任务，都是我自己会打开的页面。</p>
          </div>
          <Link href="/letters" className="friends-text-link">
            推荐一个站 →
          </Link>
        </header>

        {hasFriends ? (
          <div className="friends-grid">
            {friends.map((friend, index) => (
              <FriendCard
                key={`${friend.name}-${friend.url}`}
                friend={friend}
                index={index}
              />
            ))}
          </div>
        ) : (
          <section
            className="friends-empty"
            aria-labelledby="friends-empty-title"
            data-reveal
            data-spotlight
          >
            <div className="friends-empty-signal" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p className="friends-eyebrow">FRIEND SLOTS / 00</p>
            <h2 id="friends-empty-title">还没有收录友链</h2>
            <p>
              这里不摆示例站占位。遇到真正会点开的站点，再一个个加进来；
              你的站也可以先来自荐，我会先读几篇再决定。
            </p>
            <div className="friends-empty-actions">
              <Link href="/letters" className="friends-text-link">
                去留言板自荐 →
              </Link>
              <a
                href={siteConfig.links.github}
                target="_blank"
                rel="noreferrer noopener"
                className="friends-text-link"
              >
                在 GitHub 留言 ↗
              </a>
            </div>
          </section>
        )}

        <section
          className="friends-exchange"
          aria-labelledby="friends-exchange-title"
          data-reveal
          data-spotlight
        >
          <div className="friends-exchange-head">
            <p className="friends-eyebrow">LINK EXCHANGE</p>
            <h2 id="friends-exchange-title">交换友链</h2>
            <p>
              申请请附站点名称、链接和一句话介绍。我会先自己读几篇——
              只加我确实会点开的站。
            </p>
          </div>
          <div className="friends-exchange-grid">
            <div className="friends-exchange-card">
              <span className="friends-exchange-label">我的站点</span>
              <p className="friends-exchange-name">{siteConfig.name}</p>
              <p className="friends-exchange-url">{siteConfig.url}</p>
              <FriendsCopy text={exchangeText} />
            </div>
            <div className="friends-exchange-card">
              <span className="friends-exchange-label">怎么联系</span>
              <a
                href={siteConfig.links.github}
                target="_blank"
                rel="noreferrer noopener"
                className="friends-exchange-link"
              >
                <GithubIcon className="friends-exchange-icon" />
                GitHub Issue ↗
              </a>
              <Link href="/letters" className="friends-exchange-link">
                留言板 →
              </Link>
              <p className="friends-exchange-note">
                邮箱不常公开；留言板与 GitHub 是最稳的两条路。
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}