import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const deployScript = join(repoRoot, "scripts", "deploy.sh");
const siteUrl = "https://blog.example.com";

function read(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function writeStub(directory, name, body) {
  writeFileSync(join(directory, name), `#!/bin/sh\n${body}\n`, { mode: 0o755 });
}

function posixPath(windowsPath) {
  const result = spawnSync("sh", ["-c", 'cygpath -u "$1"', "sh", windowsPath], { encoding: "utf8" });
  assert.equal(result.status, 0, `无法转换测试路径：${result.stderr}`);
  return result.stdout.trim();
}

const REMOTE_STUB = `
printf 'ssh %s\\n' "$*" >> "$DEPLOY_TEST_LOG"
remote_script="\${@: -1}"
eval "$remote_script"
`;

const DOCKER_STUB = `
printf 'docker %s\\n' "$*" >> "$DEPLOY_TEST_LOG"
if [ -n "$DEPLOY_TEST_FAIL_AT" ] && [ "$1" = "compose" ] && [ "$6" = "up" ]; then
  exit 42
fi
if [ "$1" = "save" ]; then printf 'IMAGE_ARCHIVE\\n'; exit 0; fi
if [ "$1" = "load" ]; then printf 'Loaded image: blog-app:deploy-test\\n'; exit 0; fi
if [ "$1" = "image" ] && [ "$2" = "inspect" ]; then
  printf '%s\\n' 'sha256:3333333333333333333333333333333333333333333333333333333333333333'
  exit 0
fi
if [ "$1" = "compose" ] && [ "$6" = "ps" ]; then printf 'container\\n'; exit 0; fi
if [ "$1" = "compose" ] && [ "$6" = "exec" ]; then
  if [ "$8" = "db" ]; then printf 'pgdump\\n' > "$DEPLOY_TEST_PGDUMP"; fi
  printf 'healthy\\n'
  exit 0
fi
if [ "$1" = "compose" ] && [ "$6" = "images" ]; then
  printf '%s\\n' 'sha256:4444444444444444444444444444444444444444444444444444444444444444'
  exit 0
fi
if [ "$1" = "compose" ] && [ "$6" = "up" ]; then printf 'started\\n'; exit 0; fi
if [ "$1" = "run" ]; then
  printf 'uploads_backup\\n'
  for arg in "$@"; do
    case "$arg" in
      *:/backup) backup_dir="\${arg%:/backup}"; mkdir -p "\$backup_dir"; printf 'uploads\\n' > "\$backup_dir/uploads.tar.gz" ;;
    esac
  done
  exit 0
fi
if [ "$1" = "volume" ]; then printf 'volume\\n'; exit 0; fi
if [ "$1" = "tag" ]; then printf 'tagged\\n'; exit 0; fi
exit 0
`;

function runDeploy({ confirmedUrl, buildUrl = siteUrl, failAt, omitDocker = false, extraEnv = {} } = {}) {
  const work = mkdtempSync(join(tmpdir(), "deploy-preflight-"));
  const bin = posixPath(join(work, "bin"));
  const home = posixPath(join(work, "home"));
  const remote = posixPath(join(work, "remote"));
  const log = posixPath(join(work, "commands.log"));
  const logWindows = join(work, "commands.log");
  const payload = posixPath(join(work, "payload-XXXXXX"));
  mkdirSync(join(work, "bin"));
  mkdirSync(join(work, "home"));
  mkdirSync(join(work, "remote"));

  if (!omitDocker) writeStub(join(work, "bin"), "docker", DOCKER_STUB);
  writeStub(join(work, "bin"), "ssh", REMOTE_STUB);
  writeStub(join(work, "bin"), "scp", `
printf 'scp %s\\n' "$*" >> "$DEPLOY_TEST_LOG"
for arg in "$@"; do
  case "$arg" in
    /*.tgz|/*.tar.gz|/*.sh)
      case "$arg" in
        *:*) ;;
        *) printf 'copy\\n' > "/tmp/$(basename "$arg")" ;;
      esac
      ;;
  esac
done
exit 0
`);
  writeStub(join(work, "bin"), "tar", `
printf 'tar %s\\n' "$*" >> "$DEPLOY_TEST_LOG"
for arg in "$@"; do
  case "$arg" in
    *blog-src-*.tar.gz) printf 'SOURCE_ARCHIVE\\n' > "$arg" ;;
    /backups/*/uploads.tar.gz) printf 'uploads\\n' > "$arg" ;;
    /backups/*/blog.dump) printf 'pgdump\\n' > "$arg" ;;
  esac
done
case "$1" in
  czf) if [ -f "$2" ]; then exit 0; fi ;;
  xzf) mkdir -p "$4"; printf 'Dockerfile\\npackage.json\\ndocker-compose.yml\\ndocker-compose.prod.yml\\n.dockerignore\\n' | while read f; do printf 'x\\n' > "$4/$f"; done; exit 0 ;;
esac
exec /usr/bin/tar "$@"
`);
  writeStub(join(work, "bin"), "gzip", 'exec /usr/bin/gzip "$@"\n');
  writeStub(join(work, "bin"), "sha256sum", `
if [ "$1" = "-c" ]; then exit 0; fi
exec /usr/bin/sha256sum "$@"
`);
  writeStub(join(work, "bin"), "mktemp", 'printf \'%s\\n\' "$DEPLOY_TEST_TMP_TEMPLATE"\nmkdir -p "$DEPLOY_TEST_TMP_TEMPLATE"\n');

  const env = {
    ...process.env,
    NEXT_PUBLIC_SITE_URL: buildUrl,
    NEXT_PUBLIC_CONTACT_EMAIL: "owner@example.com",
    DEPLOY_HOST: "deploy-test@example.invalid",
    DEPLOY_DIR: remote,
    DEPLOY_TEST_LOG: log,
    DEPLOY_TEST_TMP_TEMPLATE: payload,
    DEPLOY_TEST_UPLOADS_BACKUP: posixPath(join(work, "remote", "uploads.tar.gz")),
    DEPLOY_TEST_PGDUMP: posixPath(join(work, "blog.dump")),
    DEPLOY_TEST_BACKUP_DIR: posixPath(join(work, "remote", "backups")),
    DEPLOY_TEST_FAIL_AT: failAt,
    PATH: `${bin}${delimiter}${process.env.PATH}`,
    HOME: home,
    DEPLOY_RELEASE_AUTHORIZED: "yes",
    DEPLOY_TEST_STUBS: "1",
    ...extraEnv,
  };
  if (confirmedUrl === undefined) delete env.DEPLOY_SITE_URL;
  else env.DEPLOY_SITE_URL = confirmedUrl;

  const result = spawnSync("sh", [deployScript], {
    cwd: repoRoot,
    encoding: "utf8",
    env,
    timeout: 30_000,
  });

  const commands = existsSync(logWindows) ? readFileSync(logWindows, "utf8") : "";
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  return {
    status: result.status,
    commands,
    output,
    work,
    cleanup: () => rmSync(work, { recursive: true, force: true }),
    findRemote: (suffix) => {
      const search = (directory) => {
        if (!existsSync(directory)) return "";
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
          const path = join(directory, entry.name);
          if (entry.isDirectory()) {
            const found = search(path);
            if (found) return found;
          } else if (path.endsWith(suffix)) return readFileSync(path, "utf8");
        }
        return "";
      };
      return search(join(work, "remote"));
    },
  };
}

test("非 HTTPS 构建值在任何构建或服务器命令之前失败", () => {
  const run = runDeploy({ confirmedUrl: "http://blog.example.com", buildUrl: "http://blog.example.com" });
  try {
    assert.notEqual(run.status, 0, `脚本应拒绝非 HTTPS 地址：\n${run.output}`);
    assert.match(run.output, /NEXT_PUBLIC_SITE_URL.*https/i);
    assert.doesNotMatch(run.commands, /docker compose|^(ssh|scp) /m);
  } finally {
    run.cleanup();
  }
});

test("最终公网地址未经显式确认时，即使格式正确也不发布", () => {
  const run = runDeploy({ confirmedUrl: undefined });
  try {
    assert.notEqual(run.status, 0, "缺少 DEPLOY_SITE_URL 时应拒绝发布");
    assert.match(run.output, /DEPLOY_SITE_URL/);
    assert.doesNotMatch(run.commands, /docker compose|^(ssh|scp) /m);
  } finally {
    run.cleanup();
  }
});

test("确认地址与构建值不一致时停止发布", () => {
  const run = runDeploy({ confirmedUrl: "https://other.example.com" });
  try {
    assert.notEqual(run.status, 0);
    assert.match(run.output, /不一致|一致|match|confirm/i);
    assert.doesNotMatch(run.commands, /docker compose|^(ssh|scp) /m);
  } finally {
    run.cleanup();
  }
});

test("Docker CLI 不可用时在构建前失败且不连接服务器", () => {
  const run = runDeploy({ confirmedUrl: siteUrl, omitDocker: true });
  try {
    assert.notEqual(run.status, 0);
    assert.match(run.output, /Docker/i);
    assert.doesNotMatch(run.commands, /^(ssh|scp) /m);
  } finally {
    run.cleanup();
  }
});

test("未获得发布授权或未锁定基础镜像 digest 时不启动任何服务器命令", () => {
  for (const extraEnv of [
    { DEPLOY_RELEASE_AUTHORIZED: "no" },
    { DEPLOY_TEST_STUBS: "0", DEPLOY_HOST: "real-host.invalid" },
  ]) {
    const run = runDeploy({ confirmedUrl: siteUrl, extraEnv });
    try {
      assert.notEqual(run.status, 0);
      assert.doesNotMatch(run.commands, /^(ssh|scp) /m);
    } finally {
      run.cleanup();
    }
  }
});

test("成功路径使用不可变 tag、备份、健康检查与回滚记录", () => {
  const run = runDeploy({ confirmedUrl: siteUrl });
  try {
    assert.equal(run.status, 0, `应完成本地预演：\n${run.output}`);
    assert.match(run.commands, /docker compose -f .*docker-compose\.yml -f .*docker-compose\.prod\.yml build app/m);
    assert.match(run.commands, /docker image inspect blog-app:release-/m);
    assert.match(run.commands, /docker save blog-app:release-/);
    assert.doesNotMatch(run.commands, /blog-app:latest/);
    assert.match(run.output, /sha256:[0-9a-f]{64}/);
    assert.match(run.output, /备份|backup/i);
    assert.match(run.output, /健康|health/i);
    assert.match(run.output, /回滚|rollback/i);
    assert.match(run.commands, /pg_dump|uploads\.tar\.gz|rollback/);
    assert.match(run.findRemote("rollback.env"), /PREVIOUS_IMAGE_ID=sha256:/);
    assert.match(
      read("docker-compose.yml"),
      /image:\s*\$\{BLOG_IMAGE:-blog-app:local\}/,
      "Compose 应使用可注入的不可变镜像名称"
    );
    assert.match(read("docker-compose.yml"), /DB_IMAGE_DIGEST_REQUIRED/, "数据库镜像 digest 应作为待用户确认的阻塞项记录");
    assert.match(read("Dockerfile"), /NODE_IMAGE_DIGEST_REQUIRED/, "基础镜像 digest 应作为待用户确认的阻塞项记录");
  } finally {
    run.cleanup();
  }
});

test("远端启动失败时触发失败即停与回滚指令", () => {
  const run = runDeploy({ confirmedUrl: siteUrl, failAt: "up" });
  try {
    assert.notEqual(run.status, 0, "远端启动失败时脚本应失败");
    assert.match(run.output, /失败|fail|回滚|rollback/i);
    assert.match(run.commands, /rollback/);
  } finally {
    run.cleanup();
  }
});

test("源码包与 Docker 上下文排除本地产物，部署回归进入全量测试命令", () => {
  const script = read("scripts/deploy.sh");
  const requiredExclusions = [
    ".env.*",
    ".playwright-mcp",
    ".superpowers",
    ".claude",
    "tsconfig.tsbuildinfo",
    "hosts.bak.*",
    "uploads",
    "drizzle",
    ".zcode",
    "docs/design-research",
  ];
  for (const exclusion of requiredExclusions) {
    assert.ok(script.includes(exclusion), `scripts/deploy.sh 缺少源码包排除项 ${exclusion}`);
  }
  assert.match(script, /tar .*-T .*|tar .*--files-from/, "源码包应基于明确的受控文件清单");
  const dockerignore = read(".dockerignore");
  for (const exclusion of [".playwright-mcp", ".superpowers", ".claude", ".env.*", "hosts.bak.*", "docs/design-research"]) {
    assert.ok(dockerignore.includes(exclusion), `.dockerignore 缺少 ${exclusion}`);
  }
  assert.match(dockerignore, /!\.env\.example/);
  assert.match(read("package.json"), /scripts\/deploy-preflight\.test\.mjs/);
  assert.match(script, /docker info/i);
  assert.doesNotMatch(script, /http:\/\/60\.205\.0\.224/);
  assert.match(script, /DEPLOY_RELEASE_AUTHORIZED/);
});
