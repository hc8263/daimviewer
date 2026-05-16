# 번역 워크플로 전환: API 비용 → Claude Code 구독 활용 (병렬 + 재개)

## Context

현재 상황:
- DB의 `patents.description_ko` 컬럼은 추가됐고 KR 28건 + JP 3건(스모크 테스트)이 채워진 상태. 698건이 미번역.
- 기존 `scripts/translate_descriptions.ts`는 Vercel AI Gateway 경유로 Claude Haiku 4.5를 호출 → 698건 처리 시 약 **$77 USD**, 2~3시간 소요 예상.
- 원문은 이미 로컬 `data/descriptions/*.txt`에 729개 파일로 존재. 이걸 **Claude Code(구독 한도) 안에서 번역**하면 API 비용 0원.

목표:
- 여러 subagent가 **병렬**로 한 파일씩 번역하고, **번역 한 건이 끝날 때마다 즉시 기록**해서 다른/다음 에이전트가 자연스럽게 이어서 작업할 수 있게 한다.
- 누적된 번역본을 DB로 일괄 업로드.
- API 비용 0원, 어디서 끊겨도 재개 가능, 진행 가시화.

## 출력 / 진행 관리 (핵심)

### 1. 번역 결과 저장소
- 경로: `data/descriptions_ko/<같은파일명>.txt`
- 원본과 같은 이름. 예: `data/descriptions/cn200200802997cp.txt` → `data/descriptions_ko/cn200200802997cp.txt`
- 한 파일 = 한 번역의 원자 단위. **부분 쓰기 금지**: subagent는 번역 전체가 완성된 후 한 번에 Write로 저장 (실패 시 빈 파일 안 남김).

### 2. 진행 로그 (append-only, multi-writer safe)
- 경로: `data/translation_log.jsonl`
- **번역 한 건 끝날 때마다 append**. JSON Lines 포맷이라 여러 worker가 동시에 append해도 한 줄 단위 atomic.
- 한 줄 스키마:
  ```json
  {"ts":"2026-05-16T15:01:23Z","file":"cn200200802997cp.txt","status":"ok","in_chars":28412,"out_chars":24105,"worker":"agent-7","note":""}
  ```
  실패 시: `"status":"fail"`, `"note":"why"`.
- 다른 에이전트가 세션을 이어받을 때 이 파일 + `data/descriptions_ko/` 만 보면 "어디까지 끝났나"를 정확히 파악 가능.

### 3. 큐 파일 (작업 미할당 목록)
- 매 라운드 시작 시 메인 에이전트가 **on-the-fly 생성**: `data/descriptions/` - `data/descriptions_ko/`. 별도 큐 파일은 안 둠 (디스크 상태가 진실).
- 단, 디스패치 직전에 **즉시 placeholder 파일 생성**(`data/descriptions_ko/.inflight/<name>.lock`)으로 다른 worker가 같은 파일을 동시에 잡는 걸 방지.
- 성공/실패 시 lock 제거. 라운드 시작 시 stale lock(>30분)이 있으면 제거 후 재할당.

## 병렬 디스패치

### 라운드 구성
- 라운드당 **subagent N개 동시 실행** (N=4~6, Claude Code 사용량 모니터링하며 조정).
- 한 라운드에서 각 subagent는 **할당된 1개 파일**만 번역. 작게 끊어서 실패 영향 최소화 + 진행 로그가 자주 갱신됨.
- 라운드 종료 후 메인 에이전트가:
  1. `data/translation_log.jsonl` tail 확인
  2. 다음 라운드의 미번역 목록 재계산
  3. 사용량 한도가 임박하면 멈추고 사용자에게 보고

### 처리 우선순위
1. **작은 파일부터**: JP, DE, EP, US — 같은 라운드에 더 많이 처리되어 모멘텀 확보, 로그 다양해짐
2. **CN 559건**: 그 다음
3. **초대형 단일 파일**(예: ~721KB 1건): 마지막에 별도 처리 (subagent에 "chunk 처리 필수" 명시)

## Subagent 프롬프트 (요지)

각 subagent는 다음 작업을 수행:

```
1. Read `data/descriptions/<NAME>.txt`. 파일이 없으면 fail-log 후 종료.
2. 만약 `data/descriptions_ko/.inflight/<NAME>.lock`이 이미 있으면 중복이므로 즉시 종료.
   없으면 Write로 lock 파일 생성.
3. 전체 내용을 충실하게 한국어로 번역.
   - 특허 문서 구조 태그(【発明の詳細な説明】, 【0001】, [Background], 等) 보존
   - 문단 구분 유지, 기술용어 정확하게
   - "여기 번역:" 같은 머리말 금지. 한국어 출력만.
   - 파일 크기 > 50KB면 paragraph 경계로 chunk → 순차 번역 → 이어붙임
4. Write로 `data/descriptions_ko/<NAME>.txt` 저장 (완성된 전문을 한 번에).
5. `data/translation_log.jsonl`에 한 줄 append:
   {"ts":"...","file":"<NAME>","status":"ok","in_chars":...,"out_chars":...}
6. lock 파일 제거.
7. 한 줄 요약 반환.

실패 경로:
- 어떤 단계에서든 실패하면 translation_log.jsonl에 status:"fail" + note 기록 후 lock 제거.
```

## 업로드 스크립트

### `scripts/upload_translations.ts`
- 의존: `scripts/ingest.ts`의 `loadEnv` + `Pool` 패턴 그대로
- 동작:
  1. `select wipson_key, pdf_filename from patents where pdf_filename is not null`
  2. 각 행의 `pdf_filename`을 .txt로 치환 → `data/descriptions_ko/<x>.txt` 존재 확인
  3. 있으면 `UPDATE patents set description_ko = $1 where wipson_key = $2`
  4. CLI 옵션: `--dry-run` (매핑 갯수만 출력), `--limit N`
- 재실행 안전: 이미 적재된 행도 동일 내용이면 idempotent. 다른 내용이면 덮어씀(번역 재실행 가능).

## Files to Create / Modify

| 경로 | 변경 | 비고 |
|---|---|---|
| `docs/translation-plan.md` | 신규 | 이 plan 파일을 레포 내부로 복사 (다른 세션/작업자가 참조) |
| `data/descriptions_ko/` | 새 디렉토리 | 번역 결과 누적 |
| `data/descriptions_ko/.inflight/` | 새 디렉토리 | 진행 중 lock 파일 |
| `data/translation_log.jsonl` | 새 파일 | append-only 진행 로그 (multi-writer) |
| `.gitignore` | 추가 | `data/descriptions_ko/`, `data/translation_log.jsonl` 무시 |
| `scripts/upload_translations.ts` | 신규 | descriptions_ko → DB UPDATE |
| `scripts/translate_descriptions.ts` | 삭제 | API 비용 발생 버전 폐기. (혹은 `*.legacy.ts`로 보존) |

코드/UI는 별도 수정 없음 (스키마·UI 토글은 이미 적용됨).

## Reuse (기존 자산)

- **filename → wipson_key 매핑**: `patents.pdf_filename` 컬럼이 이미 채워져 있어 join만 하면 됨. `scripts/ingest.ts`의 `buildPdfIndex/matchPdf` 재구현 불필요.
- **env 로딩 / Pool**: `scripts/ingest.ts`의 패턴 그대로 차용.
- **로컬 DB 라우팅**: `web/lib/db.ts`의 `NEON_HTTP_PROXY` 분기를 upload 스크립트에서도 동일하게 적용 가능 (로컬 docker 대상 업로드 시).

## Verification

1. **smoke (5 files)**: JP/US 각 작은 파일 5개 큐 → 라운드 1회 (subagent ×5 병렬) → 결과 확인
   - `data/descriptions_ko/`에 5개 .txt
   - `data/translation_log.jsonl`에 5줄 (status:ok)
   - lock 디렉토리는 비어 있음
   - 무작위 1개 열어 한국어 + 구조 보존 확인
2. **dry-run 업로드**: `scripts/upload_translations.ts --dry-run` → "5 rows would update" 같은 출력
3. **실 업로드**: 옵션 없이 실행 → `select count(*) filter (where description_ko is not null) from patents`가 31→36으로 증가 확인
4. **UI**: 디테일 페이지에서 해당 5건 중 하나 열고 "원문 한글 번역" 토글 → 한국어 본문 표시
5. **재개 테스트**: 라운드 중간에 메인 에이전트를 강제 종료 → 새 세션 진입 시 이미 끝난 건은 건너뛰고 미번역분만 큐에 잡히는지 확인

## Trade-offs

- **장점**: API 비용 0, 재실행 자유, 진행 가시화, 멀티 세션 친화
- **단점**:
  - Claude Code 사용 한도(5시간 단위)에 닿으면 사용자가 다음 세션 열어야 함 → 그래도 `translation_log.jsonl` + `descriptions_ko/` 덕분에 매끄럽게 이어짐
  - 초대형 단일 파일(721KB)은 subagent 컨텍스트가 빠듯 → chunk 처리를 프롬프트에서 명시
  - 번역 품질은 subagent 모델에 위임 (메인이 Opus면 subagent도 Opus, Haiku면 Haiku — 단가 체감은 0이지만 한도 소모량은 모델 따라 다름)
