"""
Generate "이해하기 쉬운 ver" patent summaries with Gemini Batch API (KEY1).

Same easy-summary prompt as scripts/easy_summaries_sync.py, but uses the Batch
API (GEMINI_API_KEY = key 1) and processes in chunks (default 100; fall back to
--chunk 50 if a 100-chunk batch fails).

Source text per key:
  - Non-KR : data/descriptions_translated.json [text_kr]
  - KR     : data/descriptions_scraped.json    [text]

Output: data/easy_summaries.json  (merged; keyed by {ctry}_{doc_id})

Usage:
    python scripts/easy_summaries_batch.py                  # all remaining, chunk=100
    python scripts/easy_summaries_batch.py --chunk 50
    python scripts/easy_summaries_batch.py --limit 200      # only first 200 remaining
    python scripts/easy_summaries_batch.py --force          # re-do everything
    python scripts/easy_summaries_batch.py --resume <job_name>
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
SRC_TRANSLATED = ROOT / "data" / "descriptions_translated.json"
SRC_SCRAPED = ROOT / "data" / "descriptions_scraped.json"
OUT = ROOT / "data" / "easy_summaries.json"
TMP_DIR = ROOT / "data" / "_batch_easy"
ENV_FILES = [ROOT / ".env.local", ROOT / ".env", ROOT / "web" / ".env.local", ROOT / "web" / ".env"]

PROMPT_VERSION = "easy_v1"
DEFAULT_MODEL = "gemini-2.5-flash"

SYSTEM_PROMPT = """너는 기술 특허를 일반인·비전공자도 이해할 수 있게 풀어 설명하는 친절한 기술 해설자야.

[지시 사항]
아래 제공되는 특허 명세서를 읽고, **해당 기술을 최대한 이해하기 쉽게, 적절한 예가 있으면 예를 들어서 설명해줘.**

[작성 규칙]
* 마크다운(Markdown) 형식으로 작성할 것.
* 전문 용어는 풀어 쓰거나, 사용해야 할 경우 괄호 안에 짧은 설명을 덧붙일 것.
* 가능하면 일상적인 비유나 예시(예: "마치 ~처럼")를 활용해 직관적으로 설명할 것.
* 글머리 기호와 짧은 단락을 적극 활용하여 가독성을 높일 것.
* 명세서 문구를 그대로 옮기지 말고, 핵심 아이디어를 재서술할 것.

[출력 형식 권장 — 항목은 내용에 맞게 조정 가능]

## 한 줄 요약
한 문장으로 이 특허가 무엇에 관한 것인지 설명.

## 어떤 문제를 풀고 싶었나요?
기존에 어떤 불편함·한계가 있었는지 일상적인 표현으로 정리.

## 핵심 아이디어
어떻게 그 문제를 풀었는지를 비유나 예시를 곁들여 설명.

## 어떻게 동작하나요?
주요 구성요소나 단계를 순서대로 풀어 설명. 필요하면 간단한 예시 시나리오 추가.

## 무엇이 좋아지나요?
이 기술을 쓰면 사용자/제조사 입장에서 어떤 이점이 있는지 정리.
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


def resolve_source_text(key: str, translated: dict, scraped: dict) -> tuple[str, str, dict]:
    t = translated.get(key)
    if t and (t.get("text_kr") or "").strip():
        meta = {"ctry": t.get("ctry"), "doc_id": t.get("doc_id"), "title": t.get("title")}
        return t["text_kr"], "data/descriptions_translated.json#text_kr", meta
    s = scraped.get(key)
    if s and (s.get("text") or "").strip():
        meta = {"ctry": s.get("ctry"), "doc_id": s.get("doc_id"), "title": s.get("title")}
        return s["text"], "data/descriptions_scraped.json#text", meta
    return "", "", {}


def build_user_content(key: str, text: str, meta: dict) -> str:
    head = (
        f"[Patent ID] {key}\n"
        f"[Country] {meta.get('ctry','')}\n"
        f"[Title] {meta.get('title','')}\n\n"
        f"[Specification Text]\n"
    )
    return head + text


def build_request(key: str, text: str, meta: dict) -> dict:
    return {
        "key": key,
        "request": {
            "contents": [
                {"role": "user", "parts": [{"text": build_user_content(key, text, meta)}]}
            ],
            "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "generation_config": {"temperature": 0.4},
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
        print(f"    [{datetime.now().strftime('%H:%M:%S')}] state={state}")
        if state in terminal:
            return job
        time.sleep(interval)


def extract_text(resp_obj: dict) -> str:
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


def merge_results(jsonl_text: str, src_meta: dict, src_label: dict, existing: dict, model: str) -> tuple[int, int]:
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
        meta = src_meta.get(key, {})
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
        if not text:
            err += 1
            existing[key] = {
                "id": key,
                "error": "empty response",
                "model": model,
                "generated_at": now,
            }
            continue
        existing[key] = {
            "id": key,
            "ctry": meta.get("ctry"),
            "doc_id": meta.get("doc_id"),
            "title": meta.get("title"),
            "source": src_label.get(key, ""),
            "summary": text,
            "model": model,
            "prompt_version": PROMPT_VERSION,
            "generated_at": now,
            "usage": extract_usage(resp_obj),
            "batch": True,
        }
        ok += 1
    return ok, err


def run_one_batch(
    client: genai.Client,
    keys: list[str],
    translated: dict,
    scraped: dict,
    existing: dict,
    out_path: Path,
    model: str,
    poll_interval: int,
    tag: str,
) -> tuple[int, int]:
    """Build + submit one batch for `keys`, poll, merge, save. Returns (ok, err)."""
    requests = []
    src_meta: dict = {}
    src_label: dict = {}
    skipped = 0
    for k in keys:
        text, lbl, meta = resolve_source_text(k, translated, scraped)
        if not text:
            skipped += 1
            continue
        src_meta[k] = meta
        src_label[k] = lbl
        requests.append(build_request(k, text, meta))

    if not requests:
        print(f"  [{tag}] nothing to do (skipped {skipped})")
        return 0, 0

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    jsonl_path = TMP_DIR / f"req_{stamp}_{tag}.jsonl"
    write_jsonl(jsonl_path, requests)
    print(f"  [{tag}] {len(requests)} reqs (skipped {skipped}), {jsonl_path.stat().st_size/1024:.0f} KB")

    uploaded = client.files.upload(
        file=str(jsonl_path),
        config=types.UploadFileConfig(display_name=f"easy-{stamp}-{tag}", mime_type="application/jsonl"),
    )
    if str(uploaded.state).split(".")[-1] != "ACTIVE":
        while True:
            f = client.files.get(name=uploaded.name)
            st = str(f.state).split(".")[-1]
            if st == "ACTIVE":
                uploaded = f
                break
            if st in ("FAILED", "DELETED"):
                raise RuntimeError(f"upload ended in state {st}")
            time.sleep(5)

    job = client.batches.create(
        model=model,
        src=uploaded.name,
        config=types.CreateBatchJobConfig(display_name=f"easy-{stamp}-{tag}"),
    )
    print(f"  [{tag}] job: {job.name}")
    job = poll_until_done(client, job.name, interval=poll_interval)
    state = str(job.state).split(".")[-1]
    if state != "JOB_STATE_SUCCEEDED":
        raise RuntimeError(f"batch ended in state {state}; error={getattr(job,'error',None)}")

    result_file = job.dest.file_name  # type: ignore[attr-defined]
    content = client.files.download(file=result_file)
    text = content.decode("utf-8") if isinstance(content, (bytes, bytearray)) else str(content)
    (TMP_DIR / f"res_{stamp}_{tag}.jsonl").write_text(text, encoding="utf-8")

    ok, err = merge_results(text, src_meta, src_label, existing, model)
    out_path.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  [{tag}] merged ok={ok} err={err} -> {out_path.name}")
    return ok, err


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="0 = all remaining")
    ap.add_argument("--ids", type=str, default="", help="comma-separated keys; overrides --limit")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--chunk", type=int, default=100, help="keys per batch (default 100; use 50 if 100 fails)")
    ap.add_argument("--force", action="store_true", help="re-summarize keys already in output")
    ap.add_argument("--out", default=str(OUT))
    ap.add_argument("--resume", default="", help="poll an existing batch job name, merge, exit")
    ap.add_argument("--poll-interval", type=int, default=30)
    args = ap.parse_args()

    for p in ENV_FILES:
        load_env(p)
    api_key = os.environ.get("GEMINI_API_KEY")  # KEY1
    if not api_key:
        print("ERROR: GEMINI_API_KEY (key 1) not set", file=sys.stderr)
        return 2

    translated = json.loads(SRC_TRANSLATED.read_text(encoding="utf-8"))
    scraped = json.loads(SRC_SCRAPED.read_text(encoding="utf-8"))

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
        content = client.files.download(file=result_file)
        text = content.decode("utf-8") if isinstance(content, (bytes, bytearray)) else str(content)
        src_meta: dict = {}
        src_label: dict = {}
        for k in list(translated.keys()) + list(scraped.keys()):
            _, lbl, m = resolve_source_text(k, translated, scraped)
            if m:
                src_meta[k] = m
                src_label[k] = lbl
        ok, err = merge_results(text, src_meta, src_label, existing, args.model)
        out_path.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"Merged. ok={ok} err={err} -> {out_path}")
        return 0

    # --- Build candidate keys (union; translated-text preferred) ---
    all_keys = list({**scraped, **translated}.keys())
    if args.ids:
        keys = [k.strip() for k in args.ids.split(",") if k.strip()]
    else:
        keys = all_keys
        if not args.force:
            def done(k: str) -> bool:
                r = existing.get(k)
                return bool(r) and bool(r.get("summary")) and not r.get("error")
            keys = [k for k in keys if not done(k)]
        if args.limit and args.limit > 0:
            keys = keys[: args.limit]

    # only keep keys that actually have source text
    keys = [k for k in keys if resolve_source_text(k, translated, scraped)[0]]
    if not keys:
        print("Nothing to summarize.")
        return 0

    chunks = [keys[i : i + args.chunk] for i in range(0, len(keys), args.chunk)]
    print(f"Total {len(keys)} keys -> {len(chunks)} chunk(s) of up to {args.chunk}  (model={args.model}, KEY1)")

    total_ok = total_err = 0
    for ci, chunk in enumerate(chunks, 1):
        tag = f"c{ci}of{len(chunks)}"
        print(f"\n=== chunk {ci}/{len(chunks)} ({len(chunk)} keys) ===")
        try:
            ok, err = run_one_batch(
                client, chunk, translated, scraped, existing, out_path,
                args.model, args.poll_interval, tag,
            )
            total_ok += ok
            total_err += err
        except Exception as e:
            print(f"  [{tag}] FAILED: {e}")
            print(f"  → 이 청크를 더 작게 다시 시도하려면:  --chunk 50  (또는 --ids 로 일부만)")
            print(f"\nStopped. ok={total_ok} err={total_err}  -> {out_path}")
            return 1

    print(f"\nDone. ok={total_ok} err={total_err}  -> {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
