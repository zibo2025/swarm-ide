"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AgentMeta, Group, Message, RightPanelId, RightPanelState, WorkspaceDefaults } from "./types";
import { api, historyAccent, historyRole, loadSession, roleLabel, saveSession, summarizeHistoryEntry } from "./utils";
import { useVizLayout } from "./useVizLayout";
import { useAgentTree } from "./useAgentTree";
import { useUiStreamEffect } from "./useUiStreamEffect";
import { useAgentStreamHandler } from "./useAgentStreamHandler";
import { useSyncToRef } from "./useSyncRef";
import { IMShell } from "./IMShell";
import { LeftPanel } from "./LeftPanel";
import { MidPanel } from "./MidPanel";
import { RightPanel } from "./RightPanel";

export default function IMPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: '#71717a' }}>加载中…</div>}>
      <IMPageInner />
    </Suspense>
  );
}

function IMPageInner() {
  const searchParams = useSearchParams();
  const workspaceOverrideId = searchParams.get("workspaceId");
  const [session, setSession] = useState<WorkspaceDefaults | null>(() => null);
  const [tokenLimit, setTokenLimit] = useState<number>(100000);
  const [groups, setGroups] = useState<Group[]>([]);
  const [agents, setAgents] = useState<AgentMeta[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"boot" | "groups" | "messages" | "send" | "idle">("boot");
  const [error, setError] = useState<string | null>(null);
  const [stoppingAgents, setStoppingAgents] = useState(false);

  const [llmHistory, setLlmHistory] = useState("");
  const [vizEventsCollapsed, setVizEventsCollapsed] = useState(true);
  const [rightPanels, setRightPanels] = useState<RightPanelState[]>([
    { id: "history", title: "LLM 历史", size: 320, collapsed: true },
    { id: "content", title: "实时内容", size: 220, collapsed: false },
    { id: "reasoning", title: "实时推理", size: 220, collapsed: false },
    { id: "tools", title: "实时工具", size: 200, collapsed: false },
  ]);
  const [midView, setMidView] = useState<"chat" | "canvas">("chat");
  const [collapsedAgents, setCollapsedAgents] = useState<Record<string, boolean>>({});

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const activeGroupIdRef = useRef<string | null>(null);
  const streamAgentIdValueRef = useRef<string | null>(null);
  const agentRoleByIdRef = useRef<Map<string, string>>(new Map());
  const llmHistoryReqIdRef = useRef(0);
  const groupsRef = useRef<Group[]>([]);


  const activeGroup = useMemo(
    () => groups.find((g) => g.id === activeGroupId) ?? null,
    [groups, activeGroupId]
  );

  const agentRoleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of agents) map.set(a.id, a.role);
    return map;
  }, [agents]);

  const vizLayout = useVizLayout(agents, session, { width: 800, height: 400 }, {});

  const getGroupLabel = useCallback(
    (g: Group | null | undefined) => {
      if (!g) return "Group";
      if (g.name) return g.name;
      if (g.id === session?.defaultGroupId) return "P2P 人类↔助手";

      const memberRoles = g.memberIds
        .filter((id) => id !== session?.humanAgentId)
        .map((id) => roleLabel(agentRoleById.get(id) ?? id.slice(0, 8)));

      if (memberRoles.length === 1) return `人类 ↔ ${memberRoles[0]}`;
      if (memberRoles.length === 2) return `${memberRoles[0]} ↔ ${memberRoles[1]}`;
      if (memberRoles.length > 2) return `群组 (${memberRoles.length})`;
      return "Group";
    },
    [agentRoleById, session?.defaultGroupId, session?.humanAgentId]
  );

  const groupByAgentId = useMemo(() => {
    const map = new Map<string, Group>();
    if (!session) return map;
    for (const g of groups) {
      if (!g.memberIds.includes(session.humanAgentId)) continue;
      const others = g.memberIds.filter((id) => id !== session.humanAgentId);
      if (others.length === 1) {
        map.set(others[0], g);
      }
    }
    return map;
  }, [groups, session]);

  const agentTreeRows = useAgentTree(agents, session, collapsedAgents, groupByAgentId);

  const extraGroups = useMemo(() => {
    if (!session) return groups;
    const mappedIds = new Set(Array.from(groupByAgentId.values()).map((g) => g.id));
    return groups.filter((g) => !mappedIds.has(g.id));
  }, [groupByAgentId, groups, session]);

  const streamAgentId = useMemo(() => {
    if (!session) return null;
    if (!activeGroupId) return session.assistantAgentId;
    const group = groups.find((g) => g.id === activeGroupId);
    if (!group) return session.assistantAgentId;
    return group.memberIds.find((id) => id !== session.humanAgentId) ?? session.assistantAgentId;
  }, [activeGroupId, groups, session]);

  const refreshAgents = useCallback(async (s: WorkspaceDefaults) => {
    const { agents } = await api<{ agents: AgentMeta[] }>(
      `/api/agents?workspaceId=${encodeURIComponent(s.workspaceId)}&meta=true`
    );
    setAgents(agents);
  }, []);

  const formatLlmHistory = useCallback((raw: string) => {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }, []);

  const refreshLlmHistory = useCallback(
    async (agentId: string) => {
      const reqId = (llmHistoryReqIdRef.current += 1);
      try {
        const res = await api<{ llmHistory: string }>(`/api/agents/${agentId}`);
        if (reqId !== llmHistoryReqIdRef.current) return;
        setLlmHistory(res.llmHistory ?? "");
      } catch (e) {
        if (reqId !== llmHistoryReqIdRef.current) return;
        setLlmHistory(
          e instanceof Error ? `(failed to load llm_history: ${e.message})` : "(failed to load llm_history)"
        );
      }
    },
    [formatLlmHistory]
  );

  const llmHistoryParsed = useMemo(() => {
    if (!llmHistory) return null;
    try {
      return JSON.parse(llmHistory);
    } catch {
      return null;
    }
  }, [llmHistory]);

  const llmHistoryFormatted = useMemo(() => {
    if (!llmHistory) return "";
    return formatLlmHistory(llmHistory);
  }, [formatLlmHistory, llmHistory]);

  // Load token limit config on mount
  useEffect(() => {
    api<{ tokenLimit: number }>("/api/config")
      .then((c) => setTokenLimit(c.tokenLimit))
      .catch(() => setTokenLimit(100000));
  }, []);

  const refreshGroups = useCallback(async (s: WorkspaceDefaults, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setStatus("groups");
    const q = new URLSearchParams({ workspaceId: s.workspaceId, agentId: s.humanAgentId });
    const { groups } = await api<{ groups: Group[] }>(`/api/groups?${q.toString()}`);
    setGroups(groups);
    if (!opts?.silent) setStatus("idle");
  }, []);

  const refreshMessages = useCallback(
    async (
      s: WorkspaceDefaults,
      groupId: string,
      opts?: { markRead?: boolean; silent?: boolean; skipGroupRefresh?: boolean }
    ) => {
      if (!opts?.silent) setStatus("messages");
      const q = new URLSearchParams();
      if (opts?.markRead ?? true) q.set("markRead", "true");
      q.set("readerId", s.humanAgentId);
      const suffix = q.size ? `?${q.toString()}` : "";
      const { messages } = await api<{ messages: Message[] }>(
        `/api/groups/${groupId}/messages${suffix}`
      );
      setMessages(messages);
      if (!opts?.silent) setStatus("idle");
      if (!opts?.skipGroupRefresh) {
        void refreshGroups(s, { silent: opts?.silent });
      }
      queueMicrotask(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
    },
    [refreshGroups]
  );

  // ── Extracted hooks ──
  const {
    contentStream, reasoningStream, toolStream,
    streamSteps, setStreamSteps, agentError, setAgentError,
    connectAgentStream, streamAgentIdRef, cleanup: cleanupAgentStream,
  } = useAgentStreamHandler({ activeGroupIdRef, refreshMessages, refreshGroups, refreshLlmHistory });

  const { vizEvents, vizBeams, agentStatusById, setAgentStatusById } = useUiStreamEffect({
    session, agentRoleByIdRef, groupsRef, activeGroupIdRef, streamAgentIdValueRef,
    refreshGroups, refreshAgents, refreshLlmHistory, refreshMessages,
  });


  const applySession = useCallback((s: WorkspaceDefaults) => {
    saveSession(s);
    setSession(s);
    setActiveGroupId(s.defaultGroupId);
    setStatus("idle");
    void refreshAgents(s);
  }, [refreshAgents]);

  const resolveWorkspace = useCallback(async (workspaceId: string) => {
    return api<WorkspaceDefaults>(`/api/workspaces/${workspaceId}/defaults`);
  }, []);

  const bootstrap = useCallback(async (overrideWorkspaceId: string | null) => {
    setError(null);
    setAgentError(null);
    setStatus("boot");

    setGroups([]);
    setMessages([]);
    setLlmHistory("");
    cleanupAgentStream();

    if (overrideWorkspaceId) {
      applySession(await resolveWorkspace(overrideWorkspaceId));
      return;
    }

    const existing = loadSession();
    if (existing) {
      try { applySession(await resolveWorkspace(existing.workspaceId)); return; } catch { /* fall through */ }
    }

    try {
      const recent = await api<{ workspaces: Array<{ id: string }> }>(`/api/workspaces`);
      if (recent.workspaces.length > 0) {
        applySession(await resolveWorkspace(recent.workspaces[0]!.id));
        return;
      }
    } catch { /* fall through */ }

    const created = await api<WorkspaceDefaults>(`/api/workspaces`, {
      method: "POST",
      body: JSON.stringify({ name: "Default Workspace" }),
    });
    applySession(created);
  }, [applySession, cleanupAgentStream, resolveWorkspace, setAgentError]);

  const createWorkspace = useCallback(async (name?: string) => {
    setError(null);
    setAgentError(null);
    setStatus("boot");
    const created = await api<WorkspaceDefaults>(`/api/workspaces`, {
      method: "POST",
      body: JSON.stringify({ name: name?.trim() || "New Workspace" }),
    });
    applySession(created);
    window.history.replaceState(null, "", "/im");
    return created;
  }, [applySession, setAgentError]);

  const createSubAgent = useCallback(async (role: string) => {
    if (!session) return;
    setError(null);
    setAgentError(null);
    setStatus("boot");
    try {
      const created = await api<{ agentId: string; groupId: string }>(`/api/agents`, {
        method: "POST",
        body: JSON.stringify({ workspaceId: session.workspaceId, creatorId: session.humanAgentId, role }),
      });
      setStatus("idle");
      void refreshGroups(session);
      void refreshAgents(session);
      setActiveGroupId(created.groupId);
      connectAgentStream(created.agentId);
    } catch (e) {
      setStatus("idle");
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [connectAgentStream, refreshAgents, refreshGroups, session, setAgentError]);

  const hireSubAgent = useCallback(async () => {
    const role = (window.prompt("Sub-agent role", "assistant") ?? "").trim();
    if (role) await createSubAgent(role);
  }, [createSubAgent]);

  const onInterruptAllAgents = useCallback(async () => {
    if (!session || stoppingAgents) return;

    setStoppingAgents(true);
    setError(null);
    setAgentError(null);

    try {
      const res = await api<{ ok: boolean; interrupted: number; agentIds: string[] }>(
        `/api/agents/interrupt-all`,
        {
          method: "POST",
          body: JSON.stringify({ workspaceId: session.workspaceId }),
        }
      );

      setAgentStatusById((prev) => {
        const next = { ...prev };
        const ids = res.agentIds.length > 0 ? res.agentIds : agents.map((agent) => agent.id);
        for (const id of ids) {
          next[id] = "IDLE";
        }
        return next;
      });
      setStatus("idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStoppingAgents(false);
    }
  }, [agents, session, stoppingAgents]);

  const onSend = useCallback(async () => {
    if (!session || !activeGroupId) return;
    const text = draft.trim();
    if (!text) return;

    if (text.startsWith("/create") || text.startsWith("/hire")) {
      const role = text.replace(/^\/(create|hire)\s*/i, "").trim();
      if (!role) { setError("Usage: /create <role>"); return; }
      setDraft("");
      await createSubAgent(role);
      return;
    }

    setStatus("send");
    setError(null);

    const optimistic: Message = {
      id: `optimistic-${Date.now()}`,
      senderId: session.humanAgentId,
      content: text,
      contentType: "text",
      sendTime: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setDraft("");
    queueMicrotask(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));

    try {
      await api(`/api/groups/${activeGroupId}/messages`, {
        method: "POST",
        body: JSON.stringify({ senderId: session.humanAgentId, content: text, contentType: "text" }),
      });
    } finally {
      // keep going
    }

    setStatus("idle");
    void refreshMessages(session, activeGroupId, { markRead: false });
    void refreshGroups(session);
  }, [
    activeGroupId,
    connectAgentStream,
    draft,
    refreshAgents,
    refreshGroups,
    refreshMessages,
    session,
  ]);

  useEffect(() => {
    void bootstrap(workspaceOverrideId).catch((e) =>
      setError(e instanceof Error ? e.message : String(e))
    );
  }, [bootstrap, workspaceOverrideId]);

  useSyncToRef(activeGroupIdRef, activeGroupId);
  useSyncToRef(streamAgentIdValueRef, streamAgentId);
  useSyncToRef(groupsRef, groups);
  useSyncToRef(agentRoleByIdRef, agentRoleById);

  useEffect(() => {
    if (!session) return;
    void refreshGroups(session).catch((e) => setError(e instanceof Error ? e.message : String(e)));
    void refreshAgents(session).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [refreshGroups, session]);

  useEffect(() => {
    if (!streamAgentId) return;
    connectAgentStream(streamAgentId);
    setLlmHistory("");
    void refreshLlmHistory(streamAgentId);
  }, [connectAgentStream, refreshLlmHistory, streamAgentId]);

  useEffect(() => {
    if (!activeGroupId || !session) return;
    void refreshMessages(session, activeGroupId, { markRead: true }).catch((e) =>
      setError(e instanceof Error ? e.message : String(e))
    );
  }, [activeGroupId, refreshMessages, session]);

  useEffect(() => {
    return () => cleanupAgentStream();
  }, [cleanupAgentStream]);

  const toggleRightPanel = useCallback((id: RightPanelId) => {
    setRightPanels((prev) =>
      prev.map((panel) =>
        panel.id === id ? { ...panel, collapsed: !panel.collapsed } : panel
      )
    );
  }, []);

  const title = getGroupLabel(activeGroup);

  const toggleAgentCollapsed = useCallback((agentId: string) => {
    setCollapsedAgents((prev) => ({ ...prev, [agentId]: !prev[agentId] }));
  }, []);

  const onVizNodeClick = useCallback((agentId: string) => {
    const group = groupByAgentId.get(agentId);
    if (group) setActiveGroupId(group.id);
  }, [groupByAgentId]);

  return (
    <IMShell
      left={
        <LeftPanel
          session={session}
          activeGroupId={activeGroupId}
          setActiveGroupId={setActiveGroupId}
          agentTreeRows={agentTreeRows}
          extraGroups={extraGroups}
          getGroupLabel={getGroupLabel}
          tokenLimit={tokenLimit}
          collapsedAgents={collapsedAgents}
          toggleAgentCollapsed={toggleAgentCollapsed}
          vizEvents={vizEvents}
          vizEventsCollapsed={vizEventsCollapsed}
          setVizEventsCollapsed={setVizEventsCollapsed}
          rightPanels={rightPanels}
          toggleRightPanel={toggleRightPanel}
          llmHistoryParsed={llmHistoryParsed}
          llmHistoryFormatted={llmHistoryFormatted}
          historyRole={historyRole}
          historyAccent={historyAccent}
          summarizeHistoryEntry={summarizeHistoryEntry}
        />
      }
      mid={
        <MidPanel
          title={title}
          status={status}
          midView={midView}
          setMidView={setMidView}
          stoppingAgents={stoppingAgents}
          session={session}
          onInterruptAllAgents={onInterruptAllAgents}
          messages={messages}
          agentRoleById={agentRoleById}
          bottomRef={bottomRef}
          draft={draft}
          setDraft={setDraft}
          onSend={onSend}
          error={error}
          vizCanvasProps={{
            vizLayout,
            vizBeams,
            agentStatusById,
            streamAgentId,
            humanAgentId: session?.humanAgentId ?? null,
            onNodeClick: onVizNodeClick,
          }}
        />
      }
      right={
        <RightPanel
          streamAgentId={streamAgentId}
          agentRoleById={agentRoleById}
          agentError={agentError}
          streamSteps={streamSteps}
          setStreamSteps={setStreamSteps}
          contentStream={contentStream}
          reasoningStream={reasoningStream}
          toolStream={toolStream}
        />
      }
    />
  );
}
