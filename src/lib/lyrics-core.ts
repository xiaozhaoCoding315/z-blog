/**
 * 歌词与段落解析（纯函数，可单独跑 node --test）。
 *
 * 网易云返回的是标准 LRC：一行可带多个时间戳，毫秒有两位/三位，
 * 制作人名单混在正文里，翻译是另一份同时间轴的 LRC。
 * 这里只做保守的清洗：认不出的行丢掉，不猜测歌词内容。
 */

export interface LyricLine {
  time: number;
  text: string;
  translation: string | null;
  /** 下一行开始时间；最后一行按 6 秒估。 */
  end: number;
}

export interface LyricChorusRange {
  start: number;
  end: number;
}

export type LyricSectionKind =
  | "intro"
  | "verse"
  | "bridge"
  | "chorus"
  | "outro"
  | "instrumental";

export interface ParsedLyrics {
  lines: LyricLine[];
  credits: string[];
  chorus: LyricChorusRange[];
  /** 两句主歌之间足够长的留白，取后半段作为间奏。 */
  bridges: LyricChorusRange[];
}

interface RawEntry {
  time: number;
  text: string;
}

const TIMESTAMP_LINE =
  /^\s*((?:\[\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?\])+)\s*(.*)$/;
const TIMESTAMP = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

/** 制作名单：只认明确的角色前缀，避免把 “曲终人散” 这类歌词当 credits。 */
const CREDIT =
  /^\s*(作词|作曲|编曲|制作人|出品人|出品|监制|混音师|混音|母带后期|母带|录音师|录音|吉他|贝斯|鼓|键盘|和声|弦乐|演唱|原唱|翻唱|发行|策划|统筹|封面|文案|特别鸣谢|词|曲|OP|SP)\s*[:：]/i;

/** 去掉紧跟时间戳的 LRC 元数据标签（[by:…] 等），避免混进歌词正文。 */
function cleanText(text: string): string {
  let value = text.trim();
  const known = new Set(["by", "ar", "al", "ti", "re", "ve", "offset"]);
  for (;;) {
    const tag = /^\[([a-z]+):[^\]]*\]\s*/i.exec(value);
    if (!tag || !known.has(tag[1].toLowerCase())) break;
    value = value.slice(tag[0].length).trim();
  }
  return value;
}

function parseEntries(lrc: string): RawEntry[] {
  const entries: RawEntry[] = [];
  for (const row of lrc.split(/\r?\n/)) {
    const match = TIMESTAMP_LINE.exec(row);
    if (!match) continue;
    const text = cleanText(match[2]);
    if (!text) continue;
    for (const stamp of match[1].matchAll(TIMESTAMP)) {
      const minutes = Number(stamp[1]);
      const seconds = Number(stamp[2]);
      const fraction = stamp[3] ? Number(`0.${stamp[3]}`) : 0;
      entries.push({ time: minutes * 60 + seconds + fraction, text });
    }
  }
  return entries;
}

function isCredit(text: string): boolean {
  return CREDIT.test(text);
}

function collectCredits(texts: string[]): string[] {
  const seen = new Set<string>();
  const credits: string[] = [];
  for (const text of texts) {
    if (!isCredit(text) || seen.has(text)) continue;
    seen.add(text);
    credits.push(text);
  }
  return credits;
}

/**
 * 翻译与原文对齐：时间差 50ms 内视为同一句；翻译等于原文时不再重复展示。
 * 翻译文件里也会混制作名单，一律只用于 credits 判断。
 */
function attachTranslations(
  entries: RawEntry[],
  translation: string
): (string | null)[] {
  if (!translation.trim()) return entries.map(() => null);
  const translated = parseEntries(translation)
    .filter((entry) => !isCredit(entry.text))
    .sort((a, b) => a.time - b.time);
  return entries.map((entry) => {
    let best: RawEntry | null = null;
    let bestGap = 0.05;
    for (const candidate of translated) {
      const gap = Math.abs(candidate.time - entry.time);
      if (gap <= bestGap) {
        best = candidate;
        bestGap = gap;
      }
      if (candidate.time > entry.time + 0.05) break;
    }
    if (!best || best.text === entry.text) return null;
    return best.text;
  });
}

/** 归一化用于判断“同一段歌词”：去掉大小写、空格与标点。 */
function normalizeLine(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

/**
 * 高潮识别：找连续 2–6 行、至少出现两次的歌词块，优先最长块。
 * 不依赖平台标签，也不假装能听懂音乐；命中后由特效层加强律动。
 */
function detectChorus(lines: LyricLine[]): LyricChorusRange[] {
  const texts = lines.map((line) => normalizeLine(line.text));
  const maxWindow = Math.min(6, Math.floor(texts.length / 2));
  for (let size = maxWindow; size >= 2; size -= 1) {
    const occurrences = new Map<string, number[]>();
    for (let start = 0; start + size <= texts.length; start += 1) {
      const block = texts.slice(start, start + size);
      if (block.some((text) => text.length < 2)) continue;
      const signature = block.join("\u0001");
      const starts = occurrences.get(signature) ?? [];
      if (starts[starts.length - 1] !== start) starts.push(start);
      occurrences.set(signature, starts);
    }

    const ranges: LyricChorusRange[] = [];
    for (const starts of occurrences.values()) {
      if (starts.length < 2) continue;
      for (const start of starts) {
        const first = lines[start];
        const last = lines[start + size - 1];
        if (first && last) ranges.push({ start: first.time, end: last.end });
      }
    }
    if (ranges.length === 0) continue;

    ranges.sort((a, b) => a.start - b.start || a.end - b.end);
    const merged: LyricChorusRange[] = [];
    for (const range of ranges) {
      const previous = merged[merged.length - 1];
      if (previous && range.start <= previous.end + 0.5) {
        previous.end = Math.max(previous.end, range.end);
      } else {
        merged.push({ ...range });
      }
    }
    const usable = merged.filter((range) => range.end - range.start >= 4);
    if (usable.length > 0) return usable;
  }
  return [];
}

/**
 * 间奏识别：两句歌词之间至少留 8 秒，就把后半段视作间奏。
 * 只取后半段，是为了让上一句的余韵先落到主歌；没有长留白就不硬造间奏。
 * 已经落在副歌里的留白不重复标记，避免盖掉高潮。
 */
const BRIDGE_MIN_GAP = 8;

function detectBridges(
  lines: LyricLine[],
  chorus: LyricChorusRange[]
): LyricChorusRange[] {
  const bridges: LyricChorusRange[] = [];
  for (let index = 1; index < lines.length; index += 1) {
    const previous = lines[index - 1];
    const next = lines[index];
    const gap = next.time - previous.time;
    if (gap < BRIDGE_MIN_GAP) continue;
    const start = previous.time + Math.max(2.5, gap * 0.45);
    const end = next.time - 0.35;
    if (end - start < 2) continue;
    if (chorus.some((range) => start < range.end && end > range.start)) continue;
    bridges.push({ start, end });
  }
  return bridges;
}

export function buildLyrics(lrc: string, translation = ""): ParsedLyrics {
  const content = parseEntries(lrc).filter((entry) => !isCredit(entry.text));
  const credits = collectCredits(parseEntries(lrc).map((entry) => entry.text));
  const sorted = content
    .map((entry, index) => ({ ...entry, index }))
    .sort((a, b) => a.time - b.time || a.index - b.index);
  const translations = attachTranslations(content, translation);

  const lines: LyricLine[] = [];
  sorted.forEach((entry, index) => {
    const next = sorted[index + 1];
    const sourceIndex = entry.index;
    const previous = lines[lines.length - 1];
    if (previous && Math.abs(previous.time - entry.time) < 0.001 && previous.text === entry.text) {
      return;
    }
    lines.push({
      time: entry.time,
      text: entry.text,
      translation: translations[sourceIndex] ?? null,
      end: next ? Math.max(next.time, entry.time + 0.5) : entry.time + 6,
    });
  });

  const chorus = detectChorus(lines);
  return { lines, credits, chorus, bridges: detectBridges(lines, chorus) };
}

/** 当前唱到第几句；还没开始返回 -1。 */
export function activeLineIndex(lyrics: ParsedLyrics, time: number): number {
  const lines = lyrics.lines;
  let low = 0;
  let high = lines.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (lines[middle].time <= time + 0.12) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}

/** 按播放进度给出段落：前奏 / 高潮 / 间奏 / 主歌 / 尾奏；没有歌词就是纯音乐。 */
export function sectionAt(time: number, lyrics: ParsedLyrics): LyricSectionKind {
  const { lines, chorus, bridges } = lyrics;
  if (lines.length === 0) return "instrumental";
  if (time < lines[0].time - 2) return "intro";
  const last = lines[lines.length - 1];
  if (time > last.end) return "outro";
  for (const range of chorus) {
    if (time >= range.start && time < range.end) return "chorus";
  }
  for (const range of bridges) {
    if (time >= range.start && time < range.end) return "bridge";
  }
  return "verse";
}