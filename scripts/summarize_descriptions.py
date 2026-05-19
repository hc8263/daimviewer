"""
Summarize patent descriptions with Gemini.

Reads:  data/descriptions_scraped.json   (key = e.g. "CN_121871527")
Writes: data/summaries.json              (same key -> summary record)

Usage:
    GEMINI_API_KEY in .env (or env var)
    python scripts/summarize_descriptions.py --limit 10
    python scripts/summarize_descriptions.py --limit 10 --force   # re-summarize
    python scripts/summarize_descriptions.py --ids CN_121871527,JP_2026-511817
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
SRC = ROOT / "data" / "descriptions_scraped.json"
OUT = ROOT / "data" / "summaries.json"
ENV_FILES = [ROOT / ".env.local", ROOT / ".env", ROOT / "web" / ".env.local", ROOT / "web" / ".env"]

PROMPT_VERSION = "zcu_v2_compact"
DEFAULT_MODEL = "gemini-2.5-flash"

SYSTEM_PROMPT = """[Role]
당신은 글로벌 자동차 기업의 전자전기(E/E) 아키텍처 및 SDV 분야를 담당하는 수석 특허 분석가이자 엔지니어입니다. R&D 연구원이 **한 화면 안에서 빠르게 스캔**할 수 있도록 특허를 요약합니다.

[Task]
입력된 특허 명세서를 분석해 아래 [Output Format]에 따라 한국어 마크다운 요약을 작성하세요. '구역 제어기(Zonal Controller Unit, ZCU)' 관련성 분석도 포함합니다.

[Output Language]
명세서 원문 언어와 무관하게 **모든 출력은 한국어**. 핵심 용어는 한국어(영문/원문) 형식으로 표기(예: 구역 제어기(ZCU), 채널(Channel)).

[Style Rules — 매우 중요]
1. **밀도 우선**: 각 불릿은 1~2문장. 산문 X. 한 항목이 3문장을 넘기지 마세요.
2. **굵은 키워드 리드**: 각 불릿은 `* **키워드:** 설명` 형태. 키워드는 그 불릿의 핵심 개념.
3. **솔루션 헤드라인**: 섹션 2 제목에 발명의 핵심을 압축한 별명을 따옴표로 붙임 (예: `## 2. 핵심 기술 솔루션: "원호 형태의 채널 구조"`).
4. **용어 최적화**: 특허 법률체("~을 특징으로 하는", "~수단") 금지. 직관적인 엔지니어링 용어로.
5. **정확성**: 명세서에 없는 내용 창작 금지. 불확실하면 생략.
6. **근거 인라인**: ZCU/핵심 구성 관련 단락은 본문 끝에 `[0027]` 형태로 짧게 부기. 별도 'Evidence' 섹션 만들지 마세요.

---

[Output Format]

## 1. 발명의 배경 및 목적
* **배경:** (기술 트렌드/환경 한 줄)
* **문제점:** (기존 기술의 한계 한 줄)
* **목적:** (이 발명이 달성하려는 바 한 줄)

## 2. 핵심 기술 솔루션: "(발명을 한마디로 표현한 별명)"
(솔루션 한 줄 개요)
* **(핵심 구성 1):** 설명
* **(핵심 구성 2):** 설명
* **(핵심 구성 3):** 설명 (필요 시 4~5개까지)

## 3. 주요 구성 및 특징
* **(특징/구성 1):** 설명
* **(특징/구성 2):** 설명
* **(특징/구성 3):** 설명 (3~5개)

## 4. 적용 분야 및 효과
* **적용:** (적용 대상/시스템)
* **효과:** (성능/구조/운용 측면의 이득 — 2~4개 짧게)

## 5. 구역 제어기(ZCU) 연관성
* **연관성:** 직접적 연관 / 간접적 연관 / 연관성 없음 중 택1
* **매칭점:** ZCU의 어떤 기능(구역 전원 분배, CAN-이더넷 변환, 제로트러스트 보안, 물리적 냉각/적층 등)과 매칭되는지 1~2문장. 근거 단락 `[0027]` 형식 인라인 부기.
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
        f"[Language] {rec.get('lang_cd','')}\n"
        f"[Source URL] {rec.get('url','')}\n\n"
        f"[Specification Text]\n"
    )
    return head + (rec.get("text") or "")


def summarize_one(client: genai.Client, model: str, rec: dict) -> dict:
    content = build_user_content(rec)
    resp = client.models.generate_content(
        model=model,
        contents=content,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.2,
        ),
    )
    return {
        "summary": resp.text,
        "model": model,
        "prompt_version": PROMPT_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "input_chars": len(rec.get("text") or ""),
        "usage": {
            "prompt_tokens": getattr(resp.usage_metadata, "prompt_token_count", None),
            "output_tokens": getattr(resp.usage_metadata, "candidates_token_count", None),
            "total_tokens": getattr(resp.usage_metadata, "total_token_count", None),
        } if getattr(resp, "usage_metadata", None) else None,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=10)
    ap.add_argument("--ids", type=str, default="", help="comma-separated keys; overrides --limit")
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--force", action="store_true", help="re-summarize even if already present")
    ap.add_argument("--out", default=str(OUT))
    args = ap.parse_args()

    for p in ENV_FILES:
        load_env(p)
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not set (check .env)", file=sys.stderr)
        return 2

    src = json.loads(SRC.read_text(encoding="utf-8"))
    out_path = Path(args.out)
    existing = {}
    if out_path.exists():
        try:
            existing = json.loads(out_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            existing = {}

    if args.ids:
        keys = [k.strip() for k in args.ids.split(",") if k.strip()]
    else:
        keys = list(src.keys())[: args.limit]

    client = genai.Client(api_key=api_key)

    for i, key in enumerate(keys, 1):
        if key not in src:
            print(f"[{i}/{len(keys)}] {key}  SKIP (not in source)")
            continue
        if not args.force and key in existing:
            print(f"[{i}/{len(keys)}] {key}  SKIP (already summarized)")
            continue

        rec = src[key]
        title = (rec.get("title") or "")[:60]
        print(f"[{i}/{len(keys)}] {key}  chars={rec.get('char_len')}  {title}")
        t0 = time.time()
        try:
            result = summarize_one(client, args.model, rec)
        except Exception as e:
            print(f"  ERROR: {e}")
            existing[key] = {"error": str(e), "model": args.model,
                              "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds")}
            out_path.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")
            continue

        record = {
            "id": key,
            "ctry": rec.get("ctry"),
            "doc_id": rec.get("doc_id"),
            "title": rec.get("title"),
            "source": "data/descriptions_scraped.json",
            **result,
            "elapsed_sec": round(time.time() - t0, 2),
        }
        existing[key] = record
        out_path.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  ok  ({record['elapsed_sec']}s, tokens={result.get('usage')})")

    print(f"\nDone. Wrote {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
