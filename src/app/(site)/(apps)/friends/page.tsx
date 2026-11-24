import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { FriendsCopy } from "@/components/friends/friends-copy";
import { GithubIcon } from "@/components/icons/github";
import { siteConfig } from "@/config/site";
import type { FriendLink } from "@/lib/friends-core";
import { getFriends } from "@/lib/friends-server";

export const metadata: Metadata = {
  title: "友链",
  description: "常读的站点，以及交换友链的方式。",
};

type RainStyle = CSSProperties & { "--rain-index": number };

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

export default async function FriendsPage() {
  const { available, friends } = await getFriends();
  const hasFriends = available && friends.length > 0;
  const ticker = [
    ...(available ? friends.map((friend) => friend.name) : []),
    "交换友链",
  ];
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
            FRIENDS / 友链
          </p>
          <h1 id="friends-title" className="friends-title" data-reveal>
            我常看的站点
          </h1>
          <p className="friends-lede" data-reveal>
            这里放我平时会打开的网站。
          </p>
          <div className="friends-hero-meta" data-reveal>
            <span>
              {available ? `${friends.length} 个站点` : "暂时读不到"}
            </span>
            <span aria-hidden="true">·</span>
            <span>交换友链</span>
          </div>
          <a className="friends-cue" href="#friends-list" data-reveal>
            <span>看看下面的站点</span>
            <span className="friends-cue-line" aria-hidden="true">
              <span />
            </span>
          </a>
        </div>

        <div className="friends-hero-foot" aria-hidden="true">
          <span>
            FRIENDS /{" "}
            {available ? String(friends.length).padStart(2, "0") : "--"}
          </span>
        </div>
        <div className="home-tide-line home-tide-breathe" aria-hidden="true">
          <span />
        </div>
      </section>

      <div className="home-ticker friends-ticker" aria-hidden="true">
        <div className="home-ticker-track">
          {Array.from({ length: 2 }, (_, copy) => (
            <span key={copy}>
              {ticker.map((label) => (
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
              DIRECTORY /{" "}
              {available ? String(friends.length).padStart(2, "0") : "--"}
            </p>
            <h2>站点列表</h2>
            <p>最近添加的排在前面。</p>
          </div>
          <a href="#friends-exchange" className="friends-text-link">
            交换友链 →
          </a>
        </header>

        {!available ? (
          <section
            className="friends-empty"
            aria-labelledby="friends-unavailable-title"
            data-reveal
          >
            <p className="friends-eyebrow">NOT AVAILABLE</p>
            <h2 id="friends-unavailable-title">友链暂时读不到</h2>
            <p>过一会儿再刷新。</p>
          </section>
        ) : hasFriends ? (
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
            <p className="friends-eyebrow">FRIENDS / 00</p>
            <h2 id="friends-empty-title">还没有添加友链</h2>
            <p>这里还没有收录站点。</p>
            <div className="friends-empty-actions">
              <Link href="/letters" className="friends-text-link">
                去留言板交换友链 →
              </Link>
            </div>
          </section>
        )}

        <section
          className="friends-exchange"
          id="friends-exchange"
          aria-labelledby="friends-exchange-title"
          data-reveal
          data-spotlight
        >
          <div className="friends-exchange-head">
            <h2 id="friends-exchange-title">交换友链</h2>
            <p>
              两步就够：复制下面我的站点资料，再到留言板用模板写下你的站点。
              站长会先去看看，合适就放上来。
            </p>
          </div>
          <ol className="friends-exchange-steps">
            <li>
              <span className="friends-exchange-step">01</span>
              <div>
                <p className="friends-exchange-step-title">复制我的站点资料</p>
                <p className="friends-exchange-name">{siteConfig.name}</p>
                <p className="friends-exchange-url">{siteConfig.url}</p>
                <FriendsCopy text={exchangeText} />
              </div>
            </li>
            <li>
              <span className="friends-exchange-step">02</span>
              <div>
                <p className="friends-exchange-step-title">写下你的站点</p>
                <p className="friends-exchange-note">
                  模板会带出站点名、网址和一句话介绍，填完提交即可。
                </p>
                <Link
                  href="/letters?template=friend#letter-form"
                  className="friends-exchange-primary"
                >
                  用模板去留言板
                </Link>
              </div>
            </li>
          </ol>
          <div className="friends-exchange-alt">
            <a
              href={siteConfig.links.github}
              target="_blank"
              rel="noreferrer noopener"
              className="friends-exchange-link"
            >
              <GithubIcon className="friends-exchange-icon" />
              也可以发 GitHub Issue ↗
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}