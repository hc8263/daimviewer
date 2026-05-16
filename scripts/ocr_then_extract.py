#!/usr/bin/env python3
"""Run OCR (ocrmypdf) on scanned PDFs from data/needs_ocr.txt, then re-run the
description extractor logic on the OCR'd PDFs.

Outputs:
  - data/ocr_pdfs/{stem}.pdf     : OCR'd PDFs with text layer
  - data/descriptions/{stem}.txt : extracted '상세한 설명' text (overwrites)
  - data/ocr_failed.txt          : stems that still failed (short/empty after OCR)
"""
from __future__ import annotations

import argparse
import multiprocessing as mp
import subprocess
import sys
from pathlib import Path

ROOT = Path("/Users/vincentlim/coding/dmpat_patent_anal")
sys.path.insert(0, str(ROOT / "scripts"))
import extract as ex  # reuse country detection + slicing

PDF_SRC = ROOT / "datas"
OCR_OUT = ROOT / "data" / "ocr_pdfs"
DESC_OUT = ROOT / "data" / "descriptions"
NEEDS = ROOT / "data" / "needs_ocr.txt"
FAILED = ROOT / "data" / "ocr_failed.txt"

OCRMYPDF = "/opt/homebrew/bin/ocrmypdf"

# tesseract language packs by country
LANG_MAP = {
    "CN": "chi_sim+chi_tra+eng",
    "EP": "eng+deu+fra",
    "WO": "eng+deu+fra",
    "KR": "kor+eng",
    "JP": "jpn+eng",
    "DE": "deu+eng",
    "US": "eng",
}


def ocr_one(stem: str) -> tuple[str, str, str]:
    """Returns (stem, country, status_message)."""
    src = PDF_SRC / f"{stem}.pdf"
    dst = OCR_OUT / f"{stem}.pdf"
    if not src.exists():
        return stem, ex.detect_country(stem), "missing_src"

    country = ex.detect_country(stem)
    lang = LANG_MAP.get(country, "eng")

    if dst.exists() and dst.stat().st_size > 0:
        msg = "ocr_cached"
    else:
        cmd = [
            OCRMYPDF,
            "--language", lang,
            "--output-type", "pdf",
            "--optimize", "0",
            "--force-ocr",          # fully re-OCR (scans may have garbage text layer)
            "--jobs", "2",
            str(src), str(dst),
        ]
        try:
            r = subprocess.run(cmd, capture_output=True, timeout=900)
            if r.returncode != 0:
                return stem, country, f"ocr_fail:{r.returncode}:{r.stderr.decode('utf-8','replace')[:200]}"
        except subprocess.TimeoutExpired:
            return stem, country, "ocr_timeout"
        except Exception as e:
            return stem, country, f"ocr_exc:{e}"
        msg = "ocr_ok"

    # Now extract description from the OCR'd PDF
    res = ex.extract_one(dst)
    return stem, country, f"{msg};extract={res[2]}({res[3]})"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=3, help="OCR is CPU-heavy; keep low")
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    OCR_OUT.mkdir(parents=True, exist_ok=True)
    DESC_OUT.mkdir(parents=True, exist_ok=True)

    stems = [s.strip() for s in NEEDS.read_text(encoding="utf-8").splitlines() if s.strip()]
    if args.limit > 0:
        stems = stems[: args.limit]

    print(f"OCR + extract on {len(stems)} PDFs (workers={args.workers})...", flush=True)

    results = []
    with mp.Pool(args.workers) as pool:
        for i, res in enumerate(pool.imap_unordered(ocr_one, stems), 1):
            results.append(res)
            print(f"  [{i}/{len(stems)}] {res[0]:40s} {res[1]:3s} {res[2]}", flush=True)

    # Aggregate
    by_country: dict[str, dict[str, int]] = {}
    failed: list[str] = []
    for stem, country, msg in results:
        by_country.setdefault(country, {})
        # Parse extract status (after ';extract=' part if present)
        ext_status = "?"
        if "extract=" in msg:
            ext_status = msg.split("extract=")[1].split("(")[0]
        by_country[country].setdefault(ext_status, 0)
        by_country[country][ext_status] += 1
        if ext_status in ("short", "empty", "?") or "ocr_fail" in msg or "ocr_timeout" in msg or "ocr_exc" in msg:
            failed.append(stem)

    FAILED.write_text("\n".join(sorted(failed)) + ("\n" if failed else ""), encoding="utf-8")

    print("\n=== Country / extract status after OCR ===")
    for c in sorted(by_country):
        print(f"  {c}: {by_country[c]}")
    print(f"\nStill failed: {len(failed)} (see {FAILED})")


if __name__ == "__main__":
    main()
