# 다임뷰어 이관(마이그레이션) 매뉴얼

> 이 문서는 **코딩·배포 경험이 전혀 없는 분**이 현재 운영 중인 "다임뷰어"(특허 분석 웹앱)를
> 본인의 GitHub 계정과 본인의 Vercel 계정으로 그대로 옮겨서 운영할 수 있도록 작성된 단계별 안내서입니다.
>
> - **인계자**(현재 소유자, 이 매뉴얼을 같이 보며 도와줄 사람): 이하 **A**
> - **인수자**(앞으로 운영하실 분, 이 문서를 따라 하시는 분): 이하 **B**
>
> B는 마우스로 클릭하고, 값을 복사·붙여넣기 하는 작업만 하시면 됩니다.
> 명령어를 직접 칠 일은 거의 없습니다(있어도 그대로 복사해서 붙여 넣는 정도).
>
> 진행 순서: ① GitHub로 코드 복사 → ② Vercel 가입 + 프로젝트 연결 →
> ③ **Vercel에서 Neon DB 자동 연결** → ④ 표 만들고 데이터 옮기기 →
> ⑤ **Vercel AI Gateway 키 발급** → ⑥ 환경변수 입력 → ⑦ 배포 + 접속 확인

---

## 0. 전체 그림 한눈에 보기

다임뷰어는 아래 4가지가 합쳐져서 동작합니다.

| 구성요소 | 역할 | 어디서 만드나? | 비용 |
|---|---|---|---|
| **GitHub** | 코드(설계도)가 저장되는 곳 | github.com | 무료 |
| **Vercel** | 코드를 받아 실제 웹사이트로 실행해 주는 곳 | vercel.com | 무료 시작 가능 |
| **Neon** (Postgres DB) | 특허/검토/챗봇 기록이 저장되는 데이터베이스 | **Vercel 안에서 한 번에 연결** (별도 가입 X) | 무료 시작 가능 |
| **Vercel AI Gateway** | AI(Claude 등) 답변을 받아오는 통합 창구 | **Vercel 안에서 한 번에 연결** (별도 가입 X) | 사용량만큼 유료 |

> 💡 **이번 매뉴얼의 포인트**
> Neon DB와 AI 둘 다 **별도 사이트 가입이 필요 없습니다.**
> Vercel의 "Storage" 와 "AI Gateway" 기능을 쓰면, Vercel이 알아서 Neon 계정과
> AI 사용 키를 만들어 주고 환경변수에도 자동/반자동으로 꽂아 줍니다.
> B가 따로 가입할 곳은 **GitHub + Vercel 단 두 곳뿐**입니다.

> 💡 **준비물**
> - 이메일 1개 (Gmail/네이버/회사 메일 모두 가능)
> - 인터넷 브라우저 (Chrome 권장)
> - 신용카드 1장 (AI 사용량 결제용. Vercel/Neon/AI Gateway 모두 카드 한 장에 묶여 청구됨)
> - 휴대폰 (각 사이트 인증용)

---

## 1단계. GitHub 계정 만들고 코드 받아오기

GitHub는 코드가 보관되는 창고입니다. 현재 코드는 A의 GitHub 계정
(`github.com/vincent0122/dmpat_patent_anal`) 에 있고,
이것을 B의 계정으로 **복사(=Import)** 해야 합니다.

### 1-1. GitHub 가입

1. https://github.com/signup 접속
2. 이메일 → 비밀번호 → 사용자명(아이디) 입력
   - 사용자명은 영문 소문자/숫자만, 나중에 URL에 들어가므로 짧고 깔끔하게 (예: `myname`)
3. 이메일 인증 코드 입력 → 가입 완료
4. 로그인된 상태로 유지

### 1-2. 저장소(Repository) 복사 받기 — Import 방식 (권장)

1. https://github.com/new/import 접속
2. `The URL for your source repository` 칸에 아래 주소 붙여넣기
   ```
   https://github.com/vincent0122/dmpat_patent_anal
   ```
3. `Repository name` 칸에 새 이름 입력 (예: `daimviewer`)
4. **Private** 선택 (비공개)
5. `Begin import` 클릭 → 1~3분 기다리면 완료 메일이 옵니다.

완료되면 `https://github.com/B의아이디/저장소이름` 주소가 생깁니다.
이 주소를 **"내 저장소 주소"** 로 기억해 두세요.

> ⚠️ 우측 상단의 **Fork** 버튼은 쓰지 마세요. 원본과 계속 묶여서 권한이 꼬일 수 있습니다.
> 반드시 **Import** 를 쓰세요.

> **대안 — A가 협업자로 초대만 해 주는 방법**: A가 본인 저장소 `Settings → Collaborators` 에서
> B를 초대하는 방식도 있지만, 이 경우 코드 소유권이 여전히 A 쪽이라 추천하지 않습니다.

---

## 2단계. Vercel 가입 + 프로젝트 가져오기

이제 GitHub의 코드를 Vercel이 실제로 실행해서 인터넷에 띄울 차례입니다.

### 2-1. Vercel 가입

1. https://vercel.com/signup 접속
2. **"Continue with GitHub"** 클릭 (1단계의 GitHub 계정으로 로그인)
3. 권한 허용 (`Authorize Vercel`)
4. 무료 **Hobby** 플랜 선택
5. 팀 이름은 본인 이름/회사명으로 자유 입력

### 2-2. 프로젝트 가져오기 (Import)

1. 대시보드 우상단 **Add New... → Project** 클릭
2. **Import Git Repository** 목록에서 1단계에서 만든 저장소를 찾아 **Import** 클릭
   - 안 보이면 `Adjust GitHub App Permissions` → 본인 저장소에 권한 추가
3. 다음 설정 화면이 뜹니다. **⚠️ 여기가 가장 중요합니다.**

### 2-3. 설정 화면 — 반드시 이대로 입력

| 항목 | 입력값 |
|---|---|
| **Project Name** | 자유 (예: `daimviewer`) |
| **Framework Preset** | `Next.js` (자동 감지됨) |
| **Root Directory** | **`web`** ← ⚠️ 반드시 바꿔야 합니다! |
| Build / Output / Install Command | 모두 비워두기 (기본값) |

> 📌 **Root Directory를 `web`으로 바꾸는 법:**
> "Root Directory" 옆 `Edit` 버튼 클릭 → 폴더 목록에서 `web` 선택 → `Continue`
>
> 이걸 안 바꾸면 배포가 100% 실패합니다.
> 이 저장소는 코드가 루트가 아니라 `web/` 하위에 있기 때문입니다.

### 2-4. 일단 Deploy 클릭

- 환경변수는 아직 비워둔 채로 맨 아래 **Deploy** 버튼을 누르세요.
- 빌드는 성공할 수도 있고, 첫 화면에서 DB 에러가 날 수도 있습니다. **둘 다 정상**입니다.
- 우선 프로젝트가 Vercel에 "생성"되어야 다음 단계의 Neon 연결이 가능합니다.

---

## 3단계. ⭐ Vercel에서 Neon DB 자동 연결하기

이 단계가 이 매뉴얼의 핵심입니다. **Neon 사이트에 따로 가입할 필요가 없습니다.**

### 3-1. Storage 메뉴 열기

1. 방금 만든 Vercel 프로젝트 페이지로 들어갑니다.
2. 상단 탭 메뉴에서 **Storage** 클릭.
3. **Create Database** 또는 **Browse Marketplace** 버튼 클릭.

### 3-2. Neon 선택

1. 데이터베이스 카탈로그가 보입니다. 그중 **Neon (Serverless Postgres)** 클릭.
2. **Install** 또는 **Add Integration** 클릭.
3. 약관(Terms) 동의 → `Continue`.
4. Region 선택 화면이 뜨면 **`Asia Pacific (Singapore)`** 또는 **`Asia Pacific (Tokyo)`** 를 선택하세요. 한국에서 접속이 가장 빠릅니다.
5. Plan은 **Free** 선택.
6. Database name은 기본값(`neondb`) 그대로 두거나 자유로 입력.
7. **Create** 클릭.

### 3-3. 자동으로 일어나는 일

Vercel이 다음 작업을 **자동으로** 처리합니다:

- B 이메일로 Neon 계정 자동 생성 (별도 가입 절차 없음)
- 새 Postgres 데이터베이스 한 개 생성
- 접속 주소 `DATABASE_URL` 을 **현재 Vercel 프로젝트의 환경변수로 자동 등록**
- (그 외에 `PGHOST` 같은 보조 환경변수도 함께 들어갑니다 — 신경 쓰지 않아도 됨)

즉, B가 따로 `DATABASE_URL` 값을 복사·붙여넣기 할 필요가 없습니다. 🎉

### 3-4. Neon 콘솔 열기 (표·데이터 작업용)

데이터베이스는 만들어졌지만 아직 **표(테이블)와 데이터가 비어 있습니다.**
다음 단계인 4단계에서 Neon 콘솔에 들어가 작업해야 합니다.

- Vercel → Storage → 방금 만든 Neon DB 카드 클릭 → 우상단 **`Open in Neon`** 버튼
- 자동 로그인되어 Neon 콘솔이 새 창으로 열립니다. (이때 Neon이 처음 열려도 가입 절차는 이미 자동으로 끝나 있습니다.)

---

## 4단계. 표 만들고 기존 데이터 옮기기

### 4-1. 표(테이블) 만들기

1. Neon 콘솔 좌측 메뉴 → **SQL Editor** 클릭.
2. 아래 SQL을 통째로 복사해서 붙여넣기
   *(아래 내용은 저장소의 `web/db/schema.sql` 과 동일합니다)*

   ```sql
   create table if not exists patents (
     wipson_key       text primary key,
     pdf_filename     text,
     country          text,
     title            text not null,
     title_ko         text,
     application_no   text,
     application_date date,
     publication_no   text,
     registration_no  text,
     applicants       text,
     inventors        text,
     ipc_main         text,
     status           text,
     description      text,
     description_ko   text,
     summary_md       text,
     admin_note       text,
     source_url       text,
     pdf_url          text,
     created_at       timestamptz default now(),
     updated_at       timestamptz default now()
   );
   alter table patents add column if not exists admin_note text;
   create index if not exists patents_title_idx on patents using gin (to_tsvector('simple', title || ' ' || coalesce(title_ko,'')));
   create index if not exists patents_country_idx on patents (country);
   create index if not exists patents_appno_idx on patents (application_no);

   create table if not exists reviews (
     wipson_key    text references patents(wipson_key) on delete cascade,
     reviewer      text not null,
     decision      text,
     note          text,
     excluded      boolean default false,
     updated_at    timestamptz default now(),
     primary key (wipson_key, reviewer)
   );
   alter table reviews add column if not exists excluded boolean default false;

   create table if not exists chat_messages (
     id            bigserial primary key,
     wipson_key    text references patents(wipson_key) on delete cascade,
     reviewer      text,
     role          text,
     content       text,
     created_at    timestamptz default now()
   );
   ```

3. 우측 상단 **Run** 클릭.
4. 화면 아래에 `CREATE TABLE` 같은 메시지가 빨갛지 않게(=초록/회색) 뜨면 성공.

### 4-2. [A 작업] 현재 DB 내용을 파일로 뽑기

이 부분은 **A가 한 번만** 해서 B에게 파일을 보내주면 됩니다.
A는 본인 컴퓨터 터미널(맥) 또는 PowerShell(윈도우)에서 아래 명령을 그대로 실행합니다.

```bash
# 맥/리눅스
pg_dump "기존_DATABASE_URL" \
  --no-owner --no-privileges --no-acl \
  --data-only \
  --table=patents --table=reviews --table=chat_messages \
  > daimviewer-data.sql
```

```powershell
# 윈도우 PowerShell
pg_dump "기존_DATABASE_URL" --no-owner --no-privileges --no-acl --data-only --table=patents --table=reviews --table=chat_messages > daimviewer-data.sql
```

- `pg_dump` 가 없다고 나오면:
  - 맥: `brew install postgresql@16` 후 다시 시도
  - 윈도우: https://www.postgresql.org/download/windows/ 에서 PostgreSQL 설치 후 다시 시도
- 같은 폴더에 **`daimviewer-data.sql`** 파일이 생깁니다.

A는 이 파일을 안전한 방법으로 B에게 전달 (구글드라이브/이메일/카톡 파일 등).

> 💡 **A의 또 다른 옵션 — Neon Branch 복사**: A가 자신의 Neon 콘솔에서 좌측 Branches →
> 기본 브랜치 옆 `...` → **Restore/Copy** 로 스냅샷을 만들고 그 connection string을 B에게
> 임시 공유하면, B가 4-3 방법 ②에서 그 주소로부터 데이터를 통째로 옮길 수도 있습니다.
> 일반적으로는 위의 `pg_dump` 방법이 가장 깔끔합니다.

### 4-3. [B 작업] 받은 파일을 새 DB에 부어넣기

두 가지 방법 중 편한 것을 고르세요.

**방법 ①. (가장 쉬움) Neon SQL Editor에 통째로 붙여넣기 — 파일이 작을 때**

1. 받은 `daimviewer-data.sql` 파일을 메모장(맥은 텍스트편집기)으로 엽니다.
2. 전체 선택(`Ctrl/Cmd + A`) → 복사(`Ctrl/Cmd + C`).
3. Neon 콘솔 → **SQL Editor** → 붙여넣기 → **Run**.
4. 하단에 `INSERT 0 ...` 같은 메시지가 흐르며 끝나면 성공.

> 파일 크기가 50MB를 넘으면 브라우저가 멈출 수 있습니다. 그땐 방법 ②.

**방법 ②. 명령어로 부어넣기 (B가 직접 한 줄 실행)**

1. **B의 새 Neon `DATABASE_URL` 확보**: Vercel → 프로젝트 → **Settings → Environment Variables** 에서 `DATABASE_URL` 행의 눈 아이콘(👁) 클릭 → 값 복사.
2. 맥: "터미널", 윈도우: "PowerShell" 실행.
3. 파일이 있는 폴더로 이동 (예: 다운로드 폴더라면 `cd ~/Downloads`).
4. 아래 한 줄 실행 (`새_DATABASE_URL` 자리에 1번에서 복사한 값을 큰따옴표로 감싸 넣기):
   ```bash
   psql "새_DATABASE_URL" -f daimviewer-data.sql
   ```
5. 출력이 한참 흐른 뒤 프롬프트가 돌아오면 완료.
6. `psql` 이 없다고 나오면: A와 같은 PostgreSQL을 설치하면 함께 깔립니다.

### 4-4. 데이터가 잘 들어갔는지 확인

Neon → **SQL Editor** 에서 한 줄 실행:

```sql
select count(*) from patents;
```

숫자가 0이 아니라 A가 알려준 기존 건수와 비슷하면 성공입니다.

---

## 5단계. Vercel AI Gateway 키 발급

다임뷰어의 챗봇은 **Vercel AI Gateway** 를 통해 Claude AI를 호출합니다.
AI Gateway는 Vercel이 제공하는 "AI 사용 통합 창구"로,
별도 회사(Anthropic 등)에 따로 가입할 필요 없이 Vercel 한 곳에서 키 발급·요금 청구가 모두 처리됩니다.

### 5-1. AI Gateway 메뉴 열기

1. Vercel 대시보드 좌측 상단 **팀(개인) 이름 옆 드롭다운** → 본인 팀 선택.
2. 상단 메뉴 중 **AI Gateway** 클릭.
   - 처음 들어가면 환영 페이지가 뜹니다. **Get Started** 또는 **Enable** 클릭.
3. 약관 동의가 필요하면 동의.

### 5-2. 결제수단 등록 (필수)

AI Gateway는 사용량 기반 유료입니다. 결제수단이 등록돼 있어야 키가 동작합니다.

1. 대시보드 → 팀 → **Settings → Billing** 으로 이동.
2. **Add Payment Method** → 카드 정보 입력.
3. AI Gateway 사용량은 Vercel 청구서에 함께 포함되어 한 번에 빠져나갑니다.
4. (선택) **Spending Limit** 항목에서 월 한도(예: $30)를 걸어두면 폭주를 방지할 수 있습니다.

> 다임뷰어 사용량 기준 월 몇 달러 수준입니다.

### 5-3. API 키 만들기

1. **AI Gateway** 메뉴 → 좌측 **API Keys** (또는 우상단 `Create Key`) 클릭.
2. 이름은 자유 (예: `daimviewer-prod`).
3. 화면에 **한 번만** 보이는 키 (`vck_...` 로 시작) 를 **즉시 메모장에 복사**.
4. 이 키가 곧 `AI_GATEWAY_API_KEY` 입니다. 6단계에서 사용합니다.

> ⚠️ 키는 비밀번호와 같습니다. 카톡·이메일에 평문으로 남기지 말고, 사용 후 메모장은 지우세요.

> 💡 **Anthropic에 따로 가입할 필요 없음**: AI Gateway가 내부적으로 Anthropic Claude를 호출해 주므로,
> B는 Anthropic 계정·결제정보·API 키를 따로 만들지 않아도 됩니다.

---

## 6단계. 관리자 비밀번호 정하기 & 환경변수 입력

### 6-1. 관리자 비밀번호(`ADMIN_PASSWORD`)

다임뷰어 관리자 페이지에 들어갈 비밀번호를 **B가 마음대로** 정합니다.
- 예: `Daim!2026secret`
- 영문/숫자/특수문자 섞어 10자 이상 권장.
- 메모장에 적어두세요.

### 6-2. Vercel 환경변수 입력

1. Vercel → 프로젝트 → **Settings → Environment Variables**.
2. 현재 들어있는 항목 확인:
   - `DATABASE_URL` ← **3단계에서 Vercel/Neon 통합이 자동으로 넣어 줬습니다.** 손대지 않습니다.
3. 아래 항목을 **수동으로 추가** (없는 것만):

| Name (Key) | Value | 어디서 가져온 값? |
|---|---|---|
| `AI_GATEWAY_API_KEY` | `vck_...` | 5-3에서 받은 Vercel AI Gateway 키 |
| `ADMIN_PASSWORD` | 본인이 정한 문자열 | 6-1에서 정한 비밀번호 |
| `NODE_ENV` | `production` | 그대로 입력 |

각 항목의 **Environment** 옵션은 `Production`, `Preview`, `Development` **세 개 모두 체크**.

### 6-3. 재배포(Redeploy)

환경변수만 추가한 상태로는 아직 반영되지 않습니다. 반드시 재배포하세요.

1. 상단 **Deployments** 탭.
2. 가장 위(최신) 배포 줄의 **`...`** 메뉴 → **Redeploy** → `Use existing Build Cache` 체크 해제 → **Redeploy**.
3. 2~5분 기다리면 새 배포 완료.

---

## 7단계. 접속 확인

### 7-1. 첫 페이지
- 배포 완료 후 표시되는 `https://daimviewer-xxx.vercel.app` 같은 주소로 접속.
- 특허 목록이 보이면 **데이터 연결 성공**.
- "데이터가 없습니다" → 4단계가 안 됐을 가능성. 4-4 쿼리로 행 수 확인.
- 500 에러/회색 화면 → 6-2 환경변수 누락 또는 6-3 Redeploy 안 함.

### 7-2. 관리자 로그인
- 주소 끝에 `/admin/login` 붙여서 접속 (예: `https://daimviewer-xxx.vercel.app/admin/login`).
- 6-1에서 정한 비밀번호 입력 → 들어가지면 성공.

### 7-3. 챗봇
- 아무 특허 하나 열고 챗봇 창에 질문.
- 답변이 정상이면 **AI 키 연결 성공**.
- "AI 키가 없습니다" 류 에러 → `AI_GATEWAY_API_KEY` 환경변수 확인 후 Redeploy.

---

## 8단계. (선택) 도메인 연결

`vercel.app` 주소 대신 본인 도메인(예: `daim.co.kr`)을 쓰고 싶다면:

1. Vercel 프로젝트 → **Settings → Domains** → 도메인 입력 → `Add`.
2. Vercel이 보여주는 DNS 레코드값을 도메인 구매처(가비아/후이즈/Cloudflare 등)에 입력.
3. 5~30분 후 자동 연결 + HTTPS 인증서 자동 발급.

도메인이 없으면 이 단계는 건너뜁니다.

---

## 9단계. 앞으로의 운영

### 9-1. 코드 수정
- 누군가(개발자 또는 A) 가 B의 GitHub 저장소에 코드를 push하면
  **Vercel이 자동으로 감지해 1~2분 안에 새 버전을 배포**합니다. B가 별도로 할 일은 없습니다.

### 9-2. 비용 모니터링
- **Vercel**: vercel.com/dashboard → 팀 → **Usage**.
- **Neon**: Vercel → Storage → Neon 카드 → **Open in Neon** → **Billing** (Vercel 통합 결제로 묶을 수도 있음).
- **AI Gateway**: Vercel → 팀 → **AI Gateway → Usage** (Vercel 청구서에 합산됨).

세 군데 모두 무료 한도가 있고, 한도 근처에서 메일로 알림이 옵니다.

### 9-3. 백업
- Neon은 자동으로 7일치 백업(Point-in-time recovery)을 보관합니다.
- 더 안전하게 하려면 매월 1회 4-2의 `pg_dump` 를 본인 PC에서 실행해 SQL 파일을 보관하세요. (`기존_DATABASE_URL` 자리에 새 Neon `DATABASE_URL` 을 넣어 실행)

### 9-4. 환경변수 변경
- Vercel → 프로젝트 → **Settings → Environment Variables** → 해당 항목 `Edit` → 값 수정.
- **반드시 Deployments → 최신 배포 Redeploy** 를 눌러야 적용됩니다.

---

## 10단계. 문제가 생겼을 때 자가진단

| 증상 | 가장 흔한 원인 | 해결 |
|---|---|---|
| 빌드(배포) 실패, 빨간 X | Root Directory가 `web`이 아님 | Settings → General → Root Directory를 `web`으로 수정 후 Redeploy |
| 페이지 열렸는데 500 에러 | 환경변수 누락 또는 Redeploy 안 함 | 6-2의 3개(+자동의 `DATABASE_URL`)가 모두 있는지, 값 공백 없는지 확인 후 Redeploy |
| 특허 목록이 빈 화면 | DB에 데이터가 안 들어감 | 4-4 쿼리로 행 수 확인. 0이면 4-3 다시 |
| 챗봇 답변 안 옴 | `AI_GATEWAY_API_KEY` 오타 / 결제수단 미등록 / 한도 초과 | 키 재확인 + Vercel Billing 상태 확인 |
| 관리자 로그인 실패 | `ADMIN_PASSWORD` 오타 / Redeploy 안 함 | 값 재확인 후 반드시 Redeploy |
| `DATABASE_URL` 이 환경변수에 없음 | 3단계 Storage 통합이 프로젝트와 연결되지 않음 | Storage 탭 → Neon → `Connect Project` 로 현재 프로젝트 연결 후 Redeploy |
| 갑자기 너무 느려짐 | Neon 무료 한도 컴퓨트 소진 | Open in Neon → Usage 확인, 필요 시 유료 전환 |

자가진단으로 해결이 안 되면:
1. Vercel → 프로젝트 → **Deployments** → 최신 배포 클릭 → **Logs** 탭의 빨간 줄을 스크린샷.
2. A 또는 개발자에게 그 스크린샷을 보내면 99% 원인 파악 가능합니다.

---

## 부록 A. 인계자(A)가 마지막으로 할 정리

B의 운영이 한 달 정도 안정화된 뒤 A가 정리해야 할 것:

1. **A의 Vercel 프로젝트(`patent-anal`) 비활성/삭제** — A 대시보드 → 해당 프로젝트 → Settings → Delete.
2. **A의 Neon 프로젝트** 삭제 (B가 데이터 잘 받았는지 충분히 확인 후).
3. **A의 AI Gateway 키 회수** — A의 Vercel 팀 → AI Gateway → API Keys → 해당 키 `Revoke`.
   (만약 기존에 Anthropic 키를 직접 쓰고 있었다면 Anthropic 콘솔에서 해당 키도 `Disable`.)
4. **GitHub 원본 저장소** 처리:
   - B에게 권한 이양하려면: A 저장소 Settings → **Transfer ownership** → B의 GitHub 사용자명 입력.
   - 또는 그대로 두고 B가 Import한 사본만 운영 (권장).

---

## 부록 B. 환경변수 한눈 정리

| 이름 | 어떻게 들어가나? | 예시 | 설명 |
|---|---|---|---|
| `DATABASE_URL` | ✅ **자동 (Vercel Storage 통합)** | `postgresql://...sslmode=require` | Neon 접속 주소 — 손대지 않음 |
| `AI_GATEWAY_API_KEY` | 수동 입력 | `vck_...` | Vercel AI Gateway 키 |
| `ADMIN_PASSWORD` | 수동 입력 | (자유) | 관리자 페이지 비밀번호 |
| `NODE_ENV` | 수동 입력 | `production` | 운영 모드 표시 |
| `ANTHROPIC_API_KEY` | 사용 안 함 | — | AI Gateway를 쓰므로 불필요 |
| `NEON_HTTP_PROXY` | 사용 안 함 | — | 일반 운영에서는 사용 안 함 |

---

## 부록 C. 한 페이지 체크리스트

- [ ] GitHub 가입 + 저장소 **Import** 완료
- [ ] Vercel 가입 + GitHub 연결
- [ ] Vercel Import 시 **Root Directory = `web`** 설정
- [ ] Vercel **Storage → Neon** 추가 → `DATABASE_URL` 자동 주입 확인
- [ ] Open in Neon → SQL Editor에서 `schema.sql` 실행 (4-1)
- [ ] A로부터 `daimviewer-data.sql` 받음
- [ ] 새 Neon에 데이터 복원 + `select count(*) from patents;` 확인
- [ ] Vercel **AI Gateway** 활성화 + 결제수단 등록 + `AI_GATEWAY_API_KEY` 발급
- [ ] `ADMIN_PASSWORD` 정함
- [ ] 환경변수 3개(`AI_GATEWAY_API_KEY`, `ADMIN_PASSWORD`, `NODE_ENV`) 입력
- [ ] **Deployments → Redeploy** 실행
- [ ] `vercel.app` 주소 접속 → 특허 목록 / 관리자 로그인 / 챗봇 동작 확인
- [ ] (선택) 도메인 연결
- [ ] A가 본인 자원 정리

모두 체크되면 이관 완료입니다. 수고하셨습니다 🎉
