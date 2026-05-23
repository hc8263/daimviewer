"""Run translate_descriptions per-id, rotating GEMINI_API_KEY2..KEY7 on quota/error."""
from __future__ import annotations
import os, sys, subprocess, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENV = ROOT / "web" / ".env.local"
OUT = ROOT / "data" / "descriptions_translated.json"

def load_env():
    for line in ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line: continue
        k, v = line.split("=", 1)
        os.environ[k.strip()] = v.strip().strip('"').strip("'")

def is_done(key: str) -> bool:
    data = json.loads(OUT.read_text(encoding="utf-8"))
    rec = data.get(key, {})
    return bool(rec.get("text_kr")) and not rec.get("error")

def main(ids: list[str], start: int = 2, end: int = 7) -> int:
    load_env()
    for kid in ids:
        if is_done(kid):
            print(f"[SKIP] {kid} already translated"); continue
        success = False
        for n in range(start, end + 1):
            key = os.environ.get(f"GEMINI_API_KEY{n}")
            if not key:
                print(f"  KEY{n} not set, skipping"); continue
            env = {**os.environ, "GEMINI_API_KEY": key}
            print(f"--- {kid} with KEY{n} ---", flush=True)
            r = subprocess.run(
                [sys.executable, str(ROOT / "scripts" / "translate_descriptions.py"),
                 "--ids", kid, "--force", "--workers", "1"],
                env=env, cwd=str(ROOT),
            )
            if r.returncode == 0 and is_done(kid):
                print(f"  ✓ {kid} translated with KEY{n}"); success = True; break
            else:
                print(f"  ✗ KEY{n} failed for {kid}, trying next")
        if not success:
            print(f"!!! {kid}: ALL KEYS {start}-{end} failed")
    return 0

if __name__ == "__main__":
    ids = sys.argv[1].split(",")
    sys.exit(main(ids))
