#!/usr/bin/env python3
"""Post-process CJK extraction artifacts in data/descriptions/*.txt.

Targets:
  1. CJK ideograph runs with stray spaces ("本 发明" → "本发明")
  2. Sentences split across lines by column-wrap ("控制\\n器。" → "控制器。")
  3. Traditional ↔ Simplified Chinese mixing in CN files (TC → SC normalize)
  4. Short Latin-only garbage tokens between CJK lines (e.g., "AEH AN", "PDE")

Safety:
  - Hangul (한글) blocks are NOT touched (Korean uses spaces legitimately)
  - Latin/digit content is preserved
  - Paragraph-number anchors ([0001], 【0001】) are protected as line starts
  - Section headers (技术领域, 背景技术, …) protected as line starts
"""
from __future__ import annotations
import argparse
import re
from pathlib import Path

try:
    from opencc import OpenCC
    CC = OpenCC("t2s")  # Traditional → Simplified
except ImportError:
    CC = None

ROOT = Path("/Users/vincentlim/coding/dmpat_patent_anal")
DESC = ROOT / "data/descriptions"

# CJK Unified Ideographs (excludes Hangul and Hiragana/Katakana)
CJK = r"㐀-䶿一-鿿豈-﫿"
# Plus CJK Extension B-F via surrogate pairs (skip for simplicity)

CJK_RE = re.compile(f"[{CJK}]")
INTERCJK_SPACE_RE = re.compile(f"(?<=[{CJK}])\\s+(?=[{CJK}])")

# Lines that must remain as line starts (don't merge into prev line)
LINE_START_PROTECTED = re.compile(
    r"^\s*("
    r"\[\d{3,5}\]"                        # [0001]
    r"|【[^】]+】"                         # 【…】
    r"|技\s*术\s*领\s*域$"
    r"|背\s*景\s*技\s*术$"
    r"|发\s*明\s*内\s*容$"
    r"|具\s*体\s*实\s*施\s*方\s*式$"
    r"|实\s*施\s*例$"
    r"|附\s*图\s*说\s*明$"
    r"|权\s*利\s*要\s*求"
    r"|说\s*明\s*书$"
    r"|기술분야|배경기술|발명의 내용|발명의 효과|발명의 상세한 설명|발명의 설명"
    r"|过\s*程"  # generic — leave alone
    r")", re.MULTILINE
)

TERMINAL_PUNCT = "。！？!?；;：:"
# Punctuation that means continuation (don't merge if line ends with these)
CONTINUATION_PUNCT = "，、,"

# Heuristic: garbage-token line — short Latin/digit-only line surrounded by CJK
GARBAGE_LINE_RE = re.compile(r"^\s*[A-Z]{2,4}(\s+[A-Z]{2,4})?\s*$")


def collapse_intercjk_spaces(text: str) -> str:
    """Remove all spaces (incl. multiple) between CJK ideographs."""
    prev = None
    while prev != text:
        prev = text
        text = INTERCJK_SPACE_RE.sub("", text)
    return text


def merge_broken_lines(text: str) -> str:
    """Merge line continuations: prev line ends with CJK + comma/no-punct,
    next line starts with CJK and is not a protected header.
    """
    lines = text.split("\n")
    out: list[str] = []
    for raw in lines:
        ln = raw.rstrip()
        if not out:
            out.append(ln)
            continue
        prev = out[-1]
        if not prev.strip():
            out.append(ln)
            continue
        if not ln.strip():
            out.append(ln)
            continue
        # Don't merge into protected headers
        if LINE_START_PROTECTED.match(ln):
            out.append(ln)
            continue
        # Need: prev ends with CJK char
        m_prev = re.search(f"[{CJK}]([{CONTINUATION_PUNCT}\\s]*)$", prev)
        if not m_prev:
            out.append(ln)
            continue
        last_real_char = prev.rstrip()[-1] if prev.rstrip() else ""
        if last_real_char in TERMINAL_PUNCT:
            out.append(ln)
            continue
        # Need: current line starts with CJK or continuation punctuation
        first_real = ln.lstrip()
        if not first_real:
            out.append(ln)
            continue
        if not re.match(f"[{CJK}，、。）)」』]", first_real):
            out.append(ln)
            continue
        # Merge
        out[-1] = prev.rstrip() + first_real
    return "\n".join(out)


def strip_garbage_tokens(text: str) -> str:
    """Remove very short Latin-only lines (likely OCR garbage from figures).
    Heuristic: line is 2-7 chars, ALL CAPS Latin, AND both neighbors contain CJK.
    """
    lines = text.split("\n")
    out: list[str] = []
    n = len(lines)
    for i, ln in enumerate(lines):
        if GARBAGE_LINE_RE.match(ln):
            # Check neighbors for CJK content
            has_cjk_before = any(CJK_RE.search(lines[j]) for j in range(max(0, i - 3), i))
            has_cjk_after = any(CJK_RE.search(lines[j]) for j in range(i + 1, min(n, i + 4)))
            if has_cjk_before and has_cjk_after:
                continue  # drop
        out.append(ln)
    return "\n".join(out)


def tc_to_sc(text: str) -> str:
    if CC is None:
        return text
    return CC.convert(text)


def is_cn_file(stem: str) -> bool:
    return stem.lower().startswith("cn")


def process(text: str, normalize_to_sc: bool) -> str:
    text = collapse_intercjk_spaces(text)
    text = strip_garbage_tokens(text)
    text = merge_broken_lines(text)
    # second pass collapses any new inter-CJK spaces created by merging
    text = collapse_intercjk_spaces(text)
    if normalize_to_sc:
        text = tc_to_sc(text)
    return text


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", type=str, default="", help="comma-separated stems")
    ap.add_argument("--no-tc-sc", action="store_true", help="skip TC→SC normalization for CN")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    files = sorted(DESC.glob("*.txt"))
    if args.only:
        wanted = set(args.only.split(","))
        files = [f for f in files if f.stem in wanted]

    stats = {"total": 0, "changed": 0, "cn_normalized": 0}
    bytes_saved = 0

    for f in files:
        stats["total"] += 1
        orig = f.read_text(encoding="utf-8")
        normalize = is_cn_file(f.stem) and not args.no_tc_sc
        new = process(orig, normalize)
        if new != orig:
            stats["changed"] += 1
            if normalize:
                stats["cn_normalized"] += 1
            bytes_saved += len(orig.encode("utf-8")) - len(new.encode("utf-8"))
            if not args.dry_run:
                f.write_text(new, encoding="utf-8")

    print(f"Processed: {stats['total']}, changed: {stats['changed']}, CN normalized: {stats['cn_normalized']}")
    print(f"Bytes saved (whitespace removed): {bytes_saved:,}")


if __name__ == "__main__":
    main()
