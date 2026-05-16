#!/usr/bin/env python3
"""Improved re-extractor for patent '상세한 설명' sections.

Improvements over scripts/extract.py:
  1. Line-anchored section headers preferred over inline matches (CN abstract cover
     pages had "技术领域" inline → false match).
  2. OCR-cached PDFs in data/ocr_pdfs/ are preferred over scanned originals.
  3. Post-process cleanup pass:
     - Dehyphenate word-\\nword (DE/US/EP two-column PDFs)
     - Strip repeating headers/footers (CN/US/KR page-number lines, "등록특허
       10-xxxx", "CN 12345 A", "US 12,345,678 B2", "- 197 -" 등)
     - Strip control chars (NULL + Cc except tab/newline)
     - Strip trailing 도면/Drawing artifacts
     - Collapse 4+ spaces to single space (preserve mild indent)

Overwrites data/descriptions/{stem}.txt for all 729 PDFs.
"""
from __future__ import annotations

import argparse
import multiprocessing as mp
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

ROOT = Path("/Users/vincentlim/coding/dmpat_patent_anal")
PDF_DIR = ROOT / "datas"
OCR_DIR = ROOT / "data" / "ocr_pdfs"
OUT_DIR = ROOT / "data" / "descriptions"
NEEDS_OCR = ROOT / "data" / "needs_ocr.txt"
PDFTOTEXT = "/opt/homebrew/bin/pdftotext"

MIN_CHARS = 500


def run_pdftotext(pdf: Path, raw: bool = False) -> str:
    args = [PDFTOTEXT, "-enc", "UTF-8"]
    args += ["-raw"] if raw else ["-layout"]
    args += [str(pdf), "-"]
    try:
        out = subprocess.run(args, capture_output=True, timeout=120)
        return out.stdout.decode("utf-8", errors="replace")
    except Exception:
        return ""


def detect_country(stem: str) -> str:
    s = stem.lower()
    if s.startswith("ep"):
        return "EP"
    if s.startswith("wowo"):
        return "WO"
    for c in ("kr", "jp", "cn", "us", "de"):
        if s.startswith(c):
            return c.upper()
    return "UNK"


# ─────────────────────────────────────────────────────────────────────
# Section slicers — line-anchored preferred
# Patterns are tried in order; the FIRST anchored hit wins. If none of the
# anchored patterns match, fall back to inline patterns (less reliable).
# ─────────────────────────────────────────────────────────────────────

# KR — claims are BEFORE description in old layouts; description usually runs to EOF
KR_ANCHORED_START = [
    r"^\s*발\s*명\s*의\s+설\s*명\s*$",
    r"^\s*발\s*명\s*의\s+상\s*세\s*한\s+설\s*명\s*$",
    r"^\s*【\s*기\s*술\s*분\s*야\s*】\s*$",
    r"^\s*기\s*술\s*분\s*야\s*$",
    r"^\s*배\s*경\s*기\s*술\s*$",
]
KR_INLINE_START = [
    r"발\s*명\s*의\s+상\s*세\s*한\s+설\s*명",
    r"발\s*명\s*의\s+설\s*명",
]
KR_END: list[str] = []  # description usually goes to EOF in KR

# JP — bracketed headers are very specific
JP_ANCHORED_START = [
    r"【発明の詳細な説明】",
    r"【技術分野】",
    r"【発明の属する技術分野】",
]
JP_INLINE_START: list[str] = []
JP_END = [
    r"【特許請求の範囲】",
    r"【\s*請求項\s*[1１]\s*】",
]

# CN — line-anchored is critical: cover pages have "技术领域" inline
CN_ANCHORED_START = [
    r"^\s*说\s*明\s*书\s*$",
    r"^\s*技\s*术\s*领\s*域\s*$",
    r"^\s*背\s*景\s*技\s*术\s*$",
    r"^\s*发\s*明\s*内\s*容\s*$",
    r"^\s*具\s*体\s*实\s*施\s*方\s*式\s*$",
    r"^\s*实\s*施\s*例\s*$",
]
CN_INLINE_START = [
    r"\[0001\]",  # paragraph numbering also signals body start
]
CN_END = [
    r"^\s*权\s*利\s*要\s*求\s*书\s*$",
    r"^\s*1\s*[\.、]\s*一\s*种",
]

# US — anchored headers in CAPS, often centered with surrounding whitespace
US_ANCHORED_START = [
    r"^\s*FIELD\s+OF\s+THE\s+INVENTION\s*$",
    r"^\s*TECHNICAL\s+FIELD\s*$",
    r"^\s*BACKGROUND\s+OF\s+THE\s+INVENTION\s*$",
    r"^\s*BACKGROUND\s*$",
    r"^\s*DETAILED\s+DESCRIPTION(\s+OF\s+.+)?\s*$",
    r"^\s*SUMMARY\s+OF\s+THE\s+INVENTION\s*$",
    r"^\s*SUMMARY\s*$",
    r"^\s*CROSS[- ]REFERENCE\s+TO\s+RELATED.*$",
]
US_INLINE_START = [
    r"FIELD\s+OF\s+THE\s+INVENTION",
    r"TECHNICAL\s+FIELD",
    r"BACKGROUND\s+OF\s+THE\s+INVENTION",
    r"DETAILED\s+DESCRIPTION",
]
US_END = [
    r"What\s+is\s+claimed\s+is",
    r"We\s+claim\s*:",
    r"I\s+claim\s*:",
    r"The\s+claimed\s+invention\s+is",
    r"^\s*CLAIMS\s*$",
    r"^\s*1\s*\.\s+[A-Z]",
]

# DE — Beschreibung header or [0001] paragraph numbering
DE_ANCHORED_START = [
    r"^\s*Beschreibung\s*$",
    r"^\s*\[0001\]",
]
DE_INLINE_START = [
    r"Die\s+vorliegende\s+Erfindung\s+betrifft",
    r"\[0001\]",
]
DE_END = [
    r"^\s*Patentansprüche\s*$",
    r"^\s*Ansprüche\s*$",
    r"^\s*Claims\s*$",
]

# EP/WO — mix of US/DE headers
EP_ANCHORED_START = US_ANCHORED_START + DE_ANCHORED_START + [
    r"^\s*Technical\s+Field\s*$",
    r"^\s*Background\s+Art\s*$",
    r"^\s*Description\s+of\s+Embodiments\s*$",
    r"^\s*DESCRIPTION\s*$",
]
EP_INLINE_START = US_INLINE_START + DE_INLINE_START
EP_END = US_END + DE_END + [r"^\s*Claims\s*$"]


COUNTRY_RULES = {
    "KR": (KR_ANCHORED_START, KR_INLINE_START, KR_END),
    "JP": (JP_ANCHORED_START, JP_INLINE_START, JP_END),
    "CN": (CN_ANCHORED_START, CN_INLINE_START, CN_END),
    "US": (US_ANCHORED_START, US_INLINE_START, US_END),
    "DE": (DE_ANCHORED_START, DE_INLINE_START, DE_END),
    "EP": (EP_ANCHORED_START, EP_INLINE_START, EP_END),
    "WO": (EP_ANCHORED_START, EP_INLINE_START, EP_END),
}


def first_match(text: str, patterns: list[str], multiline: bool) -> int | None:
    """Return position of earliest match across patterns, or None."""
    flags = re.MULTILINE if multiline else 0
    earliest = None
    for p in patterns:
        m = re.search(p, text, flags)
        if m and (earliest is None or m.start() < earliest):
            earliest = m.start()
    return earliest


def slice_text(text: str, anchored: list[str], inline: list[str], end: list[str]) -> tuple[str | None, str]:
    """Try anchored start patterns first; fall back to inline. Returns (slice, status)."""
    start = first_match(text, anchored, multiline=True)
    used = "anchored"
    if start is None and inline:
        start = first_match(text, inline, multiline=False)
        used = "inline"
    if start is None:
        return None, "nostart"
    # End: prefer line-anchored
    end_pos = len(text)
    if end:
        # Search after start to avoid matching headers near start
        ep = first_match(text[start + 50:], end, multiline=True)
        if ep is not None:
            end_pos = start + 50 + ep
    return text[start:end_pos].strip(), used


# ─────────────────────────────────────────────────────────────────────
# Post-process cleanup
# ─────────────────────────────────────────────────────────────────────

# Header/footer lines to strip (whole-line matches)
JUNK_LINE_PATTERNS = [
    # Patent publication header + page indicator (CN/US/JP/KR/EP/DE/WO 12345 U 说 明 书 2/4 页)
    r"^\s*(?:CN|US|JP|KR|EP|DE|WO)\s+\d[\d, /]*\s+[A-Z]\d?\s+.*?\d+\s*/\s*\d+\s*[页頁页面ページ]?\s*$",
    # Standalone publication header
    r"^\s*CN\s+\d{6,}\s+[A-Z]\d?\s*$",          # CN 120956738 A
    r"^\s*US\s+\d{1,3}(,\d{3})+\s+[A-Z]\d?\s*$",  # US 12,345,678 B2
    r"^\s*US\s+\d{4,}/\d{6,}\s+[A-Z]\d?\s*$",     # US 2024/0288842 A1
    r"^\s*EP\s+\d+\s+[A-Z]\d?\s*$",
    r"^\s*JP\s+\d+\s+[A-Z]\d?\s*$",
    r"^\s*등\s*록\s*특\s*허\s+\d+-\d+\s*$",
    r"^\s*공\s*개\s*특\s*허\s+\d+-\d+\s*$",
    # Bare page numbers
    r"^\s*-\s*\d{1,4}\s*-\s*$",                  # - 197 -
    r"^\s*\d{1,3}\s*$",                          # bare "6" page number
    r"^\s*第\s*\d{1,4}\s*[页頁]\s*(共\s*\d+\s*[页頁])?\s*$",  # 第 1 页 共 N 页
    r"^\s*Page\s+\d+\s*(of\s+\d+)?\s*$",
    # Drawing-only captions at tail
    r"^\s*도\s*면\s*\d+\s*$",                    # 도면116
    r"^\s*Drawing\s+\d+\s*$",
    r"^\s*Fig\.\s+\d+\s*$",
]

# Compile once
JUNK_RE = [re.compile(p) for p in JUNK_LINE_PATTERNS]


def strip_control_chars(text: str) -> str:
    return "".join(ch for ch in text if ch in "\t\n" or unicodedata.category(ch) != "Cc")


def dehyphenate(text: str) -> str:
    """Merge 'word-\\nword' → 'wordword' (latin letters only, conservative)."""
    return re.sub(r"([A-Za-zÀ-ÿ])-\n(?=[A-Za-zÀ-ÿ])", r"\1", text)


def strip_junk_lines(text: str) -> str:
    out_lines = []
    for ln in text.splitlines():
        if any(rx.match(ln) for rx in JUNK_RE):
            continue
        out_lines.append(ln)
    return "\n".join(out_lines)


def collapse_blank_runs(text: str) -> str:
    """3+ consecutive blank lines → 2."""
    return re.sub(r"\n{3,}", "\n\n", text)


def collapse_excess_spaces(text: str) -> str:
    """Collapse runs of 4+ spaces to single space, preserve 1-3 (indent)."""
    return re.sub(r" {4,}", " ", text)


def cleanup(text: str) -> str:
    text = strip_control_chars(text)
    text = dehyphenate(text)
    text = strip_junk_lines(text)
    text = collapse_excess_spaces(text)
    text = collapse_blank_runs(text)
    # trim trailing whitespace on each line
    text = "\n".join(line.rstrip() for line in text.splitlines())
    return text.strip()


# ─────────────────────────────────────────────────────────────────────
# Main processing
# ─────────────────────────────────────────────────────────────────────

def get_source_pdf(stem: str) -> Path | None:
    """Prefer OCR'd PDF if exists (better text layer); else original."""
    ocr = OCR_DIR / f"{stem}.pdf"
    if ocr.exists():
        return ocr
    src = PDF_DIR / f"{stem}.pdf"
    if src.exists():
        return src
    return None


def extract_one(stem: str) -> tuple[str, str, str, int, str]:
    """Returns (stem, country, status, length, message)."""
    country = detect_country(stem)
    if country == "UNK":
        return stem, country, "unmapped", 0, "unknown country prefix"
    pdf = get_source_pdf(stem)
    if not pdf:
        return stem, country, "nofile", 0, "PDF not found"

    anchored, inline, end = COUNTRY_RULES[country]
    text = run_pdftotext(pdf, raw=False)
    if not text or len(text) < 100:
        # Try raw mode
        text = run_pdftotext(pdf, raw=True)
    if not text or len(text) < 100:
        return stem, country, "empty", 0, "no text"

    sliced, used = slice_text(text, anchored, inline, end)
    if sliced is None:
        # No anchor matched → keep full text as last resort
        sliced = text
        used = "full"

    cleaned = cleanup(sliced)
    if len(cleaned) < MIN_CHARS:
        return stem, country, "short", len(cleaned), f"used={used}"

    out_path = OUT_DIR / f"{stem}.txt"
    out_path.write_text(cleaned, encoding="utf-8")
    return stem, country, "ok", len(cleaned), f"used={used}"


def worker(stem: str):
    return extract_one(stem)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--only", type=str, default="", help="comma-separated stems")
    args = ap.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Source list: all PDFs in datas/
    stems = sorted(p.stem for p in PDF_DIR.glob("*.pdf"))
    if args.only:
        wanted = set(args.only.split(","))
        stems = [s for s in stems if s in wanted]
    if args.limit > 0:
        stems = stems[: args.limit]

    print(f"Re-extracting {len(stems)} PDFs with {args.workers} workers...", flush=True)

    results = []
    with mp.Pool(args.workers) as pool:
        for i, res in enumerate(pool.imap_unordered(worker, stems), 1):
            results.append(res)
            if i % 100 == 0:
                print(f"  ...{i}/{len(stems)}", flush=True)

    # Stats
    by_status: dict[str, int] = {}
    by_used: dict[str, int] = {}
    short_files: list[tuple[str, int]] = []
    for stem, country, status, length, msg in results:
        by_status[status] = by_status.get(status, 0) + 1
        if "used=" in msg:
            used = msg.split("used=")[1].split()[0]
            by_used[used] = by_used.get(used, 0) + 1
        if status == "short":
            short_files.append((stem, length))

    print("\n=== Status counts ===")
    for s, n in sorted(by_status.items(), key=lambda x: -x[1]):
        print(f"  {s:12s} {n}")
    print("\n=== Slicer used ===")
    for u, n in sorted(by_used.items(), key=lambda x: -x[1]):
        print(f"  {u:12s} {n}")
    if short_files:
        print("\n=== Still short (<500 chars) ===")
        for stem, length in sorted(short_files, key=lambda x: x[1])[:20]:
            print(f"  {stem:40s} {length} chars")


if __name__ == "__main__":
    main()
