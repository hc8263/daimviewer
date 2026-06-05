"use client";
import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TopBar } from "./TopBar";
import { PRIcon } from "./icons";
import type { PatentView } from "@/lib/patents";

export function AdminPanel({ patents }: { patents: PatentView[] }) {
  const router = useRouter();
  const [tab, setTab] = React.useState<"upload" | "notes" | "models">("upload");

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
          {tab === "notes" && <NotesTab patents={patents} />}
          {tab === "models" && <ModelsTab />}
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
