import type { Metadata } from "next";
import { projects, type Project } from "@/config/portfolio";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "项目",
  description: "项目档案：正在做、维护中与已完成的工作。",
};

const STATUS_TONE: Record<Project["status"], string> = {
  进行中: "active",
  维护中: "maintain",
  已完成: "done",
  待启动: "queued",
};

const FEATURED_INDEX = Math.max(
  0,
  projects.findIndex((project) => project.featured)
);
const FEATURED = projects[FEATURED_INDEX] ?? projects[0];
const ARCHIVE = projects
  .map((project, index) => ({ project, index }))
  .filter(({ project }) => project !== FEATURED);
const ACTIVE_COUNT = projects.filter(
  (project) => project.status === "进行中" || project.status === "维护中"
).length;
const REPO_COUNT = projects.filter((project) => project.repo).length;

function ProjectStatus({ status }: { status: Project["status"] }) {
  return (
    <span className="project-status" data-tone={STATUS_TONE[status]}>
      <i aria-hidden="true" />
      {status}
    </span>
  );
}

function ProjectStack({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="project-stack">
      <span className="project-stack-label">技术</span>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function ProjectLinks({ project }: { project: Project }) {
  if (!project.link && !project.repo) return null;
  return (
    <div className="project-links">
      {project.link ? (
        <a
          className="project-link is-primary"
          href={project.link}
          target="_blank"
          rel="noreferrer noopener"
        >
          {project.linkLabel ?? "访问站点"}
          <span aria-hidden="true">↗</span>
        </a>
      ) : null}
      {project.repo ? (
        <a
          className="project-link"
          href={project.repo}
          target="_blank"
          rel="noreferrer noopener"
        >
          源码
          <span aria-hidden="true">↗</span>
        </a>
      ) : null}
    </div>
  );
}

function HighlightList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="project-highlights">
      {items.map((item) => (
        <li key={item}>
          <span aria-hidden="true">+</span>
          <p>{item}</p>
        </li>
      ))}
    </ul>
  );
}

function ProjectFacts({ project }: { project: Project }) {
  if (!project.role && !project.context) return null;
  return (
    <dl className="project-facts">
      {project.role ? (
        <div>
          <dt>角色</dt>
          <dd>{project.role}</dd>
        </div>
      ) : null}
      {project.context ? (
        <div>
          <dt>上下文</dt>
          <dd>{project.context}</dd>
        </div>
      ) : null}
    </dl>
  );
}

function Outcomes({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="project-outcomes">
      <span>留下了什么</span>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <div className="projects-page">
      <section className="project-stage" aria-labelledby="projects-title">
        <span className="project-stage-glow" aria-hidden="true" />

        <header className="project-stage-head">
          <div className="project-stage-intro">
            <p className="project-kicker">PROJECT ARCHIVE / 项目档案</p>
            <h1 id="projects-title">
              从想法，
              <br />
              到能跑起来。
            </h1>
            <p className="project-stage-lede">
              {projects.length} 份档案，记录为什么做、做到哪一步，以及最后留下了什么。
            </p>
          </div>

          <nav className="project-index" aria-label="项目索引">
            <span className="project-index-label">INDEX</span>
            {projects.map((project, index) => (
              <a
                key={project.name}
                className="project-index-row"
                href={`#project-${index + 1}`}
              >
                <span className="project-index-no">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="project-index-name">{project.name}</span>
                <ProjectStatus status={project.status} />
              </a>
            ))}
          </nav>
        </header>

        <article
          className="project-feature"
          id={`project-${FEATURED_INDEX + 1}`}
        >
          <header className="project-feature-head">
            <span className="project-feature-no">
              CASE {String(FEATURED_INDEX + 1).padStart(2, "0")} · FEATURED
            </span>
            <ProjectStatus status={FEATURED.status} />
            <div className="project-feature-links">
              <ProjectLinks project={FEATURED} />
            </div>
          </header>

          <div className="project-feature-title">
            <h2>{FEATURED.name}</h2>
            {FEATURED.tagline ? (
              <p className="project-tagline">{FEATURED.tagline}</p>
            ) : null}
            {FEATURED.link && FEATURED.liveNote ? (
              <p className="project-live">
                <span className="project-live-dot" aria-hidden="true" />
                {FEATURED.liveNote}
                <a href={FEATURED.link} target="_blank" rel="noreferrer noopener">
                  {FEATURED.link.replace(/^https?:\/\//, "")}
                  <span aria-hidden="true"> ↗</span>
                </a>
              </p>
            ) : null}
          </div>

          <div className="project-feature-grid">
            <div className="project-feature-main">
              <p className="project-description">{FEATURED.description}</p>

              {FEATURED.highlights?.length ? (
                <section
                  className="project-block"
                  aria-label={`${FEATURED.name} 的能力清单`}
                >
                  <h3>做到的事</h3>
                  <HighlightList items={FEATURED.highlights} />
                </section>
              ) : null}

              <ProjectStack items={FEATURED.stack} />
            </div>

            <aside
              className="project-feature-notes"
              aria-label={`${FEATURED.name} 的档案摘录`}
            >
              {FEATURED.why ? (
                <div className="project-note is-why">
                  <span>为什么做</span>
                  <p>{FEATURED.why}</p>
                </div>
              ) : null}
              {FEATURED.feeling ? (
                <div className="project-note is-feeling">
                  <span>最真实的感受</span>
                  <p>{FEATURED.feeling}</p>
                </div>
              ) : null}
              <Outcomes items={FEATURED.outcomes} />
              <ProjectFacts project={FEATURED} />
            </aside>
          </div>
        </article>

        <div className="project-stage-foot">
          <span>
            <b>{String(projects.length).padStart(2, "0")}</b> 份档案
          </span>
          <span>
            <b>{String(ACTIVE_COUNT).padStart(2, "0")}</b> 个仍在维护或迭代
          </span>
          <span>
            <b>{String(REPO_COUNT).padStart(2, "0")}</b> 个公开仓库
          </span>
        </div>
      </section>

      {ARCHIVE.length > 0 ? (
        <section className="project-archive" aria-labelledby="archive-title">
          <header className="project-archive-head">
            <div>
              <p className="project-kicker is-ink">FIELD NOTES / 其余档案</p>
              <h2 id="archive-title">
                另外{ARCHIVE.length === 2 ? "两份" : `${ARCHIVE.length} 份`}
              </h2>
              <p className="project-archive-lede">
                仍在维护的和已经交付的，都留在这里。
              </p>
            </div>
            <span className="project-archive-count">
              {String(ARCHIVE.length).padStart(2, "0")} /{" "}
              {String(projects.length).padStart(2, "0")}
            </span>
          </header>

          {ARCHIVE.map(({ project, index }) => (
            <article
              key={project.name}
              className="project-row"
              id={`project-${index + 1}`}
              data-tone={STATUS_TONE[project.status]}
            >
              <div className="project-row-cover">
                <span className="project-row-no" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="project-row-kind">
                  {project.status === "已完成" ? "已交付" : "持续维护"}
                </span>
                <span className="project-row-rule" aria-hidden="true" />
              </div>

              <div className="project-row-body">
                <header className="project-row-head">
                  <h3>{project.name}</h3>
                  <ProjectStatus status={project.status} />
                  <div className="project-row-head-links">
                    <ProjectLinks project={project} />
                  </div>
                </header>
                {project.tagline ? (
                  <p className="project-row-tagline">{project.tagline}</p>
                ) : null}
                <p className="project-row-desc">{project.description}</p>

                {(project.why || project.feeling) && (
                  <div className="project-row-glimpses">
                    {project.why ? (
                      <div>
                        <span>为什么做</span>
                        <p>{project.why}</p>
                      </div>
                    ) : null}
                    {project.feeling ? (
                      <div>
                        <span>最真实的感受</span>
                        <p>{project.feeling}</p>
                      </div>
                    ) : null}
                  </div>
                )}

                <ProjectStack items={project.stack} />

                {(project.role ||
                  project.context ||
                  project.highlights?.length ||
                  project.outcomes?.length) && (
                  <details className="project-more">
                    <summary>
                      <span>展开档案</span>
                      <i aria-hidden="true">+</i>
                    </summary>
                    <div className="project-more-body">
                      <ProjectFacts project={project} />
                      {project.highlights?.length ? (
                        <section
                          className="project-block"
                          aria-label={`${project.name} 的能力清单`}
                        >
                          <h3>做到的事</h3>
                          <HighlightList items={project.highlights} />
                        </section>
                      ) : null}
                      <Outcomes items={project.outcomes} />
                    </div>
                  </details>
                )}
              </div>
            </article>
          ))}
        </section>
      ) : null}

      <footer className="project-colophon">
        <p>所有源码都在 GitHub，没写完的部分也在那里继续长。</p>
        <a href={siteConfig.links.github} target="_blank" rel="noreferrer noopener">
          github.com/xiaozhaoCoding315
          <span aria-hidden="true">↗</span>
        </a>
      </footer>
    </div>
  );
}