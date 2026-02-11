import { Brain, ChevronDown, MessageSquare, Wrench, Zap } from "lucide-react";
import { cx } from "./utils";
import { MarkdownContent } from "./MarkdownContent";

type StreamStep = {
  id: number;
  type: "reasoning" | "content" | "tool";
  collapsed: boolean;
  done: boolean;
};

type RightPanelProps = {
  streamAgentId: string | null;
  agentRoleById: Map<string, string>;
  agentError: string | null;
  streamSteps: StreamStep[];
  setStreamSteps: (fn: (prev: StreamStep[]) => StreamStep[]) => void;
  contentStream: string;
  reasoningStream: string;
  toolStream: string;
};

export function RightPanel({
  streamAgentId,
  agentRoleById,
  agentError,
  streamSteps,
  setStreamSteps,
  contentStream,
  reasoningStream,
  toolStream,
}: RightPanelProps) {
  return (
    <>
      <section className="panel panel-right">
        {/* ── Windsurf 风格头部 ── */}
        <div className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.4)' }} />
            <div style={{ fontWeight: 700, fontSize: 13 }}>实时输出</div>
          </div>
          <div className="muted mono" style={{ fontSize: 12 }}>
            {streamAgentId ? (agentRoleById.get(streamAgentId) ?? streamAgentId.slice(0, 8)) : "—"}
          </div>
        </div>

        {agentError ? (
          <div className="toast" style={{ borderColor: "#713f12", background: "rgba(113,63,18,0.25)", color: "#fde68a" }}>
            {agentError}
          </div>
        ) : null}

        {/* ── Windsurf 步骤流 ── */}
        <div className="ws-flow">
          {streamSteps.length === 0 ? (
            <div className="ws-empty">
              <div className="ws-empty-icon"><Zap size={24} /></div>
              <div className="ws-empty-text">等待 Agent 输出…</div>
              <div className="ws-empty-hint">Agent 开始推理后，输出将实时显示在这里</div>
            </div>
          ) : (
            <div className="ws-steps">
              {streamSteps.map((step, idx) => {
                const stepLabel = step.type === "reasoning" ? "推理过程" : step.type === "content" ? "回复内容" : "工具调用";
                const stepBadge = step.type === "reasoning" ? "thinking" : step.type === "content" ? "streaming" : "tool_use";
                const StepIcon = step.type === "reasoning" ? Brain : step.type === "content" ? MessageSquare : Wrench;
                const stepContent = step.type === "reasoning" ? reasoningStream : step.type === "content" ? contentStream : toolStream;
                const previewText = stepContent?.slice(0, 80)?.replace(/\n/g, " ") || "";
                return (
                  <div
                    key={step.id}
                    className={cx("ws-step", `ws-step--${step.type}`, step.collapsed && "ws-step--collapsed", !step.done && "ws-step--active")}
                  >
                    <button
                      className="ws-step-header"
                      onClick={() => setStreamSteps((prev) => prev.map((s) => s.id === step.id ? { ...s, collapsed: !s.collapsed } : s))}
                    >
                      <div className={`ws-step-dot ws-step-dot--${step.type}`} />
                      <StepIcon size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
                      <span className="ws-step-label">{stepLabel}</span>
                      <span className="ws-step-num">#{idx + 1}</span>
                      {!step.done && <span className={`ws-step-badge ws-step-badge--${step.type}`}>{stepBadge}</span>}
                      {step.done && <span className="ws-step-badge ws-step-badge--done">完成</span>}
                      <ChevronDown size={12} className={cx("ws-step-chevron", !step.collapsed && "ws-step-chevron--open")} />
                    </button>
                    {step.collapsed ? (
                      <div className="ws-step-preview">{previewText}{previewText.length >= 80 ? "…" : ""}</div>
                    ) : (
                      <div className={cx("ws-step-body", step.type === "tool" && "mono")}>
                        <MarkdownContent content={stepContent} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

{/* 事件流已移至左侧面板 */}
      </section>
      <style jsx global>{`
        @keyframes viz-dash {
          from {
            stroke-dashoffset: 18;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </>
  );
}
