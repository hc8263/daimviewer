"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { PRIcon } from "./icons";

export function AdminLogin() {
  const router = useRouter();
  const [pw, setPw] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error || "로그인 실패");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch (e2) {
      setErr((e2 as Error).message);
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--pr-bg)" }}>
      <form onSubmit={submit} className="admin-login">
        <div className="admin-login-h">
          <PRIcon name="Lock" size={18} />
          <span>다임뷰어 관리자</span>
        </div>
        <input
          autoFocus
          type="password"
          placeholder="비밀번호"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        {err && <div className="err">{err}</div>}
        <button className="pr-btn pr-btn-primary pr-btn-sm" disabled={busy || !pw}>
          {busy ? "확인 중…" : "로그인"}
        </button>
      </form>
    </div>
  );
}
