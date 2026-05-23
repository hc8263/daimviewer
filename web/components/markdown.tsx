// Tiny markdown renderer — supports H2/H3, bold, italic, inline code,
// ordered + unordered lists with indentation-based nesting, paragraphs.
import React from "react";

function inline(s: string): string {
  let t = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic: only when * is surrounded by non-space (avoids matching list markers)
  t = t.replace(/(^|[^\w*])\*([^\s*][^*]*?[^\s*]|\S)\*(?=[^\w*]|$)/g, "$1<em>$2</em>");
  t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
  return t;
}

type BulletKind = "ul" | "ol";
type ListItem = { html: string; children?: ListBlock };
type ListBlock = { kind: BulletKind; items: ListItem[] };

const BULLET_RE = /^(\s*)([-•*]|\d+\.)\s+(.*)$/;
const HEAD2_RE = /^##\s+(.*)$/;
const HEAD3_RE = /^###\s+(.*)$/;

function getIndent(line: string): number {
  const m = line.match(/^[ \t]*/);
  // Tabs count as 4 spaces for indent comparison
  return m ? m[0].replace(/\t/g, "    ").length : 0;
}

function kindOf(marker: string): BulletKind {
  return /^\d+\.$/.test(marker) ? "ol" : "ul";
}

// Parse a list starting at lines[i] with the given base indent.
// Returns the block + the index after the last consumed line.
function parseList(lines: string[], i: number, baseIndent: number): [ListBlock, number] {
  const items: ListItem[] = [];
  let kind: BulletKind | null = null;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const m = line.match(BULLET_RE);
    if (!m) break;
    const indent = m[1].replace(/\t/g, "    ").length;
    if (indent < baseIndent) break;
    if (indent > baseIndent) {
      // nested list under previous item
      const [nested, next] = parseList(lines, i, indent);
      if (items.length) items[items.length - 1].children = nested;
      i = next;
      continue;
    }
    const itemKind = kindOf(m[2]);
    if (kind === null) kind = itemKind;
    items.push({ html: inline(m[3]) });
    i++;
  }
  return [{ kind: kind || "ul", items }, i];
}

function ListBlockEl({ block, k }: { block: ListBlock; k: number }): React.ReactElement {
  const Tag = block.kind === "ol" ? "ol" : "ul";
  return (
    <Tag key={k}>
      {block.items.map((it, j) => (
        <li key={j}>
          <span dangerouslySetInnerHTML={{ __html: it.html }} />
          {it.children && it.children.items.length > 0 && (
            <ListBlockEl block={it.children} k={0} />
          )}
        </li>
      ))}
    </Tag>
  );
}

export function renderMarkdown(md: string | null | undefined): React.ReactNode[] {
  if (!md) return [];
  const lines = md.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    let m = line.match(HEAD2_RE);
    if (m) {
      out.push(<h2 key={key++} dangerouslySetInnerHTML={{ __html: inline(m[1]) }} />);
      i++;
      continue;
    }
    m = line.match(HEAD3_RE);
    if (m) {
      out.push(<h3 key={key++} dangerouslySetInnerHTML={{ __html: inline(m[1]) }} />);
      i++;
      continue;
    }
    if (BULLET_RE.test(line)) {
      const baseIndent = getIndent(line);
      const [block, next] = parseList(lines, i, baseIndent);
      out.push(<ListBlockEl key={key++} block={block} k={key} />);
      i = next;
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const para = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !HEAD2_RE.test(lines[i]) &&
      !HEAD3_RE.test(lines[i]) &&
      !BULLET_RE.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    out.push(<p key={key++} dangerouslySetInnerHTML={{ __html: inline(para.join(" ")) }} />);
  }

  return out;
}
