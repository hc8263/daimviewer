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
  description      text,
  description_ko   text,
  summary_md       text,
  admin_note       text,
  source_url       text,
  pdf_url          text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
-- migrations (idempotent) for older deployments
alter table patents add column if not exists admin_note text;
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
