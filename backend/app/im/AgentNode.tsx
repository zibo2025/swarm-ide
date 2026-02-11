"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Briefcase, Code2, Network, User } from "lucide-react";
import type { AgentStatus } from "./types";
import { roleLabel, statusColor, statusLabel } from "./utils";

export type AgentNodeData = {
  role: string;
  status: AgentStatus;
  isHuman: boolean;
  isActive: boolean;
};

function AgentNodeInner({ data }: NodeProps) {
  const { role, status, isHuman, isActive } = data as unknown as AgentNodeData;
  const ring = statusColor(status);
  const Icon =
    role === "productmanager"
      ? Briefcase
      : role === "coder"
        ? Code2
        : role === "assistant"
          ? Network
          : User;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
      }}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        style={{
          position: "relative",
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: `2px solid ${ring}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(5,5,5,0.9)",
          boxShadow: isActive
            ? `0 0 20px ${ring}88, 0 0 40px ${ring}44`
            : `0 0 12px ${ring}33`,
          transition: "box-shadow 0.3s ease, border-color 0.3s ease",
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            border: `1.5px solid ${isHuman ? "#f8fafc" : "#4ade80"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.6)",
          }}
        >
          <Icon size={18} color={isHuman ? "#f8fafc" : "#e4e4e7"} />
        </div>
        {status === "BUSY" && (
          <div
            style={{
              position: "absolute",
              inset: 4,
              borderRadius: "50%",
              border: "2px solid #ef4444",
              borderTopColor: "transparent",
              borderRightColor: "transparent",
              animation: "spin 1s linear infinite",
            }}
          />
        )}
      </div>
      <div
        style={{
          textAlign: "center",
          fontSize: 11,
          fontWeight: 600,
          color: "#e4e4e7",
          lineHeight: 1.3,
        }}
      >
        {roleLabel(role)}
        <div style={{ fontSize: 10, color: ring, fontWeight: 500 }}>{statusLabel(status)}</div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

export const AgentNode = memo(AgentNodeInner);
