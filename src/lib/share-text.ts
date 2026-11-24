/**
 * 从一段分享文案里取出链接。
 *
 * 中文排版里括号 / 引号经常直接贴在链接后面，不能算进地址。
 * 单独成文件，是为了让客户端的单曲识别与歌单导入共用同一套规则，
 * 而不把整个歌单归一化层带进浏览器。
 */
export function extractUrlFromText(raw: string): string | null {
  const match = raw.match(
    /https?:\/\/[^\s<>"'（），。！？、；：()【】「」《》一-鿿＀-￯]+/i
  );
  if (!match) return null;
  // 中文标点经常紧跟链接，不属于地址本身
  return match[0].replace(/[，。！？、；：,.!?;:]+$/u, "");
}
