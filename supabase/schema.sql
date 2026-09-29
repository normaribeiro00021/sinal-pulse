-- SINAL PULSE — initial Supabase schema. No external APIs are connected in V1.
create extension if not exists "pgcrypto";

create table advertisers (
  id uuid primary key default gen_random_uuid(), name text not null, external_id text unique, platform_handle text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table offers (
  id uuid primary key default gen_random_uuid(), name text not null, advertiser_id uuid references advertisers(id) on delete set null,
  landing_page_url text, country text, language text, niche text, subniche text, product_format text, headline text, promise text,
  observed_price numeric(12,2), currency char(3), source text not null default 'manual', first_seen_at timestamptz, last_seen_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table ads (
  id uuid primary key default gen_random_uuid(), external_ad_id text, offer_id uuid not null references offers(id) on delete cascade,
  advertiser_id uuid references advertisers(id) on delete set null, platform text not null, status text, creative_type text, creative_url text,
  ad_copy text, destination_url text, raw_data jsonb not null default '{}'::jsonb, started_at timestamptz, ended_at timestamptz, first_seen_at timestamptz, last_seen_at timestamptz,
  unique(platform, external_ad_id)
);
create table offer_snapshots (
  id uuid primary key default gen_random_uuid(), offer_id uuid not null references offers(id) on delete cascade, snapshot_date date not null,
  active_ads integer not null default 0, total_ads integer not null default 0, unique_creatives integer not null default 0,
  oldest_active_ad_days integer, new_ads_since_previous_snapshot integer, removed_ads_since_previous_snapshot integer, mining_run_id uuid,
  created_at timestamptz not null default now(), unique(offer_id, snapshot_date)
);
create table keywords (id uuid primary key default gen_random_uuid(), term text not null, country char(2) not null, niche text, created_at timestamptz not null default now(), unique(term, country));
create table mining_runs (id uuid primary key default gen_random_uuid(), keyword_id uuid references keywords(id) on delete set null, country char(2) not null, status text not null default 'queued', filters jsonb not null default '{}'::jsonb, result_count integer, actor_run_id text unique, dataset_id text, cost_usd numeric(12,6), error_message text, started_at timestamptz, finished_at timestamptz, created_at timestamptz not null default now());
create table tiktok_signals (id uuid primary key default gen_random_uuid(), offer_id uuid not null references offers(id) on delete cascade, signal_type text not null, signal_value numeric, observed_at timestamptz not null default now(), raw_data jsonb);
alter table offer_snapshots add constraint offer_snapshots_mining_run_fk foreign key (mining_run_id) references mining_runs(id) on delete set null;
create table offer_scores (id uuid primary key default gen_random_uuid(), offer_id uuid not null references offers(id) on delete cascade, score_date date not null, pulse_score numeric(5,2) not null check (pulse_score between 0 and 100), scale_score numeric(5,2), momentum_score numeric(5,2), momentum_status text, longevity_score numeric(5,2), creative_diversity_score numeric(5,2), fit_score numeric(5,2), unique(offer_id, score_date));
create table saved_offers (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, offer_id uuid not null references offers(id) on delete cascade, created_at timestamptz not null default now(), unique(user_id, offer_id));

create index ads_offer_id_idx on ads(offer_id); create index offer_snapshots_offer_date_idx on offer_snapshots(offer_id, snapshot_date desc); create index offer_scores_offer_date_idx on offer_scores(offer_id, score_date desc);
alter table advertisers enable row level security; alter table offers enable row level security; alter table ads enable row level security; alter table offer_snapshots enable row level security; alter table keywords enable row level security; alter table mining_runs enable row level security; alter table tiktok_signals enable row level security; alter table offer_scores enable row level security; alter table saved_offers enable row level security;
create policy "Users manage their saved offers" on saved_offers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
