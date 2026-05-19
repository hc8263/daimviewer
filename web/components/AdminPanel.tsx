"use client";
import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TopBar } from "./TopBar";
import { PRIcon } from "./icons";
import type { PatentView } from "@/lib/patents";

export function AdminPanel({ patents }: { patents: PatentView[] }) {
  const router = useRouter();
  const [tab, setTab] = React.useState<"upload" | "notes">("upload");

  const logout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.refresh();
  };

  return (
    <div className="pr-app">
      <TopBar crumbs={["다임뷰어", "관리자 모드"]} />
      <div className="admin-shell">
        <aside className="admin-rail">
          <div className={`nav-item ${tab === "upload" ? "active" : ""}`} onClick={() => setTab("upload")}>
            <PRIcon name="Upload" size={14} />분석 대상 업로드
          </div>
          <div className={`nav-item ${tab === "notes" ? "active" : ""}`} onClick={() => setTab("notes")}>
            <PRIcon name="MessageSquare" size={14} />관리자 메모
          </div>
          <div style={{ flex: 1 }} />
          <Link href="/" className="nav-item">
            <PRIcon name="ExternalLink" size={14} />검토 화면으로
          </Link>
          <div className="nav-item" onClick={logout}>
            <PRIcon name="X" size={14} />로그아웃
          </div>
        </aside>
        <main className="admin-main">
          {tab === "upload" ? <UploadTab /> : <NotesTab patents={patents} />}
        </main>
      </div>
    </div>
  );
}

function UploadTab() {
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<{ ok: boolean; inserted?: number; updated?: number; error?: string; warnings?: string[] } | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const j = await res.json();
      setResult({ ok: res.ok, ...j });
    } catch (err) {
      setResult({ ok: false, error: (err as Error).message });
    }
    setBusy(false);
  };

  return (
    <section className="admin-card">
      <h2>분석 대상 특허 업로드 (.xlsx)</h2>
      <p className="admin-help">
        WIPSON ON 엑셀 파일을 업로드하세요. 헤더 매핑: <code>WIPSON ON Key / WIPSONKEY → wipson_key</code>,
        <code>국가</code>, <code>발명의명칭 / Title</code>, <code>출원번호</code>, <code>출원일자</code>,
        <code>공개번호</code>, <code>등록번호</code>, <code>출원인</code>, <code>발명자</code>,
        <code>IPC메인 / IPC</code>, <code>분류 / 상태</code>.
      </p>
      <form onSubmit={onSubmit} className="admin-form">
        <input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button className="pr-btn pr-btn-primary pr-btn-sm" disabled={!file || busy}>
          {busy ? "업로드 중…" : "업로드 & 적재"}
        </button>
      </form>
      {result && (
        <div className={`admin-result ${result.ok ? "ok" : "err"}`}>
          {result.ok ? (
            <>
              ✅ 업로드 완료 — 신규 {result.inserted ?? 0}건 · 갱신 {result.updated ?? 0}건
              {result.warnings && result.warnings.length > 0 && (
                <details>
                  <summary>경고 {result.warnings.length}건</summary>
                  <ul>{result.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                </details>
              )}
            </>
          ) : (
            <>❌ 실패 — {result.error}</>
          )}
        </div>
      )}
    </section>
  );
}

function NotesTab({ patents }: { patents: PatentView[] }) {
  const [q, setQ] = React.useState("");
  const [sel, setSel] = React.useState<string | null>(patents[0]?.wipsonKey ?? null);
  const list = q
    ? patents.filter((p) =>
        p.wipsonKey.toLowerCase().includes(q.toLowerCase()) ||
        (p.fileTitle || "").toLowerCase().includes(q.toLowerCase()))
    : patents;
  const active = patents.find((p) => p.wipsonKey === sel) ?? null;
  return (
    <section className="admin-card admin-card-split">
      <div className="admin-notes-list">
        <input
          className="admin-search"
          placeholder="WIPSONKEY · 제목 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="admin-notes-rows">
          {list.slice(0, 200).map((p) => (
            <div key={p.wipsonKey}
                 className={`row ${sel === p.wipsonKey ? "active" : ""}`}
                 onClick={() => setSel(p.wipsonKey)}>
              <div className="k">{p.wipsonKey}{p.adminNote && <span className="dot">●</span>}</div>
              <div className="t">{p.fileTitle}</div>
            </div>
          ))}
        </div>
      </div>
      {active && <NoteEditor key={active.wipsonKey} patent={active} />}
    </section>
  );
}

function NoteEditor({ patent }: { patent: PatentView }) {
  const [val, setVal] = React.useState(patent.adminNote ?? "");
  const [busy, setBusy] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const save = async () => {
    setBusy(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/note", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wipsonKey: patent.wipsonKey, adminNote: val || null }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-notes-edit">
      <div className="h">
        <div>
          <div className="k">{patent.wipsonKey}</div>
          <div className="t">{patent.fileTitle}</div>
        </div>
        <button className="pr-btn pr-btn-primary pr-btn-sm" onClick={save} disabled={busy}>
          {busy ? "저장 중…" : saved ? "저장됨" : "저장"}
        </button>
      </div>
      <textarea
        value={val}
        onChange={(e) => { setVal(e.target.value); setSaved(false); }}
        placeholder="이 특허에 대한 관리자 메모(Markdown 가능). 검토자 모두에게 노출됩니다."
        rows={20}
      />
    </div>
  );
}
