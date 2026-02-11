import { useCallback, useRef, useState } from "react";
import type { RefObject } from "react";
import type { AgentStreamEvent, WorkspaceDefaults } from "./types";
import { loadSession } from "./utils";

type StreamStep = { id: number; type: "reasoning" | "content" | "tool"; collapsed: boolean; done: boolean };

type UseAgentStreamHandlerParams = {
  activeGroupIdRef: RefObject<string | null>;
  refreshMessages: (s: WorkspaceDefaults, groupId: string, opts?: { markRead?: boolean }) => Promise<void>;
  refreshGroups: (s: WorkspaceDefaults) => Promise<void>;
  refreshLlmHistory: (agentId: string) => Promise<void>;
};

export function useAgentStreamHandler({
  activeGroupIdRef,
  refreshMessages,
  refreshGroups,
  refreshLlmHistory,
}: UseAgentStreamHandlerParams) {
  const [contentStream, setContentStream] = useState("");
  const [reasoningStream, setReasoningStream] = useState("");
  const [toolStream, setToolStream] = useState("");
  const [streamSteps, setStreamSteps] = useState<StreamStep[]>([]);
  const [agentError, setAgentError] = useState<string | null>(null);

  const esRef = useRef<EventSource | null>(null);
  const streamAgentIdRef = useRef<string | null>(null);
  const streamStepCounterRef = useRef(0);
  const activeStepTypeRef = useRef<string | null>(null);
  const toolCallBuffersRef = useRef<Map<string, string>>(new Map());
  const toolResultBuffersRef = useRef<Map<string, string>>(new Map());

  const connectAgentStream = useCallback(
    (agentId: string) => {
      if (streamAgentIdRef.current === agentId && esRef.current) return;
      streamAgentIdRef.current = agentId;

      esRef.current?.close();
      setContentStream("");
      setReasoningStream("");
      setToolStream("");
      setAgentError(null);
      setStreamSteps([]);
      streamStepCounterRef.current = 0;
      activeStepTypeRef.current = null;
      toolCallBuffersRef.current = new Map();
      toolResultBuffersRef.current = new Map();

      const groupId = activeGroupIdRef.current;
      const suffix = groupId ? `?groupId=${encodeURIComponent(groupId)}` : "";
      const es = new EventSource(`/api/agents/${agentId}/context-stream${suffix}`);
      esRef.current = es;

      const ensureStep = (type: "reasoning" | "content" | "tool") => {
        if (activeStepTypeRef.current !== type) {
          activeStepTypeRef.current = type;
          const id = ++streamStepCounterRef.current;
          setStreamSteps((prev) => [
            ...prev.map((s) => s.done ? s : { ...s, done: true, collapsed: true }),
            { id, type, collapsed: false, done: false },
          ]);
        }
      };

      es.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data) as AgentStreamEvent;
          if (payload.event === "agent.stream") {
            const chunk = payload.data.delta;
            if (chunk) {
              if (payload.data.kind === "content") {
                ensureStep("content");
                setContentStream((t) => t + chunk);
              } else if (payload.data.kind === "reasoning") {
                ensureStep("reasoning");
                setReasoningStream((t) => t + chunk);
              } else {
                ensureStep("tool");
                const name = payload.data.tool_call_name ?? payload.data.tool_call_id ?? "tool_call";
                const key = payload.data.tool_call_id ?? name;
                const buffers =
                  payload.data.kind === "tool_result"
                    ? toolResultBuffersRef.current
                    : toolCallBuffersRef.current;
                const next = `${buffers.get(key) ?? ""}${chunk}`;
                buffers.set(key, next);
                const callLines = Array.from(toolCallBuffersRef.current.entries()).map(
                  ([id, value]) => `tool_calls[${id}]: ${value}`
                );
                const resultLines = Array.from(toolResultBuffersRef.current.entries()).map(
                  ([id, value]) => `tool_result[${id}]: ${value}`
                );
                setToolStream([...callLines, ...resultLines].join("\n\n"));
              }
            }
            return;
          }
          if (payload.event === "agent.wakeup") {
            setContentStream("");
            setReasoningStream("");
            setToolStream("");
            activeStepTypeRef.current = null;
            setStreamSteps([]);
            streamStepCounterRef.current = 0;
            toolCallBuffersRef.current = new Map();
            toolResultBuffersRef.current = new Map();
            return;
          }
          if (payload.event === "agent.unread") {
            setContentStream("");
            setReasoningStream("");
            setToolStream("");
            activeStepTypeRef.current = null;
            setStreamSteps([]);
            streamStepCounterRef.current = 0;
            toolCallBuffersRef.current = new Map();
            toolResultBuffersRef.current = new Map();
            return;
          }
          if (payload.event === "agent.done") {
            setStreamSteps((prev) => prev.map((s) => ({ ...s, done: true, collapsed: true })));
            activeStepTypeRef.current = null;
            toolCallBuffersRef.current = new Map();
            toolResultBuffersRef.current = new Map();
            const groupId = activeGroupIdRef.current;
            const nextSession = loadSession();
            if (nextSession && groupId) void refreshMessages(nextSession, groupId, { markRead: false });
            if (nextSession) void refreshGroups(nextSession);
            const agentId = streamAgentIdRef.current;
            if (agentId) void refreshLlmHistory(agentId);
            return;
          }
          if (payload.event === "agent.error") {
            setAgentError(payload.data.message);
          }
        } catch {
          // ignore
        }
      };

      es.onerror = () => setAgentError("SSE disconnected");
    },
    [refreshGroups, refreshMessages]
  );

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    esRef.current?.close();
  }, []);

  return {
    contentStream,
    reasoningStream,
    toolStream,
    streamSteps,
    setStreamSteps,
    agentError,
    setAgentError,
    connectAgentStream,
    streamAgentIdRef,
    cleanup,
  };
}
