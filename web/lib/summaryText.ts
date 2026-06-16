const EASY_SUMMARY_HEADING = "## 한 줄 요약";

export function normalizeEasySummary(text: string): string {
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  const headingIndex = normalized.indexOf(EASY_SUMMARY_HEADING);
  if (headingIndex >= 0) {
    return normalized.slice(headingIndex).trim();
  }
  return `${EASY_SUMMARY_HEADING}\n${normalized}`;
}
