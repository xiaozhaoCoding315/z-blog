/**
 * 网易云扫码登录的 eapi 请求构造（纯函数，`node --test` 可直接跑）。
 *
 * 网页式的明文请求（GET /api/login/qrcode/...）看起来能用，扫码后却会被
 * 网易云风控以 8821「请切换其他登录方式或升级新版本再试」拒绝。
 * 官方 PC 客户端的做法是：
 *
 *   POST interfacepc.music.163.com/eapi/login/qrcode/{unikey,client/login}
 *   体为 params=<AES-128-ECB + MD5 摘要，全大写十六进制>
 *   Cookie 与加密体的 header 里都带同一个随机 deviceId
 *   二维码内容追加 chainId=v1_<deviceId>_pc_login_<毫秒>
 *
 * 这里只拼请求，不发网络；抓取与错误处理留在 music-auth。
 */
import { createCipheriv, createHash, randomBytes } from "node:crypto";

const EAPI_KEY = "e82ckenh8dichen8";
const EAPI_HOST = "https://interfacepc.music.163.com";

/** 官方 Windows 客户端版本，扫码登录必须以此身份出现 */
export const PC_APPVER = "3.1.17.204416";
const PC_OSVER = "Microsoft-Windows-10-Professional-build-19045-64bit";
export const PC_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/91.0.4472.164 " +
  "NeteaseMusicDesktop/3.1.17.204416 Safari/537.36";

const SEPARATOR = "-36cd479b6b5-";

/** eapi 请求带的 Cookie 键值；NMTID 由网易云下发，其余是官方客户端的匿名身份 */
export type EapiCookieJar = Record<string, string>;

export interface EapiRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
}

/** 32 位大写十六进制，形状与网易云客户端的设备 id 一致 */
export function newDeviceId(): string {
  return randomBytes(16).toString("hex").toUpperCase();
}

/**
 * 官方客户端的匿名 Cookie 身份。扫码请求除了 header 里的设备字段，
 * 还会带 _ntes_nuid / WNMCID 等会话标识；NMTID 由平台下发后补进来。
 */
export function newQrCookieJar(now = Date.now()): EapiCookieJar {
  const nuid = randomBytes(32).toString("hex");
  const letters = randomBytes(6);
  let wnmcid = "";
  for (let i = 0; i < 6; i += 1) {
    wnmcid += String.fromCharCode(97 + (letters[i] % 26));
  }
  return {
    __remember_me: "true",
    ntes_kaola_ad: "1",
    _ntes_nuid: nuid,
    _ntes_nnid: `${nuid},${now}`,
    WNMCID: `${wnmcid}.${now}.01.0`,
    WEVNSM: "1.0.0",
  };
}

/** 把 Set-Cookie 收进票内 Cookie 罐；只接受合法的 cookie 名，拒绝换行注入 */
export function mergeSetCookies(
  jar: EapiCookieJar,
  setCookies: string[]
): EapiCookieJar {
  for (const entry of setCookies) {
    const pair = entry.split(";")[0]?.trim();
    if (!pair) continue;
    const equals = pair.indexOf("=");
    if (equals <= 0) continue;
    const name = pair.slice(0, equals).trim();
    const value = pair.slice(equals + 1).trim();
    if (!/^[A-Za-z0-9_-]+$/.test(name) || /[\r\n]/.test(value)) continue;
    jar[name] = value;
  }
  return jar;
}

export function cookieHeader(jar: EapiCookieJar): string {
  return Object.entries(jar)
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
    .join("; ");
}

/** eapi 的 params 表单值：摘要覆盖 path + JSON，密钥为平台公开常量 */
export function eapiParams(path: string, payload: string): string {
  const digest = createHash("md5")
    .update(`nobody${path}use${payload}md5forencrypt`)
    .digest("hex");
  const plain = `${path}${SEPARATOR}${payload}${SEPARATOR}${digest}`;
  const cipher = createCipheriv("aes-128-ecb", Buffer.from(EAPI_KEY, "utf8"), null);
  return Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
    .toString("hex")
    .toUpperCase();
}

/**
 * 一次 eapi 请求的完整形态。`path` 是 /api/ 路径（摘要用），
 * 实际地址会换成 /eapi/。响应保持明文 JSON，因为体里 e_r 为 false。
 */
export function eapiRequest(
  path: string,
  payload: Record<string, unknown>,
  device: string,
  now = Date.now(),
  jar: EapiCookieJar = {}
): EapiRequest {
  const header: Record<string, string> = {
    os: "pc",
    appver: PC_APPVER,
    osver: PC_OSVER,
    deviceId: device,
    versioncode: "140",
    buildver: String(Math.floor(now / 1000)),
    resolution: "1920x1080",
    __csrf: "",
    channel: "netease",
    requestId: `${now}_${String(now % 1000).padStart(4, "0")}`,
  };
  // 平台下发的 NMTID 也要进加密 header，官方客户端就是这么带的
  if (jar.NMTID) header.NMTID = jar.NMTID;

  const cookie = [cookieHeader(jar), cookieHeader(header)]
    .filter(Boolean)
    .join("; ");

  return {
    url: `${EAPI_HOST}/eapi/${path.replace(/^\/api\//, "")}`,
    headers: {
      "User-Agent": PC_USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookie,
    },
    body: `params=${eapiParams(
      path,
      JSON.stringify({ ...payload, header, e_r: false })
    )}`,
  };
}

/**
 * 二维码内容必须带 chainId，且 deviceId 与轮询请求一致；
 * 少了它，手机确认后仍会被风控拒绝。
 */
export function neteaseQrContent(
  key: string,
  device: string,
  issuedAt = Date.now()
): string {
  return `https://music.163.com/login?codekey=${encodeURIComponent(
    key
  )}&chainId=v1_${device}_pc_login_${issuedAt}`;
}