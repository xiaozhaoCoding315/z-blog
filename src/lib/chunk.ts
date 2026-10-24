/**
 * Markdown 分块：RAG 检索的最小单元。
 *
 * 策略：按二级标题切分（标题行保留在分块内以携带语义）；
 * 超长小节再用滑动窗口二切，带重叠防止句子被截断。
 */

const MAX_CHARS = 800;
const OVERLAP = 100;
const MIN_CHARS = 60;

export interface TextChunk {
  heading: string | null;
  text: string;
}

export function chunkMarkdown(markdown: string): TextChunk[] {
  // 去掉文章开头的引言块以外的元信息残留，按二级标题切分
  const sections = markdown.split(/\n(?=## )/).map((s) => s.trim());
  const chunks: TextChunk[] = [];

  for (const section of sections) {
    if (!section) continue;
    const headingMatch = /^##\s+(.+)$/m.exec(section);
    const heading = headingMatch?.[1]?.trim() ?? null;

    if (section.length <= MAX_CHARS) {
      if (section.length >= MIN_CHARS) {
        chunks.push({ heading, text: section });
      }
      continue;
    }

    // 滑动窗口切分长小节
    const lines = section.split("\n");
    let buffer: string[] = [];
    let bufferLen = 0;

    const flush = () => {
      if (bufferLen >= MIN_CHARS) {
        chunks.push({ heading, text: buffer.join("\n").trim() });
      }
      // 保留尾部若干行作为下一块的开头（重叠）
      const tail: string[] = [];
      let tailLen = 0;
      while (buffer.length > 0 && tailLen < OVERLAP) {
        const line = buffer.pop() as string;
        tail.unshift(line);
        tailLen += line.length + 1;
      }
      buffer = tail;
      bufferLen = tailLen;
    };

    for (const line of lines) {
      buffer.push(line);
      bufferLen += line.length + 1;
      if (bufferLen >= MAX_CHARS) flush();
    }
    if (bufferLen >= MIN_CHARS) {
      chunks.push({ heading, text: buffer.join("\n").trim() });
    }
  }

  return chunks;
}
