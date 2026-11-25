import test from "node:test";
import assert from "node:assert/strict";
import { getClientIp, rateLimit } from "../src/lib/rate-limit.ts";

function makeRequest(headers = {}) {
  return new Request("http://localhost/api/test", { headers });
}

function setTrustProxy(value) {
  if (value === undefined) delete process.env.TRUST_PROXY;
  else process.env.TRUST_PROXY = value;
}

test("默认不信任转发头，直连统一归到 direct", () => {
  const previous = process.env.TRUST_PROXY;
  setTrustProxy(undefined);

  assert.equal(
    getClientIp(makeRequest({ "x-forwarded-for": "1.2.3.4" })),
    "direct"
  );
  assert.equal(getClientIp(makeRequest({ "x-real-ip": "5.6.7.8" })), "direct");

  setTrustProxy(previous);
});

test("只有显式开启 TRUST_PROXY 才读取 XFF，并取最后一跳", () => {
  const previous = process.env.TRUST_PROXY;
  setTrustProxy("1");

  // 访客伪造的 1.2.3.4 在左侧；最后一跳是代理实际看到的 9.9.9.9
  assert.equal(
    getClientIp(
      makeRequest({ "x-forwarded-for": "1.2.3.4, 9.9.9.9" })
    ),
    "9.9.9.9"
  );
  assert.equal(getClientIp(makeRequest({ "x-forwarded-for": "1.2.3.4" })), "1.2.3.4");

  setTrustProxy(previous);
});

test("可信代理链里 XFF 缺失或为空时退回 X-Real-IP / proxy", () => {
  const previous = process.env.TRUST_PROXY;
  setTrustProxy("true");

  assert.equal(getClientIp(makeRequest({ "x-real-ip": "5.6.7.8" })), "5.6.7.8");
  assert.equal(getClientIp(makeRequest({ "x-forwarded-for": "  " })), "proxy");
  assert.equal(getClientIp(makeRequest()), "proxy");

  setTrustProxy(previous);
});

test("限频按滑动窗口拒绝超限请求，窗口过后恢复", async () => {
  const key = `test:${process.pid}:${Date.now()}`;
  assert.equal(rateLimit(key, 2, 60), true);
  assert.equal(rateLimit(key, 2, 60), true);
  assert.equal(rateLimit(key, 2, 60), false);

  await new Promise((resolve) => setTimeout(resolve, 90));
  assert.equal(rateLimit(key, 2, 60), true);
});