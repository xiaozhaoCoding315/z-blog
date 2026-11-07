import type { Moment } from "@/lib/life";

/**
 * 阶段 1 的假数据。阶段 2 接上数据库后整份删除。
 * 时间一律带 +08:00，避免和服务端时区打架。
 */
export const mockMoments: Moment[] = [
  {
    id: "m-2026-11-05",
    kind: "text",
    publishedAt: "2026-11-05T21:40:00+08:00",
    body: "降温了。把阳台上的薄荷搬进屋，顺手给自己煮了碗面。",
    weather: "阴",
    place: "杭州",
    mood: "安静",
  },
  {
    id: "m-2026-11-03",
    kind: "photo",
    publishedAt: "2026-11-03T16:20:00+08:00",
    body: "城南那家旧书店，二楼靠窗的位置还在。老板换了台唱片机。",
    place: "南京西路",
  },
  {
    id: "m-2026-11-01",
    kind: "song",
    publishedAt: "2026-11-01T23:10:00+08:00",
    body: "十一月的第一首歌。",
    card: {
      title: "Merry Christmas Mr. Lawrence",
      meta: "坂本龍一",
      note: "每年入冬都会翻出来听一遍。",
    },
  },
  {
    id: "m-2026-10-28",
    kind: "text",
    publishedAt: "2026-10-28T09:15:00+08:00",
    body: "早起去菜场，卖豆腐的阿姨记得我不吃香菜。",
    weather: "晴",
    place: "杭州",
  },
  {
    id: "m-2026-10-24",
    kind: "shelf",
    publishedAt: "2026-10-24T22:00:00+08:00",
    body: "",
    card: {
      title: "《城市与狗》",
      meta: "巴尔加斯·略萨",
      note: "读到最后才发现，前面所有的玩笑都是为了最后那一页。",
    },
  },
  {
    id: "m-2026-10-19",
    kind: "quote",
    publishedAt: "2026-10-19T20:30:00+08:00",
    body: "",
    card: {
      title: "“把日子过成日子，而不是过成任务。”",
      meta: "摘自已忘记名字的播客",
    },
  },
];
