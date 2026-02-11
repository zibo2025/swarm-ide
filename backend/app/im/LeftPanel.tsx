import { ChevronDown, ChevronRight } from "lucide-react";
import type { Group, VizEvent, RightPanelState } from "./types";
import type { AgentTreeRow } from "./useAgentTree";
import { cx } from "./utils";
import { IMHistoryList } from "./IMHistoryList";

type LeftPanelProps = {
  session: { workspaceId: string; humanAgentId: string } | null;
  activeGroupId: string | null;
  setActiveGroupId: (id: string) => void;
  agentTreeRows: AgentTreeRow[];
  extraGroups: Group[];
  getGroupLabel: (g: Group | null | undefined) => string;
  tokenLimit: number;
  collapsedAgents: Record<string, boolean>;
  toggleAgentCollapsed: (agentId: string) => void;
  vizEvents: VizEvent[];
  vizEventsCollapsed: boolean;
  setVizEventsCollapsed: (fn: (c: boolean) => boolean) => void;
  rightPanels: RightPanelState[];
  toggleRightPanel: (id: "history") => void;
  llmHistoryParsed: any;
  llmHistoryFormatted: string;
  historyRole: (entry: any) => string;
  historyAccent: (role?: string) => string;
  summarizeHistoryEntry: (entry: any, index: number, opts?: { omitRole?: boolean }) => string;
  renameAgent?: (agentId: string, currentRole: string) => void;
};

export function LeftPanel({
  session,
  activeGroupId,
  setActiveGroupId,
  agentTreeRows,
  extraGroups,
  getGroupLabel,
  tokenLimit,
  collapsedAgents,
  toggleAgentCollapsed,
  vizEvents,
  vizEventsCollapsed,
  setVizEventsCollapsed,
  rightPanels,
  toggleRightPanel,
  llmHistoryParsed,
  llmHistoryFormatted,
  historyRole,
  historyAccent,
  summarizeHistoryEntry,
  renameAgent,
}: LeftPanelProps) {
  const renderGroupRow = (
    g: Group,
    tree?: {
      depth: number;
      hasChildren: boolean;
      collapsed: boolean;
      agentId: string;
      guides: boolean[];
      isLast: boolean;
    }
  ) => {
    const guideWidth = 14;
    const caretWidth = 18;
    const caretGap = 6;
    const depth = tree?.depth ?? 0;
    const prefixWidth = depth > 0 ? depth * guideWidth + guideWidth : 0;
    const previewIndent = tree ? prefixWidth + caretWidth + caretGap : 0;
    return (
      <div
        key={g.id}
        role="button"
        tabIndex={0}
        className={cx("row", g.id === activeGroupId && "active")}
        onClick={() => {
          setActiveGroupId(g.id);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setActiveGroupId(g.id);
        }}
        style={{ paddingLeft: 16 }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {tree && tree.depth > 0 ? (
              <span className="tree-prefix">
                {tree.guides.map((hasLine, idx) => (
                  <span
                    key={`${g.id}-guide-${idx}`}
                    className={hasLine ? "tree-line" : "tree-blank"}
                  />
                ))}
                <span className={tree.isLast ? "tree-elbow last" : "tree-elbow"} />
              </span>
            ) : null}
            {tree?.hasChildren ? (
              <button
                type="button"
                className="tree-caret"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleAgentCollapsed(tree.agentId);
                }}
                title={tree.collapsed ? "展开" : "收起"}
              >
                {tree.collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              </button>
            ) : tree ? (
              <span className="tree-caret-placeholder" />
            ) : null}
            <div
              style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: tree ? "default" : undefined }}
              onDoubleClick={(e) => {
                if (tree && renameAgent) {
                  e.stopPropagation();
                  renameAgent(tree.agentId, agentTreeRows.find(r => r.agent.id === tree.agentId)?.agent.role ?? "");
                }
              }}
              title={tree ? "双击修改名称" : undefined}
            >
              {getGroupLabel(g)}
            </div>
          </div>
          {g.unreadCount > 0 && <span className="badge">{g.unreadCount}</span>}
        </div>
        {g.lastMessage ? (
          <div
            className="muted"
            style={{
              fontSize: 12,
              marginTop: 6,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              marginLeft: previewIndent,
            }}
          >
            {g.lastMessage.content}
          </div>
        ) : null}
        {g.contextTokens > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, marginBottom: 2 }}>
              <span className="muted">Context</span>
              <span className="mono" style={{ color: (g.contextTokens / tokenLimit) > 0.8 ? "#ef4444" : (g.contextTokens / tokenLimit) > 0.5 ? "#facc15" : "#22c55e" }}>
                {g.contextTokens.toLocaleString()}
                <span className="muted" style={{ marginLeft: 4 }}>/ {tokenLimit.toLocaleString()}</span>
              </span>
            </div>
            <div style={{ height: 3, background: "#27272a", borderRadius: 2, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, (g.contextTokens / tokenLimit) * 100)}%`,
                  background: (g.contextTokens / tokenLimit) > 0.8 ? "#ef4444" : (g.contextTokens / tokenLimit) > 0.5 ? "#facc15" : "#22c55e",
                  borderRadius: 2,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="panel panel-left">
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg, #38bdf8, #818cf8)' }} />
          <div style={{ fontWeight: 700, fontSize: 13 }}>工作区</div>
        </div>
        <div className="muted mono" style={{ fontSize: 12 }}>
          {session?.workspaceId?.slice(0, 8) ?? "—"}
        </div>
      </div>

      <div className="list" style={{ flex: '1 1 0', minHeight: 0 }}>
        {agentTreeRows.length === 0 && extraGroups.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center' }} className="muted">
            暂无对话
          </div>
        ) : (
          <>
            {agentTreeRows.map(({ agent, group, depth, hasChildren, collapsed, guides, isLast }) =>
              group
                ? renderGroupRow(group, {
                    depth,
                    hasChildren,
                    collapsed,
                    agentId: agent.id,
                    guides,
                    isLast,
                  })
                : null
            )}
            {extraGroups.map((g) => renderGroupRow(g))}
          </>
        )}
      </div>

      {/* ── 事件流（左侧，LLM 上下文上方） ── */}
      <div className="ws-events-section">
        <button
          className="left-llm-toggle"
          onClick={() => setVizEventsCollapsed((c) => !c)}
        >
          <span style={{ fontSize: 12 }}>{vizEventsCollapsed ? "▸" : "▾"}</span>
          <span>事件流</span>
          <span className="left-llm-count">{vizEvents.length}</span>
        </button>
        {!vizEventsCollapsed && (
          <div className="ws-events-body">
            {vizEvents.length === 0 ? (
              <div className="muted" style={{ padding: '4px 8px' }}>暂无事件</div>
            ) : (
              vizEvents.slice(-8).reverse().map((evt) => (
                <div key={evt.id} className="ws-event-item">
                  <span
                    className="ws-event-dot"
                    style={{
                      background:
                        evt.kind === "agent" ? "#60a5fa"
                        : evt.kind === "message" ? "#fbbf24"
                        : evt.kind === "llm" ? "#38bdf8"
                        : evt.kind === "tool" ? "#f97316"
                        : "#a855f7",
                    }}
                  />
                  <span className="ws-event-label">{evt.label}</span>
                  <span className="ws-event-time">{new Date(evt.at).toLocaleTimeString()}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── LLM 历史（左侧底部） ── */}
      <div className="left-llm-section">
        <button
          className="left-llm-toggle"
          type="button"
          onClick={() => toggleRightPanel("history")}
        >
          <span style={{ fontSize: 12 }}>{rightPanels.find(p => p.id === "history")?.collapsed ? "▸" : "▾"}</span>
          <span>LLM 上下文</span>
          {Array.isArray(llmHistoryParsed) && (
            <span className="left-llm-count">{llmHistoryParsed.length}</span>
          )}
        </button>
        {!rightPanels.find(p => p.id === "history")?.collapsed && (
          <div className="left-llm-body">
            {Array.isArray(llmHistoryParsed) ? (
              <IMHistoryList
                entries={llmHistoryParsed}
                historyRole={historyRole}
                historyAccent={historyAccent}
                summarizeHistoryEntry={summarizeHistoryEntry}
              />
            ) : (
              <pre className="mono" style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, color: '#94A3B8' }}>
                {llmHistoryFormatted || "—"}
              </pre>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
