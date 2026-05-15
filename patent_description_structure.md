# 국가별 '상세한 설명' 단락 구조

## 🇰🇷 KR (한국) — 28건

최신 KIPO 양식 기준:

- 명세서
  - 기술분야
  - 배경기술
  - 발명의 내용 (또는 발명의 상세한 설명)
    - 해결하려는 과제
    - 과제의 해결 수단
    - 발명의 효과
  - 도면의 간단한 설명
  - 발명을 실시하기 위한 구체적인 내용 (또는 실시예)
  - (산업상 이용가능성)

> 구식 양식(예: `kr00000679478b1p`)은 `발명의 상세한 설명` 아래 `실시예` 하나로만 묶이기도 함.

## 🇯🇵 JP (일본) — 52건

헤더가 전부 `【...】` 대괄호 + 단락번호 `【0001】`:

- 【発明の詳細な説明】
  - 【技術分野】 (구판: 【発明の属する技術分野】)
  - 【背景技術】 (구판: 【従来の技術】)
  - 【発明が解決しようとする課題】
  - 【課題を解決するための手段】
  - 【発明の効果】
  - 【図面の簡単な説明】
  - 【発明を実施するための形態】 (구판: 【発明を実施するための最良の形態】 / 【実施例】)
  - (【産業上の利用可能性】)

## 🇨🇳 CN (중국) — 559건

단락번호 `[0001]` 사용. 헤더는 평문:

- 技术领域
- 背景技术
- 发明内容
- 附图说明
- 具体实施方式 (간혹 实施例)

> 일부 구형(`cn1993...`) 및 실용신안 일부는 스캔 이미지여서 pdftotext로 0줄 — OCR 필요.

## 🇺🇸 US (미국) — 49건

대문자 센터링 헤더:

- (CROSS-REFERENCE TO RELATED APPLICATIONS)
- FIELD OF THE INVENTION (또는 TECHNICAL FIELD)
- BACKGROUND OF THE INVENTION
- SUMMARY OF THE INVENTION
- BRIEF DESCRIPTION OF THE DRAWINGS
- DETAILED DESCRIPTION OF THE INVENTION (또는 ... OF THE EMBODIMENTS / DESCRIPTION OF THE INVENTION)

## 🇩🇪 DE (독일) — 31건

DPMA는 명시적 소제목 없이 `[0001]…` 단락번호로만 흐름. 내부적으로는:

- Beschreibung
  - 기술분야 (`Die vorliegende Erfindung betrifft …`로 시작)
  - 종래기술 (`Es ist … bekannt`)
  - 과제 (`Aufgabe der Erfindung`)
  - 해결 (`Lösung` / `Zusammenfassung`)
  - 도면의 간단한 설명 (`Kurze Beschreibung der Zeichnungen`)
  - 상세설명 / 실시예 (`Ausführungsbeispiel(e)` / `Detaillierte Beschreibung`)

> 헤더 없이 흘러가는 경우가 많아 `[0001]` 단락 단위로 자르고 키워드(Aufgabe/Lösung/Zeichnung/Ausführungsbeispiel)로 섹션 추정해야 함.

## 🇪🇵 EP (유럽) — 9건

일반적으로 US와 유사한 헤더(`Technical Field` / `Background Art` / `Summary of Invention` / `Brief Description of Drawings` / `Description of Embodiments`)지만, 현재 dataset의 EP 파일들은 **대부분 스캔 PDF**(텍스트 추출 0줄) — OCR 전처리 필요.

---

## 텍스트 추출 시 권장 접근

- **앵커 기반 분할**: 각 국가별 헤더 정규식으로 시작/끝 위치 찾아 슬라이싱 (KR/JP/CN/US는 깔끔하게 동작).
- **DE**: 헤더가 없으므로 `[\d{4}]` 단락번호 단위 분리 + 키워드로 분류.
- **스캔본**(EP 일부, 구형 CN 일부): `ocrmypdf` 등으로 OCR 후 동일 파이프라인.
- **pdftotext**는 `-layout` 옵션 결과가 깔끔하나, 다단(2-column) US/EP는 `-raw`가 더 나을 때도 있음.
