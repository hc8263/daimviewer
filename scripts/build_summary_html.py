"""
Build a self-contained HTML viewer from a summaries JSON file.

Usage:
    python scripts/build_summary_html.py data/summaries.json
    python scripts/build_summary_html.py data/summaries_v2.json -o data/summaries_v2.html
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

HTML_TPL = r"""<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>__TITLE__</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<style>
  :root { --bd:#e3e3e3; --muted:#6b7280; --bg:#fafafa; --sel:#eef4ff; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Apple SD Gothic Neo", sans-serif; color:#222; }
  .app { display:grid; grid-template-columns: 360px 1fr; height:100vh; }
  aside { border-right:1px solid var(--bd); background:var(--bg); display:flex; flex-direction:column; }
  .filters { padding:12px; border-bottom:1px solid var(--bd); display:flex; flex-direction:column; gap:8px; }
  .filters input, .filters select { width:100%; padding:6px 8px; font-size:13px; border:1px solid var(--bd); border-radius:6px; background:#fff; }
  .count { color:var(--muted); font-size:12px; }
  ul.list { list-style:none; margin:0; padding:0; overflow:auto; flex:1; }
  ul.list li { padding:10px 12px; border-bottom:1px solid var(--bd); cursor:pointer; font-size:13px; }
  ul.list li:hover { background:#f0f0f0; }
  ul.list li.active { background:var(--sel); }
  ul.list .tag { display:inline-block; padding:1px 6px; background:#dbe5ff; color:#1b3a8a; border-radius:4px; font-size:11px; margin-right:6px; font-weight:600; }
  ul.list .docid { color:var(--muted); font-size:11px; margin-left:4px; }
  ul.list .title { display:block; margin-top:4px; color:#222; line-height:1.4; }
  main { overflow:auto; padding:24px 36px; }
  .hd { border-bottom:1px solid var(--bd); padding-bottom:12px; margin-bottom:16px; }
  .hd .ctry { display:inline-block; padding:2px 8px; background:#dbe5ff; color:#1b3a8a; border-radius:4px; font-size:12px; font-weight:600; margin-right:8px; }
  .hd h1 { margin:6px 0; font-size:20px; }
  .hd .meta { color:var(--muted); font-size:12px; }
  .summary h2 { font-size:16px; margin-top:24px; border-left:3px solid #2754c5; padding-left:8px; }
  .summary h3 { font-size:14px; margin-top:16px; }
  .summary ul { padding-left:20px; }
  .summary li { margin:4px 0; line-height:1.6; }
  .summary strong { color:#111; }
  .summary code { background:#f3f4f6; padding:1px 4px; border-radius:3px; font-size:90%; }
  .empty { color:var(--muted); padding:40px; text-align:center; }
</style>
</head>
<body>
<div class="app">
  <aside>
    <div class="filters">
      <input id="q" placeholder="제목/ID 검색" />
      <select id="ctry"><option value="">전체 국가</option></select>
      <div class="count" id="count"></div>
    </div>
    <ul class="list" id="list"></ul>
  </aside>
  <main id="main"><div class="empty">왼쪽 목록에서 특허를 선택하세요</div></main>
</div>

<script id="data" type="application/json">__PAYLOAD__</script>
<script>
  const DATA = JSON.parse(document.getElementById('data').textContent);
  const entries = Object.values(DATA);
  const listEl = document.getElementById('list');
  const mainEl = document.getElementById('main');
  const qEl = document.getElementById('q');
  const ctryEl = document.getElementById('ctry');
  const countEl = document.getElementById('count');

  const countries = [...new Set(entries.map(e => e.ctry).filter(Boolean))].sort();
  for (const c of countries) {
    const o = document.createElement('option'); o.value = c; o.textContent = c; ctryEl.appendChild(o);
  }

  let current = null;

  function render() {
    const q = qEl.value.trim().toLowerCase();
    const ctry = ctryEl.value;
    const filtered = entries.filter(e => {
      if (ctry && e.ctry !== ctry) return false;
      if (!q) return true;
      return (e.title||'').toLowerCase().includes(q) || (e.id||'').toLowerCase().includes(q);
    });
    countEl.textContent = `${filtered.length} / ${entries.length}건`;
    listEl.innerHTML = '';
    for (const e of filtered) {
      const li = document.createElement('li');
      li.dataset.id = e.id;
      if (current === e.id) li.classList.add('active');
      li.innerHTML = `<span class="tag">${e.ctry||''}</span><span class="docid">${e.doc_id||''}</span><span class="title">${escapeHtml(e.title||'(제목 없음)')}</span>`;
      li.onclick = () => select(e.id);
      listEl.appendChild(li);
    }
  }

  function select(id) {
    current = id;
    const e = DATA[id];
    document.querySelectorAll('ul.list li').forEach(li => li.classList.toggle('active', li.dataset.id === id));
    if (!e) { mainEl.innerHTML = '<div class="empty">데이터 없음</div>'; return; }
    const summaryHtml = e.summary ? marked.parse(e.summary) : (e.error ? `<div class="empty">오류: ${escapeHtml(e.error)}</div>` : '<div class="empty">요약 없음</div>');
    mainEl.innerHTML = `
      <div class="hd">
        <div><span class="ctry">${e.ctry||''}</span><span style="color:#6b7280;font-size:12px">${e.id}</span></div>
        <h1>${escapeHtml(e.title||'')}</h1>
        <div class="meta">
          모델: ${e.model||''} · 프롬프트: ${e.prompt_version||''} · 입력 ${e.input_chars||0}자 · 생성 ${e.generated_at||''}
        </div>
      </div>
      <div class="summary">${summaryHtml}</div>
    `;
  }

  function escapeHtml(s){ return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]); }

  qEl.oninput = render;
  ctryEl.onchange = render;
  render();
  if (entries.length) select(entries[0].id);
</script>
</body>
</html>
"""


def build(src: Path, dst: Path, title: str) -> None:
    data = json.loads(src.read_text(encoding="utf-8"))
    payload = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    html = HTML_TPL.replace("__PAYLOAD__", payload).replace("__TITLE__", title)
    dst.write_text(html, encoding="utf-8")
    print(f"wrote {dst}  ({len(html):,} bytes, {len(data)} entries)")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("src", help="path to summaries JSON")
    ap.add_argument("-o", "--out", help="output HTML path (default: same name with .html)")
    ap.add_argument("--title", default="특허 요약 뷰어")
    args = ap.parse_args()
    src = Path(args.src)
    dst = Path(args.out) if args.out else src.with_suffix(".html")
    build(src, dst, args.title)
    return 0


if __name__ == "__main__":
    sys.exit(main())
