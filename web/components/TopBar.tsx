"use client";
import React from "react";
import Link from "next/link";
import { PRIcon, WantedMark } from "./icons";

export function TopBar({ crumbs = [], rightExtra = null, backHref = null }: {
  crumbs?: string[];
  rightExtra?: React.ReactNode;
  backHref?: string | null;
}) {
  return (
    <header className="pr-topbar">
      <Link href="/" className="brand" style={{ marginRight: 4 }}>
        <span className="brand-mark"><WantedMark size={14} /></span>
        특허 검토
      </Link>
      {backHref && (
        <Link href={backHref} className="pr-btn pr-btn-default pr-btn-sm" title="목록으로">
          <PRIcon name="ChevronLeft" size={14} />
          목록으로
        </Link>
      )}
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep"><PRIcon name="ChevronRight" size={12} /></span>}
            <span className={i === crumbs.length - 1 ? "cur" : ""}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="spacer" />
      {rightExtra}
      <button className="pr-iconbtn" title="설정"><PRIcon name="Settings" size={16} /></button>
      <span className="pr-userchip">
        <span className="av">박</span>
        박경민
      </span>
    </header>
  );
}
