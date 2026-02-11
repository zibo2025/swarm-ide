import type { WorkspaceDefaults, AgentStatus } from "./types";
import { SESSION_KEY } from "./constants";

export function loadSession(): WorkspaceDefaults | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WorkspaceDefaults;
  } catch {
    return null;
  }
}

export function saveSession(session: WorkspaceDefaults) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} ${text}`);
  }
  return (await res.json()) as T;
}

export function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

export function roleColor(role?: string) {
  if (!role) return "#e4e4e7";
  if (role === "human") return "#f8fafc";
  if (role === "assistant") return "#38bdf8";
  if (role === "productmanager") return "#fb7185";
  if (role === "coder") return "#34d399";
  return "#fbbf24";
}

export function statusColor(status?: AgentStatus) {
  if (status === "BUSY") return "#ef4444";
  if (status === "WAKING") return "#facc15";
  return "#22c55e";
}

export function summarizeHistoryEntry(entry: any, index: number, opts?: { omitRole?: boolean }) {
  const role = typeof entry?.role === "string" ? entry.role : "unknown";
  const toolCalls = Array.isArray(entry?.tool_calls) ? entry.tool_calls.length : 0;
  const toolName =
    typeof entry?.name === "string"
      ? entry.name
      : typeof entry?.tool_call_id === "string"
        ? entry.tool_call_id.slice(0, 6)
        : "";
  let contentText = "";
  if (typeof entry?.content === "string") {
    contentText = entry.content;
  } else if (entry?.content != null) {
    try {
      contentText = JSON.stringify(entry.content);
    } catch {
      contentText = String(entry.content);
    }
  }
  contentText = contentText.replace(/\s+/g, " ").slice(0, 80);
  const metaParts: string[] = [];
  if (!opts?.omitRole) metaParts.push(role);
  if (role === "tool" && toolName) {
    metaParts.push(toolName);
  } else if (toolCalls > 0) {
    metaParts.push(`tool_calls:${toolCalls}`);
  }
  const meta = metaParts.join(" · ");
  const prefix = meta ? `#${index + 1} ${meta}` : `#${index + 1}`;
  return contentText ? `${prefix} — ${contentText}` : prefix;
}

export function historyRole(entry: any) {
  return typeof entry?.role === "string" ? entry.role : "unknown";
}

export function historyAccent(role?: string) {
  if (!role) return "#94a3b8";
  if (role === "human") return "#f8fafc";
  if (role === "assistant") return "#38bdf8";
  if (role === "productmanager") return "#fb7185";
  if (role === "coder") return "#34d399";
  if (role === "tool") return "#fbbf24";
  if (role === "system") return "#a78bfa";
  return "#94a3b8";
}
