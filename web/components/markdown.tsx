// Tiny markdown renderer — ported from design/patent_review/markdown.jsx.
// Handles the subset our summaries use: H2/H3, bold, italic, inline code,
// ordered + unordered lists, paragraphs. No third-party dep.
import React from "react";

function inline(s: string): string {
  let t = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/\*(.+?)\*/g, "<em>$1</em>");
  t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
  return t;
}

export function renderMarkdown(md: string | null | undefined): React.ReactNode[] {
  if (!md) return [];
  const lines = md.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^##\s/.test(line)) {
      out.push(<h2 key={key++} dangerouslySetInnerHTML={{ __html: inline(line.replace(/^##\s+/, "")) }} />);
      i++;
      continue;
    }
    if (/^###\s/.test(line)) {
      out.push(<h3 key={key++} dangerouslySetInnerHTML={{ __html: inline(line.replace(/^###\s+/, "")) }} />);
      i++;
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      out.push(
        <ol key={key++}>
          {items.map((it, j) => (
            <li key={j} dangerouslySetInnerHTML={{ __html: inline(it) }} />
          ))}
        </ol>
      );
      continue;
    }
    if (/^[-•]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-•]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-•]\s+/, ""));
        i++;
      }
      out.push(
        <ul key={key++}>
          {items.map((it, j) => (
            <li key={j} dangerouslySetInnerHTML={{ __html: inline(it) }} />
          ))}
        </ul>
      );
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
      !/^#{2,}\s/.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i]) &&
      !/^[-•]\s/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    out.push(<p key={key++} dangerouslySetInnerHTML={{ __html: inline(para.join(" ")) }} />);
  }

  return out;
}
