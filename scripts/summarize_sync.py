"""Sync summarization for specific keys, rotating GEMINI_API_KEY -> KEY2..KEY8."""
from __future__ import annotations
import argparse, json, os, sys, time
from datetime import datetime, timezone
from pathlib import Path
from google import genai
from google.genai import types

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "descriptions_translated.json"
OUT = ROOT / "data" / "summaries.json"
ENV = ROOT / "web" / ".env.local"

# Import the prompt + helpers from batch script for consistency
sys.path.insert(0, str(ROOT / "scripts"))
from summarize_descriptions_batch import SYSTEM_PROMPT, PROMPT_VERSION, build_user_content  # noqa: E402

DEFAULT_MODEL = "gemini-2.5-flash"


def load_env() -> None:
    for line in ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ[k.strip()] = v.strip().strip('"').strip("'")


def candidate_keys(start: str) -> list[tuple[str, str]]:
    """Return [(label, value), ...] starting from `start` key, then rotating."""
    order = []
    if start == "KEY2":
        order = ["KEY2","KEY3","KEY4","KEY5","KEY7","KEY8","KEY1"]
    else:
        order = ["KEY1","KEY2","KEY3","KEY4","KEY5","KEY7","KEY8"]
    out = []
    for lab in order:
        env_name = "GEMINI_API_KEY" if lab == "KEY1" else f"GEMINI_API_{lab}"
        v = os.environ.get(env_name)
        if v:
            out.append((lab, v))
    return out


def summarize_one(key_label: str, api_key: str, model: str, rec: dict) -> str:
    client = genai.Client(api_key=api_key)
    resp = client.models.generate_content(
        model=model,
        contents=build_user_content(rec),
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.2,
        ),
    )
    return resp.text or ""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ids", required=True)
    ap.add_argument("--model", default=DEFAULT_MODEL)
    ap.add_argument("--start", default="KEY2", choices=["KEY1","KEY2"])
    args = ap.parse_args()

    load_env()
    src = json.loads(SRC.read_text(encoding="utf-8"))
    existing = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}

    ids = [k.strip() for k in args.ids.split(",") if k.strip()]
    keys = candidate_keys(args.start)
    print(f"Available keys: {[k[0] for k in keys]}")

    for kid in ids:
        rec = src.get(kid)
        if not rec or not (rec.get("text_kr") or "").strip():
            print(f"[SKIP] {kid}: no text_kr in source"); continue
        success = False
        for label, val in keys:
            print(f"--- {kid} with {label} (chars={len(rec['text_kr'])}) ---", flush=True)
            t0 = time.time()
            try:
                text = summarize_one(label, val, args.model, rec)
                if not text.strip():
                    print(f"  ✗ empty response"); continue
                existing[kid] = {
                    "id": kid,
                    "ctry": rec.get("ctry"),
                    "doc_id": rec.get("doc_id"),
                    "title": rec.get("title"),
                    "source": "data/descriptions_scraped.json",
                    "summary": text,
                    "model": args.model,
                    "prompt_version": PROMPT_VERSION,
                    "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                    "input_chars": len(rec.get("text_kr") or ""),
                    "sync": True,
                }
                OUT.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")
                print(f"  ✓ ok {time.time()-t0:.1f}s chars_out={len(text)}")
                success = True
                break
            except Exception as e:
                msg = str(e)[:200]
                print(f"  ✗ {label} error: {msg}")
                time.sleep(2)
        if not success:
            print(f"!!! {kid}: ALL KEYS failed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
