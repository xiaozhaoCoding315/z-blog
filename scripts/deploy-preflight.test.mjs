import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
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
  # 夹具里登记过的 tag 返回它自己的 ID，清理逻辑才需要真的判断「是不是运行中的那个」
  if [ -n "$DEPLOY_TEST_FIXTURE" ] && [ -f "$DEPLOY_TEST_FIXTURE" ]; then
    wanted="\${3#blog-app:}"
    while IFS='	' read -r f_tag f_id f_created f_kind; do
      [ "$f_tag" = "$wanted" ] || continue
      printf '%s\\n' "$f_id"
      exit 0
    done < "$DEPLOY_TEST_FIXTURE"
  fi
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
  # 真实行为：compose images -q 输出 64 位十六进制，不带 sha256: 前缀
  if [ -n "$DEPLOY_TEST_CURRENT_IMAGE" ]; then
    printf '%s\\n' "\${DEPLOY_TEST_CURRENT_IMAGE#sha256:}"
  else
    printf '%s\\n' '4444444444444444444444444444444444444444444444444444444444444444'
  fi
  exit 0
fi
if [ "$1" = "images" ]; then
  ref=""; want_created=0
  for arg in "$@"; do
    case "$arg" in
      reference=*) ref="\${arg#reference=}" ;;
      *CreatedAt*) want_created=1 ;;
    esac
  done
  if [ -n "$DEPLOY_TEST_FIXTURE" ] && [ -f "$DEPLOY_TEST_FIXTURE" ]; then
    while IFS='	' read -r f_tag f_id f_created f_kind; do
      [ -n "$f_tag" ] || continue
      case "$ref" in
        *release-*) [ "$f_kind" = "release" ] || continue ;;
        *rollback-*) [ "$f_kind" = "rollback" ] || continue ;;
      esac
      if [ "$want_created" = "1" ]; then printf '%s|%s\\n' "$f_created" "$f_tag"
      else printf '%s\\n' "$f_tag"; fi
    done < "$DEPLOY_TEST_FIXTURE"
  fi
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

// 在远端目录里铺一套真实的发布记录：目录名带 release- 前缀，releases/ 与 backups/
// 成对出现，并且其中一份是「正在运行」的版本（rollback.env 的 NEW_IMAGE_ID 与
// docker compose images -q app 的输出一致）。
// 传 emergency: true 时只在 backups/ 建目录（人工应急快照的形态：没有发布记录）。
function seedReleases(remoteRoot, releases) {
  for (const release of releases) {
    const name = `release-${release.id}`;
    if (release.emergency) {
      const directory = join(remoteRoot, "backups", name);
      mkdirSync(directory, { recursive: true });
      writeFileSync(join(directory, "blog.dump"), `pgdump of ${release.id}\n`);
      utimesSync(directory, release.at, release.at);
      continue;
    }
    for (const kind of ["releases", "backups"]) {
      const directory = join(remoteRoot, kind, name);
      mkdirSync(directory, { recursive: true });
      // backups/<id>/ 没有 rollback.env，只有 releases/<id>/ 有 —— 这正是线上形态
      writeFileSync(
        join(directory, kind === "releases" ? "rollback.env" : "blog.dump"),
        kind === "releases"
          ? `RELEASE_ID=${release.id}\nNEW_IMAGE_ID=sha256:${release.image}\n`
          : `pgdump of ${release.id}\n`,
      );
      utimesSync(directory, release.at, release.at);
    }
  }
}

function runDeploy({ confirmedUrl, buildUrl = siteUrl, failAt, omitDocker = false, extraEnv = {}, releases } = {}) {
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

  // 镜像清单夹具：tag \t ID \t CreatedAt \t kind（release / rollback）。
  // docker 的 stub 从这里读，清理逻辑才能拿到和线上同形的数据。
  const fixturePath = posixPath(join(work, "images.tsv"));
  const fixtureRows = [];
  if (releases) {
    seedReleases(join(work, "remote"), releases);
    releases.forEach((release, index) => {
      const stamp = `2026-11-${String(10 - index).padStart(2, "0")}T10:00:00Z`;
      fixtureRows.push(`release-${release.id}\tsha256:${release.image}\t${stamp}\trelease`);
      fixtureRows.push(`rollback-${release.id}\tsha256:${release.image}\t${stamp}\trollback`);
    });
  }
  writeFileSync(join(work, "images.tsv"), fixtureRows.join("\n") + (fixtureRows.length ? "\n" : ""));

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
    DEPLOY_TEST_FIXTURE: fixturePath,
    PATH: `${bin}${delimiter}${process.env.PATH}`,
    HOME: home,
    DEPLOY_RELEASE_AUTHORIZED: "yes",
    DEPLOY_TEST_STUBS: "1",
    DEPLOY_TEST_CURRENT_IMAGE: releases ? `sha256:${releases[0].image}` : "",
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
    remoteRoot: join(work, "remote"),
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

test("发布成功后清理超出保留数量的旧发布目录，运行中的那份永不删除", () => {
  const run = runDeploy({ confirmedUrl: siteUrl, extraEnv: { DEPLOY_KEEP_RELEASES: "2" } });
  try {
    assert.equal(run.status, 0, `应完成本地预演：\n${run.output}`);
    // 远端脚本里必须出现清理动作，且清理在健康检查之后
    assert.match(run.commands, /rm -rf "releases\/\$old"/);
    assert.match(run.commands, /rm -rf "backups\/\$old"/);
    // 没有发布记录的备份目录（人工应急快照）必须保住
    assert.match(run.commands, /保留备份：backups\/\$old/);
    assert.match(run.commands, /docker rmi "blog-app:\$tag"/);
    assert.ok(
      run.output.indexOf("清理旧发布") > run.output.indexOf("healthy"),
      "清理应发生在健康检查通过之后",
    );
    // 运行中的镜像无论如何都要保住
    assert.match(run.commands, /CURRENT_IMAGE_ID/);
    assert.match(run.commands, /保留（运行中）/);
  } finally {
    run.cleanup();
  }
});

// 线上目录名带 `release-` 前缀（历史版本不带），比较时两侧必须一致。
// 这个用例用真实命名跑清理逻辑本身：剥前缀的那版曾把所有目录删光。
test("真实 release- 目录下只删超出保留窗口的旧版本，运行中的那份留着", () => {
  // 运行中的版本故意放在保留窗口之外（回滚到旧版后的常态）。
  // 只要比较时一侧剥了前缀，它就会连同全部历史目录一起被删光。
  const releases = [1, 2, 3, 4, 5].map((n) => ({
    id: `2026110${n}T100000Z-abc${n}`,
    image: `${String(n).repeat(64)}`,
    at: new Date(Date.UTC(2026, 10, 10 - n, 10, 0, 0)),
  }));
  const running = releases[4];
  const emergency = {
    id: "emergency",
    image: "e".repeat(64),
    at: new Date(Date.UTC(2026, 10, 9, 10, 0, 0)),
    emergency: true,
  };
  const run = runDeploy({
    confirmedUrl: siteUrl,
    extraEnv: { DEPLOY_KEEP_RELEASES: "2", DEPLOY_TEST_CURRENT_IMAGE: `sha256:${running.image}` },
    releases: [...releases, emergency],
  });
  try {
    assert.equal(run.status, 0, `应完成本地预演：\n${run.output}`);
    const remaining = (kind) => {
      const directory = join(run.remoteRoot, kind);
      return existsSync(directory) ? readdirSync(directory).sort() : [];
    };
    const releaseDirs = remaining("releases");
    const backupDirs = remaining("backups");

    assert.ok(releaseDirs.includes(`release-${running.id}`), `运行中的版本被删了：${releaseDirs}`);
    assert.ok(backupDirs.includes(`release-${running.id}`), `运行中的版本备份被删了：${backupDirs}`);
    assert.deepEqual(
      backupDirs.filter((name) => name !== "release-emergency"),
      releaseDirs,
      "releases/ 与 backups/ 必须保留同一批目录",
    );
    // 人工建的应急快照（backups/ 里有、releases/ 里没有）绝不能删
    assert.ok(backupDirs.includes("release-emergency"), `应急备份被删了：${backupDirs}`);
    // 保留窗口 2 = 本次发布的目录（新建、mtime 最新）+ 窗口内的最新一份旧版本，
    // 再加窗口外的运行中版本
    assert.equal(releaseDirs.length, 3, `应只剩本次发布、窗口内一份与运行中的版本：${releaseDirs}`);
    for (const old of releases.slice(1, 3)) {
      assert.ok(!releaseDirs.includes(`release-${old.id}`), `超出窗口的 ${old.id} 应被删除`);
    }
    assert.match(run.output, /清理完成/);
  } finally {
    run.cleanup();
  }
});

test("清理按完整目录名比较，真实 release- 前缀下不会删光", () => {
  const script = read("scripts/deploy.sh");
  // 目录比较两侧都用完整名（源码里这段位于 REMOTE_SCRIPT 双引号字符串内，引号是转义的）
  assert.ok(
    script.includes(String.raw`grep -qxF \"\$old\"`),
    "目录比较应使用完整目录名 $old，而不是剥过前缀的值",
  );
  // 目录循环里不能再出现剥前缀的写法（镜像段归一到 ID 是合法的，不在此列）
  const dirLoop = script.slice(script.indexOf("# fail-safe：保留集为空"), script.indexOf("# 镜像标签："));
  assert.ok(dirLoop.length > 0, "找不到目录清理段");
  assert.ok(!dirLoop.includes("sed 's/^release-//'"), "目录循环里不应剥前缀后比较");
  // 保留集为空时必须有 fail-safe，不执行删除
  assert.match(script, /跳过清理：保留集为空/);
  assert.match(script, /跳过镜像清理：保留集为空/);
});

// REMOTE_SCRIPT 是一整段双引号字符串：里面任何反引号都会被本地 shell 当成
// 命令替换执行（曾经写进注释里的 `release-` 就变成了 `release-: not found`）。
test("远端脚本里的注释不写反引号，避免本地命令替换", () => {
  const script = read("scripts/deploy.sh");
  const start = script.indexOf('REMOTE_SCRIPT="set -eu');
  const end = script.indexOf('"$REMOTE_SHELL" "$HOST" "$REMOTE_SCRIPT"');
  assert.ok(start > 0 && end > start, "找不到 REMOTE_SCRIPT 的范围");
  const remote = script.slice(start, end);
  assert.ok(!remote.includes("`"), "REMOTE_SCRIPT 内不能出现反引号，改用普通文字描述命令名");
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
