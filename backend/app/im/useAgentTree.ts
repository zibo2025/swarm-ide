import { useMemo } from "react";
import type { AgentMeta, Group, WorkspaceDefaults } from "./types";

export type AgentTreeRow = {
  agent: AgentMeta;
  group: Group | null;
  depth: number;
  hasChildren: boolean;
  collapsed: boolean;
  guides: boolean[];
  isLast: boolean;
};

export function useAgentTree(
  agents: AgentMeta[],
  session: WorkspaceDefaults | null,
  collapsedAgents: Record<string, boolean>,
  groupByAgentId: Map<string, Group>
): AgentTreeRow[] {
  return useMemo(() => {
    if (!session)
      return [] as AgentTreeRow[];
    const byId = new Map(agents.map((a) => [a.id, a]));
    const childrenById = new Map<string, AgentMeta[]>();
    const roots: AgentMeta[] = [];
    const byCreatedAt = (a: AgentMeta, b: AgentMeta) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

    for (const agent of agents) {
      if (agent.role === "human") continue;
      const parentId = agent.parentId;
      const parent = parentId && parentId !== agent.id ? byId.get(parentId) : null;
      if (parent && parent.role !== "human" && parent.id !== agent.id) {
        const list = childrenById.get(parent.id) ?? [];
        list.push(agent);
        childrenById.set(parent.id, list);
      } else {
        roots.push(agent);
      }
    }

    for (const list of childrenById.values()) list.sort(byCreatedAt);
    roots.sort(byCreatedAt);

    const rows: AgentTreeRow[] = [];
    const walk = (agent: AgentMeta, depth: number, guides: boolean[], isLast: boolean) => {
      const children = childrenById.get(agent.id) ?? [];
      const collapsed = !!collapsedAgents[agent.id];
      rows.push({
        agent,
        group: groupByAgentId.get(agent.id) ?? null,
        depth,
        hasChildren: children.length > 0,
        collapsed,
        guides,
        isLast,
      });
      if (collapsed) return;
      const nextGuides = [...guides, !isLast];
      children.forEach((child, index) => {
        walk(child, depth + 1, nextGuides, index === children.length - 1);
      });
    };
    roots.forEach((root, index) => walk(root, 0, [], index === roots.length - 1));
    return rows;
  }, [agents, collapsedAgents, groupByAgentId, session]);
}
