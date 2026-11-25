"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  PET_POSITION_KEY,
  clampPetPosition,
  readPetPosition,
  writePetPosition,
  type PetPosition,
} from "@/lib/pet-position";
import {
  isSongRecommendationRequest,
  type PetMusicCandidate,
} from "@/lib/pet-music";
import { recommendSongForPet } from "@/app/(site)/(apps)/playlist/pet-actions";
import { requestPlayQueue } from "@/components/playlist/music-provider";
import { useAssistantChat } from "@/components/assistant/assistant-provider";
import { ChatComposer, ChatThread } from "@/components/assistant/chat-thread";
import type { ChatSource } from "@/components/assistant/assistant-shared";

const PET_PROMPTS = [
  "推荐一首歌",
  "你最近在做什么项目？",
  "推荐一篇站内笔记",
  "你了解这个站吗？",
];

const IDLE_ACTIONS = ["look", "stretch", "wave", "doze"] as const;
type IdleAction = (typeof IDLE_ACTIONS)[number];

const ACTIVITIES = ["snack", "workout", "game", "phone"] as const;
type Activity = (typeof ACTIVITIES)[number];

const PET_QUIPS = ["在呢！", "别戳啦～", "元气 +1", "摸鱼中…", "想问点什么？"];
const PET_MUSIC_QUIPS = ["这个鼓点可以！", "一起晃～", "这首歌不错"];
const PET_ACTIVITY_QUIPS: Record<Activity, string[]> = {
  snack: ["先让我吃完这口！", "小饼干分你一半…"],
  workout: ["举铁呢，别闹～", "再练一组！"],
  game: ["这局快赢了！", "等我打完这关～"],
  phone: ["刷到一条好玩的…", "回个消息先～"],
};

const ACTIVITY_HOLD_MS = 6400;
const ACTIVITY_DELAY_MIN_MS = 4500;
const ACTIVITY_DELAY_JITTER_MS = 4500;

/** 卡皮巴拉「小元」：暖棕绒毛、薄荷绿坐垫、打结布领与全息电路。 */
function XiaoyuanMascot() {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const furId = `xy-fur-${uid}`;
  const shadeId = `xy-shade-${uid}`;
  const bellyId = `xy-belly-${uid}`;
  const creamId = `xy-cream-${uid}`;
  const cushionId = `xy-cushion-${uid}`;
  const cushionRimId = `xy-cushion-rim-${uid}`;
  const collarId = `xy-collar-${uid}`;
  const cookieId = `xy-cookie-${uid}`;
  const glowId = `xy-glow-${uid}`;

  return (
    <svg
      className="xiaoyuan-mascot"
      viewBox="0 0 120 120"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={furId} cx="40%" cy="22%" r="84%">
          <stop offset="0" stopColor="#dfb58d" />
          <stop offset="0.44" stopColor="#c18c61" />
          <stop offset="0.8" stopColor="#91603e" />
          <stop offset="1" stopColor="#633b26" />
        </radialGradient>
        <linearGradient id={shadeId} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#9b6747" />
          <stop offset="1" stopColor="#5a3523" />
        </linearGradient>
        <linearGradient id={bellyId} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#b98560" />
          <stop offset="1" stopColor="#8a5a3e" />
        </linearGradient>
        <radialGradient id={creamId} cx="50%" cy="28%" r="80%">
          <stop offset="0" stopColor="#f9e7c9" />
          <stop offset="0.7" stopColor="#e7c9a2" />
          <stop offset="1" stopColor="#cba57c" />
        </radialGradient>
        <radialGradient id={cushionId} cx="44%" cy="24%" r="82%">
          <stop offset="0" stopColor="#e6f7dc" />
          <stop offset="0.56" stopColor="#bce0b3" />
          <stop offset="1" stopColor="#8abd8d" />
        </radialGradient>
        <linearGradient id={cushionRimId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6ea978" />
          <stop offset="1" stopColor="#3f7a54" />
        </linearGradient>
        <linearGradient id={collarId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dcf5ca" />
          <stop offset="0.55" stopColor="#b4dfa9" />
          <stop offset="1" stopColor="#82be85" />
        </linearGradient>
        <radialGradient id={cookieId} cx="34%" cy="28%" r="82%">
          <stop offset="0" stopColor="#ffe8ad" />
          <stop offset="0.62" stopColor="#f3c46f" />
          <stop offset="1" stopColor="#dc9c42" />
        </radialGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#6fffd2" stopOpacity="0.26" />
          <stop offset="0.58" stopColor="#6bd9ff" stopOpacity="0.1" />
          <stop offset="1" stopColor="#6bd9ff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse
        className="xiaoyuan-mascot-glow"
        cx="60"
        cy="62"
        rx="52"
        ry="47"
        fill={`url(#${glowId})`}
      />
      <ellipse
        className="xiaoyuan-mascot-shadow"
        cx="60"
        cy="111"
        rx="45"
        ry="5"
        fill="#02100e"
        opacity="0.34"
      />

      {/* 薄荷绿圆坐垫 */}
      <g className="xiaoyuan-mascot-cushion">
        <ellipse cx="60" cy="103" rx="50" ry="14" fill={`url(#${cushionRimId})`} />
        <ellipse
          cx="60"
          cy="99.5"
          rx="48"
          ry="13"
          fill={`url(#${cushionId})`}
          stroke="#86bd8d"
          strokeWidth="0.8"
        />
        <path
          d="M17 99 Q60 108 103 99"
          fill="none"
          stroke="#5f9d6d"
          strokeOpacity="0.34"
          strokeWidth="0.9"
        />
        <path
          d="M24 103.5 Q60 110 96 103.5"
          fill="none"
          stroke="#5f9d6d"
          strokeOpacity="0.22"
          strokeWidth="0.8"
        />
        <path
          d="M19 96 Q60 104 101 96"
          fill="none"
          stroke="#f4fff0"
          strokeOpacity="0.38"
          strokeWidth="1"
        />
        <circle cx="36" cy="101.5" r="1" fill="#f6fff2" opacity="0.65" />
        <circle cx="84" cy="102.5" r="0.9" fill="#f6fff2" opacity="0.55" />
        <circle cx="60" cy="104.5" r="0.8" fill="#f6fff2" opacity="0.45" />
      </g>

      {/* 环境里的全息电路 */}
      <g
        className="xiaoyuan-mascot-circuit is-around"
        fill="none"
        stroke="#7fe7ff"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.52"
      >
        <ellipse
          cx="60"
          cy="62"
          rx="51"
          ry="46"
          strokeOpacity="0.22"
          strokeDasharray="1.5 8"
        />
        <path d="M12 96 H7 V78 H15" />
        <path d="M108 92 H113 V72 H105" />
        <path d="M24 109 H38 V104" />
        <path d="M96 107 H84 V102" />
        <path d="M17 46 H11 V32" />
        <path d="M103 54 H110 V66" />
        <path d="M46 111 H60 V107 H74" strokeOpacity="0.55" />
        <circle cx="7" cy="78" r="1.4" fill="#bffcff" stroke="none" />
        <circle cx="113" cy="72" r="1.4" fill="#bffcff" stroke="none" />
        <circle cx="11" cy="32" r="1.2" fill="#bffcff" stroke="none" />
        <circle cx="110" cy="66" r="1.2" fill="#bffcff" stroke="none" />
        <rect
          className="xiaoyuan-mascot-chip"
          x="13"
          y="92"
          width="4"
          height="4"
          rx="1"
        />
        <rect
          className="xiaoyuan-mascot-chip"
          x="104"
          y="90"
          width="4"
          height="4"
          rx="1"
        />
        <rect
          className="xiaoyuan-mascot-chip"
          x="34"
          y="101"
          width="3.2"
          height="3.2"
          rx="0.8"
        />
      </g>

      <g className="xiaoyuan-mascot-body">
        {/* 后半身与奶油肚皮 */}
        <path
          d="M30 70 C20 80 22 94 34 100 C46 105 74 105 86 100 C98 94 100 80 90 70 Z"
          fill={`url(#${shadeId})`}
        />
        <path
          d="M40 78 C33 88 40 99 60 100 C80 99 87 88 80 78 Z"
          fill={`url(#${bellyId})`}
          opacity="0.72"
        />

        {/* 小耳朵：水豚的耳廓短而圆，位置靠后，只从头顶两侧露出一点 */}
        <g className="xiaoyuan-mascot-ear is-left">
          <ellipse
            cx="24"
            cy="27"
            rx="4"
            ry="4.7"
            transform="rotate(-20 24 27)"
            fill={`url(#${shadeId})`}
          />
          <ellipse
            cx="24.3"
            cy="28"
            rx="1.8"
            ry="2.2"
            transform="rotate(-20 24.3 28)"
            fill="#dd9b80"
            opacity="0.75"
          />
        </g>
        <g className="xiaoyuan-mascot-ear is-right">
          <ellipse
            cx="96"
            cy="27"
            rx="4"
            ry="4.7"
            transform="rotate(20 96 27)"
            fill={`url(#${shadeId})`}
          />
          <ellipse
            cx="95.7"
            cy="28"
            rx="1.8"
            ry="2.2"
            transform="rotate(20 95.7 28)"
            fill="#dd9b80"
            opacity="0.75"
          />
        </g>

        {/* 宽而钝的头：水豚不是圆熊头，额头平、两颊宽、口鼻是一整块方钝的奶油色 */}
        <path
          d="M36 21 H84 Q99 26 104 40 Q106 47 106 55 L106 63 Q106 78 88 84 Q74 87 60 87 Q46 87 32 84 Q14 78 14 63 L14 55 Q14 47 16 40 Q21 26 36 21 Z"
          fill={`url(#${furId})`}
          stroke="#7fe7ff"
          strokeOpacity="0.18"
          strokeWidth="1.1"
        />
        <path
          d="M44 22 Q60 19 76 22"
          fill="none"
          stroke="#f6d6b4"
          strokeOpacity="0.4"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        <path
          d="M20 57 C21 65 28 73 37 78"
          fill="none"
          stroke="#f6d6b4"
          strokeOpacity="0.14"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* 水豚的毛不贴脸：颊边留几簇短毛，头顶加一点粗糙笔触 */}
        <g fill={`url(#${shadeId})`}>
          <path d="M16 56 Q12.5 59 14 64 Q17 62 17.5 58 Z" />
          <path d="M18 67 Q15 70 17 75 Q20 72 20.5 68 Z" />
          <path d="M104 56 Q107.5 59 106 64 Q103 62 102.5 58 Z" />
          <path d="M102 67 Q105 70 103 75 Q100 72 99.5 68 Z" />
        </g>
        <g
          fill="none"
          stroke="#b07c56"
          strokeOpacity="0.3"
          strokeWidth="0.7"
          strokeLinecap="round"
        >
          <path d="M30 31 L27 33.5 M36 26.5 L33.8 29.5" />
          <path d="M90 31 L93 33.5 M84 26.5 L86.2 29.5" />
          <path d="M48 21.5 L46.8 23.9 M72 21.5 L73.2 23.9" />
        </g>

        {/* 大眼睛 */}
        <g className="xiaoyuan-mascot-eye is-left">
          <ellipse cx="33.5" cy="42" rx="4.1" ry="4.7" fill="#432614" />
          <ellipse cx="33.5" cy="42" rx="2.9" ry="3.6" fill="#241209" />
          <g className="xiaoyuan-mascot-pupil">
            <circle cx="32.3" cy="40.3" r="1.15" fill="#fff8ea" opacity="0.95" />
            <circle cx="34.9" cy="43.4" r="0.5" fill="#fff8ea" opacity="0.62" />
          </g>
          <path
            d="M29.8 39.9 Q33.5 38.1 37.2 39.9"
            fill="none"
            stroke="#4a2c1d"
            strokeWidth="0.9"
            strokeLinecap="round"
            opacity="0.7"
          />
        </g>
        <g className="xiaoyuan-mascot-eye is-right">
          <ellipse cx="86.5" cy="42" rx="4.1" ry="4.7" fill="#432614" />
          <ellipse cx="86.5" cy="42" rx="2.9" ry="3.6" fill="#241209" />
          <g className="xiaoyuan-mascot-pupil">
            <circle cx="85.3" cy="40.3" r="1.15" fill="#fff8ea" opacity="0.95" />
            <circle cx="87.9" cy="43.4" r="0.5" fill="#fff8ea" opacity="0.62" />
          </g>
          <path
            d="M82.8 39.9 Q86.5 38.1 90.2 39.9"
            fill="none"
            stroke="#4a2c1d"
            strokeWidth="0.9"
            strokeLinecap="round"
            opacity="0.7"
          />
        </g>

        {/* 水豚的方钝口鼻：几乎横贯两颊的奶油色块，配宽鼻垫和竖缝鼻孔 */}
        <path
          d="M32 52.5 Q33 49.5 39 49.5 H81 Q87 49.5 88 52.5 Q91 55.5 89.5 74 Q88.5 79 60 79.5 Q31.5 79 30.5 74 Q29 55.5 32 52.5 Z"
          fill={`url(#${creamId})`}
        />
        <path
          d="M33 52.2 Q60 54.8 87 52.2 Q86 50 81 50 H39 Q34 50 33 52.2 Z"
          fill="#c69a72"
          opacity="0.24"
        />
        <path
          d="M31.6 53.5 C30 58 30.5 68 32.5 74"
          fill="none"
          stroke="#b98a63"
          strokeOpacity="0.28"
          strokeWidth="0.9"
          strokeLinecap="round"
        />
        <path
          d="M88.4 53.5 C90 58 89.5 68 87.5 74"
          fill="none"
          stroke="#b98a63"
          strokeOpacity="0.28"
          strokeWidth="0.9"
          strokeLinecap="round"
        />
        <ellipse cx="60" cy="79" rx="21" ry="2.2" fill="#9b6a48" opacity="0.16" />
        <path
          d="M51 55.5 C54 53.2 66 53.2 69 55.5 C70.5 59.5 68.5 62.5 60 62.5 C51.5 62.5 49.5 59.5 51 55.5 Z"
          fill="#382216"
        />
        <ellipse cx="56.4" cy="56.6" rx="1.7" ry="0.7" fill="#f8e3c6" opacity="0.28" />
        <path
          d="M54.4 57.7 C55.7 59.1 55.5 60.7 54.7 62.1 M65.6 57.7 C64.3 59.1 64.5 60.7 65.3 62.1"
          fill="none"
          stroke="#120804"
          strokeWidth="1.35"
          strokeLinecap="round"
        />
        <g className="xiaoyuan-mascot-mouth">
          <path
            d="M60 62.5 V67.5 M60 67.5 C57.6 70.7 55.2 70.1 53.6 68.1 M60 67.5 C62.4 70.7 64.8 70.1 66.4 68.1"
            fill="none"
            stroke="#5a3a28"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </g>
        <ellipse cx="24" cy="60" rx="6.2" ry="2.7" fill="#ef8f72" opacity="0.3" />
        <ellipse cx="96" cy="60" rx="6.2" ry="2.7" fill="#ef8f72" opacity="0.3" />
        <g fill="#8a5a3b" opacity="0.34">
          <circle cx="45" cy="73" r="0.7" />
          <circle cx="48" cy="75.5" r="0.6" />
          <circle cx="75" cy="73" r="0.7" />
          <circle cx="72" cy="75.5" r="0.6" />
        </g>
        <g
          fill="none"
          stroke="#8a5a3b"
          strokeOpacity="0.26"
          strokeWidth="0.7"
          strokeLinecap="round"
        >
          <path d="M30.5 69 L24.5 67.5 M30.5 71.5 L24 72.5" />
          <path d="M89.5 69 L95.5 67.5 M89.5 71.5 L96 72.5" />
        </g>

        {/* 薄荷绿打结领巾 */}
        <g className="xiaoyuan-mascot-collar">
          <path
            d="M39 79 C49 86.4 71 86.4 81 79 L80 84.5 C70 91.5 50 91.5 40 84.5 Z"
            fill={`url(#${collarId})`}
            stroke="#66a571"
            strokeWidth="0.6"
          />
          <path
            d="M43 82.6 C52 88 68 88 77 82.6"
            fill="none"
            stroke="#f4fff0"
            strokeOpacity="0.38"
            strokeWidth="0.8"
            strokeDasharray="1 2.4"
          />
          <path
            d="M56.8 86.4 C58.6 84.8 61.4 84.8 63.2 86.4 C62.8 90.2 61.4 92 60 93 C58.6 92 57.2 90.2 56.8 86.4 Z"
            fill="#8cc98b"
            stroke="#5f9b69"
            strokeWidth="0.6"
          />
          <path
            d="M58.2 91.4 C55.8 95.4 52.4 96.8 49.6 95.6 C51.8 93.4 53.2 90.8 54.6 88.8 Z"
            fill="#79b77d"
            stroke="#5f9b69"
            strokeWidth="0.5"
          />
          <path
            d="M61.8 91.4 C64.2 95.4 67.6 96.8 70.4 95.6 C68.2 93.4 66.8 90.8 65.4 88.8 Z"
            fill="#79b77d"
            stroke="#5f9b69"
            strokeWidth="0.5"
          />
          <circle cx="59" cy="87" r="0.9" fill="#efffdc" opacity="0.7" />
        </g>

        {/* 前爪 */}
        <g className="xiaoyuan-mascot-paw is-left">
          <ellipse cx="49.5" cy="94.5" rx="7.1" ry="4.6" fill={`url(#${shadeId})`} />
          <path
            d="M46.4 93.7 Q49.5 96 52.6 93.7"
            fill="none"
            stroke="#d9b68e"
            strokeOpacity="0.4"
            strokeWidth="0.9"
            strokeLinecap="round"
          />
        </g>
        <g className="xiaoyuan-mascot-paw is-right">
          <ellipse cx="70.5" cy="94.5" rx="7.1" ry="4.6" fill={`url(#${shadeId})`} />
          <path
            d="M67.4 93.7 Q70.5 96 73.6 93.7"
            fill="none"
            stroke="#d9b68e"
            strokeOpacity="0.4"
            strokeWidth="0.9"
            strokeLinecap="round"
          />
        </g>

        {/* 零食 */}
        <g className="xiaoyuan-mascot-snack">
          <circle
            className="xiaoyuan-mascot-cookie"
            cx="77.5"
            cy="68"
            r="6.2"
            fill={`url(#${cookieId})`}
            stroke="#b07a3c"
            strokeWidth="0.8"
          />
          <circle cx="75.6" cy="66" r="0.9" fill="#6a3b1f" />
          <circle cx="80" cy="69" r="0.8" fill="#6a3b1f" />
          <circle cx="76.8" cy="70.6" r="0.7" fill="#6a3b1f" />
          <path
            d="M81.8 63.8 C83 63 84.4 64.2 83.8 65.6 C82.8 65.2 82 64.6 81.8 63.8 Z"
            fill="#f6d48e"
            opacity="0.9"
          />
          <g className="xiaoyuan-mascot-crumbs" fill="#e7b25e">
            <circle className="is-one" cx="86" cy="74" r="0.9" />
            <circle className="is-two" cx="81" cy="77.5" r="0.7" />
            <circle className="is-three" cx="88" cy="70.5" r="0.6" />
          </g>
        </g>

        {/* 运动哑铃与汗滴 */}
        <g className="xiaoyuan-mascot-dumbbell">
          <rect x="73" y="85.4" width="16" height="3.2" rx="1.6" fill="#9bf3ff" />
          <rect
            x="70"
            y="80.6"
            width="5"
            height="12.8"
            rx="2.2"
            fill="#0c3b3a"
            stroke="#7fe7ff"
            strokeWidth="0.7"
          />
          <rect
            x="87"
            y="80.6"
            width="5"
            height="12.8"
            rx="2.2"
            fill="#0c3b3a"
            stroke="#7fe7ff"
            strokeWidth="0.7"
          />
          <rect x="71.8" y="83" width="1.6" height="8" rx="0.8" fill="#7fe7ff" opacity="0.55" />
          <rect x="88.8" y="83" width="1.6" height="8" rx="0.8" fill="#7fe7ff" opacity="0.55" />
          <circle cx="93" cy="77" r="1.1" fill="#bffcff" opacity="0.8" />
        </g>
        <g className="xiaoyuan-mascot-sweat">
          <path
            d="M93 58 C95 61 94.6 63.6 92.8 63.6 C91 63.6 90.8 61 93 58 Z"
            fill="#8bf5ff"
            opacity="0.85"
          />
        </g>

        {/* 掌上游戏机 */}
        <g className="xiaoyuan-mascot-controller">
          <rect
            x="44"
            y="88.5"
            width="32"
            height="11.5"
            rx="5.6"
            fill="#082624"
            stroke="#7fe7ff"
            strokeWidth="0.7"
          />
          <rect
            x="49.5"
            y="90.5"
            width="21"
            height="7.6"
            rx="2"
            fill="#7fe7ff"
            opacity="0.7"
            className="is-screen"
          />
          <path
            d="M45.8 93.6 H49 M47.4 92 V95.2"
            fill="none"
            stroke="#bffcff"
            strokeWidth="0.9"
            strokeLinecap="round"
          />
          <circle cx="73.2" cy="92.4" r="1.15" fill="#ffd37a" />
          <circle cx="70.8" cy="94.4" r="1" fill="#bffcff" />
          <rect x="51.5" y="92.2" width="7" height="1" rx="0.5" fill="#04211d" opacity="0.55" />
          <rect x="51.5" y="94.3" width="10" height="0.9" rx="0.45" fill="#04211d" opacity="0.4" />
          <g className="xiaoyuan-mascot-game-thumb is-left">
            <ellipse cx="46.5" cy="97.4" rx="3" ry="2.2" fill={`url(#${shadeId})`} />
          </g>
          <g className="xiaoyuan-mascot-game-thumb is-right">
            <ellipse cx="73.5" cy="97.4" rx="3" ry="2.2" fill={`url(#${shadeId})`} />
          </g>
        </g>

        {/* 手机与爱心 */}
        <g className="xiaoyuan-mascot-phone">
          <rect
            x="72"
            y="74"
            width="12.5"
            height="20"
            rx="3"
            fill="#06211f"
            stroke="#7fe7ff"
            strokeWidth="0.8"
          />
          <rect
            x="74"
            y="77"
            width="8.5"
            height="14"
            rx="1.4"
            fill="#8bf5ff"
            opacity="0.82"
            className="is-screen"
          />
          <path
            d="M75.5 79.5 H81 M75.5 82 H79.5 M75.5 84.5 H81.5"
            fill="none"
            stroke="#04211d"
            strokeOpacity="0.58"
            strokeWidth="0.8"
            strokeLinecap="round"
          />
          <circle cx="78.2" cy="91.8" r="0.7" fill="#7fe7ff" />
          <ellipse
            cx="73.6"
            cy="88.5"
            rx="1.9"
            ry="2.8"
            transform="rotate(18 73.6 88.5)"
            fill={`url(#${shadeId})`}
          />
        </g>
        <g className="xiaoyuan-mascot-hearts" fill="#ff9fb0">
          <path
            className="xiaoyuan-mascot-heart is-one"
            d="M88 64 C85 60 90 58 90 61 C90 58 95 60 92 64 C91 65.4 90 66 90 66 C90 66 89 65.4 88 64 Z"
            opacity="0.85"
          />
          <path
            className="xiaoyuan-mascot-heart is-two"
            d="M96 55 C93.6 52 97.2 50.4 97.2 53 C97.2 50.4 100.8 52 98.4 55 C97.8 55.8 97.2 56.2 97.2 56.2 C97.2 56.2 96.6 55.8 96 55 Z"
            opacity="0.65"
          />
          <path
            className="xiaoyuan-mascot-heart is-three"
            d="M84 54 C82.2 51.6 85 50.4 85 52.4 C85 50.4 87.8 51.6 86 54 C85.5 54.6 85 54.9 85 54.9 C85 54.9 84.5 54.6 84 54 Z"
            opacity="0.5"
          />
        </g>

        {/* 游戏像素星 */}
        <g className="xiaoyuan-mascot-game-stars" fill="#8bf5ff">
          <path className="xiaoyuan-mascot-star is-one" d="M94 75 V71 M92 73 H96" stroke="#8bf5ff" strokeWidth="0.9" strokeLinecap="round" />
          <path className="xiaoyuan-mascot-star is-two" d="M101 67 V63 M99 65 H103" stroke="#8bf5ff" strokeWidth="0.8" strokeLinecap="round" opacity="0.8" />
          <path className="xiaoyuan-mascot-star is-three" d="M86 67 V64 M84.5 65.5 H87.5" stroke="#8bf5ff" strokeWidth="0.7" strokeLinecap="round" opacity="0.6" />
        </g>

        {/* 上机电路与耳机 */}
        <g
          className="xiaoyuan-mascot-circuit is-trace"
          fill="none"
          stroke="#7fe7ff"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.34"
        >
          <path d="M91 57 H97 V66" />
          <rect x="94.8" y="66" width="4.2" height="4.2" rx="1" />
          <path d="M27 61 H21 V71" />
          <circle cx="21" cy="71" r="1.3" fill="#bffcff" stroke="none" />
        </g>

        <g className="xiaoyuan-mascot-headphones">
          <path
            d="M22 34 C22 17 98 17 98 34"
            fill="none"
            stroke="#06211f"
            strokeWidth="5.4"
            strokeLinecap="round"
          />
          <path
            d="M22 34 C22 17 98 17 98 34"
            fill="none"
            stroke="#7fe7ff"
            strokeOpacity="0.6"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
          <rect
            x="13.5"
            y="32"
            width="14.5"
            height="24"
            rx="7.2"
            fill="#06211f"
            stroke="#7fe7ff"
            strokeOpacity="0.5"
            strokeWidth="0.9"
          />
          <rect x="16.5" y="36" width="8.5" height="16" rx="4.2" fill="#0d3a35" />
          <circle cx="20.8" cy="44.5" r="1.8" fill="#7fe7ff" />
          <rect
            x="92"
            y="32"
            width="14.5"
            height="24"
            rx="7.2"
            fill="#06211f"
            stroke="#7fe7ff"
            strokeOpacity="0.5"
            strokeWidth="0.9"
          />
          <rect x="95" y="36" width="8.5" height="16" rx="4.2" fill="#0d3a35" />
          <circle cx="99.2" cy="44.5" r="1.8" fill="#7fe7ff" />
        </g>
      </g>

      {/* 两侧全息对话气泡 */}
      <g className="xiaoyuan-mascot-hud is-left">
        <rect
          x="2"
          y="13"
          width="26"
          height="16"
          rx="5.5"
          fill="#062b29"
          fillOpacity="0.9"
          stroke="#8bf5ff"
          strokeOpacity="0.75"
          strokeWidth="0.8"
        />
        <path
          d="M23 28.5 L29 34 L20 30.5 Z"
          fill="#062b29"
          stroke="#8bf5ff"
          strokeOpacity="0.55"
          strokeWidth="0.7"
          strokeLinejoin="round"
        />
        <path
          d="M7 20.5 H16 M7 23 H13 M7 25.5 H10"
          fill="none"
          stroke="#efffff"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.9"
        />
      </g>
      <g className="xiaoyuan-mascot-hud is-right">
        <rect
          x="93"
          y="37"
          width="24"
          height="15"
          rx="5.2"
          fill="#062b29"
          fillOpacity="0.9"
          stroke="#8bf5ff"
          strokeOpacity="0.7"
          strokeWidth="0.8"
        />
        <path
          d="M96 51 L92 56.5 L100 52.5 Z"
          fill="#062b29"
          stroke="#8bf5ff"
          strokeOpacity="0.5"
          strokeWidth="0.7"
          strokeLinejoin="round"
        />
        <path
          d="M98 43.5 H106 M98 46 H104 M98 48.5 H101.5"
          fill="none"
          stroke="#efffff"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.86"
        />
      </g>

      {/* 音符、睡眠符 */}
      <g className="xiaoyuan-mascot-note is-one">
        <path
          d="M104 34 V22 L111.5 20 V31"
          fill="none"
          stroke="#6fffd2"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />
        <ellipse cx="101.4" cy="34" rx="2.6" ry="2" fill="#6fffd2" />
        <ellipse cx="108.9" cy="31" rx="2.6" ry="2" fill="#6fffd2" />
      </g>
      <g className="xiaoyuan-mascot-note is-two">
        <path
          d="M99 46 V36 L104.5 34.5 V43.5"
          fill="none"
          stroke="#6bd9ff"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />
        <ellipse cx="97" cy="46" rx="2.1" ry="1.7" fill="#6bd9ff" />
        <ellipse cx="102.5" cy="43.5" rx="2.1" ry="1.7" fill="#6bd9ff" />
      </g>
      <g className="xiaoyuan-mascot-zzz">
        <text className="xiaoyuan-mascot-z is-one" x="95" y="34" fontSize="8">
          z
        </text>
        <text className="xiaoyuan-mascot-z is-two" x="102" y="25" fontSize="9">
          z
        </text>
        <text className="xiaoyuan-mascot-z is-three" x="109" y="15" fontSize="10">
          z
        </text>
      </g>
    </svg>
  );
}

/**
 * 全站挂着的卡皮巴拉小元。
 *
 * 面板与助手页共用 AssistantChatProvider，所以在这里问完直接去 /assistant
 * 仍能看到同一段对话。已经在助手页时不再开第二个聊天窗口，而是把焦点送回
 * 页面输入框。放歌时戴耳机跟拍摇摆；空闲时张望、伸懒腰、招手或打盹，
 * 也会自己吃零食、举哑铃、打游戏、玩手机；点击有挤压、粒子环与随机短句。
 */
export function XiaoyuanPet({ chatEnabled }: { chatEnabled: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    messages,
    status,
    busy,
    error,
    send,
    stop,
    clear,
  } = useAssistantChat();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [input, setInput] = useState("");
  const [reactionKey, setReactionKey] = useState(0);
  const [pressed, setPressed] = useState(false);
  const [quip, setQuip] = useState("");
  const [idleAction, setIdleAction] = useState<IdleAction | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [mediaMusic, setMediaMusic] = useState(false);
  const [manualMusic, setManualMusic] = useState(false);
  const [position, setPosition] = useState<PetPosition | null>(null);
  const [dragging, setDragging] = useState(false);
  const [panelPlacement, setPanelPlacement] = useState<CSSProperties | null>(null);
  const [recommendation, setRecommendation] =
    useState<PetMusicCandidate | null>(null);
  const [recommending, setRecommending] = useState(false);
  const [recommendError, setRecommendError] = useState("");
  const petRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef<PetPosition | null>(null);
  const lastRecommendedIdRef = useRef<number | null>(null);
  const recommendBusyRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    width: number;
    height: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const shouldReturnFocusRef = useRef(false);
  const wasPanelOpenRef = useRef(false);
  const pressTimerRef = useRef<number | null>(null);
  const quipTimerRef = useRef<number | null>(null);
  const assistantRoute =
    pathname === "/assistant" || pathname.startsWith("/assistant/");
  // 整页助手已经是同一段会话，不再叠一个面板；离开时保留原来的开合状态。
  const panelOpen = open && !assistantRoute;

  const closePanel = useCallback((returnFocus = false) => {
    if (returnFocus) shouldReturnFocusRef.current = true;
    setOpen(false);
  }, []);

  const commitPosition = useCallback((next: PetPosition | null) => {
    positionRef.current = next;
    setPosition(next);
  }, []);

  const flashQuip = useCallback((text: string, hold = 2200) => {
    setQuip(text);
    if (quipTimerRef.current) window.clearTimeout(quipTimerRef.current);
    quipTimerRef.current = window.setTimeout(() => setQuip(""), hold);
  }, []);

  // 记住用户把小元拖到哪里；窗口变小或旋转时再夹回可见区域。
  useEffect(() => {
    const root = petRef.current;
    if (!root) return;
    const stored = readPetPosition(window.localStorage);
    if (stored) {
      const rect = root.getBoundingClientRect();
      commitPosition(
        clampPetPosition(
          stored,
          { width: window.innerWidth, height: window.innerHeight },
          { width: rect.width || 96, height: rect.height || 104 }
        )
      );
    }
    const onResize = () => {
      const current = positionRef.current;
      if (!current) return;
      const rect = root.getBoundingClientRect();
      commitPosition(
        clampPetPosition(
          current,
          { width: window.innerWidth, height: window.innerHeight },
          { width: rect.width || 96, height: rect.height || 104 }
        )
      );
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [commitPosition]);

  // 拖过位置后，面板改为跟随萌宠的 fixed 定位并自动避让视口边缘，
  // 否则贴着屏幕左边时，右对齐的 392px 面板会伸出屏幕。
  const placePanel = useCallback(() => {
    const root = petRef.current;
    if (!position || !root) {
      setPanelPlacement(null);
      return;
    }
    const rect = root.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // 与 pet.css 的 --pet-panel-w / --pet-panel-max 对齐：440×640 上限。
    const panelWidth = Math.max(240, Math.min(440, vw - 24));
    const maxHeight = Math.max(180, Math.min(640, vh - 152));
    const gap = 10;
    const margin = 12;
    const above = Math.max(0, rect.top - margin - gap);
    const below = Math.max(0, vh - rect.bottom - margin - gap);
    const openUp = above >= Math.min(maxHeight, 360) || above >= below;
    const left = Math.max(
      margin,
      Math.min(rect.left + rect.width / 2 - panelWidth / 2, vw - panelWidth - margin)
    );
    setPanelPlacement({
      position: "fixed",
      left,
      width: panelWidth,
      maxHeight: Math.max(160, Math.min(maxHeight, openUp ? above : below)),
      ...(openUp
        ? { bottom: vh - rect.top + gap }
        : { top: rect.bottom + gap }),
    });
  }, [position]);

  // 面板定位只在「打开 / 拖动位置变化 / 窗口尺寸变化」时重算。首帧在
  // rAF 里跑，避免 effect 内同步 setState 触发的级联渲染；关闭时不清 state，
  // 由下面派生的 activePanelStyle 直接失效，省掉一次多余渲染。
  useEffect(() => {
    if (!panelOpen) return;
    const frame = window.requestAnimationFrame(placePanel);
    window.addEventListener("resize", placePanel);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", placePanel);
    };
  }, [panelOpen, placePanel]);

  // 关闭后把焦点还给萌宠按钮，避免键盘用户被丢回页面顶部。
  useEffect(() => {
    if (panelOpen) {
      wasPanelOpenRef.current = true;
      return;
    }
    if (wasPanelOpenRef.current && shouldReturnFocusRef.current) {
      shouldReturnFocusRef.current = false;
      buttonRef.current?.focus();
    }
    wasPanelOpenRef.current = false;
  }, [panelOpen]);

  useEffect(() => {
    if (!panelOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel(true);
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      closePanel();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [closePanel, panelOpen]);

  useEffect(() => {
    if (!panelOpen) return;
    const timer = window.setTimeout(
      () => inputRef.current?.focus({ preventScroll: true }),
      90
    );
    return () => window.clearTimeout(timer);
  }, [panelOpen]);

  // 眼睛轻轻跟着指针走；直接写 CSS 变量，避免每次 pointermove 都重渲染整段对话。
  useEffect(() => {
    const node = buttonRef.current;
    if (!node) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const onPointerMove = (event: PointerEvent) => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const rect = node.getBoundingClientRect();
        const dx = (event.clientX - (rect.left + rect.width / 2)) / 260;
        const dy = (event.clientY - (rect.top + rect.height / 2)) / 260;
        const clamp = (value: number) => Math.max(-1, Math.min(1, value));
        node.style.setProperty(
          "--pet-gaze-x",
          `${(clamp(dx) * 1.8).toFixed(2)}px`
        );
        node.style.setProperty(
          "--pet-gaze-y",
          `${(clamp(dy) * 1.4).toFixed(2)}px`
        );
      });
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // 待机小动作：张望、伸懒腰、招手、打盹轮着来，间隔带一点随机。
  useEffect(() => {
    if (!chatEnabled) return;
    let idleTimer = 0;
    let resetTimer = 0;
    const schedule = () => {
      idleTimer = window.setTimeout(() => {
        const next =
          IDLE_ACTIONS[Math.floor(Math.random() * IDLE_ACTIONS.length)];
        setIdleAction(next);
        resetTimer = window.setTimeout(() => {
          setIdleAction(null);
          schedule();
        }, 2800);
      }, 6500 + Math.random() * 5000);
    };
    schedule();
    return () => {
      window.clearTimeout(idleTimer);
      window.clearTimeout(resetTimer);
    };
  }, [chatEnabled]);

  // 自己的小日常：吃零食、运动、打游戏、玩手机轮流来；不打断聊天。
  useEffect(() => {
    if (!chatEnabled) return;
    let startTimer = 0;
    let stopTimer = 0;
    const schedule = () => {
      startTimer = window.setTimeout(() => {
        const next =
          ACTIVITIES[Math.floor(Math.random() * ACTIVITIES.length)];
        setActivity(next);
        stopTimer = window.setTimeout(() => {
          setActivity(null);
          schedule();
        }, ACTIVITY_HOLD_MS);
      }, ACTIVITY_DELAY_MIN_MS + Math.random() * ACTIVITY_DELAY_JITTER_MS);
    };
    schedule();
    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(stopTimer);
    };
  }, [chatEnabled]);

  // 音乐感应：useChat 之外的音乐不该被漏掉。页内 <audio>/<video> 的
  // play/pause 不冒泡，所以挂在 document 捕获阶段，再轮询 mediaSession
  // 兜住没有事件的情况；跨站 iframe 播放器浏览器不允许父页面读取，
  // 留给面板里的「听歌」手动开关。
  useEffect(() => {
    if (!chatEnabled) return;
    const syncMedia = () => {
      const media = document.querySelectorAll<HTMLMediaElement>(
        "audio, video"
      );
      const elementPlaying = Array.from(media).some(
        (node) => !node.paused && !node.ended && !node.muted && node.volume > 0
      );
      const sessionPlaying = navigator.mediaSession?.playbackState === "playing";
      setMediaMusic(elementPlaying || sessionPlaying);
    };
    const events = ["play", "playing", "pause", "ended", "emptied"] as const;
    const onMedia = () => syncMedia();
    for (const event of events) {
      document.addEventListener(event, onMedia, true);
    }
    syncMedia();
    const poll = window.setInterval(syncMedia, 1500);
    return () => {
      for (const event of events) {
        document.removeEventListener(event, onMedia, true);
      }
      window.clearInterval(poll);
    };
  }, [chatEnabled]);

  // 站内播放器、页内媒体、手动开关三种信号合并成一个根属性，
  // CSS 只认 .xiaoyuan-pet[data-music]，待机与日常动作也按它让位。
  useEffect(() => {
    const root = petRef.current;
    if (!root) return;
    const sync = () => {
      const pageMusic =
        document.documentElement.dataset.musicPlaying === "true";
      root.dataset.music =
        pageMusic || mediaMusic || manualMusic ? "true" : "false";
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-music-playing"],
    });
    return () => observer.disconnect();
  }, [manualMusic, mediaMusic]);

  useEffect(
    () => () => {
      if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
      if (quipTimerRef.current) window.clearTimeout(quipTimerRef.current);
    },
    []
  );

  const focusPageComposer = useCallback(() => {
    const composer = document.querySelector<HTMLTextAreaElement>(
      "[data-assistant-composer]"
    );
    if (!composer) return false;
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    composer.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "center",
    });
    composer.focus({ preventScroll: true });
    return true;
  }, []);

  // 每次点击：挤压一下、冒一圈粒子，再随机说一句；放歌时换成跟音乐有关的短句。
  const react = useCallback(() => {
    setReactionKey((key) => key + 1);
    setPressed(true);
    if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current);
    pressTimerRef.current = window.setTimeout(() => setPressed(false), 320);

    const musicOn =
      mediaMusic ||
      manualMusic ||
      document.documentElement.dataset.musicPlaying === "true";
    const pool = musicOn
      ? PET_MUSIC_QUIPS
      : activity
        ? PET_ACTIVITY_QUIPS[activity]
        : PET_QUIPS;
    setQuip(pool[Math.floor(Math.random() * pool.length)] ?? "在呢！");
    if (quipTimerRef.current) window.clearTimeout(quipTimerRef.current);
    quipTimerRef.current = window.setTimeout(() => setQuip(""), 2000);
  }, [activity, manualMusic, mediaMusic]);

  // 跨站 iframe / 外部播放器读不到播放状态时，由用户手动给小元戴上耳机。
  const toggleMusic = () => {
    const next = !manualMusic;
    setManualMusic(next);
    setQuip(next ? "耳机戴好啦～" : "先摘会儿耳机");
    if (quipTimerRef.current) window.clearTimeout(quipTimerRef.current);
    quipTimerRef.current = window.setTimeout(() => setQuip(""), 2000);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || dragRef.current) return;
    const root = petRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      width: rect.width || 96,
      height: rect.height || 104,
      moved: false,
    };
    suppressClickRef.current = false;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // 指针捕获失败时仍可依靠按钮上的 pointermove 完成拖动
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    if (!drag.moved) {
      drag.moved = true;
      setDragging(true);
      closePanel();
      if (quipTimerRef.current) window.clearTimeout(quipTimerRef.current);
      setQuip("");
    }
    event.preventDefault();
    commitPosition(
      clampPetPosition(
        { x: drag.originX + dx, y: drag.originY + dy },
        { width: window.innerWidth, height: window.innerHeight },
        { width: drag.width, height: drag.height }
      )
    );
  };

  const finishDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    save: boolean
  ) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (drag.moved && save) {
      suppressClickRef.current = true;
      const current = positionRef.current;
      if (current) writePetPosition(window.localStorage, current);
    }
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // 指针已经释放时忽略
    }
  };

  const resetPosition = () => {
    commitPosition(null);
    try {
      window.localStorage.removeItem(PET_POSITION_KEY);
    } catch {
      // 隐私模式读不到 localStorage 时仍然归位
    }
    setQuip("回到角落啦");
    if (quipTimerRef.current) window.clearTimeout(quipTimerRef.current);
    quipTimerRef.current = window.setTimeout(() => setQuip(""), 2000);
  };

  // 点歌：挑一首能站内出声的歌，直接送进全站播放器，并在面板里留一张
  // 正在播放的卡片；「换一首」会避开刚放过的这首。
  const recommendAndPlay = useCallback(async () => {
    if (recommendBusyRef.current) return;
    recommendBusyRef.current = true;
    setRecommending(true);
    setRecommendError("");
    try {
      const result = await recommendSongForPet(
        lastRecommendedIdRef.current ?? undefined
      );
      if (!result.ok || !result.candidate) {
        setRecommendError(result.error ?? "这次没找到能播的歌");
        return;
      }
      const candidate = result.candidate;
      lastRecommendedIdRef.current = candidate.track.id;
      setRecommendation(candidate);
      requestPlayQueue([candidate.track], 0, {
        title: candidate.playlistTitle,
        cover: candidate.playlistCover,
      });
      flashQuip(`放《${candidate.track.title}》给你听～`, 2600);
    } catch {
      setRecommendError("歌单暂时读不到，稍后再试");
    } finally {
      recommendBusyRef.current = false;
      setRecommending(false);
    }
  }, [flashQuip]);

  const toggle = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    react();
    if (assistantRoute) {
      if (focusPageComposer()) {
        setOpen(false);
        return;
      }
    }
    setOpen((current) => !current);
  };

  const submit = (text: string) => {
    if (!text.trim()) return;
    // 「推荐一首歌」「来点音乐」这类短句直接点歌，不再绕去问模型：
    // 模型只能描述歌，点歌要的是播放器真的响起来。
    if (isSongRecommendationRequest(text)) {
      setInput("");
      void recommendAndPlay();
      return;
    }
    if (!send(text)) return;
    setInput("");
  };

  const openSource = (source: ChatSource) => {
    setOpen(false);
    router.push(source.href?.trim() || `/notes/${source.slug}`);
  };

  const clearConversation = () => {
    clear();
    setInput("");
  };

  if (!chatEnabled) return null;

  const hint = assistantRoute
    ? "我就在页面上，去输入框找我"
    : busy
      ? status === "submitted"
        ? "正在翻笔记…"
        : "正在想…"
      : messages.length > 0
        ? "接着聊？"
        : "在呢，点我聊聊";

  return (
    <div
      ref={petRef}
      className="xiaoyuan-pet"
      data-open={panelOpen ? "true" : "false"}
      data-busy={busy ? "true" : "false"}
      data-route={assistantRoute ? "assistant" : "page"}
      data-idle={idleAction ?? "none"}
      data-activity={activity ?? "none"}
      data-press={pressed ? "true" : "false"}
      data-dragged={position ? "true" : "false"}
      data-dragging={dragging ? "true" : "false"}
      style={position ? { left: position.x, top: position.y } : undefined}
    >
      {panelOpen && (
        <section
          ref={panelRef}
          id="xiaoyuan-pet-panel"
          className="xiaoyuan-panel"
          role="dialog"
          aria-label="小元同学对话"
          style={position ? (panelPlacement ?? undefined) : undefined}
        >
          <header className="xiaoyuan-panel-head">
            <span className="xiaoyuan-panel-avatar">
              <XiaoyuanMascot />
            </span>
            <span className="xiaoyuan-panel-id">
              <strong>小元同学</strong>
              <small data-state={busy ? "busy" : "ready"}>
                <i aria-hidden="true" />
                {busy
                  ? status === "submitted"
                    ? "检索中"
                    : "生成中"
                  : "在线 · 全站同步"}
              </small>
            </span>
            <span className="xiaoyuan-panel-actions">
              <button
                type="button"
                className="xiaoyuan-panel-more"
                aria-label="更多操作"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                title="更多操作"
                onClick={() => setMenuOpen((value) => !value)}
              >
                ⋯
              </button>
              <button
                type="button"
                className="xiaoyuan-panel-close"
                aria-label="关闭小元同学对话"
                onClick={() => closePanel(true)}
              >
                ×
              </button>
            </span>

            {/* 五个并排的小按钮换成一张菜单：头像旁只留「更多」与「关闭」。 */}
            {menuOpen && (
              <div className="xiaoyuan-panel-menu" role="menu" aria-label="小元同学的操作">
                <button
                  type="button"
                  role="menuitem"
                  className="xiaoyuan-panel-pick"
                  disabled={recommending}
                  onClick={() => {
                    setMenuOpen(false);
                    void recommendAndPlay();
                  }}
                >
                  <span aria-hidden="true">♪</span>
                  {recommending ? "找歌中…" : "推荐一首歌"}
                </button>
                <button
                  type="button"
                  role="menuitemcheckbox"
                  className="xiaoyuan-panel-music"
                  aria-checked={manualMusic}
                  aria-label={
                    manualMusic ? "关闭小元的听歌模式" : "开启小元的听歌模式"
                  }
                  title="外部播放器或跨站音乐也能让小元戴上耳机"
                  onClick={() => {
                    setMenuOpen(false);
                    toggleMusic();
                  }}
                >
                  <span aria-hidden="true">♫</span>
                  <span className="xiaoyuan-panel-music-label">
                    听歌模式{manualMusic ? "（开）" : ""}
                  </span>
                </button>
                {position && (
                  <button
                    type="button"
                    role="menuitem"
                    className="xiaoyuan-panel-home"
                    onClick={() => {
                      setMenuOpen(false);
                      resetPosition();
                    }}
                  >
                    <span aria-hidden="true">⌂</span>
                    回到右下角
                  </button>
                )}
                <Link
                  href="/assistant"
                  role="menuitem"
                  className="xiaoyuan-panel-expand"
                  onClick={() => closePanel()}
                >
                  <span aria-hidden="true">↗</span>
                  打开全页
                </Link>
              </div>
            )}
          </header>

          <ChatThread
            dense
            messages={messages}
            status={status}
            error={error}
            onOpenSource={openSource}
            className="xiaoyuan-panel-thread"
            empty={
              <div className="xy-chat-greeting">
                <p>
                  我是小元同学。站内的问题、项目或技术话题，都可以直接问我。
                </p>
                <div className="xy-chat-suggestions">
                  {PET_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => submit(prompt)}
                    >
                      {prompt}
                      <span aria-hidden="true">→</span>
                    </button>
                  ))}
                </div>
              </div>
            }
          />

          {(recommendation || recommendError) && (
            <div className="xiaoyuan-panel-recommend">
              {recommendation && (
                <div className="xiaoyuan-pet-recommend">
                  <span className="xiaoyuan-pet-recommend-art" aria-hidden="true">
                    {recommendation.track.coverUrl ||
                    recommendation.playlistCover ? (
                      <img
                        src={
                          recommendation.track.coverUrl ??
                          recommendation.playlistCover ??
                          ""
                        }
                        alt=""
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span>♪</span>
                    )}
                  </span>
                  <span className="xiaoyuan-pet-recommend-meta">
                    <small>已送进播放器</small>
                    <strong>{recommendation.track.title}</strong>
                    <span>
                      {recommendation.track.artist} ·{" "}
                      {recommendation.playlistTitle}
                    </span>
                  </span>
                  <span className="xiaoyuan-pet-recommend-actions">
                    {recommendation.playlistId !== null && (
                      <Link
                        href={`/playlist/${recommendation.playlistId}`}
                        onClick={() => closePanel()}
                      >
                        歌单
                      </Link>
                    )}
                    <button
                      type="button"
                      disabled={recommending}
                      onClick={() => void recommendAndPlay()}
                    >
                      {recommending ? "找歌中…" : "换一首"}
                    </button>
                  </span>
                </div>
              )}
              {recommendError && (
                <p className="xiaoyuan-pet-recommend-error" role="status">
                  {recommendError}
                </p>
              )}
            </div>
          )}

          <ChatComposer
            dense
            value={input}
            onChange={setInput}
            onSubmit={() => submit(input)}
            onStop={stop}
            busy={busy}
            autoFocus
            hint={
              messages.length > 0 ? (
                <button type="button" onClick={clearConversation}>
                  清空
                </button>
              ) : (
                "Enter 发送 · Shift+Enter 换行"
              )
            }
          />
        </section>
      )}

      <div className="xiaoyuan-pet-anchor">
        <span className="xiaoyuan-pet-hint" aria-hidden="true">
          {hint}
        </span>
        <span className="xiaoyuan-pet-spark is-one" aria-hidden="true" />
        <span className="xiaoyuan-pet-spark is-two" aria-hidden="true" />
        <button
          ref={buttonRef}
          type="button"
          className="xiaoyuan-pet-trigger"
          aria-label={
            assistantRoute
              ? "去小元同学的输入框"
              : panelOpen
                ? "收起小元同学对话"
                : "和小元同学聊聊"
          }
          aria-expanded={panelOpen}
          aria-controls="xiaoyuan-pet-panel"
          title="拖动可移动小元 · 点击聊天"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(event) => finishDrag(event, true)}
          onPointerCancel={(event) => finishDrag(event, false)}
          onClick={toggle}
        >
          <span className="xiaoyuan-pet-halo" aria-hidden="true" />
          <XiaoyuanMascot />
          <span
            className="xiaoyuan-pet-status"
            data-state={busy ? "busy" : "ready"}
            aria-hidden="true"
          />
          <span className="xiaoyuan-pet-name" aria-hidden="true">
            <span className="xiaoyuan-pet-eq">
              <b />
              <b />
              <b />
            </span>
            <i />
            小元同学
          </span>
        </button>
        {reactionKey > 0 && (
          <span
            key={reactionKey}
            className="xiaoyuan-pet-burst"
            aria-hidden="true"
          >
            <i className="is-ring" />
            <i className="is-dot is-one" />
            <i className="is-dot is-two" />
            <i className="is-dot is-three" />
            <i className="is-dot is-four" />
          </span>
        )}
      </div>
      {quip && (
        <span className="xiaoyuan-pet-quip" aria-hidden="true">
          {quip}
        </span>
      )}
    </div>
  );
}