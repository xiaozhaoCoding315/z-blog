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
 * 5 分钟一档：天气的变化尺度就是分钟级，没必要更勤。
 * 失败返回 null，调用方显示 NOT AVAILABLE——不许拿上一次的值冒充现在。
 */
export async function getWeather(): Promise<Weather | null> {
  "use cache";
  cacheLife({ stale: 300, revalidate: 300, expire: 3600 });

  const { latitude, longitude } = siteConfig.weather;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}` +
    `&longitude=${longitude}&current=temperature_2m,weather_code&timezone=Asia%2FShanghai`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const data = await res.json();
    const temperature = data?.current?.temperature_2m;
    const code = data?.current?.weather_code;
    if (typeof temperature !== "number" || typeof code !== "number") {
      return null;
    }
    return {
      temperature: Math.round(temperature),
      label: weatherLabel(code),
    };
  } catch {
    return null;
  }
}
