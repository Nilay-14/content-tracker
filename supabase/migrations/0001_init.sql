-- Content Tracker: initial schema.
-- Run once in Supabase → SQL Editor. See CLAUDE.md → Data model.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type content_type as enum ('reel', 'static', 'carousel', 'story', 'other');

create type post_status as enum (
  'idea', 'planned', 'shot', 'edited', 'scheduled', 'posted', 'skipped'
);

-- ---------------------------------------------------------------------------
-- brands
-- ---------------------------------------------------------------------------
create table brands (
  id               uuid primary key default gen_random_uuid(),
  name             text not null unique,
  instagram_handle text,
  color            text not null default '#6366F1',
  monthly_target   int not null default 0 check (monthly_target >= 0),
  -- 0 = Sunday … 6 = Saturday. Empty means no preferred days.
  preferred_days   smallint[] not null default '{}'
                   check (preferred_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  is_active        boolean not null default true,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- brand_month_targets: optional override of the target for one month
-- ---------------------------------------------------------------------------
create table brand_month_targets (
  id       uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands (id) on delete cascade,
  month    date not null check (extract(day from month) = 1),
  target   int not null check (target >= 0),
  unique (brand_id, month)
);

-- ---------------------------------------------------------------------------
-- festivals
-- ---------------------------------------------------------------------------
create table festivals (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  festival_date date,
  is_active     boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- posts: one row per content entry
-- ---------------------------------------------------------------------------
create table posts (
  id                 uuid primary key default gen_random_uuid(),
  brand_id           uuid not null references brands (id) on delete restrict,
  post_date          date,
  title              text not null,
  content_type       content_type not null default 'reel',
  platform           text not null default 'instagram',
  status             post_status not null default 'posted',
  skip_reason        text,
  rescheduled_from   date,
  festival_id        uuid references festivals (id) on delete set null,
  post_url           text,
  people             text[] not null default '{}',
  notes              text,
  views              int,
  likes              int,
  comments           int,
  shares             int,
  saves              int,
  followers_gained   int,
  metrics_updated_at timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- Only ideas may be undated.
  constraint posts_date_required_unless_idea
    check (post_date is not null or status = 'idea')
);

create index posts_post_date_idx on posts (post_date);
create index posts_brand_date_idx on posts (brand_id, post_date);
create index posts_festival_idx on posts (festival_id);

-- Keep posts.updated_at current on every update.
create function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger posts_set_updated_at
  before update on posts
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: on, with no policies. Only the server (service_role
-- key) can read or write; the public anon key gets nothing.
-- ---------------------------------------------------------------------------
alter table brands enable row level security;
alter table brand_month_targets enable row level security;
alter table festivals enable row level security;
alter table posts enable row level security;
