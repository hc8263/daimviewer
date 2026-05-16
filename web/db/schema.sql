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
  source_url       text,
  pdf_url          text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
create index if not exists patents_title_idx on patents using gin (to_tsvector('simple', title || ' ' || coalesce(title_ko,'')));
create index if not exists patents_country_idx on patents (country);
create index if not exists patents_appno_idx on patents (application_no);

-- 검토 기록
create table if not exists reviews (
  wipson_key    text references patents(wipson_key) on delete cascade,
  reviewer      text not null,
  decision      text,
  note          text,
  updated_at    timestamptz default now(),
  primary key (wipson_key, reviewer)
);

-- 챗봇 대화 로그
create table if not exists chat_messages (
  id            bigserial primary key,
  wipson_key    text references patents(wipson_key) on delete cascade,
  reviewer      text,
  role          text,
  content       text,
  created_at    timestamptz default now()
);
