import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "다임뷰어",
  description: "다임뷰어 — 특허 검토 워크스페이스",
};

const themeInitScript = `(function(){try{var t=localStorage.getItem('pr.theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}else{document.documentElement.setAttribute('data-theme','light');}}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
