import Link from "next/link";

import { store } from "@/lib/storage";

import ClearDbButton from "./_components/clear-db";
import CreateWorkspace from "./_components/create-workspace";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  let workspaces:
    | Array<{ id: string; name: string; createdAt: string }>
    | null = null;
  let dbError: string | null = null;

  try {
    workspaces = await store.listWorkspaces();
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="home">
      {/* ── Ambient background ── */}
      <div className="home-bg" aria-hidden="true">
        <div className="home-bg-orb home-bg-orb--1" />
        <div className="home-bg-orb home-bg-orb--2" />
        <div className="home-bg-orb home-bg-orb--3" />
      </div>

      {/* ── Nav bar ── */}
      <nav className="home-nav">
        <div className="home-nav-brand">
          <SwarmLogo />
          <span className="home-nav-title">Swarm IDE</span>
        </div>
        <div className="home-nav-links">
          <Link href="/im" className="home-nav-link">IM</Link>
          <Link href="/graph" className="home-nav-link">Graph</Link>
          <a href="https://github.com/chmod777john/swarm-ide" target="_blank" rel="noopener noreferrer" className="home-nav-link">
            <GithubIcon />
          </a>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="home-hero">
        <div className="home-hero-badge">自组织 Agent 蜂群系统</div>
        <h1 className="home-hero-title">
          <span className="home-hero-gradient">Swarm</span> IDE
        </h1>
        <p className="home-hero-desc">
          极简原语驱动的多 Agent 协作平台。无预设拓扑，Agent 自主演化；<br />
          微信式聊天界面，人类可随时介入任意层级。
        </p>
        <div className="home-hero-actions">
          <CreateWorkspace />
        </div>
      </section>

      {/* ── DB Error ── */}
      {dbError ? (
        <section className="home-section">
          <div className="home-db-error">
            <div className="home-db-error-icon">⚠</div>
            <div>
              <div className="home-db-error-title">数据库未就绪</div>
              <div className="home-db-error-msg mono">{dbError}</div>
              <div className="home-db-error-steps mono">
                1. <code>cd backend && docker compose up -d</code><br />
                2. <code>curl -X POST http://localhost:3017/api/admin/init-db</code><br />
                3. 刷新页面
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Features ── */}
      <section className="home-section">
        <div className="home-features">
          <FeatureCard
            icon="🐝"
            title="液态拓扑"
            desc="无预设结构，Agent 在运行时自主演化网络，主动雇佣下属完成复杂任务。"
          />
          <FeatureCard
            icon="💬"
            title="微信式交互"
            desc="树状多级对话列表，可随时选择任意 Agent 对话，即使在最深层级。"
          />
          <FeatureCard
            icon="🔮"
            title="实时可视化"
            desc="Graph 直接展示蜂群拓扑与实时通信链路，流式输出 tool-call 参数。"
          />
          <FeatureCard
            icon="🧠"
            title="上下文透明"
            desc="LLM History 面板实时展示 Agent 上下文，Agent 不再是黑箱。"
          />
        </div>
      </section>

      {/* ── Workspaces ── */}
      <section className="home-section">
        <div className="home-section-header">
          <h2 className="home-section-title">工作区</h2>
          <p className="home-section-desc">选择一个工作区开始对话，或创建新的工作区。</p>
        </div>
        <WorkspacesList workspaces={workspaces ?? []} />
      </section>

      {/* ── Admin ── */}
      <section className="home-section home-admin">
        <div className="home-section-header">
          <h2 className="home-section-title">管理</h2>
        </div>
        <ClearDbButton />
      </section>

      {/* ── Footer ── */}
      <footer className="home-footer">
        <span className="home-footer-text">Swarm IDE — 极简原语，无限可能</span>
      </footer>
    </div>
  );
}

/* ── Sub-components ── */

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="home-feature-card">
      <div className="home-feature-icon">{icon}</div>
      <div className="home-feature-title">{title}</div>
      <div className="home-feature-desc">{desc}</div>
    </div>
  );
}

function WorkspacesList({ workspaces }: { workspaces: Array<{ id: string; name: string; createdAt: string }> }) {
  if (workspaces.length === 0) {
    return (
      <div className="home-empty">
        <div className="home-empty-icon">📂</div>
        <div className="home-empty-text">暂无工作区，在上方创建一个开始吧。</div>
      </div>
    );
  }

  return (
    <div className="home-workspace-grid">
      {workspaces.map((w) => (
        <Link
          key={w.id}
          href={`/im?workspaceId=${encodeURIComponent(w.id)}`}
          className="home-workspace-card"
        >
          <div className="home-workspace-card-top">
            <div className="home-workspace-name">{w.name}</div>
            <div className="home-workspace-arrow">→</div>
          </div>
          <div className="home-workspace-meta mono">
            {new Date(w.createdAt).toLocaleString()}
          </div>
          <div className="home-workspace-id mono">{w.id}</div>
        </Link>
      ))}
    </div>
  );
}

function SwarmLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="13" stroke="url(#logo-grad)" strokeWidth="2" />
      <circle cx="14" cy="9" r="2.5" fill="url(#logo-grad)" />
      <circle cx="9" cy="17" r="2.5" fill="url(#logo-grad)" />
      <circle cx="19" cy="17" r="2.5" fill="url(#logo-grad)" />
      <line x1="14" y1="11.5" x2="9.5" y2="15" stroke="url(#logo-grad)" strokeWidth="1.2" />
      <line x1="14" y1="11.5" x2="18.5" y2="15" stroke="url(#logo-grad)" strokeWidth="1.2" />
      <line x1="11" y1="17" x2="17" y2="17" stroke="url(#logo-grad)" strokeWidth="1.2" />
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="28" y2="28">
          <stop stopColor="#38bdf8" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
