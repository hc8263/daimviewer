export function normalizeClaimText(text: string): string {
  return text.replace(/(\d+)'s(?=[),;\]\s])/g, "$1'");
}
