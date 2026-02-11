import type { ReactNode, RefObject } from "react";
import { LayoutGrid, MessageSquare, Square } from "lucide-react";
import type { Message } from "./types";
import { cx, fmtTime } from "./utils";
import { MarkdownContent } from "./MarkdownContent";
import { IMMessageList } from "./IMMessageList";
import { VizCanvas } from "./VizCanvas";
import type { ComponentProps } from "react";

type VizCanvasProps = ComponentProps<typeof VizCanvas>;

type MidPanelProps = {
  title: string;
  status: "boot" | "groups" | "messages" | "send" | "idle";
  midView: "chat" | "canvas";
  setMidView: (v: "chat" | "canvas") => void;
  stoppingAgents: boolean;
  session: { humanAgentId: string } | null;
  onInterruptAllAgents: () => Promise<void>;
  // Chat
  messages: Message[];
  agentRoleById: Map<string, string>;
  bottomRef: RefObject<HTMLDivElement | null>;
  draft: string;
  setDraft: (v: string) => void;
  onSend: () => Promise<void>;
  error: string | null;
  // Canvas
  midStackRef: RefObject<HTMLDivElement | null>;
  vizCanvasProps: VizCanvasProps;
};

export function MidPanel({
  title,
  status,
  midView,
  setMidView,
  stoppingAgents,
  session,
  onInterruptAllAgents,
  messages,
  agentRoleById,
  bottomRef,
  draft,
  setDraft,
  onSend,
  error,
  midStackRef,
  vizCanvasProps,
}: MidPanelProps) {
  return (
    <main className="panel panel-mid">
      <div className="header">
        <div style={{ fontWeight: 700, fontSize: 13 }}>{title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", border: "1px solid rgba(51,65,85,0.5)" }}>
            <button
              className="btn"
              style={{
                padding: "2px 8px",
                fontSize: 12,
                borderRadius: 0,
                border: "none",
                background: midView === "chat" ? "rgba(56,189,248,0.15)" : "transparent",
                color: midView === "chat" ? "#7dd3fc" : "#94A3B8",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
              onClick={() => setMidView("chat")}
              title="回复视图"
            >
              <MessageSquare size={12} /> 回复
            </button>
            <button
              className="btn"
              style={{
                padding: "2px 8px",
                fontSize: 12,
                borderRadius: 0,
                border: "none",
                borderLeft: "1px solid rgba(51,65,85,0.5)",
                background: midView === "canvas" ? "rgba(34,197,94,0.15)" : "transparent",
                color: midView === "canvas" ? "#86efac" : "#94A3B8",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
              onClick={() => setMidView("canvas")}
              title="协作画布视图"
            >
              <LayoutGrid size={12} /> 画布
            </button>
          </div>
          {status !== "idle" && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#38bdf8', animation: 'home-float 1.5s ease-in-out infinite alternate' }} />
              <span className="muted mono" style={{ fontSize: 12 }}>{status}</span>
            </div>
          )}
          <button
            className="btn"
            style={{
              padding: "3px 8px",
              fontSize: 12,
              borderColor: 'rgba(239,68,68,0.3)',
              background: stoppingAgents ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.06)',
              color: "#fca5a5",
            }}
            onClick={() => void onInterruptAllAgents()}
            disabled={!session || stoppingAgents}
            title="停止所有 agent 当前循环"
          >
            {stoppingAgents ? "停止中…" : <><Square size={12} style={{ fill: 'currentColor' }} /> 停止全部</>}
          </button>
        </div>
      </div>

      {midView === "chat" ? (
        <>
          <div className="chat" style={{ flex: 1, minHeight: 0 }}>
            <IMMessageList
              messages={messages}
              humanAgentId={session?.humanAgentId ?? null}
              agentRoleById={agentRoleById}
              fmtTime={fmtTime}
              renderContent={(content) => <MarkdownContent content={content} />}
              cx={cx}
            />
            <div ref={bottomRef} />
          </div>

          {error ? <div className="toast">{error}</div> : null}

          <div className="composer">
            <textarea
              className="input textarea"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="输入消息… (Ctrl/Cmd+Enter 发送)"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  void onSend();
                }
              }}
            />
            <button className="btn btn-primary" style={{ borderRadius: 6, padding: '6px 14px' }} onClick={() => void onSend()} disabled={!draft.trim() || status === "send"}>
              发送
            </button>
          </div>
        </>
      ) : (
        <div className="viz-shell" ref={midStackRef} style={{ flex: 1, minHeight: 0 }}>
          <VizCanvas {...vizCanvasProps} />

          {/* 事件流已移至左侧面板 */}
        </div>
      )}
    </main>
  );
}
