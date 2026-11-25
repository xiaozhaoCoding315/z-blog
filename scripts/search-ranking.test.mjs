import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync(
  new URL("../src/app/api/search/route.ts", import.meta.url),
  "utf8"
);

test("搜索先取每篇最佳分块，再按全局相似度排序取前 8", () => {
  assert.match(route, /WITH best AS \(/);
  assert.match(route, /SELECT DISTINCT ON \(c\.post_slug\)/);
  assert.match(route, /SELECT \* FROM best/);

  const globalOrder = route.indexOf("ORDER BY similarity DESC");
  const globalLimit = route.indexOf("LIMIT 8", globalOrder);
  assert.ok(globalOrder !== -1, "缺少相似度降序");
  assert.ok(globalLimit > globalOrder, "LIMIT 必须作用在相似度排序之后");

  // 同一层里 ORDER BY post_slug ... LIMIT 8 是旧 bug 的写法
  assert.doesNotMatch(
    route,
    /ORDER BY c\.post_slug, c\.embedding <=> \$\{vectorStr\}::vector\s*LIMIT 8/
  );
});