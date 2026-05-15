import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "특허 검토",
  description: "2026 신규 개발 검토",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
