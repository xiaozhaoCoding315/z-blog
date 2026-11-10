/**
 * 歌单导入的纯函数层：链接识别、平台响应归一化、手动曲目、播放地址。
 *   node --test scripts/playlist-core.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_IMPORT_TRACKS,
  formatDuration,
  isDirectAudioUrl,
  neteaseEmbedUrl,
  normalizeNeteasePlaylist,
  normalizeQqPlaylist,
  parseManualTracks,
  parsePlaylistUrl,
  trackSearchUrl,
} from "../src/lib/playlist-core.ts";

const neteaseRaw = {
  result: {
    id: 24381616,
    name: "  夜航西飞  ",
    description: "一张歌单",
    coverImgUrl: "http://p1.music.126.net/cover.jpg",
    tracks: [
      {
        id: 111,
        name: "第一首",
        ar: [{ name: "歌手A" }, { name: "歌手B" }],
        al: { picUrl: "http://p2.music.126.net/a.jpg" },
        dt: 245_000,
      },
      { id: 112, name: "第二首", artists: [{ name: "歌手C" }], duration: 61_000 },
      { id: 0, name: "没有 id" },
      { id: 113, name: "" },
    ],
  },
};

const qqRaw = {
  cdlist: [
    {
      disstid: 7218364,
      dissname: "公路与海",
      desc: "QQ 歌单",
      logo: "http://qpic.y.qq.com/logo.jpg",
      songlist: [
        {
          songmid: "003a",
          songname: "出发",
          singer: [{ name: "乐队" }],
          albummid: "001b",
          interval: 200,
        },
        { songmid: "", songname: "缺 mid" },
        { songmid: "004c", name: "夜路", interval: 0 },
      ],
    },
  ],
};

test("链接：网易云网页、hash 路由与 /playlist/{id} 都能认出", () => {
  const urls = [
    "https://music.163.com/playlist?id=24381616",
    "https://music.163.com/#/playlist?id=24381616",
    "https://music.163.com/playlist/24381616/",
  ];
  for (const url of urls) {
    const result = parsePlaylistUrl(url);
    assert.equal(result.ok, true, url);
    assert.equal(result.value.provider, "netease");
    assert.equal(result.value.externalId, "24381616");
  }
});

test("链接：网易云短链保留给服务端跟随跳转，不瞎猜 id", () => {
  const result = parsePlaylistUrl("https://163cn.tv/abc123");
  assert.equal(result.ok, true);
  assert.equal(result.value.provider, "netease");
  assert.equal(result.value.externalId, null);
});

test("链接：QQ 音乐 playlist / taoge / query / 短链", () => {
  assert.equal(
    parsePlaylistUrl("https://y.qq.com/n/ryqq/playlist/7218364").value.externalId,
    "7218364"
  );
  assert.equal(
    parsePlaylistUrl("https://y.qq.com/n/yqq/taoge.html?id=7218364").value.externalId,
    "7218364"
  );
  assert.equal(
    parsePlaylistUrl("https://y.qq.com/n/ryqq/playlist/7218364.html").value.externalId,
    "7218364"
  );
  assert.equal(
    parsePlaylistUrl("https://c6.y.qq.com/base/fcgi-bin/u?__=x").value.externalId,
    null
  );
});

test("链接：无法识别的输入给出明确错误", () => {
  assert.equal(parsePlaylistUrl("").ok, false);
  assert.equal(parsePlaylistUrl("随便一段话").ok, false);
  assert.equal(parsePlaylistUrl("ftp://music.163.com/x").ok, false);
  assert.equal(parsePlaylistUrl("https://example.com/playlist?id=1").ok, false);
  assert.equal(parsePlaylistUrl("https://music.163.com/discover").ok, false);
});

test("网易云归一化：标题、封面、时长、艺人合并", () => {
  const result = normalizeNeteasePlaylist(neteaseRaw, "999");
  assert.equal(result.ok, true);
  const playlist = result.value;
  assert.equal(playlist.title, "夜航西飞");
  assert.equal(playlist.platform, "netease");
  assert.equal(playlist.externalId, "24381616");
  assert.equal(playlist.externalUrl, "https://music.163.com/#/playlist?id=24381616");
  // http 封面统一升级成 https，避免混合内容
  assert.equal(playlist.coverUrl, "https://p1.music.126.net/cover.jpg");
  assert.equal(playlist.tracks.length, 2);
  assert.equal(playlist.tracks[0].artist, "歌手A / 歌手B");
  assert.equal(playlist.tracks[0].duration, 245);
  assert.equal(playlist.tracks[0].coverUrl, "https://p2.music.126.net/a.jpg");
  assert.equal(playlist.tracks[1].artist, "歌手C");
  assert.equal(playlist.tracks[1].duration, 61);
  assert.match(playlist.tracks[0].url, /music\.163\.com\/#\/song\?id=111/);
});

test("网易云归一化：空歌单与坏响应不伪造曲目", () => {
  const empty = normalizeNeteasePlaylist(
    { result: { id: 1, name: "空", tracks: [] } },
    "1"
  );
  assert.equal(empty.ok, false);
  assert.match(empty.error, /没有返回可导入的曲目/);
  assert.equal(normalizeNeteasePlaylist(null, "1").ok, false);
  assert.equal(normalizeNeteasePlaylist({}, "1").ok, false);
});

test("QQ 归一化：songmid、封面、时长与专辑封面模板", () => {
  const result = normalizeQqPlaylist(qqRaw, "999");
  assert.equal(result.ok, true);
  const playlist = result.value;
  assert.equal(playlist.title, "公路与海");
  assert.equal(playlist.platform, "qq");
  assert.equal(playlist.externalId, "7218364");
  assert.equal(playlist.tracks.length, 2);
  assert.equal(playlist.tracks[0].artist, "乐队");
  assert.equal(playlist.tracks[0].duration, 200);
  assert.equal(
    playlist.tracks[0].coverUrl,
    "https://y.qq.com/music/photo_new/T002R300x300M000001b.jpg"
  );
  assert.match(playlist.tracks[0].url, /songDetail\/003a/);
  assert.equal(playlist.tracks[1].artist, "未知艺人");
  assert.equal(playlist.tracks[1].duration, null);
});

test("QQ 新接口：musicu.fcg 的 dirinfo / songlist 归一化", () => {
  const raw = {
    req_0: {
      code: 0,
      data: {
        dirinfo: {
          id: 7707261125,
          title: "甜度爆表",
          desc: "甜系说唱",
          picurl: "https://qpic.y.qq.com/cover/600",
          songnum: 1,
        },
        songlist: [
          {
            mid: "002xTzGb2UBQRk",
            name: "你的",
            singer: [{ name: "DouDou" }, { name: "Viva宋佩豫" }],
            interval: 163,
            album: { mid: "0023VbHy1oT80v" },
          },
          { mid: "", name: "缺 mid" },
        ],
        total_song_num: 2,
      },
    },
  };
  const result = normalizeQqPlaylist(raw, "0");
  assert.equal(result.ok, true);
  assert.equal(result.value.title, "甜度爆表");
  assert.equal(result.value.externalId, "7707261125");
  assert.equal(result.value.coverUrl, "https://qpic.y.qq.com/cover/600");
  assert.equal(result.value.description, "甜系说唱");
  assert.equal(result.value.tracks.length, 1);
  assert.equal(result.value.tracks[0].artist, "DouDou / Viva宋佩豫");
  assert.equal(result.value.tracks[0].externalId, "002xTzGb2UBQRk");
  assert.equal(result.value.tracks[0].duration, 163);
  assert.equal(
    result.value.tracks[0].coverUrl,
    "https://y.qq.com/music/photo_new/T002R300x300M0000023VbHy1oT80v.jpg"
  );
});

test("QQ 归一化：空歌单不伪造曲目", () => {
  const result = normalizeQqPlaylist({ cdlist: [{ disstid: 1, songlist: [] }] }, "1");
  assert.equal(result.ok, false);
  assert.match(result.error, /没有返回可导入的曲目/);
});

test("归一化：超过 300 首只保留前 300", () => {
  const many = {
    result: {
      id: 5,
      name: "很长",
      tracks: Array.from({ length: MAX_IMPORT_TRACKS + 20 }, (_, i) => ({
        id: i + 1,
        name: `曲目 ${i + 1}`,
      })),
    },
  };
  const result = normalizeNeteasePlaylist(many, "5");
  assert.equal(result.ok, true);
  assert.equal(result.value.tracks.length, MAX_IMPORT_TRACKS);
});

test("手动导入：短横线、竖线与制表符都能分列", () => {
  const tracks = parseManualTracks(
    "晴天 - 周杰伦\n夜曲 | 周杰伦\n稻香\t周杰伦\n\n  ",
    "netease"
  );
  assert.equal(tracks.length, 3);
  assert.deepEqual(
    tracks.map((track) => [track.title, track.artist]),
    [
      ["晴天", "周杰伦"],
      ["夜曲", "周杰伦"],
      ["稻香", "周杰伦"],
    ]
  );
  assert.equal(tracks[0].externalId, null);
  assert.match(tracks[0].url, /music\.163\.com\/#\/search/);
});

test("手动导入：不带空白的连字符不会被切开（Lo-fi / A-Lin）", () => {
  const tracks = parseManualTracks("Lo-fi 午后 - 某艺人\nA-Lin - 给我一个理由忘记", "qq");
  assert.deepEqual(
    tracks.map((track) => [track.title, track.artist]),
    [
      ["Lo-fi 午后", "某艺人"],
      ["A-Lin", "给我一个理由忘记"],
    ]
  );
});

test("手动导入：缺歌手标为未知艺人，空行与空歌名忽略", () => {
  const tracks = parseManualTracks("只有歌名\n - 只有歌手 \n\n", "other");
  // 行首的「- 」没有前导空白，按整行歌名保留，不当作分隔符
  assert.equal(tracks.length, 2);
  assert.equal(tracks[0].title, "只有歌名");
  assert.equal(tracks[0].artist, "未知艺人");
  assert.equal(tracks[1].title, "- 只有歌手");

  // 竖线前面没有歌名时整行被跳过，而不是造一条空标题曲目
  assert.equal(parseManualTracks("| 只有歌手", "other").length, 0);
});

test("手动导入：上限同为 300 首", () => {
  const raw = Array.from({ length: MAX_IMPORT_TRACKS + 5 }, (_, i) => `歌 ${i}`).join("\n");
  assert.equal(parseManualTracks(raw, "other").length, MAX_IMPORT_TRACKS);
});

test("播放地址：官方外链播放器与直接音频判断", () => {
  assert.equal(
    neteaseEmbedUrl("111"),
    "https://music.163.com/outchain/player?type=2&id=111&auto=1&height=66"
  );
  assert.match(neteaseEmbedUrl("111", false), /auto=0/);
  assert.equal(isDirectAudioUrl("https://cdn.example.com/a.mp3"), true);
  assert.equal(isDirectAudioUrl("https://cdn.example.com/a.M4A?x=1"), true);
  assert.equal(isDirectAudioUrl("https://music.163.com/song?id=1"), false);
  assert.equal(isDirectAudioUrl("不是链接"), false);
});

test("时长格式化", () => {
  assert.equal(formatDuration(245), "4:05");
  assert.equal(formatDuration(61), "1:01");
  assert.equal(formatDuration(3600), "60:00");
  assert.equal(formatDuration(null), "--:--");
  assert.equal(formatDuration(0), "--:--");
});

test("手动曲目搜索地址按平台区分", () => {
  assert.match(trackSearchUrl("netease", "晴天", "周杰伦"), /music\.163\.com/);
  assert.match(trackSearchUrl("qq", "晴天", "周杰伦"), /y\.qq\.com/);
  assert.match(trackSearchUrl("other", "晴天", "周杰伦"), /bing\.com/);
});