"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeMouseHandler,
  BackgroundVariant,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AgentNode, type AgentNodeData } from "./AgentNode";
import type { AgentMeta, AgentStatus, VizBeam } from "./types";

type VizLayout = {
  positions: Map<string, { x: number; y: number }>;
  ordered: AgentMeta[];
  edges: Array<{ fromId: string; toId: string }>;
  parentById: Map<string, string | null>;
};

export type VizCanvasProps = {
  vizLayout: VizLayout;
  vizBeams: VizBeam[];
  agentStatusById: Record<string, AgentStatus>;
  streamAgentId: string | null;
  humanAgentId: string | null;
  onNodeClick?: (agentId: string) => void;
};

const nodeTypes = { agent: AgentNode };

function VizCanvasInner({
  vizLayout,
  vizBeams,
  agentStatusById,
  streamAgentId,
  humanAgentId,
  onNodeClick,
}: VizCanvasProps) {
  const { fitView } = useReactFlow();
  const prevCountRef = useRef(0);

  const nextNodes: Node[] = useMemo(() => {
    return vizLayout.ordered.map((agent) => {
      const pos = vizLayout.positions.get(agent.id) ?? { x: 0, y: 0 };
      const status = agentStatusById[agent.id] ?? "IDLE";
      const isActive = streamAgentId === agent.id;
      const isHuman = agent.id === humanAgentId || agent.role === "human";
      return {
        id: agent.id,
        type: "agent",
        position: { x: pos.x - 40, y: pos.y - 50 },
        data: { role: agent.role, status, isHuman, isActive } satisfies AgentNodeData,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        draggable: true,
      };
    });
  }, [vizLayout, agentStatusById, streamAgentId, humanAgentId]);

  const beamMap = useMemo(() => {
    const map = new Map<string, VizBeam>();
    for (const b of vizBeams) map.set(`${b.fromId}-${b.toId}`, b);
    return map;
  }, [vizBeams]);

  const nextEdges: Edge[] = useMemo(() => {
    return vizLayout.edges.map((e) => {
      const key = `${e.fromId}-${e.toId}`;
      const beam = beamMap.get(key);
      return {
        id: key,
        source: e.fromId,
        target: e.toId,
        type: "smoothstep",
        animated: !!beam,
        label: beam ? (beam.kind === "create" ? "create" : "send") : undefined,
        labelStyle: beam ? { fill: beam.kind === "create" ? "#93c5fd" : "#94a3b8", fontSize: 10, fontWeight: 600 } : undefined,
        labelBgStyle: beam ? { fill: beam.kind === "create" ? "rgba(30,58,138,0.8)" : "rgba(15,23,42,0.8)", stroke: "rgba(51,65,85,0.4)", strokeWidth: 1 } : undefined,
        labelBgPadding: [4, 2] as [number, number],
        style: {
          stroke: beam ? "#38bdf8" : "rgba(148,163,184,0.35)",
          strokeWidth: beam ? 2 : 1.2,
        },
      };
    });
  }, [vizLayout.edges, beamMap]);

  const [nodes, setNodes, onNodesChange] = useNodesState(nextNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(nextEdges);

  useEffect(() => {
    setNodes((prev) => {
      const posMap = new Map(prev.map((n) => [n.id, n.position]));
      return nextNodes.map((n) => {
        const draggedPos = posMap.get(n.id);
        return draggedPos ? { ...n, position: draggedPos } : n;
      });
    });
  }, [nextNodes, setNodes]);

  useEffect(() => {
    setEdges(nextEdges);
  }, [nextEdges, setEdges]);

  useEffect(() => {
    const count = vizLayout.ordered.length;
    if (count !== prevCountRef.current) {
      prevCountRef.current = count;
      setTimeout(() => fitView({ padding: 0.3, duration: 300 }), 100);
    }
  }, [vizLayout.ordered.length, fitView]);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => { onNodeClick?.(node.id); },
    [onNodeClick],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      minZoom={0.3}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      nodesDraggable
      nodesConnectable={false}
      colorMode="dark"
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(148,163,184,0.15)" />
      <Controls
        showInteractive={false}
        style={{
          borderRadius: 8,
          border: "1px solid rgba(51,65,85,0.4)",
          background: "rgba(15,23,42,0.8)",
          backdropFilter: "blur(8px)",
        }}
      />
      <MiniMap
        nodeColor={(n) => {
          const d = n.data as AgentNodeData | undefined;
          if (!d) return "#334155";
          return d.isActive ? "#38bdf8" : d.isHuman ? "#f8fafc" : "#4ade80";
        }}
        maskColor="rgba(0,0,0,0.7)"
        style={{
          background: "rgba(15,23,42,0.9)",
          border: "1px solid rgba(51,65,85,0.4)",
          borderRadius: 6,
        }}
      />
    </ReactFlow>
  );
}

export function VizCanvas(props: VizCanvasProps) {
  return (
    <div style={{ width: "100%", height: "100%", background: "#050505" }}>
      <ReactFlowProvider>
        <VizCanvasInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
