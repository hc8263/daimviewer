#!/usr/bin/env python3
"""Audit extracted '상세한 설명' .txt files for common parsing/quality issues.

Flags per-file metrics:
  - chars, lines, mean_line_len
  - excess_whitespace_ratio    : 다중 공백("  +") 비율
  - mid_line_break_ratio       : 단어 중간 hyphen 후 줄바꿈 (en/de/fr 다단 PDF 흔함)
  - bare_pagenum_lines         : '-1-', '2', 'p.5' 같은 줄(헤더/푸터 잔존 의심)
  - ctrl_chars                 : NULL/제어문자 수
  - replacement_chars          : U+FFFD 등 인코딩 깨짐
  - non_basic_chars_ratio      : (정보용) ASCII가 아닌 문자 비율
  - mixed_sc_tc                : (CN) 간체-번체 혼용 의심 (페어 카운트)
  - line_widow_ratio           : 5자 이하 짧은 줄 비율 (다단 추출 실패 의심)

Top-K worst per metric를 출력하여 사람이 직접 확인할 후보를 제시한다.
"""
from __future__ import annotations
import re
import sys
import unicodedata
from pathlib import Path
from collections import defaultdict

ROOT = Path("/Users/vincentlim/coding/dmpat_patent_anal")
DESC = ROOT / "data/descriptions"

# 간체↔번체 페어 일부 (오인식 의심 시그널)
SC_TC_PAIRS = [
    ("国", "國"), ("电", "電"), ("发", "發"), ("机", "機"), ("学", "學"),
    ("说", "說"), ("书", "書"), ("务", "務"), ("权", "權"), ("时", "時"),
    ("线", "線"), ("应", "應"), ("过", "過"), ("处", "處"), ("个", "個"),
    ("门", "門"), ("问", "問"), ("们", "們"), ("会", "會"), ("无", "無"),
]

PAGENUM_RE = re.compile(r"^\s*[-—\[]?\s*(p\.?\s*)?\d+\s*[-—\]/]?\s*$", re.I)
EXCESS_WS_RE = re.compile(r"  +")  # 2+ spaces


def audit_file(p: Path):
    raw = p.read_bytes()
    text = raw.decode("utf-8", errors="replace")
    chars = len(text)
    if chars == 0:
        return None
    lines = text.splitlines()
    nlines = len(lines)
    mean_line = chars / max(nlines, 1)

    # whitespace
    excess_ws = sum(len(m.group(0)) for m in EXCESS_WS_RE.finditer(text))
    excess_ws_ratio = excess_ws / chars

    # mid-word hyphenation: "word-\nword" (영문 다단 PDF 흔한 깨짐)
    hyphen_breaks = len(re.findall(r"[A-Za-z]-\n[A-Za-z]", text))

    # bare page-number lines
    pagenum_lines = sum(1 for ln in lines if PAGENUM_RE.match(ln) and ln.strip())

    # control chars (excl. tab/newline)
    ctrl = sum(1 for ch in text if unicodedata.category(ch) == "Cc" and ch not in "\t\n\r")

    # replacement char
    repl = text.count("�")

    # mixed simplified/traditional Chinese
    sc_count = 0
    tc_count = 0
    for sc, tc in SC_TC_PAIRS:
        sc_count += text.count(sc)
        tc_count += text.count(tc)
    mixed_sc_tc = min(sc_count, tc_count)  # 둘 다 많이 나오면 의심

    # very short lines (widow lines from multi-column extraction failure)
    short_lines = sum(1 for ln in lines if 0 < len(ln.strip()) <= 5)
    short_ratio = short_lines / max(nlines, 1)

    # non-ascii ratio (정보용; 한중일은 자연히 높음)
    non_ascii = sum(1 for ch in text if ord(ch) > 127)
    non_ascii_ratio = non_ascii / chars

    return dict(
        stem=p.stem,
        country=p.stem[:2].lower() if not p.stem.startswith("EP") else "ep",
        chars=chars,
        nlines=nlines,
        mean_line=round(mean_line, 1),
        excess_ws_ratio=round(excess_ws_ratio, 3),
        hyphen_breaks=hyphen_breaks,
        pagenum_lines=pagenum_lines,
        ctrl=ctrl,
        repl=repl,
        mixed_sc_tc=mixed_sc_tc,
        short_ratio=round(short_ratio, 3),
        non_ascii_ratio=round(non_ascii_ratio, 3),
        sc=sc_count,
        tc=tc_count,
    )


def main():
    files = sorted(DESC.glob("*.txt"))
    print(f"Auditing {len(files)} files...\n")
    rows = [audit_file(f) for f in files]
    rows = [r for r in rows if r]

    # Overall summary
    by_country = defaultdict(list)
    for r in rows:
        by_country[r["country"]].append(r)

    print("=== Country averages ===")
    print(f"{'cc':4} {'count':>5} {'mean_chars':>10} {'mean_lines':>10} {'mean_line_len':>13} {'ws_ratio':>9} {'short_ratio':>11}")
    for c in sorted(by_country):
        rs = by_country[c]
        n = len(rs)
        print(f"{c:4} {n:>5} "
              f"{int(sum(r['chars'] for r in rs)/n):>10} "
              f"{int(sum(r['nlines'] for r in rs)/n):>10} "
              f"{sum(r['mean_line'] for r in rs)/n:>13.1f} "
              f"{sum(r['excess_ws_ratio'] for r in rs)/n:>9.3f} "
              f"{sum(r['short_ratio'] for r in rs)/n:>11.3f}")

    # Anomalies
    def topk(key, k=10, reverse=True):
        return sorted(rows, key=lambda r: r[key], reverse=reverse)[:k]

    print("\n=== Top 10: replacement chars (U+FFFD 인코딩 깨짐) ===")
    for r in topk("repl"):
        if r["repl"] == 0: break
        print(f"  {r['stem']:40s} repl={r['repl']:>5}  chars={r['chars']}")

    print("\n=== Top 10: control chars ===")
    for r in topk("ctrl"):
        if r["ctrl"] == 0: break
        print(f"  {r['stem']:40s} ctrl={r['ctrl']}")

    print("\n=== Top 10: excessive whitespace ratio (다단 정렬 잔존) ===")
    for r in topk("excess_ws_ratio"):
        print(f"  {r['stem']:40s} ws_ratio={r['excess_ws_ratio']}  short={r['short_ratio']}")

    print("\n=== Top 10: hyphen line-breaks (영문 단어 잘림) ===")
    for r in topk("hyphen_breaks"):
        if r["hyphen_breaks"] == 0: break
        print(f"  {r['stem']:40s} hyphen_breaks={r['hyphen_breaks']}")

    print("\n=== Top 10: bare page-number lines (헤더/푸터 잔존) ===")
    for r in topk("pagenum_lines"):
        if r["pagenum_lines"] == 0: break
        print(f"  {r['stem']:40s} pagenum_lines={r['pagenum_lines']}")

    print("\n=== Top 10: short-line ratio (다단 분리 실패 의심) ===")
    for r in topk("short_ratio"):
        print(f"  {r['stem']:40s} short_ratio={r['short_ratio']}  chars={r['chars']}")

    print("\n=== Top 10: SC/TC 혼용 (CN OCR 의심) ===")
    for r in topk("mixed_sc_tc"):
        if r["mixed_sc_tc"] < 5: break
        print(f"  {r['stem']:40s} sc={r['sc']:>4} tc={r['tc']:>4} both={r['mixed_sc_tc']}")

    print("\n=== Bottom 10: chars (너무 짧음 — 추출 누락 가능성) ===")
    for r in topk("chars", reverse=False)[:10]:
        print(f"  {r['stem']:40s} chars={r['chars']}")


if __name__ == "__main__":
    main()
