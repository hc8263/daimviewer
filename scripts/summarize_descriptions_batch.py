"""
Summarize patent descriptions with Gemini Batch API (file mode).

https://ai.google.dev/gemini-api/docs/batch-api?batch=file

Workflow:
    1) Build a JSONL file: one inline request per spec (key encoded as `key`)
    2) Upload via Files API
    3) Create batch job (model = gemini-2.5-flash)
    4) Poll until JOB_STATE_SUCCEEDED
    5) Download results JSONL, merge into data/summaries.json

Usage:
    GEMINI_API_KEY in .env
    python scripts/summarize_descriptions_batch.py                # batch all not-yet-summarized
    python scripts/summarize_descriptions_batch.py --limit 50
    python scripts/summarize_descriptions_batch.py --ids CN_121871527,JP_2026-511817
    python scripts/summarize_descriptions_batch.py --force        # re-summarize all
    python scripts/summarize_descriptions_batch.py --resume <batch_job_name>
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from google import genai
from google.genai import types

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "descriptions_translated.json"
OUT = ROOT / "data" / "summaries.json"
TMP_DIR = ROOT / "data" / "_batch"
ENV_FILES = [ROOT / ".env.local", ROOT / ".env", ROOT / "web" / ".env.local", ROOT / "web" / ".env"]

PROMPT_VERSION = "zonal_v3_paranum"
DEFAULT_MODEL = "gemini-2.5-flash"

SYSTEM_PROMPT = """[역할 정의]
너는 차량용 자율주행 및 SDV(소프트웨어 중심 자동차)의 핵심인 'Zonal Architecture(구역 아키텍처)'의 전문 기술 분석가야. 엔지니어와 변리사가 기술의 핵심을 한눈에 파악할 수 있도록 구조화된 요약을 제공해야 해.

[지시 사항]
아래 제공되는 특허 명세서를 읽고, 반드시 다음 5가지 세부 항목에 맞추어 마크다운(Markdown) 형식으로 요약해줘.

* 본문을 그대로 복사·붙여넣기 하지 말고, 기술적 의미를 파악하여 정제된 전문 용어로 재서술할 것.
* '단순 문장 나열'이나 '명세서 문구 그대로 인용'은 금지하며, 각 항목의 핵심을 압축하여 정리할 것.

[공통 규칙]
1. **단락번호 부기 규칙**
   - 명세서에 `[0034]` 형식(또는 이에 준하는 `<0034>`, `【0034】` 등)의 단락번호가 **실제로 존재하는 경우에만** 부기할 것.
   - 부기 형식은 `[0034]` 로 통일하고, 문장 끝에 인라인으로 짧게 표기.
   - **단락번호가 명세서에 없으면 절대 임의로 생성하지 말 것** (생략 허용).
   - 부기 적용 항목: **모든 항목(1~5)**. 단, 별도의 'Evidence' 섹션은 만들지 말고 문장 끝 인라인 부기만 사용할 것.
   - 한 문장에 근거 단락이 여러 개인 경우 `[0034][0036]` 또는 `[0034, 0036]` 형식으로 묶어 표기 가능.

2. **항목 2와 항목 3의 구분**
   - **항목 2**: 시스템 전체의 거시적 아키텍처 — 구성요소 간 연결 관계, 계층 구조, 데이터/전력 흐름의 큰 그림.
   - **항목 3**: 개별 구성요소(또는 방법 단계) 각각의 역할·기능·동작 방식.
   - 두 항목에서 동일한 내용을 반복하지 말 것.

3. **청구항 유형별 처리 (항목 3)**
   - 장치 청구항만 있는 경우: 물리적 구성요소 중심으로 기술.
   - 방법 청구항만 있는 경우: 각 단계(step) 중심으로 기술.
   - 장치·방법 청구항이 혼재된 경우: **장치 구성 우선** 기술 후, 핵심 방법 단계를 보조적으로 덧붙일 것.

4. **항목 5의 "연관성 없음" 처리**
   - "연관성 없음"으로 판단한 경우에도 매칭점란을 비우지 말고, **연관성이 없다고 판단한 사유를 1문장으로** 기재할 것.

[출력 형식]

## 1. 개발 배경 및 목적
* 기존 기술의 문제점(한계)이 무엇인지 기술할 것. (근거 단락 인라인 부기)
* 본 발명이 해결하고자 하는 궁극적 목적을 한 문장으로 정리할 것. (근거 단락 인라인 부기)

## 2. 시스템 핵심 구조 및 특징
* 전체 시스템의 거시적 아키텍처 — 주요 구성요소 간의 연결 관계, 계층 구조, 신호/전력 흐름을 중심으로 요약할 것.
* 각 문장 끝에는 근거 단락번호를 `[0034]` 형식으로 인라인 부기할 것 (공통 규칙 1 준수).

## 3. 주요 구성 및 특징
* 개별 구성요소(장치 청구항) 또는 각 단계(방법 청구항)의 **역할·기능·동작 방식**을 항목별로 정리할 것.
* 항목 2와 중복되지 않도록, 각 요소의 내부 동작에 초점을 둘 것.
* 각 구성/단계의 근거 단락번호를 인라인 부기할 것 (공통 규칙 1 준수).

## 4. 기대 효과
* 본 발명을 통해 얻을 수 있는 기술적·경제적 효과(안전성, 경량화, 비용 절감, 확장성 등)를 번호 리스트 형태로 정리할 것.
* 각 효과 문장 끝에 근거 단락번호를 인라인 부기할 것 (공통 규칙 1 준수).

## 5. 구역 제어기(ZCU) 연관성
* **연관성:** 직접적 연관 / 간접적 연관 / 연관성 없음 중 택1
* **매칭점:** ZCU의 어떤 기능과 매칭되는지 1~2문장으로 정리할 것.
  - 참고 ZCU 기능 예시(이에 한정되지 않음): 구역 단위 전원 분배, CAN-이더넷 프로토콜 변환, 제로트러스트 기반 보안, 물리적 냉각·적층 구조, E/E 아키텍처 단순화, 와이어링 하네스 경량화 등.
  - 매칭 근거 문장 끝에는 단락번호를 `[0021]` 형식으로 인라인 부기할 것 (공통 규칙 1 준수).
  - "연관성 없음"으로 판단한 경우, 매칭점란에 그 사유를 1문장으로 기재할 것 (공통 규칙 4 준수).
"""


def load_env(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k, v = k.strip(), v.strip().strip('"').strip("'")
        os.environ.setdefault(k, v)


def build_user_content(rec: dict) -> str:
    head = (
        f"[Patent ID] {rec.get('ctry')}_{rec.get('doc_id')}\n"
        f"[Title] {rec.get('title','')}\n"
        f"[Source Lang] {rec.get('src_lang','')}\n\n"
        f"[Specification Text (Korean)]\n"
    )
    return head + (rec.get("text_kr") or "")


def build_request(key: str, rec: dict, model: str) -> dict:
    """One JSONL line: a Gemini batch inlined request.

    Schema per docs: {"key": "...", "request": {"contents": [...], "system_instruction": {...}, "generation_config": {...}}}
    """
    return {
        "key": key,
        "request": {
            "contents": [
                {"role": "user", "parts": [{"text": build_user_content(rec)}]}
            ],
            "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "generation_config": {"temperature": 0.2},
        },
    }


def write_jsonl(path: Path, items: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for it in items:
            f.write(json.dumps(it, ensure_ascii=False) + "\n")


def poll_until_done(client: genai.Client, name: str, interval: int = 30) -> object:
    terminal = {"JOB_STATE_SUCCEEDED", "JOB_STATE_FAILED", "JOB_STATE_CANCELLED", "JOB_STATE_EXPIRED"}
    while True:
        job = client.batches.get(name=name)
        state = str(job.state).split(".")[-1] if job.state else "UNKNOWN"
        print(f"  [{datetime.now().strftime('%H:%M:%S')}] state={state}")
        if state in terminal:
            return job
        time.sleep(interval)


def extract_text(resp_obj: dict) -> str:
    """Pull text out of a candidates response dict."""
    try:
        cands = resp_obj.get("candidates") or []
        if not cands:
            return ""
        parts = (cands[0].get("content") or {}).get("parts") or []
        return "".join(p.get("text", "") for p in parts).strip()
    except Exception:
        return ""


def extract_usage(resp_obj: dict) -> dict | None:
    um = resp_obj.get("usageMetadata") or resp_obj.get("usage_metadata")
    if not um:
        return None
    return {
        "prompt_tokens": um.get("promptTokenCount") or um.get("prompt_token_count"),
        "output_tokens": um.get("candidatesTokenCount") or um.get("candidates_token_count"),
        "total_tokens": um.get("totalTokenCount") or um.get("total_token_count"),
    }


def merge_results(jsonl_text: str, src: dict, existing: dict, model: str) -> tuple[int, int]:
    """Parse batch result JSONL, merge into existing summaries dict. Returns (ok, err)."""
    ok = err = 0
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    for line in jsonl_text.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        key = row.get("key")
        if not key:
            continue
        rec = src.get(key, {})
        if "error" in row and row["error"]:
            err += 1
            existing[key] = {
                "id": key,
                "error": json.dumps(row["error"], ensure_ascii=False),
                "model": model,
                "generated_at": now,
            }
            continue
        resp_obj = row.get("response") or {}
        text = extract_text(resp_obj)
        existing[key] = {
            "id": key,
            "ctry": rec.get("ctry"),
            "doc_id": rec.get("doc_id"),
            "title": rec.get("title"),
            "source": "data/descriptions_scraped.json",
            "summary": text,
            "model": model,
            "prompt_version": PROMPT_VERSION,
            "generated_at": now,
            "input_chars": len(rec.get("text_kr") or ""),
            "usage": extract_usage(resp_obj),
            "batch": True,
        }
        ok += 1
    return ok, err


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="0 = no limit")
    ap.add_argument("--ids", type=str, default="", help="comma-separated keys; overrides --limit")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--force", action="store_true", help="include keys already summarized")
    ap.add_argument("--out", default=str(OUT))
    ap.add_argument("--src", default=str(SRC), help="source JSON (default: descriptions_translated.json)")
    ap.add_argument("--resume", default="", help="resume by polling an existing batch job name")
    ap.add_argument("--poll-interval", type=int, default=30)
    args = ap.parse_args()

    for p in ENV_FILES:
        load_env(p)
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not set (check .env)", file=sys.stderr)
        return 2

    src = json.loads(Path(args.src).read_text(encoding="utf-8"))
    out_path = Path(args.out)
    existing: dict = {}
    if out_path.exists():
        try:
            existing = json.loads(out_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            existing = {}

    client = genai.Client(api_key=api_key)

    # --- Resume path ---
    if args.resume:
        print(f"Resuming batch: {args.resume}")
        job = poll_until_done(client, args.resume, interval=args.poll_interval)
        state = str(job.state).split(".")[-1]
        if state != "JOB_STATE_SUCCEEDED":
            print(f"Job ended with state {state}; aborting.")
            return 1
        result_file = job.dest.file_name  # type: ignore[attr-defined]
        print(f"Downloading results file: {result_file}")
        content = client.files.download(file=result_file)
        text = content.decode("utf-8") if isinstance(content, (bytes, bytearray)) else str(content)
        ok, err = merge_results(text, src, existing, args.model)
        out_path.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Merged. ok={ok} err={err} -> {out_path}")
        return 0

    # --- Build keys ---
    if args.ids:
        keys = [k.strip() for k in args.ids.split(",") if k.strip()]
    else:
        keys = list(src.keys())
        if not args.force:
            keys = [k for k in keys if k not in existing]
        if args.limit and args.limit > 0:
            keys = keys[: args.limit]

    keys = [k for k in keys if k in src]
    if not keys:
        print("Nothing to summarize.")
        return 0

    print(f"Preparing {len(keys)} requests for batch (model={args.model})")
    requests = [build_request(k, src[k], args.model) for k in keys]

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    jsonl_path = TMP_DIR / f"requests_{stamp}.jsonl"
    write_jsonl(jsonl_path, requests)
    print(f"Wrote {jsonl_path}  ({jsonl_path.stat().st_size/1024:.1f} KB)")

    # --- Upload input JSONL ---
    print("Uploading input file to Files API...")
    uploaded = client.files.upload(
        file=str(jsonl_path),
        config=types.UploadFileConfig(
            display_name=f"summarize-batch-{stamp}",
            mime_type="application/jsonl",
        ),
    )
    print(f"  uploaded: {uploaded.name}  state={uploaded.state}")

    # --- Wait for file ACTIVE ---
    if str(uploaded.state).split(".")[-1] != "ACTIVE":
        print("  waiting for file ACTIVE...")
        while True:
            f = client.files.get(name=uploaded.name)
            st = str(f.state).split(".")[-1]
            print(f"    state={st}")
            if st == "ACTIVE":
                uploaded = f
                break
            if st in ("FAILED", "DELETED"):
                print(f"  ERROR: file ended in state {st}")
                return 1
            time.sleep(10)

    # --- Create batch job ---
    print("Creating batch job...")
    job = client.batches.create(
        model=args.model,
        src=uploaded.name,
        config=types.CreateBatchJobConfig(display_name=f"summarize-{stamp}"),
    )
    print(f"  job: {job.name}")
    print(f"  (resume with:  python scripts/summarize_descriptions_batch.py --resume {job.name})")

    # --- Poll ---
    job = poll_until_done(client, job.name, interval=args.poll_interval)
    state = str(job.state).split(".")[-1]
    if state != "JOB_STATE_SUCCEEDED":
        err = getattr(job, "error", None)
        print(f"Job ended with state {state}; error={err}")
        return 1

    # --- Download results ---
    result_file = job.dest.file_name  # type: ignore[attr-defined]
    print(f"Downloading results file: {result_file}")
    content = client.files.download(file=result_file)
    text = content.decode("utf-8") if isinstance(content, (bytes, bytearray)) else str(content)

    raw_out = TMP_DIR / f"results_{stamp}.jsonl"
    raw_out.write_text(text, encoding="utf-8")
    print(f"  saved raw results -> {raw_out}")

    ok, err = merge_results(text, src, existing, args.model)
    out_path.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nDone. ok={ok} err={err}  -> {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
