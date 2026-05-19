import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "다임뷰어",
  description: "다임뷰어 — 특허 검토 워크스페이스",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
