#!/usr/bin/env python3
"""Extract '상세한 설명' (detailed description) sections from patent PDFs.

Routes by filename prefix (kr/jp/cn/us/de/ep/EP/wowo) and uses country-specific
header anchors to slice [start ~ claims-start].
"""
from __future__ import annotations

import argparse
import multiprocessing as mp
import os
import random
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path("/Users/vincentlim/coding/dmpat_patent_anal")
PDF_DIR = ROOT / "datas"
OUT_DIR = ROOT / "data" / "descriptions"
NEEDS_OCR = ROOT / "data" / "needs_ocr.txt"
PDFTOTEXT = "/opt/homebrew/bin/pdftotext"

MIN_CHARS = 500  # below this → needs_ocr


def run_pdftotext(pdf: Path, raw: bool = False) -> str:
    args = [PDFTOTEXT, "-enc", "UTF-8"]
    args += ["-raw"] if raw else ["-layout"]
    args += [str(pdf), "-"]
    try:
        out = subprocess.run(
            args, capture_output=True, timeout=120, check=False
        )
        return out.stdout.decode("utf-8", errors="replace")
    except Exception as e:
        return ""


def detect_country(stem: str) -> str:
    s = stem.lower()
    # EP3308497A1-wowo... → EP (already starts with EP/ep)
    if s.startswith("ep"):
        return "EP"
    if s.startswith("wowo"):
        return "WO"
    for c in ("kr", "jp", "cn", "us", "de"):
        if s.startswith(c):
            return c.upper()
    return "UNK"


# --- country slicers ---

def slice_by_regex(text: str, start_patterns: list[str], end_patterns: list[str]) -> str | None:
    """Find first start match; from there find first end match; return slice."""
    start_idx = None
    for p in start_patterns:
        m = re.search(p, text)
        if m and (start_idx is None or m.start() < start_idx):
            start_idx = m.start()
    if start_idx is None:
        return None
    end_idx = len(text)
    for p in end_patterns:
        m = re.search(p, text[start_idx + 50:])  # avoid matching within header
        if m:
            cand = start_idx + 50 + m.start()
            if cand < end_idx:
                end_idx = cand
    return text[start_idx:end_idx].strip()


KR_START = [
    # New KIPO format: "발명의 설명" header (clean marker for description section)
    r"발\s*명\s*의\s+설\s*명",
    # Old KIPO format: "발명의 상세한 설명"
    r"발\s*명\s*의\s+상\s*세\s*한\s+설\s*명",
    # Section headers (with optional spaces between Hangul characters)
    r"기\s*술\s*분\s*야\s*$",
    r"【\s*기\s*술\s*분\s*야\s*】",
    r"배\s*경\s*기\s*술\s*$",
]
KR_END = [
    # description usually goes to end of doc (claims are before description in KR)
    # but in old layouts the description may end before "특허청구의 범위" appears again
    r"^\s*도\s*면\s*$",   # figures section
]

JP_START = [
    r"【発明の詳細な説明】",
    r"【技術分野】",
    r"【発明の属する技術分野】",
]
JP_END = [
    r"【特許請求の範囲】",
    r"【\s*請求項\s*[1１]\s*】",
]

CN_START = [
    r"技\s*术\s*领\s*域",
    r"背\s*景\s*技\s*术",
    r"发\s*明\s*内\s*容",
    r"说\s*明\s*书\s*$",
]
CN_END = [
    r"权\s*利\s*要\s*求\s*书",
    r"权\s*利\s*要\s*求\s*1\s*[\.、]",
    r"^\s*1\s*[\.、]\s*一\s*种",  # claim start
]

US_START = [
    r"FIELD\s+OF\s+THE\s+INVENTION",
    r"TECHNICAL\s+FIELD",
    r"BACKGROUND\s+OF\s+THE\s+INVENTION",
    r"CROSS[- ]REFERENCE\s+TO\s+RELATED",
    r"DETAILED\s+DESCRIPTION",
    r"SUMMARY\s+OF\s+THE\s+INVENTION",
]
US_END = [
    r"What\s+is\s+claimed\s+is",
    r"We\s+claim\s*:",
    r"I\s+claim\s*:",
    r"The\s+claimed\s+invention\s+is",
    r"\bCLAIMS\b",
    r"^\s*1\s*\.\s+[A-Z]",  # numbered claim 1
]

DE_START = [
    r"^\s*Beschreibung\s*$",
    r"Die\s+vorliegende\s+Erfindung\s+betrifft",
    r"\[0001\]",
]
DE_END = [
    r"Patentansprüche",
    r"\bAnsprüche\b\s*$",
    r"\bCLAIMS\b",
]

EP_START = US_START + DE_START + [
    r"Technical\s+Field",
    r"Background\s+Art",
    r"Description\s+of\s+Embodiments",
]
EP_END = US_END + DE_END + [r"^\s*Claims\s*$"]

COUNTRY_RULES = {
    "KR": (KR_START, KR_END),
    "JP": (JP_START, JP_END),
    "CN": (CN_START, CN_END),
    "US": (US_START, US_END),
    "DE": (DE_START, DE_END),
    "EP": (EP_START, EP_END),
    "WO": (EP_START, EP_END),
}


def extract_one(pdf: Path) -> tuple[str, str, int, str]:
    """Returns (stem, country, status_code, message). status: ok|short|nostart|empty|err."""
    stem = pdf.stem
    country = detect_country(stem)
    rules = COUNTRY_RULES.get(country)
    if rules is None:
        return stem, country, "unmapped", "no country rule"

    text = run_pdftotext(pdf, raw=False)
    if not text.strip():
        return stem, country, "empty", "pdftotext returned 0 chars"

    starts, ends = rules
    sliced = slice_by_regex(text, starts, ends)

    # fallback to -raw for multi-column docs
    if (sliced is None or len(sliced) < MIN_CHARS) and country in ("US", "EP", "WO"):
        text2 = run_pdftotext(pdf, raw=True)
        if text2.strip():
            sliced2 = slice_by_regex(text2, starts, ends)
            if sliced2 and len(sliced2) > (len(sliced) if sliced else 0):
                sliced = sliced2
                text = text2

    if sliced is None:
        # last resort: if document has decent length, use the whole text
        if len(text) >= MIN_CHARS * 2:
            sliced = text.strip()
            status = "nostart_full"
        else:
            return stem, country, "short", f"no start anchor; text_len={len(text)}"
    else:
        status = "ok"

    if len(sliced) < MIN_CHARS:
        return stem, country, "short", f"slice_len={len(sliced)} text_len={len(text)}"

    out_path = OUT_DIR / f"{stem}.txt"
    out_path.write_text(sliced, encoding="utf-8")
    return stem, country, status, f"slice_len={len(sliced)}"


def worker(pdf_path_str: str):
    return extract_one(Path(pdf_path_str))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="limit per country (0=all)")
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--sample-log", type=int, default=10, help="sample N for first/end 300char log")
    args = ap.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    NEEDS_OCR.parent.mkdir(parents=True, exist_ok=True)

    pdfs = sorted(PDF_DIR.glob("*.pdf"))
    if args.limit > 0:
        by_country: dict[str, list[Path]] = {}
        for p in pdfs:
            by_country.setdefault(detect_country(p.stem), []).append(p)
        selected: list[Path] = []
        for c, ps in by_country.items():
            selected.extend(ps[: args.limit])
        pdfs = selected

    print(f"Processing {len(pdfs)} PDFs with {args.workers} workers...", flush=True)

    results: list[tuple[str, str, str, str]] = []
    with mp.Pool(args.workers) as pool:
        for i, res in enumerate(pool.imap_unordered(worker, [str(p) for p in pdfs]), 1):
            results.append(res)
            if i % 50 == 0:
                print(f"  ...{i}/{len(pdfs)}", flush=True)

    # Stats
    country_stats: dict[str, dict[str, int]] = {}
    needs_ocr_list: list[str] = []
    unmapped_list: list[str] = []
    for stem, country, status, msg in results:
        country_stats.setdefault(country, {}).setdefault(status, 0)
        country_stats[country][status] += 1
        if status in ("short", "empty"):
            needs_ocr_list.append(stem)
        if status == "unmapped":
            unmapped_list.append(stem)

    NEEDS_OCR.write_text("\n".join(sorted(needs_ocr_list)) + ("\n" if needs_ocr_list else ""), encoding="utf-8")

    print("\n=== Country stats ===")
    for c in sorted(country_stats):
        print(f"  {c}: {country_stats[c]}")
    if unmapped_list:
        print(f"\nUnmapped: {unmapped_list}")

    # Sample log
    print("\n=== Random sample first/end 300 chars ===")
    ok_results = [r for r in results if r[2] in ("ok", "nostart_full")]
    random.seed(42)
    # Stratify by country
    by_c: dict[str, list] = {}
    for r in ok_results:
        by_c.setdefault(r[1], []).append(r)
    samples = []
    for c, lst in by_c.items():
        random.shuffle(lst)
        samples.extend(lst[: max(1, args.sample_log // max(1, len(by_c)))])
    samples = samples[: args.sample_log]
    for stem, country, status, msg in samples:
        path = OUT_DIR / f"{stem}.txt"
        if not path.exists():
            continue
        t = path.read_text(encoding="utf-8")
        head = t[:300].replace("\n", " ⏎ ")
        tail = t[-300:].replace("\n", " ⏎ ")
        print(f"\n--- {stem} [{country}/{status}] len={len(t)} ---")
        print(f"HEAD: {head}")
        print(f"TAIL: {tail}")

    total = len(results)
    n_ok = sum(1 for r in results if r[2] in ("ok", "nostart_full"))
    n_ocr = len(needs_ocr_list)
    n_unmapped = len(unmapped_list)
    print(f"\n총 {total}건 중 성공 {n_ok}건 / OCR필요 {n_ocr}건 / 매핑실패 {n_unmapped}건")


if __name__ == "__main__":
    main()
