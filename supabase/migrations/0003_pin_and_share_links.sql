-- PIN lock: one row of app settings. The PIN itself is never stored, only
-- a salted scrypt hash. Wrong tries are counted so guessing gets slow.
create table if not exists public.app_settings (
  id smallint primary key default 1 check (id = 1),
  pin_hash text,
  pin_salt text,
  failed_attempts int not null default 0,
  locked_until timestamptz
);
insert into public.app_settings (id) values (1) on conflict (id) do nothing;
alter table public.app_settings enable row level security;

-- Read-only share links: a brand with a token can be viewed at /share/<token>.
alter table public.brands add column if not exists share_token text unique;
