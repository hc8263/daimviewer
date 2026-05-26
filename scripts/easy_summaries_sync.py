"""
Generate "이해하기 쉬운 ver" patent summaries (parallel sync calls).

Source text resolution per key:
  - Non-KR  : data/descriptions_translated.json [text_kr]
  - KR      : data/descriptions_scraped.json    [text]

Output: data/easy_summaries.json   (same keying as summaries.json)

Uses GEMINI_API_KEY2 .. GEMINI_API_KEY7 round-robin across worker threads.
Default model: gemini-2.5-flash.

Usage:
    python scripts/easy_summaries_batch.py --limit 5
    python scripts/easy_summaries_batch.py --ids CN_121871527,JP_2026-511817
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
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
ALLOWED_KEY_INDEXES = list(range(2, 8))  # 2..7

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


def collect_api_keys() -> list[tuple[int, str]]:
    out: list[tuple[int, str]] = []
    for idx in ALLOWED_KEY_INDEXES:
        v = os.environ.get(f"GEMINI_API_KEY{idx}")
        if v:
            out.append((idx, v))
    return out


def resolve_source_text(key: str, translated: dict, scraped: dict) -> tuple[str, str, dict]:
    """Return (text, source_label, meta). meta carries ctry/doc_id/title for output."""
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


def extract_usage(resp) -> dict | None:
    um = getattr(resp, "usage_metadata", None)
    if not um:
        return None
    return {
        "prompt_tokens": getattr(um, "prompt_token_count", None),
        "output_tokens": getattr(um, "candidates_token_count", None),
        "total_tokens": getattr(um, "total_token_count", None),
    }


def generate_one(api_key: str, key_idx: int, model: str, key: str, text: str, meta: dict) -> dict:
    """Single sync call. Returns merged record dict for `key`."""
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    client = genai.Client(api_key=api_key)
    user_content = build_user_content(key, text, meta)
    try:
        resp = client.models.generate_content(
            model=model,
            contents=user_content,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.4,
            ),
        )
        out_text = (resp.text or "").strip()
        return {
            "id": key,
            "ctry": meta.get("ctry"),
            "doc_id": meta.get("doc_id"),
            "title": meta.get("title"),
            "summary": out_text,
            "model": model,
            "prompt_version": PROMPT_VERSION,
            "generated_at": now,
            "usage": extract_usage(resp),
            "key_index": key_idx,
        }
    except Exception as e:
        return {
            "id": key,
            "error": f"{type(e).__name__}: {e}",
            "model": model,
            "generated_at": now,
            "key_index": key_idx,
        }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=5, help="0 = no limit (default 5 for test)")
    ap.add_argument("--ids", type=str, default="", help="comma-separated keys; overrides --limit")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--force", action="store_true", help="re-summarize keys already in output")
    ap.add_argument("--out", default=str(OUT))
    ap.add_argument("--workers", type=int, default=0, help="parallel workers (default = number of available keys)")
    args = ap.parse_args()

    for p in ENV_FILES:
        load_env(p)

    api_keys = collect_api_keys()
    if not api_keys:
        print("ERROR: No GEMINI_API_KEY2..7 found in environment", file=sys.stderr)
        return 2
    print(f"Available keys: {[i for i,_ in api_keys]}")

    translated = json.loads(SRC_TRANSLATED.read_text(encoding="utf-8"))
    scraped = json.loads(SRC_SCRAPED.read_text(encoding="utf-8"))

    out_path = Path(args.out)
    existing: dict = {}
    if out_path.exists():
        try:
            existing = json.loads(out_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            existing = {}

    all_keys = list({**scraped, **translated}.keys())
    if args.ids:
        keys = [k.strip() for k in args.ids.split(",") if k.strip()]
    else:
        keys = all_keys
        if not args.force:
            keys = [k for k in keys if k not in existing]
        if args.limit and args.limit > 0:
            keys = keys[: args.limit]

    jobs: list[tuple[str, str, dict]] = []  # (key, text, meta)
    skipped = 0
    for k in keys:
        text, _lbl, meta = resolve_source_text(k, translated, scraped)
        if not text:
            skipped += 1
            continue
        jobs.append((k, text, meta))

    if not jobs:
        print(f"Nothing to summarize. (skipped {skipped})")
        return 0

    workers = args.workers or len(api_keys)
    print(f"Generating {len(jobs)} summaries (skipped {skipped}) — model={args.model}, workers={workers}")

    write_lock = threading.Lock()
    done_ok = 0
    done_err = 0

    def task(idx_job: tuple[int, tuple[str, str, dict]]) -> tuple[str, dict]:
        i, (key, text, meta) = idx_job
        key_idx, api_key = api_keys[i % len(api_keys)]
        t0 = time.time()
        rec = generate_one(api_key, key_idx, args.model, key, text, meta)
        rec["elapsed_sec"] = round(time.time() - t0, 2)
        return key, rec

    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = [ex.submit(task, (i, j)) for i, j in enumerate(jobs)]
        for fut in as_completed(futs):
            key, rec = fut.result()
            with write_lock:
                existing[key] = rec
                if "error" in rec:
                    done_err += 1
                    print(f"  ✗ {key}  (key{rec.get('key_index')})  {rec['error'][:120]}")
                else:
                    done_ok += 1
                    chars = len(rec.get("summary") or "")
                    print(f"  ✓ {key}  (key{rec['key_index']}, {rec['elapsed_sec']}s, {chars} chars)")
                # incremental save
                out_path.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\nDone. ok={done_ok} err={done_err}  -> {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
