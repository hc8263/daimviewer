"""Reformat section 3 ("주요 구성 및 특징") of given summaries for readability.

For each top-level bullet `*   **헤더:** 본문...`:
  - If the bullet is followed by nested items (already structured) → keep as-is,
    but normalize the header to `*   **헤더**:` (colon outside bold).
  - If the bullet has a body but no nested items → split the body into sentences
    and emit each as an indented sub-bullet `    *   sentence`.

Blank line is inserted between top-level bullets for readability.

Usage:
    python scripts/reformat_section3.py --ids CN_112421993,EP_1190189,...
    python scripts/reformat_section3.py --ids ALL          # all 8 new ones
"""
from __future__ import annotations
import argparse, json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SUMM = ROOT / "data" / "summaries.json"

NEW_IDS = [
    "CN_112421993", "CN_116691421", "CN_115991160", "CN_120834937",
    "CN_116442717", "EP_1190189", "US_2020-0389469", "US_2025-0087986",
]

# Sentence end: Korean `다`, closing `]`/`)`, or alpha word — followed by `.` + whitespace.
SENT_END = re.compile(r'(?<=[다\]\)\w])\.\s+(?=\S)')

def split_sentences(text: str) -> list[str]:
    text = text.strip()
    if not text:
        return []
    chunks = []
    last = 0
    for m in SENT_END.finditer(text):
        chunk = text[last:m.start() + 1].strip()
        if chunk:
            chunks.append(chunk)
        last = m.end()
    tail = text[last:].strip()
    if tail:
        chunks.append(tail)
    return chunks


def reformat_section3(sec: str) -> str:
    lines = sec.split("\n")
    out: list[str] = [lines[0]]  # `## 3. ...`
    i = 1
    bullets: list[tuple[str | None, list[str]]] = []  # (top_content_or_None, nested_lines)

    while i < len(lines):
        line = lines[i]
        if not line.strip():
            i += 1
            continue
        m = re.match(r'^\*\s+(.*)$', line)
        if m:
            content = m.group(1)
            nested: list[str] = []
            i += 1
            # Collect nested (indented) lines until next blank or non-indented
            while i < len(lines):
                nxt = lines[i]
                if not nxt.strip():
                    # Skip blank lines but stop nesting accumulation
                    i += 1
                    continue
                if nxt.startswith("    ") or nxt.startswith("\t"):
                    nested.append(nxt)
                    i += 1
                else:
                    break
            bullets.append((content, nested))
        else:
            bullets.append((None, [line]))
            i += 1

    rendered: list[str] = []
    for content, nested in bullets:
        if content is None:
            rendered.append(nested[0])
            continue

        # Header pattern: `**헤더:**` (colon inside) OR `**헤더**` (no colon) OR `**헤더** [refs]:`
        # Normalize to `**헤더**:` or `**헤더** [refs]:`
        hdr_match = re.match(r'^\*\*([^*]+?)\*\*\s*(.*)$', content)
        if not hdr_match:
            # No bold header — leave bullet as is
            rendered.append(f'*   {content}')
            if nested:
                rendered.extend(nested)
            rendered.append("")
            continue

        header_raw = hdr_match.group(1).rstrip()  # may end with `:`
        rest = hdr_match.group(2).strip()

        # If header contains trailing `:`, strip and remember
        header_has_colon = header_raw.endswith(":")
        header = header_raw.rstrip(":").strip()

        # If `rest` starts with refs like `[0001][0002]:` or `[0001]:`, separate refs
        refs_match = re.match(r'^((?:\[[^\]]+\]\s*)+)(?:\:\s*)?(.*)$', rest)
        if refs_match and refs_match.group(1).strip():
            refs = refs_match.group(1).strip()
            body = refs_match.group(2).strip()
        else:
            refs = ""
            body = rest if not header_has_colon else rest
            # If header had colon, body may need leading `:` removed (already none)

        # Already nested → keep nested, just normalize the header line
        if nested:
            head_line = f'*   **{header}**'
            if refs:
                head_line += f' {refs}'
            head_line += ':'
            rendered.append(head_line)
            rendered.extend(nested)
            # If body exists alongside nested, append as first sub-bullet
            # (rare; ignore for now to keep nesting intact)
            rendered.append("")
            continue

        # No nested: try to split body into sentences
        sentences = split_sentences(body)
        if len(sentences) >= 2:
            head_line = f'*   **{header}**'
            if refs:
                head_line += f' {refs}'
            head_line += ':'
            rendered.append(head_line)
            for s in sentences:
                rendered.append(f'    *   {s}')
            rendered.append("")
        else:
            # Single sentence or empty body — keep one-liner with normalized header
            head_line = f'*   **{header}**'
            if refs:
                head_line += f' {refs}'
            if body:
                head_line += f': {body}'
            elif header_has_colon:
                head_line += ':'
            rendered.append(head_line)
            rendered.append("")

    while rendered and not rendered[-1]:
        rendered.pop()

    return out[0] + "\n" + "\n".join(rendered)


def process(key: str, data: dict) -> bool:
    rec = data.get(key)
    if not rec or not rec.get("summary"):
        print(f"SKIP {key}: no summary")
        return False
    s = rec["summary"]
    m = re.search(r'(## 3\..*?)(?=\n## |\Z)', s, re.S)
    if not m:
        print(f"SKIP {key}: no section 3")
        return False
    new_sec = reformat_section3(m.group(1))
    if new_sec == m.group(1):
        print(f"NOOP {key}: already formatted")
        return False
    rec["summary"] = s[: m.start()] + new_sec + s[m.end():]
    print(f"  ✓ {key}: reformatted ({len(m.group(1))} -> {len(new_sec)} chars)")
    return True


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ids", required=True, help='comma-separated keys, or "ALL" for the 8 new ones')
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    ids = NEW_IDS if args.ids.upper() == "ALL" else [k.strip() for k in args.ids.split(",") if k.strip()]
    data = json.loads(SUMM.read_text(encoding="utf-8"))
    changed = 0
    for k in ids:
        if process(k, data):
            changed += 1
    if args.dry_run:
        print(f"\n[dry-run] would change {changed} entries")
    elif changed:
        SUMM.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\nWrote {SUMM} ({changed} entries updated)")
    else:
        print("\nNothing changed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
