"""KR/EP 처럼 본문을 못 받아온 항목을 docContJson.wips 로 재수집.

기존 data/descriptions_scraped.json 에서 char_len 이 작은 항목(<200) 만
대상으로 doc-content JSON API 를 호출하여 dtlDesc HTML 을 가져와 텍스트화한다.
"""
from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "descriptions_scraped.json"

JSON_URL = "https://sd.wips.co.kr/wipslink/doc/docContJson.wips"
PAGE_TMPL = {
    "KR": "https://sd.wips.co.kr/wipslink/api/dkrdshtm.wips?skey={skey}",
    "EP": "https://sd.wips.co.kr/wipslink/api/depdshtm.wips?skey={skey}",
    "CN": "https://sd.wips.co.kr/wipslink/api/dcndshtm.wips?skey={skey}",
    "JP": "https://sd.wips.co.kr/wipslink/api/djpdshtm.wips?skey={skey}",
    "US": "https://sd.wips.co.kr/wipslink/api/dusdshtm.wips?skey={skey}",
    "DE": "https://sd.wips.co.kr/wipslink/api/dipdshtm.wips?skey={skey}",
}
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"


def fetch_desc_json(session: requests.Session, skey: str, ctry: str) -> str | None:
    page = PAGE_TMPL.get(ctry, PAGE_TMPL["CN"]).format(skey=skey)
    # 세션 쿠키 발급
    session.get(page, headers={"User-Agent": UA}, timeout=60)
    data = {
        "skey": skey,
        "tabGb": "DS",
        "isAbEnable": "true",
        "isClEnable": "true",
        "isDsEnable": "true",
        "isAdEnable": "true",
        "isPsEnable": "false",
        "isJdEnable": "false",
        "isFtEnable": "false",
        "devDocType": "DS",
        "devDocCtry": ctry,
    }
    r = session.post(
        JSON_URL,
        data=data,
        headers={
            "User-Agent": UA,
            "X-Requested-With": "XMLHttpRequest",
            "Referer": page,
            "Origin": "https://sd.wips.co.kr",
        },
        timeout=60,
    )
    if r.status_code != 200:
        return None
    try:
        obj = r.json()
    except Exception:
        return None
    parts = []
    for item in obj.get("descList") or []:
        html = item.get("dtlDesc") or ""
        if html:
            parts.append(html)
    if not parts:
        return None
    soup = BeautifulSoup("\n".join(parts), "html.parser")
    text = soup.get_text("\n", strip=True)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def main():
    store = json.loads(OUT.read_text(encoding="utf-8"))
    targets = [(k, v) for k, v in store.items() if v.get("char_len", 0) < 200]
    print(f"대상: {len(targets)}건")

    session = requests.Session()
    updated = 0
    for k, v in targets:
        skey = v["skey"]
        ctry = v["ctry"]
        print(f"[fetch] {k}  ctry={ctry}  skey={skey}", flush=True)
        try:
            text = fetch_desc_json(session, skey, ctry)
        except Exception as e:
            print(f"  ! 에러: {e}")
            continue
        if not text:
            print("  ! 본문 없음")
            continue
        print(f"  ok  {len(text)} chars")
        store[k]["text"] = text
        store[k]["char_len"] = len(text)
        OUT.write_text(json.dumps(store, ensure_ascii=False, indent=2), encoding="utf-8")
        updated += 1
        time.sleep(0.6)

    print(f"\n완료: {updated}/{len(targets)} 업데이트됨")


if __name__ == "__main__":
    sys.exit(main())
