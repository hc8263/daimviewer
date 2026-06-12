"use client";
import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TopBar } from "./TopBar";
import { PRIcon } from "./icons";
import type { PatentView } from "@/lib/patents";

export function AdminPanel({ patents }: { patents: PatentView[] }) {
  const router = useRouter();
  const [tab, setTab] = React.useState<"upload" | "process" | "notes" | "models">("upload");

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
          <div className={`nav-item ${tab === "process" ? "active" : ""}`} onClick={() => setTab("process")}>
            <PRIcon name="Sparkles" size={14} />번역 · 요약
          </div>
          <div className={`nav-item ${tab === "notes" ? "active" : ""}`} onClick={() => setTab("notes")}>
            <PRIcon name="MessageSquare" size={14} />관리자 메모
          </div>
          <div className={`nav-item ${tab === "models" ? "active" : ""}`} onClick={() => setTab("models")}>
            <PRIcon name="Bot" size={14} />LLM 모델 비교
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
          {tab === "upload" && <UploadTab />}
          {tab === "process" && <ProcessTab />}
          {tab === "notes" && <NotesTab patents={patents} />}
          {tab === "models" && <ModelsTab />}
        </main>
      </div>
    </div>
  );
}

type UploadResult = {
  ok: boolean;
  error?: string;
  sheet?: string;
  headerRow?: number;
  mapping?: { field: string; label: string; header: string }[];
  missing?: string[];
  inserted?: number;
  updated?: number;
  duplicateInFile?: number;
  insertedKeys?: string[];
  warnings?: string[];
};

function UploadTab() {
  const router = useRouter();
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [result, setResult] = React.useState<UploadResult | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  // dragenter/dragleave는 자식 요소를 지날 때마다 발생하므로 깊이를 센다
  const dragDepth = React.useRef(0);

  const acceptFile = (f: File | undefined | null) => {
    if (!f) return;
    if (!/\.(xlsx|xls)$/i.test(f.name)) {
      setResult({ ok: false, error: `엑셀 파일(.xlsx, .xls)만 업로드할 수 있습니다: ${f.name}` });
      return;
    }
    setResult(null);
    setFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    acceptFile(e.dataTransfer.files?.[0]);
  };
  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current++;
    setDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };

  const fmtSize = (n: number) =>
    n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`;

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
      if (res.ok) router.refresh();
    } catch (err) {
      setResult({ ok: false, error: (err as Error).message });
    }
    setBusy(false);
  };

  return (
    <section className="admin-card">
      <h2>분석 대상 특허 업로드 (.xlsx)</h2>
      <p className="admin-help">
        WIPS ON 엑셀 파일을 업로드하세요. 데이터 시트와 헤더 행은 자동으로 탐지하며,
        <code>WIPS ON key</code>, <code>국가코드</code>, <code>발명의 명칭(원문/번역문)</code>,
        <code>출원번호 · 출원일</code>, <code>공개·등록번호</code>, <code>출원인 · 발명자</code>,
        <code>Current IPC Main</code>, <code>대분류 · 중분류</code>, <code>원문(PDF)/상세보기 링크</code>를
        자동 매핑합니다. 이미 존재하는 특허(WIPS ON key 기준)는 신규 등록 대신 갱신되며,
        기존 목록 번호(#)는 변하지 않고 신규 건은 목록 맨 뒤 번호로 추가됩니다.
      </p>
      <form onSubmit={onSubmit} className="admin-form-upload">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: "none" }}
          onChange={(e) => { acceptFile(e.target.files?.[0]); e.target.value = ""; }}
        />
        <div
          className={`upload-drop ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
          role="button"
          tabIndex={0}
          aria-label="엑셀 파일 선택 또는 드래그앤드랍"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputRef.current?.click(); } }}
          onDragEnter={onDragEnter}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {file ? (
            <>
              <div className="upload-drop-file">
                <PRIcon name="Check" size={16} color="#00B468" />
                <span className="name">{file.name}</span>
                <span className="size">{fmtSize(file.size)}</span>
                <button
                  type="button"
                  className="clear"
                  aria-label="파일 선택 해제"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                >
                  <PRIcon name="X" size={13} />
                </button>
              </div>
              <div className="upload-drop-sub">다른 파일을 끌어다 놓거나 클릭하여 교체</div>
            </>
          ) : (
            <>
              <PRIcon name="Upload" size={22} color="var(--pr-fg-muted)" />
              <div className="upload-drop-main">엑셀 파일을 끌어다 놓거나 <span className="browse">클릭하여 선택</span></div>
              <div className="upload-drop-sub">.xlsx · .xls</div>
            </>
          )}
        </div>
        <button className="pr-btn pr-btn-primary pr-btn-sm" disabled={!file || busy}>
          {busy ? "업로드 중…" : "업로드"}
        </button>
      </form>
      {result && (
        <div className={`admin-result ${result.ok ? "ok" : "err"}`}>
          {result.ok ? (
            <>
              <div className="upload-counts">
                ✅ 업로드 완료 — <strong>신규 {result.inserted ?? 0}건</strong> ·
                중복(기존 갱신) {result.updated ?? 0}건
                {(result.duplicateInFile ?? 0) > 0 && <> · 파일 내 중복 {result.duplicateInFile}건 건너뜀</>}
                <span className="upload-sheet">시트 「{result.sheet}」 · 헤더 {result.headerRow}행</span>
              </div>
              {result.insertedKeys && result.insertedKeys.length > 0 && (
                <details open>
                  <summary>신규 추가된 특허 {result.insertedKeys.length}건 — 목록에서 <strong>NEW</strong> 배지로 표시됩니다</summary>
                  <div className="upload-keys">
                    {result.insertedKeys.map((k) => <code key={k}>{k}</code>)}
                  </div>
                </details>
              )}
              {result.mapping && (
                <details>
                  <summary>컬럼 매핑 확인 ({result.mapping.length}개 매핑{result.missing && result.missing.length > 0 ? ` · 미매핑 ${result.missing.length}개` : ""})</summary>
                  <table className="upload-mapping">
                    <thead><tr><th>DB 필드</th><th>엑셀 헤더</th></tr></thead>
                    <tbody>
                      {result.mapping.map((m) => (
                        <tr key={m.field}><td>{m.label}</td><td><code>{m.header}</code></td></tr>
                      ))}
                      {(result.missing || []).map((f) => (
                        <tr key={f} className="miss"><td>{f}</td><td>— 매핑되는 헤더 없음</td></tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              )}
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

type ProcRow = {
  seq: number | null;
  wipson_key: string;
  country: string | null;
  title: string;
  title_ko: string | null;
  created_at: string;
  is_new: boolean;
  desc_chars: number;
  desc_ko_chars: number;
  has_summary: boolean;
  has_easy: boolean;
};

type ProcMode = "translate" | "summarize" | "easy";
const PROC_LABEL: Record<ProcMode, string> = {
  translate: "번역",
  summarize: "명세서 요약",
  easy: "쉬운 요약",
};

type ProcState = { state: "running" | "ok" | "err"; mode: ProcMode; msg?: string };

function ProcessTab() {
  const [rows, setRows] = React.useState<ProcRow[] | null>(null);
  const [filter, setFilter] = React.useState<"all" | "new" | "needTranslate" | "needSummary">("new");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);
  const [progress, setProgress] = React.useState<{ done: number; total: number; mode: string } | null>(null);
  const [status, setStatus] = React.useState<Record<string, ProcState>>({});
  const stopRef = React.useRef(false);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/process", { cache: "no-store" });
      const j = await res.json();
      if (res.ok && Array.isArray(j.rows)) setRows(j.rows);
    } catch { /* keep current */ }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  if (!rows) {
    return <section className="admin-card"><h2>번역 · 요약 (Gemini 2.5 Flash)</h2><p className="admin-help">불러오는 중…</p></section>;
  }

  const needTranslate = (r: ProcRow) => r.desc_chars > 0 && r.desc_ko_chars === 0;
  const needSummary = (r: ProcRow) => (!r.has_summary || !r.has_easy) && (r.desc_ko_chars > 0 || r.desc_chars > 0);
  const list = rows.filter((r) => {
    if (filter === "new") return r.is_new;
    if (filter === "needTranslate") return needTranslate(r);
    if (filter === "needSummary") return needSummary(r);
    return true;
  });

  const counts = {
    all: rows.length,
    new: rows.filter((r) => r.is_new).length,
    needTranslate: rows.filter(needTranslate).length,
    needSummary: rows.filter(needSummary).length,
  };

  const toggle = (k: string) => {
    const next = new Set(selected);
    if (next.has(k)) next.delete(k); else next.add(k);
    setSelected(next);
  };
  const toggleAll = () => {
    const visible = list.map((r) => r.wipson_key);
    const allSelected = visible.length > 0 && visible.every((k) => selected.has(k));
    setSelected(allSelected ? new Set() : new Set(visible));
  };

  // 선택 항목을 1건씩 순차 처리 (서버는 특허 1건 × 작업 1개 단위)
  const run = async (mode: ProcMode) => {
    const keys = list.filter((r) => selected.has(r.wipson_key)).map((r) => r.wipson_key);
    if (keys.length === 0 || busy) return;
    const label = PROC_LABEL[mode];
    if (!confirm(`${keys.length}건을 Gemini 2.5 Flash로 ${label}할까요?`)) return;
    setBusy(true);
    stopRef.current = false;
    setProgress({ done: 0, total: keys.length, mode: label });
    for (let i = 0; i < keys.length; i++) {
      if (stopRef.current) break;
      const k = keys[i];
      setStatus((s) => ({ ...s, [k]: { state: "running", mode } }));
      try {
        const res = await fetch("/api/admin/process", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ wipsonKey: k, mode }),
        });
        const j = await res.json();
        if (res.ok) {
          setStatus((s) => ({ ...s, [k]: { state: "ok", mode, msg: `${(j.outChars ?? 0).toLocaleString()}자 생성` } }));
        } else {
          setStatus((s) => ({ ...s, [k]: { state: "err", mode, msg: j.error || `HTTP ${res.status}` } }));
        }
      } catch (err) {
        setStatus((s) => ({ ...s, [k]: { state: "err", mode, msg: (err as Error).message } }));
      }
      setProgress({ done: i + 1, total: keys.length, mode: label });
    }
    setBusy(false);
    await load();
  };

  const mark = (yes: boolean) => yes
    ? <span className="proc-flag ok">✓</span>
    : <span className="proc-flag no">—</span>;

  return (
    <section className="admin-card">
      <h2>번역 · 요약 (Gemini 2.5 Flash)</h2>
      <p className="admin-help">
        업로드된 특허의 <strong>번역</strong>(원문 → 한글 명세서)과 2가지 스타일의 요약 —
        <strong>명세서 중심 요약</strong>(단락번호 근거 부기, 검토용)과 <strong>이해하기 쉬운 ver</strong>(비전공자용
        해설) — 을 생성합니다. 대상을 선택한 뒤 실행하세요. 번역은 원문이 적재된 특허만, 요약은 번역문(없으면
        원문)이 있는 특허만 처리할 수 있습니다.
      </p>

      <div className="proc-toolbar">
        <div className="proc-filters">
          <button className={`lp-chip ${filter === "new" ? "has-value" : ""}`} onClick={() => setFilter("new")}>최근 추가 <span className="val">{counts.new}</span></button>
          <button className={`lp-chip ${filter === "needTranslate" ? "has-value" : ""}`} onClick={() => setFilter("needTranslate")}>번역 필요 <span className="val">{counts.needTranslate}</span></button>
          <button className={`lp-chip ${filter === "needSummary" ? "has-value" : ""}`} onClick={() => setFilter("needSummary")}>요약 필요 <span className="val">{counts.needSummary}</span></button>
          <button className={`lp-chip ${filter === "all" ? "has-value" : ""}`} onClick={() => setFilter("all")}>전체 <span className="val">{counts.all}</span></button>
        </div>
        <div style={{ flex: 1 }} />
        {busy ? (
          <>
            <span className="proc-progress">{progress?.mode} 진행 중 — {progress?.done}/{progress?.total}</span>
            <button className="pr-btn pr-btn-default pr-btn-sm" onClick={() => { stopRef.current = true; }}>중지</button>
          </>
        ) : (
          <>
            <button className="pr-btn pr-btn-primary pr-btn-sm" disabled={selected.size === 0} onClick={() => run("translate")}>
              번역 ({selected.size})
            </button>
            <button className="pr-btn pr-btn-primary pr-btn-sm" disabled={selected.size === 0} onClick={() => run("summarize")}>
              명세서 요약 ({selected.size})
            </button>
            <button className="pr-btn pr-btn-primary pr-btn-sm" disabled={selected.size === 0} onClick={() => run("easy")}>
              쉬운 요약 ({selected.size})
            </button>
          </>
        )}
      </div>

      <div className="proc-table">
        <table>
          <thead>
            <tr>
              <th style={{ width: 32 }}>
                <span className={`lp-checkbox ${list.length > 0 && list.every((r) => selected.has(r.wipson_key)) ? "checked" : ""}`} onClick={toggleAll}>
                  {list.length > 0 && list.every((r) => selected.has(r.wipson_key)) && <PRIcon name="Check" size={11} color="#fff" />}
                </span>
              </th>
              <th style={{ width: 40 }}>#</th>
              <th style={{ width: 160 }}>WIPSONKEY</th>
              <th>제목</th>
              <th style={{ width: 56 }}>원문</th>
              <th style={{ width: 56 }}>번역</th>
              <th style={{ width: 80 }}>명세서 요약</th>
              <th style={{ width: 80 }}>쉬운 요약</th>
              <th style={{ width: 220 }}>처리 결과</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const st = status[r.wipson_key];
              return (
                <tr key={r.wipson_key} className={selected.has(r.wipson_key) ? "selected" : ""} onClick={() => toggle(r.wipson_key)}>
                  <td>
                    <span className={`lp-checkbox ${selected.has(r.wipson_key) ? "checked" : ""}`}>
                      {selected.has(r.wipson_key) && <PRIcon name="Check" size={11} color="#fff" />}
                    </span>
                  </td>
                  <td className="mono">{r.seq ?? ""}</td>
                  <td className="mono">
                    {r.wipson_key}
                    {r.is_new && <span className="lp-new-badge">NEW</span>}
                  </td>
                  <td className="proc-title">{r.title_ko || r.title}</td>
                  <td>{mark(r.desc_chars > 0)}</td>
                  <td>{mark(r.desc_ko_chars > 0)}</td>
                  <td>{mark(r.has_summary)}</td>
                  <td>{mark(r.has_easy)}</td>
                  <td className="proc-status">
                    {st?.state === "running" && <span className="run">{PROC_LABEL[st.mode]} 중…</span>}
                    {st?.state === "ok" && <span className="ok">✓ {st.msg}</span>}
                    {st?.state === "err" && <span className="err" title={st.msg}>✗ {st.msg}</span>}
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr><td colSpan={9} className="proc-empty">해당 조건의 특허가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
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

function buildNoteTemplate(patent: PatentView): string {
  return `## 발명의 명칭
${patent.fileTitle}

## 기술 분야


## 해결 과제
-

## 해결 수단


## 핵심 구성요소
1.
2.

## 적용 가능성
**검토 의견:** `;
}

function NoteEditor({ patent }: { patent: PatentView }) {
  const router = useRouter();
  const template = React.useMemo(() => buildNoteTemplate(patent), [patent]);
  const [val, setVal] = React.useState(patent.adminNote ?? template);
  const [busy, setBusy] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const save = async () => {
    setBusy(true);
    setSaved(false);
    const trimmed = val.trim();
    const next = !trimmed || trimmed === template.trim() ? null : val;
    try {
      const res = await fetch("/api/admin/note", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ wipsonKey: patent.wipsonKey, adminNote: next }),
      });
      if (res.ok) {
        setSaved(true);
        if (next === null) setVal(template);
        router.refresh();
      }
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

type ModelSpec = {
  id: string;
  vendor: string;
  context: string;
  ttft: string;
  tps: string;
  inputPrice: number;   // $/M input tokens
  outputPrice: number;  // $/M output tokens
  cacheRead: number | null;
  cacheWrite: number | null;
  imagePrice: string | null;
  pros: string[];
  cons: string[];
  bestFor: string;
};

const MODEL_SPECS: ModelSpec[] = [
  {
    id: "deepseek/deepseek-v4-pro",
    vendor: "DeepSeek",
    context: "1M",
    ttft: "0.6s",
    tps: "131 tps",
    inputPrice: 0.43,
    outputPrice: 0.87,
    cacheRead: null,
    cacheWrite: null,
    imagePrice: null,
    pros: [
      "1M 컨텍스트 — 긴 명세서 전문 질의에 유리",
      "출력가가 낮아 대량 생성 워크로드 비용 부담이 작음",
      "고성능 추론 모델로 복잡한 특허 검토 질의에 적합",
    ],
    cons: [
      "한국어 자연스러움/뉘앙스는 Claude·Gemini 대비 다소 떨어짐",
      "이미지 입력 미지원 — 명세서 도면 직접 분석 불가",
    ],
    bestFor: "긴 명세서 분석 · 비용 효율적인 정밀 질의",
  },
  {
    id: "google/gemini-2.5-flash",
    vendor: "Google",
    context: "1M",
    ttft: "0.4s",
    tps: "191 tps",
    inputPrice: 0.30,
    outputPrice: 2.50,
    cacheRead: 0.03,
    cacheWrite: null,
    imagePrice: "$35.00/K + 입력 토큰",
    pros: [
      "TTFT 0.4s로 가장 빠른 첫 응답 — 인터랙티브 UX에 유리",
      "1M 컨텍스트 + 191 tps로 긴 명세서를 빠르게 토해냄",
      "이미지/도면 입력 지원",
    ],
    cons: [
      "출력가 $2.50/M — DeepSeek 대비 약 9배",
      "장문 추론 시 사실 누락(생략) 경향이 있어 검증 필요",
    ],
    bestFor: "실시간 대화 응답 속도 우선 · 도면 포함 분석",
  },
  {
    id: "anthropic/claude-haiku-4.5",
    vendor: "Anthropic",
    context: "200K",
    ttft: "0.5s",
    tps: "113 tps",
    inputPrice: 1.00,
    outputPrice: 5.00,
    cacheRead: 0.10,
    cacheWrite: 1.25,
    imagePrice: "$10.00/K + 입력 토큰",
    pros: [
      "한국어/특허 용어 이해도가 가장 높음 — 변리사 검토 품질 우수",
      "지시 준수율(instruction following) 강력 — 인용 규칙·근거 기반 응답 준수",
      "프롬프트 캐싱 활용 시 같은 특허 반복 질의가 효율적",
    ],
    cons: [
      "4종 중 가장 비쌈 (입력 $1.00, 출력 $5.00/M)",
      "컨텍스트 200K — 1M 모델에 비해 명세서가 매우 길면 자름 발생 가능",
    ],
    bestFor: "최종 보고용 정밀 검토 · 한국어 표현 품질 중시",
  },
  {
    id: "openai/gpt-5-mini",
    vendor: "OpenAI",
    context: "400K",
    ttft: "4.3s",
    tps: "405 tps",
    inputPrice: 0.25,
    outputPrice: 2.00,
    cacheRead: 0.03,
    cacheWrite: null,
    imagePrice: "$10.00/K + 입력 토큰",
    pros: [
      "TPS 405로 한 번 시작되면 가장 빠르게 장문을 출력",
      "범용 추론 안정성 — 코드/표/리스트 정리에 강점",
      "이미지 입력 지원, 400K 컨텍스트로 무난",
    ],
    cons: [
      "TTFT 4.3s — 첫 토큰까지 체감 지연이 큼(스트리밍 UI에서 답답함)",
      "한국어 결과물은 Claude 대비 다소 기계적",
    ],
    bestFor: "장문 보고서 일괄 생성 · 첫 응답 지연 허용 가능 시",
  },
];

function fmtUsd(v: number | null) {
  if (v === null) return "—";
  if (v === 0) return "$0";
  return `$${v.toFixed(2)}`;
}

// 검토자 한 번의 질의를 가정한 예시 비용:
// 입력 60k 토큰(명세서) + 출력 1k 토큰.
function estimatePerQuery(spec: ModelSpec) {
  const inputCost = (60_000 / 1_000_000) * spec.inputPrice;
  const outputCost = (1_000 / 1_000_000) * spec.outputPrice;
  return inputCost + outputCost;
}

function ModelsTab() {
  const cheapest = MODEL_SPECS.reduce((a, b) => estimatePerQuery(a) < estimatePerQuery(b) ? a : b);
  return (
    <section className="admin-card">
      <h2>LLM 모델 비교</h2>
      <p className="admin-help">
        챗봇에서 선택 가능한 모델의 스펙·비용·장단점을 비교합니다. 가격은 Vercel AI Gateway 기준 $/1M tokens.
        하단 예시 비용은 <strong>입력 60K + 출력 1K 토큰</strong>(특허 1건 질의 가정)으로 계산했습니다.
      </p>

      <div className="model-grid">
        {MODEL_SPECS.map((m) => {
          const perQuery = estimatePerQuery(m);
          const isCheapest = m.id === cheapest.id;
          return (
            <div key={m.id} className={`model-card ${isCheapest ? "cheapest" : ""}`}>
              <div className="model-card-head">
                <div>
                  <div className="model-vendor">{m.vendor}</div>
                  <div className="model-id">{m.id}</div>
                </div>
                {isCheapest && <span className="badge-cheapest">최저가</span>}
              </div>

              <div className="model-specs">
                <div><span>컨텍스트</span><strong>{m.context}</strong></div>
                <div><span>TTFT</span><strong>{m.ttft}</strong></div>
                <div><span>속도</span><strong>{m.tps}</strong></div>
              </div>

              <table className="model-price">
                <tbody>
                  <tr><td>입력</td><td>{fmtUsd(m.inputPrice)}/M</td></tr>
                  <tr><td>출력</td><td>{fmtUsd(m.outputPrice)}/M</td></tr>
                  <tr><td>캐시 읽기</td><td>{fmtUsd(m.cacheRead)}/M</td></tr>
                  <tr><td>캐시 쓰기</td><td>{fmtUsd(m.cacheWrite)}/M</td></tr>
                  <tr><td>이미지</td><td>{m.imagePrice ?? "—"}</td></tr>
                  <tr className="row-total">
                    <td>1건 질의 예상</td>
                    <td><strong>${perQuery.toFixed(5)}</strong></td>
                  </tr>
                </tbody>
              </table>

              <div className="model-pros-cons">
                <div className="pros">
                  <div className="ph">장점</div>
                  <ul>{m.pros.map((p, i) => <li key={i}>{p}</li>)}</ul>
                </div>
                <div className="cons">
                  <div className="ph">단점</div>
                  <ul>{m.cons.map((c, i) => <li key={i}>{c}</li>)}</ul>
                </div>
              </div>

              <div className="model-bestfor">
                <PRIcon name="Sparkles" size={12} color="#0066FF" />
                <span>{m.bestFor}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="model-summary">
        <h3>요약 권장</h3>
        <ul>
          <li><strong>기본 워크로드</strong> — DeepSeek V4 Pro. 1M 컨텍스트로 명세서 전체 분석에 유리하고 비용 효율적.</li>
          <li><strong>응답 체감 속도</strong> — Gemini 2.5 Flash. TTFT 0.4s로 가장 빠른 첫 토큰.</li>
          <li><strong>최종 보고 품질</strong> — Claude Haiku 4.5. 한국어/특허 용어 이해도 최상.</li>
          <li><strong>긴 보고서 자동 작성</strong> — GPT-5 Mini. TPS 405로 본문 생성이 빠름(첫 응답 지연 감수).</li>
        </ul>
      </div>
    </section>
  );
}
