-- 특허 본체
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
  major_category   text,
  middle_category  text,
  description      text,
  description_ko   text,
  summary_md       text,
  easy_summary_md  text,
  admin_note       text,
  source_url       text,
  pdf_url          text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
-- migrations (idempotent) for older deployments
alter table patents add column if not exists admin_note text;
alter table patents add column if not exists easy_summary_md text;
alter table patents add column if not exists major_category text;
alter table patents add column if not exists middle_category text;
-- 고정 표시 번호(seq): 기존 행은 당시 표시 순서(출원일 desc)대로 백필.
-- 신규 행은 업로드 라우트가 insert 시점에 max(seq)+1을 명시 할당하므로
-- 기존 넘버링이 오염되지 않는다. (default nextval은 upsert 충돌 행에서도
-- 시퀀스를 소모해 번호가 점프하므로 쓰지 않는다.)
alter table patents add column if not exists seq integer;
update patents p set seq = r.rn
  from (select wipson_key, row_number() over (order by application_date desc nulls last, wipson_key) as rn
          from patents) r
 where p.wipson_key = r.wipson_key and p.seq is null;
create unique index if not exists patents_seq_idx on patents (seq);
create index if not exists patents_title_idx on patents using gin (to_tsvector('simple', title || ' ' || coalesce(title_ko,'')));
create index if not exists patents_country_idx on patents (country);
create index if not exists patents_appno_idx on patents (application_no);

-- 검토 기록
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

-- 챗봇 대화 로그
create table if not exists chat_messages (
  id            bigserial primary key,
  wipson_key    text references patents(wipson_key) on delete cascade,
  reviewer      text,
  role          text,
  content       text,
  created_at    timestamptz default now()
);
