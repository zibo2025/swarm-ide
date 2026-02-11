"use client";

import { useState } from "react";

type WorkspaceDefaults = {
  workspaceId: string;
  humanAgentId: string;
  assistantAgentId: string;
  defaultGroupId: string;
};

export default function CreateWorkspace() {
  const [name, setName] = useState("New Workspace");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCreate() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} ${text}`);
      const data = JSON.parse(text) as WorkspaceDefaults;
      window.location.href = `/im?workspaceId=${encodeURIComponent(data.workspaceId)}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="home-create">
      <div className="home-create-row">
        <input
          className="home-create-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="输入工作区名称"
          disabled={busy}
          onKeyDown={(e) => { if (e.key === "Enter") void onCreate(); }}
        />
        <button className="home-create-btn" onClick={() => void onCreate()} disabled={busy}>
          {busy ? "创建中…" : "创建工作区"}
        </button>
      </div>
      {error ? (
        <div className="home-create-error mono">{error}</div>
      ) : null}
    </div>
  );
}

