"""
Translate patent descriptions (CN/JP/US/EP/DE) to Korean with Gemini.

Reads:  data/descriptions_scraped.json
Writes: data/descriptions_translated.json   (same key -> translated record)

Usage:
    GEMINI_API_KEY in .env (or env var)
    python scripts/translate_descriptions.py --dry-run
    python scripts/translate_descriptions.py --limit 5 --only-lang CN
    python scripts/translate_descriptions.py                      # all 701 non-KR items
    python scripts/translate_descriptions.py --workers 4
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

from google import genai
from google.genai import types

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "descriptions_scraped.json"
OUT = ROOT / "data" / "descriptions_translated.json"
ENV_FILES = [ROOT / ".env.local", ROOT / ".env", ROOT / "web" / ".env.local", ROOT / "web" / ".env"]

DEFAULT_MODEL = "gemini-2.5-flash"
DEFAULT_CHUNK_CHARS = 3500

# Gemini 2.5 Flash pricing (USD / 1M tokens) — used for dry-run cost estimate
PRICE_IN_PER_M = 0.30
PRICE_OUT_PER_M = 2.50

SYSTEM_PROMPT = """[Role]
당신은 특허 명세서 전문 번역가입니다. 다양한 언어(중국어/일본어/영어/독일어)로 작성된 특허의 '발명의 설명' 본문을 자연스럽고 정확한 한국어로 번역합니다.

[Rules]
1. 한국어로만 출력하세요. 번역 외의 설명·요약·주석을 절대 추가하지 마세요.
2. 원문의 단락 구조와 줄바꿈을 그대로 유지합니다.
3. 단락 번호([0001], [0002] ...) 와 도면 부호(예: 도 1, FIG. 1, 110, S102), 화학식·수식·기호는 보존합니다.
4. 섹션 헤더는 한국어 표준 표기로 변환합니다.
   - 技术领域 / 技術分野 / TECHNICAL FIELD / Technisches Gebiet → [기술분야]
   - 背景技术 / 背景技術 / BACKGROUND / Stand der Technik → [배경기술]
   - 发明内容 / 発明の概要 / SUMMARY → [발명의 내용]
   - 具体实施方式 / 発明を実施するための形態 / DETAILED DESCRIPTION → [구체적인 실시 형태]
   - 附图说明 / 図面の簡単な説明 / BRIEF DESCRIPTION OF DRAWINGS → [도면의 간단한 설명]
5. 기술 용어는 한국 특허·공학 표준 용어를 사용합니다. 회사명·제품명·약어(예: ECU, CAN, BMS)는 원문 그대로 둡니다.
6. 입력이 이미 한국어인 부분(예: 머리말 "상세설명")은 그대로 둡니다.
"""

CJK_RE = re.compile(r"[぀-ヿ㐀-䶿一-鿿]")
HANGUL_RE = re.compile(r"[가-힣]")


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


def estimate_input_tokens(text: str) -> int:
    """Rough heuristic: CJK chars ~ 1 token each, latin chars ~ 0.25 token."""
    if not text:
        return 0
    cjk = len(CJK_RE.findall(text))
    other = len(text) - cjk
    return int(cjk + other * 0.25)


def split_into_chunks(text: str, max_chars: int) -> list[str]:
    """Split by paragraph boundaries, packing up to max_chars per chunk."""
    if len(text) <= max_chars:
        return [text]
    paragraphs = text.split("\n")
    chunks: list[str] = []
    buf: list[str] = []
    buf_len = 0
    for p in paragraphs:
        plen = len(p) + 1  # for the newline
        if buf_len + plen > max_chars and buf:
            chunks.append("\n".join(buf))
            buf = [p]
            buf_len = plen
        else:
            buf.append(p)
            buf_len += plen
        # Edge: single paragraph longer than max_chars — hard split
        if buf_len > max_chars * 1.5 and len(buf) == 1:
            big = buf[0]
            for i in range(0, len(big), max_chars):
                chunks.append(big[i : i + max_chars])
            buf = []
            buf_len = 0
    if buf:
        chunks.append("\n".join(buf))
    return chunks


def translate_chunk(client: genai.Client, model: str, chunk: str, src_lang: str) -> tuple[str, dict]:
    prompt = f"[원문 언어: {src_lang}]\n다음 텍스트를 한국어로 번역하세요.\n\n---\n{chunk}\n---"
    resp = client.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.1,
        ),
    )
    usage = {}
    if getattr(resp, "usage_metadata", None):
        usage = {
            "prompt_tokens": getattr(resp.usage_metadata, "prompt_token_count", 0) or 0,
            "output_tokens": getattr(resp.usage_metadata, "candidates_token_count", 0) or 0,
        }
    return resp.text or "", usage


def translate_one(client: genai.Client, model: str, key: str, rec: dict, chunk_chars: int) -> dict:
    text = rec.get("text") or ""
    src_lang = rec.get("lang_cd") or ""
    chunks = split_into_chunks(text, chunk_chars)
    translated_parts: list[str] = []
    total_in = 0
    total_out = 0
    t0 = time.time()
    for idx, ch in enumerate(chunks, 1):
        out, usage = translate_chunk(client, model, ch, src_lang)
        translated_parts.append(out.strip())
        total_in += usage.get("prompt_tokens", 0)
        total_out += usage.get("output_tokens", 0)
    text_kr = "\n\n".join(translated_parts)
    return {
        "id": key,
        "ctry": rec.get("ctry"),
        "doc_id": rec.get("doc_id"),
        "title": rec.get("title"),
        "src_lang": src_lang,
        "src_char_len": len(text),
        "kr_char_len": len(text_kr),
        "hangul_ratio": round(len(HANGUL_RE.findall(text_kr)) / max(len(text_kr), 1), 3),
        "chunk_count": len(chunks),
        "text_kr": text_kr,
        "model": model,
        "translated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "elapsed_sec": round(time.time() - t0, 2),
        "usage": {"prompt_tokens": total_in, "output_tokens": total_out},
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--limit", type=int, default=0, help="0 = no limit")
    ap.add_argument("--only-lang", type=str, default="", help="comma-separated, e.g. CN,JP")
    ap.add_argument("--ids", type=str, default="", help="comma-separated keys; overrides filters")
    ap.add_argument("--chunk-chars", type=int, default=DEFAULT_CHUNK_CHARS)
    ap.add_argument("--workers", type=int, default=1)
    ap.add_argument("--include-kr", action="store_true", help="also translate KR records")
    ap.add_argument("--force", action="store_true", help="re-translate even if already present")
    ap.add_argument("--dry-run", action="store_true", help="print chunk counts and cost estimate; no API calls")
    ap.add_argument("--out", default=str(OUT))
    args = ap.parse_args()

    for p in ENV_FILES:
        load_env(p)

    src = json.loads(SRC.read_text(encoding="utf-8"))
    out_path = Path(args.out)
    existing: dict = {}
    if out_path.exists():
        try:
            existing = json.loads(out_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            existing = {}

    # Build target list
    if args.ids:
        keys = [k.strip() for k in args.ids.split(",") if k.strip()]
    else:
        lang_filter = {s.strip().upper() for s in args.only_lang.split(",") if s.strip()}
        keys = []
        for k, v in src.items():
            lang = (v.get("lang_cd") or "").upper()
            if not args.include_kr and lang == "KR":
                continue
            if lang_filter and lang not in lang_filter:
                continue
            keys.append(k)
        if args.limit:
            keys = keys[: args.limit]

    todo = [k for k in keys if args.force or k not in existing or "text_kr" not in existing.get(k, {})]
    print(f"Targets: {len(keys)}  to-do: {len(todo)}  (skipped already-done: {len(keys)-len(todo)})", file=sys.stderr)

    # Dry-run: stats + cost estimate
    if args.dry_run:
        total_chunks = 0
        total_in_tokens = 0
        total_src_chars = 0
        per_lang: dict[str, int] = {}
        for k in todo:
            rec = src[k]
            text = rec.get("text") or ""
            chunks = split_into_chunks(text, args.chunk_chars)
            total_chunks += len(chunks)
            total_in_tokens += estimate_input_tokens(text)
            total_src_chars += len(text)
            lang = rec.get("lang_cd", "?")
            per_lang[lang] = per_lang.get(lang, 0) + 1
        # Output token estimate: Korean output ~ 0.9 token/char, output ~ source char count
        est_out_tokens = int(total_src_chars * 0.9)
        cost_in = total_in_tokens / 1_000_000 * PRICE_IN_PER_M
        cost_out = est_out_tokens / 1_000_000 * PRICE_OUT_PER_M
        print(f"\n[dry-run]", file=sys.stderr)
        print(f"  items: {len(todo)}  per-lang: {per_lang}", file=sys.stderr)
        print(f"  total chunks: {total_chunks}  (chunk_chars={args.chunk_chars})", file=sys.stderr)
        print(f"  src chars: {total_src_chars:,}", file=sys.stderr)
        print(f"  est input tokens:  {total_in_tokens:,}", file=sys.stderr)
        print(f"  est output tokens: {est_out_tokens:,}", file=sys.stderr)
        print(f"  est cost ({args.model}):  ${cost_in + cost_out:,.2f}  (in ${cost_in:,.2f} + out ${cost_out:,.2f})", file=sys.stderr)
        return 0

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not set (check .env)", file=sys.stderr)
        return 2
    client = genai.Client(api_key=api_key)

    save_lock = Lock()

    def save() -> None:
        out_path.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")

    def work(idx_key: tuple[int, str]) -> tuple[str, dict | None, str | None]:
        idx, key = idx_key
        rec = src[key]
        try:
            result = translate_one(client, args.model, key, rec, args.chunk_chars)
            return key, result, None
        except Exception as e:
            return key, None, str(e)

    indexed = list(enumerate(todo, 1))
    done_count = 0
    if args.workers <= 1:
        for idx, key in indexed:
            rec = src[key]
            print(f"[{idx}/{len(todo)}] {key} lang={rec.get('lang_cd')} chars={rec.get('char_len')}", file=sys.stderr)
            key, result, err = work((idx, key))
            if err:
                print(f"  ERROR: {err}", file=sys.stderr)
                existing[key] = {
                    "id": key,
                    "error": err,
                    "model": args.model,
                    "translated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                }
            else:
                existing[key] = result
                print(f"  ok  chunks={result['chunk_count']}  {result['elapsed_sec']}s  tokens={result['usage']}", file=sys.stderr)
            save()
            done_count += 1
    else:
        with ThreadPoolExecutor(max_workers=args.workers) as ex:
            futures = {ex.submit(work, ik): ik for ik in indexed}
            for fut in as_completed(futures):
                idx, key = futures[fut]
                key, result, err = fut.result()
                rec = src[key]
                if err:
                    print(f"[{idx}/{len(todo)}] {key} lang={rec.get('lang_cd')} ERROR: {err}", file=sys.stderr)
                    record = {
                        "id": key,
                        "error": err,
                        "model": args.model,
                        "translated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                    }
                else:
                    print(f"[{idx}/{len(todo)}] {key} lang={rec.get('lang_cd')} ok chunks={result['chunk_count']} {result['elapsed_sec']}s tokens={result['usage']}", file=sys.stderr)
                    record = result
                with save_lock:
                    existing[key] = record
                    done_count += 1
                    if done_count % 5 == 0:
                        save()
        with save_lock:
            save()

    print(f"\nDone. Wrote {out_path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
