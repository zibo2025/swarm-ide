"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";

type IMShellProps = {
  left: ReactNode;
  mid: ReactNode;
  right: ReactNode;
};

const STORAGE_KEY = "im-shell.panels.v2";
const LEFT_DEFAULT = 260;
const RIGHT_DEFAULT = 340;
const LEFT_MIN = 180;
const LEFT_MAX = 480;
const RIGHT_MIN = 240;
const RIGHT_MAX = 560;

type SavedState = { lw?: number; rw?: number; lc?: boolean; rc?: boolean };

function readSaved(): SavedState {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}"); } catch { return {}; }
}

function writeSaved(s: SavedState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* noop */ }
}

export function IMShell({ left, mid, right }: IMShellProps) {
  const [leftWidth, setLeftWidth] = useState(LEFT_DEFAULT);
  const [rightWidth, setRightWidth] = useState(RIGHT_DEFAULT);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dragging, setDragging] = useState<"left" | "right" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ lw: LEFT_DEFAULT, rw: RIGHT_DEFAULT, lc: false, rc: false });

  useEffect(() => {
    const saved = readSaved();
    const lw = saved.lw ?? LEFT_DEFAULT;
    const rw = saved.rw ?? RIGHT_DEFAULT;
    const lc = saved.lc ?? false;
    const rc = saved.rc ?? (window.innerWidth <= 1440);
    setLeftWidth(lw);
    setRightWidth(rw);
    setLeftCollapsed(lc);
    setRightCollapsed(rc);
    stateRef.current = { lw, rw, lc, rc };
    setMounted(true);
  }, []);

  const persist = useCallback(() => {
    const s = stateRef.current;
    writeSaved({ lw: s.lw, rw: s.rw, lc: s.lc, rc: s.rc });
  }, []);

  const toggleLeft = useCallback(() => {
    setLeftCollapsed((prev) => {
      const next = !prev;
      stateRef.current.lc = next;
      persist();
      return next;
    });
  }, [persist]);

  const toggleRight = useCallback(() => {
    setRightCollapsed((prev) => {
      const next = !prev;
      stateRef.current.rc = next;
      persist();
      return next;
    });
  }, [persist]);

  const onSashMouseDown = useCallback(
    (side: "left" | "right") => (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(side);
      const startX = e.clientX;
      const startLW = stateRef.current.lw;
      const startRW = stateRef.current.rw;

      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX;
        if (side === "left") {
          const next = Math.max(LEFT_MIN, Math.min(LEFT_MAX, startLW + dx));
          setLeftWidth(next);
          stateRef.current.lw = next;
        } else {
          const next = Math.max(RIGHT_MIN, Math.min(RIGHT_MAX, startRW - dx));
          setRightWidth(next);
          stateRef.current.rw = next;
        }
      };

      const onUp = () => {
        setDragging(null);
        persist();
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [persist]
  );

  const onSashDblClick = useCallback(
    (side: "left" | "right") => () => {
      if (side === "left") toggleLeft();
      else toggleRight();
    },
    [toggleLeft, toggleRight]
  );

  return (
    <div
      ref={containerRef}
      className="im-shell"
      style={{
        visibility: mounted ? "visible" : "hidden",
        cursor: dragging ? "col-resize" : undefined,
      }}
    >
      {/* ── Left panel ── */}
      {!leftCollapsed && (
        <div className="im-shell-panel im-shell-left" style={{ width: leftWidth, minWidth: LEFT_MIN, maxWidth: LEFT_MAX }}>
          {left}
        </div>
      )}

      {/* ── Left sash ── */}
      <div
        className={`im-sash${leftCollapsed ? " im-sash--collapsed" : ""}${dragging === "left" ? " im-sash--active" : ""}`}
        onMouseDown={leftCollapsed ? undefined : onSashMouseDown("left")}
        onDoubleClick={onSashDblClick("left")}
      >
        <button type="button" className="im-sash-btn" onClick={toggleLeft} title={leftCollapsed ? "展开左侧面板" : "收起左侧面板"}>
          {leftCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      {/* ── Middle panel ── */}
      <div className="im-shell-panel im-shell-mid" style={{ flex: 1, minWidth: 0 }}>
        {mid}
      </div>

      {/* ── Right sash ── */}
      <div
        className={`im-sash${rightCollapsed ? " im-sash--collapsed" : ""}${dragging === "right" ? " im-sash--active" : ""}`}
        onMouseDown={rightCollapsed ? undefined : onSashMouseDown("right")}
        onDoubleClick={onSashDblClick("right")}
      >
        <button type="button" className="im-sash-btn" onClick={toggleRight} title={rightCollapsed ? "展开右侧面板" : "收起右侧面板"}>
          {rightCollapsed ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />}
        </button>
      </div>

      {/* ── Right panel ── */}
      {!rightCollapsed && (
        <div className="im-shell-panel im-shell-right" style={{ width: rightWidth, minWidth: RIGHT_MIN, maxWidth: RIGHT_MAX }}>
          {right}
        </div>
      )}
    </div>
  );
}
