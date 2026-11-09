import { cacheLife } from "next/cache";
import { siteConfig } from "@/config/site";
import { weatherLabel } from "@/lib/weather";

export interface Weather {
  temperature: number;
  label: string;
}

/**
 * 当前天气。Open-Meteo 免注册、免 key。
 * 只在服务端取，客户端不直连第三方。
 *
 * 成功按 5 分钟一档缓存；任何失败只标记 60 秒，避免把一次超时/坏响应
 * 当成接下来一小时的事实。条件式 cacheLife 每条分支只调用一次。
 * 失败返回 null，调用方显示 NOT AVAILABLE——不许拿上一次的值冒充现在。
 */
export async function getWeather(): Promise<Weather | null> {
  "use cache";

  const { latitude, longitude } = siteConfig.weather;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}` +
    `&longitude=${longitude}&current=temperature_2m,weather_code&timezone=Asia%2FShanghai`;

  let temperature: unknown;
  let code: unknown;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) {
      cacheLife({ stale: 60, revalidate: 60, expire: 60 });
      return null;
    }
    const data = await res.json();
    temperature = data?.current?.temperature_2m;
    code = data?.current?.weather_code;
  } catch {
    cacheLife({ stale: 60, revalidate: 60, expire: 60 });
    return null;
  }

  if (typeof temperature !== "number" || typeof code !== "number") {
    cacheLife({ stale: 60, revalidate: 60, expire: 60 });
    return null;
  }

  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });
  return {
    temperature: Math.round(temperature),
    label: weatherLabel(code),
  };
}
