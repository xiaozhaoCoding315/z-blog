import { connection } from "next/server";
import { getStatusSentence } from "@/lib/settings-server";
import { DesktopHome } from "@/components/desktop/desktop-home";

/**
 * 桌面主屏要读站长的状态句，所以停在请求期。
 * 没有这行，构建时数据库缺席会把默认状态句烤进静态壳。
 */
export const instant = false;

export default async function HomePage() {
  await connection();
  const status = await getStatusSentence();
  return <DesktopHome status={status} />;
}
