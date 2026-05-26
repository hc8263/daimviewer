"use client";
import React from "react";
import type { PatentView } from "@/lib/patents";

type Ctx = {
  items: PatentView[];
  updateLocal: (key: string, patch: Partial<PatentView>) => void;
};

export const PatentsCtx = React.createContext<Ctx | null>(null);

export function usePatents(): Ctx {
  const c = React.useContext(PatentsCtx);
  if (!c) throw new Error("usePatents must be used inside <PatentsShell>");
  return c;
}
