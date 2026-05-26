"use client";
import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { TopBar } from "./TopBar";
import { DetailRail } from "./DetailRail";
import { Splitter } from "./Splitter";
import { PatentsCtx } from "./PatentsContext";
import type { PatentView } from "@/lib/patents";

const LEFT_DEFAULT = 338;
const LEFT_MIN = 200;
const LEFT_MAX = 480;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function readStored(key: string, fallback: number, min: number, max: number) {
  if (typeof window === "undefined") return fallback;
  const v = parseInt(window.localStorage.getItem(key) || "", 10);
  if (!Number.isFinite(v)) return fallback;
  return clamp(v, min, max);
}

export function PatentsShell({ patents, children }: { patents: PatentView[]; children: React.ReactNode }) {
  // Local mutable copy — preserved across patent navigations because this
  // client component is mounted by the persistent layout, not by the page.
  const [items, setItems] = React.useState<PatentView[]>(patents);

  // If the server-cached list reference changes (revalidation), merge new
  // server data while keeping local decision/excluded edits that may already
  // have been applied optimistically.
  const lastServer = React.useRef(patents);
  React.useEffect(() => {
    if (patents === lastServer.current) return;
    lastServer.current = patents;
    setItems((prev) => {
      const byKey = new Map(prev.map((p) => [p.wipsonKey, p] as const));
      return patents.map((p) => {
        const local = byKey.get(p.wipsonKey);
        if (!local) return p;
        return {
          ...p,
          reviewStatus: local.reviewStatus ?? p.reviewStatus,
          reviewer: local.reviewer ?? p.reviewer,
          reviewDate: local.reviewDate ?? p.reviewDate,
          excluded: local.excluded || p.excluded,
          comment: local.comment ?? p.comment,
        };
      });
    });
  }, [patents]);

  const updateLocal = React.useCallback((key: string, patch: Partial<PatentView>) => {
    setItems((prev) => prev.map((p) => (p.wipsonKey === key ? { ...p, ...patch } : p)));
  }, []);

  const pathname = usePathname();
  const activeKey = React.useMemo(() => {
    const m = pathname?.match(/^\/patents\/([^/]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }, [pathname]);
  const active = React.useMemo(
    () => items.find((p) => p.wipsonKey === activeKey) || null,
    [items, activeKey],
  );

  const [leftW, setLeftW] = React.useState(() => readStored("pr.leftW.v2", LEFT_DEFAULT, LEFT_MIN, LEFT_MAX));

  const onResizeLeft = React.useCallback((delta: number | "reset") => {
    if (delta === "reset") {
      setLeftW(LEFT_DEFAULT);
      try { localStorage.removeItem("pr.leftW.v2"); } catch {}
      return;
    }
    setLeftW((w) => {
      const next = clamp(w + delta, LEFT_MIN, LEFT_MAX);
      try { localStorage.setItem("pr.leftW.v2", String(next)); } catch {}
      return next;
    });
  }, []);

  // Keyboard nav (↑/↓ prev/next, ←/→ scroll body)
  const router = useRouter();
  React.useEffect(() => {
    if (!active) return;
    const navList = items.filter((p) => !p.excluded);
    const idx = navList.findIndex((p) => p.wipsonKey === active.wipsonKey);
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (t && t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowDown" || e.key === "j") {
        const n = navList[idx + 1];
        if (n) { e.preventDefault(); router.push(`/patents/${encodeURIComponent(n.wipsonKey)}`); }
      } else if (e.key === "ArrowUp" || e.key === "k") {
        const n = navList[idx - 1];
        if (n) { e.preventDefault(); router.push(`/patents/${encodeURIComponent(n.wipsonKey)}`); }
      } else if (e.key === "ArrowLeft") {
        const body = document.querySelector(".dp-body");
        if (body) { e.preventDefault(); body.scrollBy({ top: -120, behavior: "smooth" }); }
      } else if (e.key === "ArrowRight") {
        const body = document.querySelector(".dp-body");
        if (body) { e.preventDefault(); body.scrollBy({ top: 120, behavior: "smooth" }); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, items, router]);

  const crumbs = React.useMemo(() => {
    const base: Array<string | { label: string; href: string }> = [
      { label: "프로젝트", href: "/" },
      { label: "2026 신규 개발 검토", href: "/" },
    ];
    if (active) base.push(active.wipsonKey);
    return base;
  }, [active]);

  return (
    <PatentsCtx.Provider value={{ items, updateLocal }}>
      <div className="pr-app">
        <TopBar crumbs={crumbs} />
        <div className="dp-shell">
          {active && <DetailRail active={active} patents={items} width={leftW} />}
          <Splitter onResize={onResizeLeft} />
          {children}
        </div>
      </div>
    </PatentsCtx.Provider>
  );
}
