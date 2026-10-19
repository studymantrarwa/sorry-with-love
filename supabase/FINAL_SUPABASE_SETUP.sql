-- BHAVISHYA GYANI v37.2.3 — FRESH START / SINGLE SQL INSTALLER
-- ============================================================================
-- IMPORTANT
-- 1) This file is intended for a BRAND-NEW Supabase project/database.
-- 2) It intentionally resets the application schema at the beginning.
-- 3) Run THIS ONE file only. Do not run the old SQL files separately.
-- 4) Existing Supabase data will be deleted if this is run on a database that
--    already contains application data. Use only for the new clean project.
-- 5) Razorpay/Firebase/SMTP/TURN/Vercel secrets are NOT stored in this file.
-- 6) The transaction makes the install all-or-nothing if a later SQL statement
--    fails.
-- ============================================================================

BEGIN;

-- ============================================================================
-- SOURCE: supabase/setup.sql
-- ============================================================================
-- BHAVISHYA GYANI V25 — COMPLETE FRESH RESET
-- Run ONCE in Supabase SQL Editor after creating/choosing the project.
-- This application uses three independent account tables and server-side authentication.
-- It intentionally removes old application data and old Supabase Auth test users.

create extension if not exists pgcrypto;

-- SAFETY GUARD: this installer is for a NEW/EMPTY database only; it refuses to delete populated application data.
-- If any application table already contains rows, abort before any DROP statement.
DO $$
DECLARE
  t text;
  n bigint;
  protected_tables text[] := ARRAY[
    'user_accounts','user_profiles','admin_accounts','admin_profiles','astrologer_accounts',
    'astrologers','astrologer_applications','kundalis','conversations','messages',
    'payments','wallets','wallet_transactions','astrologer_earnings','reviews','notifications',
    'admin_audit_logs','support_tickets','astrologer_documents','astrologer_follows',
    'api_rate_limits','call_signals','chat_festival_offers','chat_free_minute_transactions',
    'chat_offer_claims','password_reset_tokens','pooja_bookings','poojas','push_tokens',
    'razorpay_webhook_events','astrologer_performance_daily','astrologer_leaves'
  ];
BEGIN
  FOREACH t IN ARRAY protected_tables LOOP
    IF to_regclass('public.'||t) IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
      IF n > 0 THEN
        RAISE EXCEPTION 'SAFETY STOP: public.% contains % rows. This is a fresh-install SQL and will not delete existing data. Create/use an empty Supabase project instead.', t, n;
      END IF;
    END IF;
  END LOOP;
END $$;

-- Remove old application objects. CASCADE clears dependent policies/views/indexes.
drop view if exists public.profiles cascade;
drop table if exists public.app_feedback cascade;
drop table if exists public.admin_audit_logs cascade;
drop table if exists public.review_reports cascade;
drop table if exists public.platform_settings cascade;
drop table if exists public.notifications cascade;
drop table if exists public.reviews cascade;
drop table if exists public.messages cascade;
drop table if exists public.conversations cascade;
drop table if exists public.payments cascade;
drop table if exists public.astrologer_follows cascade;
drop table if exists public.astrologer_earnings cascade;
drop table if exists public.astrologer_performance_daily cascade;
drop table if exists public.astrologer_leaves cascade;
drop table if exists public.support_tickets cascade;
drop table if exists public.astrologer_documents cascade;
drop table if exists public.astrologer_applications cascade;
drop table if exists public.kundalis cascade;
drop table if exists public.astrologers cascade;
drop table if exists public.user_profiles cascade;
drop table if exists public.admin_profiles cascade;
drop table if exists public.user_accounts cascade;
drop table if exists public.astrologer_accounts cascade;
drop table if exists public.admin_accounts cascade;
drop table if exists public.wallet_transactions cascade;
drop table if exists public.wallets cascade;
drop table if exists public.payouts cascade;
drop table if exists public.system_settings cascade;
drop table if exists public.api_rate_limits cascade;
drop table if exists public.call_signals cascade;
drop table if exists public.chat_festival_offers cascade;
drop table if exists public.chat_free_minute_transactions cascade;
drop table if exists public.chat_offer_claims cascade;
drop table if exists public.password_reset_tokens cascade;
drop table if exists public.pooja_bookings cascade;
drop table if exists public.poojas cascade;
drop table if exists public.push_tokens cascade;
drop table if exists public.razorpay_webhook_events cascade;

-- Old Supabase Auth accounts are not used by V25, so remove old test users too.
do $$ begin
  if to_regclass('auth.users') is not null then
    delete from auth.users;
  end if;
exception when others then
  raise notice 'auth.users cleanup skipped: %', SQLERRM;
end $$;

-- ============================================================
-- 1) COMPLETELY INDEPENDENT ACCOUNT SYSTEMS
-- The same email/mobile may exist once in EACH table.
-- ============================================================
create table public.user_accounts(
 id uuid primary key,
 email text not null unique,
 phone text not null unique,
 password_hash text not null,
 password_salt text not null,
 full_name text not null default '',
 blocked boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table public.astrologer_accounts(
 id uuid primary key,
 email text not null unique,
 phone text not null unique,
 password_hash text not null,
 password_salt text not null,
 full_name text not null default '',
 approved boolean not null default false,
 blocked boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table public.admin_accounts(
 id uuid primary key,
 email text not null unique,
 phone text not null unique,
 password_hash text not null,
 password_salt text not null,
 full_name text not null default '',
 blocked boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table public.user_profiles(
 id uuid primary key references public.user_accounts(id) on delete cascade,
 full_name text not null default '', avatar_url text, referral_code text unique,
 referred_by uuid references public.user_accounts(id) on delete set null,
 reward_points integer not null default 0, blocked boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.admin_profiles(
 id uuid primary key references public.admin_accounts(id) on delete cascade,
 full_name text not null default '', avatar_url text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- ============================================================
-- 2) ASTROLOGER + USER BUSINESS DATA
-- ============================================================
create table public.astrologers(
 id uuid primary key references public.astrologer_accounts(id) on delete cascade,
 full_name text not null default '', avatar_url text, bio text default '', education text default '',
 experience_years integer not null default 0, expertise text[] not null default '{}', languages text[] not null default '{}',
 fee numeric(12,2) not null default 0, fee_per_minute numeric(12,2) not null default 0, discount numeric(5,2) not null default 0,
 online boolean not null default false, last_seen timestamptz, verified boolean not null default false,
 approved_at timestamptz, call_enabled boolean not null default false, chat_enabled boolean not null default true,
 video_enabled boolean not null default false, boosted boolean not null default false,
 followers integer not null default 0, followers_count integer not null default 0,
 rating_avg numeric(4,2) not null default 0, rank_score numeric(8,2) not null default 0,
 rank_position integer, completed_chats integer not null default 0, accepted_requests integer not null default 0,
 missed_requests integer not null default 0, response_seconds_avg numeric(10,2) not null default 0,
 blocked boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.astrologer_applications(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.astrologer_accounts(id) on delete cascade,
 education text default '', bio text default '', experience_years integer not null default 0,
 expertise text[] not null default '{}', languages text[] not null default '{}', requested_fee numeric(12,2) not null default 0,
 avatar_url text, status text not null default 'pending' check(status in ('pending','approved','rejected')),
 admin_note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index astrologer_application_pending_uidx on public.astrologer_applications(user_id) where status='pending';

create table public.kundalis(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.user_accounts(id) on delete cascade,
 name text not null, gender text, dob date not null, birth_time time not null, place text not null,
 latitude numeric(10,7) not null, longitude numeric(10,7) not null, timezone numeric(4,2) not null default 5.50,
 ayanamsa text not null default 'Lahiri', calculation_data jsonb not null default '{}', created_at timestamptz not null default now()
);

create table public.conversations(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.user_accounts(id) on delete cascade,
 astrologer_id uuid references public.astrologer_accounts(id) on delete set null,
 admin_id uuid references public.admin_accounts(id) on delete set null,
 status text not null default 'requested', channel text not null default 'chat', requested_at timestamptz not null default now(),
 astrologer_accepted_at timestamptz, user_confirm_deadline timestamptz, user_confirmed_at timestamptz,
 accepted_at timestamptz, closed_at timestamptz, missed_by text, astrologer_response_seconds integer,
 user_confirm_response_seconds integer, billed_seconds integer not null default 0, billed_amount numeric(12,2) not null default 0, last_message_at timestamptz, fee_snapshot numeric(12,2) default 0,
 discount_snapshot numeric(5,2) default 0, retention_until timestamptz, created_at timestamptz not null default now()
);

create table public.messages(
 id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade,
 sender_id uuid not null, body text not null, kundali_id uuid references public.kundalis(id) on delete set null,
 read_at timestamptz, created_at timestamptz not null default now()
);

create table public.reviews(
 id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade,
 user_id uuid not null references public.user_accounts(id) on delete cascade,
 astrologer_id uuid not null references public.astrologer_accounts(id) on delete cascade,
 rating integer not null check(rating between 1 and 5), review text,
 moderation_status text not null default 'approved', admin_note text, created_at timestamptz not null default now(),
 unique(conversation_id,user_id)
);

create table public.review_reports(
 id uuid primary key default gen_random_uuid(),
 review_id uuid not null references public.reviews(id) on delete cascade,
 astrologer_id uuid not null references public.astrologer_accounts(id) on delete cascade,
 reporter_id uuid not null references public.astrologer_accounts(id) on delete cascade,
 message text not null default '',
 status text not null default 'open' check(status in ('open','resolved','dismissed')),
 admin_id uuid references public.admin_accounts(id) on delete set null,
 created_at timestamptz not null default now(),
 resolved_at timestamptz
);

create table public.astrologer_follows(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.user_accounts(id) on delete cascade,
 astrologer_id uuid not null references public.astrologer_accounts(id) on delete cascade,
 created_at timestamptz not null default now(), unique(user_id,astrologer_id)
);

create table public.notifications(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.user_accounts(id) on delete cascade,
 title text not null, body text not null, read_at timestamptz, created_at timestamptz not null default now()
);

create table public.payments(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.user_accounts(id) on delete cascade,
 astrologer_id uuid references public.astrologer_accounts(id) on delete set null,
 conversation_id uuid references public.conversations(id) on delete set null,
 amount numeric(12,2) not null default 0, currency text not null default 'INR', method text not null default 'manual',
 reference text, proof_url text, gateway text, gateway_order_id text, gateway_payment_id text, purpose text not null default 'general', status text not null default 'pending' check(status in ('pending','approved','rejected','refunded')),
 admin_note text, approved_by uuid references public.admin_accounts(id) on delete set null, approved_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.astrologer_earnings(
 id uuid primary key default gen_random_uuid(), astrologer_id uuid not null references public.astrologer_accounts(id) on delete cascade,
 amount numeric(12,2) not null default 0, gross_amount numeric(12,2) not null default 0, commission_amount numeric(12,2) not null default 0, net_amount numeric(12,2) not null default 0, category text not null default 'service', earned_at timestamptz not null default now(), paid_out boolean not null default false, payout_id uuid, conversation_id uuid references public.conversations(id) on delete set null
);

create table public.wallets(
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references public.user_accounts(id) on delete cascade,
 balance numeric(12,2) not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.wallet_transactions(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.user_accounts(id) on delete cascade,
 amount numeric(12,2) not null, type text not null check(type in ('credit','debit')), source text not null default 'manual', payment_id uuid references public.payments(id) on delete set null, description text not null default '', created_at timestamptz not null default now()
);
create table public.payouts(
 id uuid primary key default gen_random_uuid(), astrologer_id uuid not null references public.astrologer_accounts(id) on delete cascade,
 period_start date not null, period_end date not null, gross_amount numeric(12,2) not null default 0, commission_amount numeric(12,2) not null default 0, net_amount numeric(12,2) not null default 0, payout_date date, status text not null default 'pending' check(status in ('pending','processing','paid','held')), reference text, admin_note text, paid_at timestamptz, created_at timestamptz not null default now(), unique(astrologer_id,period_start,period_end)
);
create table public.astrologer_performance_daily(
 id uuid primary key default gen_random_uuid(), astrologer_id uuid not null references public.astrologer_accounts(id) on delete cascade,
 day date not null, chat_quality numeric, live_hours numeric, call_pickup_rate numeric, chat_pickup_rate numeric,
 conversion_rate numeric, response_time_sec numeric, login_hours numeric, unique(astrologer_id,day)
);
create table public.astrologer_leaves(
 id uuid primary key default gen_random_uuid(), astrologer_id uuid not null references public.astrologer_accounts(id) on delete cascade,
 from_date date not null, to_date date not null, reason text, status text not null default 'pending', created_at timestamptz not null default now()
);
create table public.support_tickets(
 id uuid primary key default gen_random_uuid(), user_id uuid, subject text not null, message text,
 status text not null default 'open', created_at timestamptz not null default now()
);
create table public.app_feedback(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.user_accounts(id) on delete cascade,
 rating integer not null check(rating between 1 and 5), feedback text, created_at timestamptz not null default now()
);
create table public.platform_settings(
 key text primary key, value jsonb not null default '{}', updated_by uuid references public.admin_accounts(id) on delete set null,
 updated_at timestamptz not null default now()
);
create table public.admin_audit_logs(
 id uuid primary key default gen_random_uuid(), admin_id uuid not null references public.admin_accounts(id) on delete cascade,
 action text not null, details jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.system_settings(key text primary key,value text not null,updated_at timestamptz not null default now());

-- Admin registration code is intentionally not seeded. Configure ADMIN_REGISTRATION_CODE as a deployment secret.
insert into public.platform_settings(key,value) values
('chat_rules','{"astrologer_accept_seconds":120,"user_confirm_seconds":120,"chat_retention_seconds":172800,"auto_miss":true}'::jsonb),
('rank_rules','{"rating_weight":35,"completion_weight":20,"acceptance_weight":20,"response_weight":15,"reliability_weight":10}'::jsonb)
on conflict(key) do update set value=excluded.value,updated_at=now();

-- Compatibility read view for legacy UI only. It is not writable and is blocked from browser roles.
create view public.profiles as
select a.id,a.full_name,a.email,a.phone,p.avatar_url,p.blocked,'user'::text as role,p.referral_code,p.referred_by,p.reward_points,p.created_at,p.updated_at
from public.user_accounts a join public.user_profiles p on p.id=a.id
union all
select a.id,a.full_name,a.email,a.phone,x.avatar_url,x.blocked,'astrologer'::text as role,null::text,null::uuid,0,x.created_at,x.updated_at
from public.astrologer_accounts a join public.astrologers x on x.id=a.id
union all
select a.id,a.full_name,a.email,a.phone,p.avatar_url,a.blocked,'admin'::text as role,null::text,null::uuid,0,p.created_at,p.updated_at
from public.admin_accounts a join public.admin_profiles p on p.id=a.id;

-- Server uses service-role access; browser access remains blocked by RLS.
DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY['user_accounts','user_profiles','astrologer_accounts','astrologers','astrologer_applications','admin_accounts','admin_profiles','kundalis','conversations','messages','reviews','astrologer_follows','notifications','payments','astrologer_earnings','wallets','wallet_transactions','payouts','astrologer_performance_daily','astrologer_leaves','support_tickets','app_feedback','platform_settings','admin_audit_logs','review_reports','system_settings'])
  LOOP EXECUTE format('alter table public.%I enable row level security',t); END LOOP;
END $$;

revoke all on public.profiles from anon,authenticated;

create index idx_user_accounts_email on public.user_accounts(email);
create index idx_user_accounts_phone on public.user_accounts(phone);
create index idx_astro_accounts_email on public.astrologer_accounts(email);
create index idx_astro_accounts_phone on public.astrologer_accounts(phone);
create index idx_admin_accounts_email on public.admin_accounts(email);
create index idx_admin_accounts_phone on public.admin_accounts(phone);
create index idx_astrologers_rank on public.astrologers(rank_score desc,rating_avg desc);
create index idx_astrologers_presence on public.astrologers(online,last_seen desc);
create index idx_apps_status on public.astrologer_applications(status,created_at desc);
create index idx_conv_user on public.conversations(user_id,status,created_at desc);
create index idx_conv_astro on public.conversations(astrologer_id,status,created_at desc);
create index idx_messages_conv on public.messages(conversation_id,created_at);
create index idx_wallet_tx_user on public.wallet_transactions(user_id,created_at desc);
create index idx_earnings_astro_day on public.astrologer_earnings(astrologer_id,earned_at desc);
create index idx_payouts_astro_period on public.payouts(astrologer_id,period_start,period_end);


-- Payment/commission defaults
insert into public.platform_settings(key,value) values('payment_settings','{"commission_percent":20,"payout_start_day":1,"payout_end_day":10}'::jsonb) on conflict(key) do nothing;

-- FREE CHAT / FESTIVAL / RECHARGE OFFER SYSTEM
alter table public.user_accounts add column if not exists free_chat_minutes integer not null default 0;
alter table public.user_accounts add column if not exists free_chat_minutes_used integer not null default 0;
create table if not exists public.chat_free_minute_transactions(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.user_accounts(id) on delete cascade,
 minutes integer not null check(minutes > 0), type text not null check(type in ('credit','debit')), source text not null default 'admin',
 conversation_id uuid references public.conversations(id) on delete set null, description text not null default '', created_at timestamptz not null default now()
);
create table if not exists public.chat_festival_offers(
 id uuid primary key default gen_random_uuid(), name text not null, minutes integer not null check(minutes > 0),
 target text not null default 'all' check(target in ('all','selected')), user_ids uuid[] not null default '{}',
 start_at timestamptz not null, end_at timestamptz not null, active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.chat_offer_claims(
 id uuid primary key default gen_random_uuid(), offer_id uuid not null references public.chat_festival_offers(id) on delete cascade,
 user_id uuid not null references public.user_accounts(id) on delete cascade, minutes_granted integer not null check(minutes_granted > 0),
 claimed_at timestamptz not null default now(), unique(offer_id,user_id)
);
insert into public.platform_settings(key,value) values ('chat_offer_settings','{"new_user_free_minutes":0}'::jsonb) on conflict (key) do nothing;
insert into public.platform_settings(key,value) values ('recharge_offer_settings','{"active":false,"percent":0,"start_at":null,"end_at":null}'::jsonb) on conflict (key) do nothing;

-- ============================================================================
-- SOURCE: supabase/RUN_THIS_SQL_ONLY.sql
-- ============================================================================
-- BHAVISHYA GYANI - FINAL CUMULATIVE MIGRATION
-- Existing project ke liye. Is file ko Supabase SQL Editor me ek baar run karein.
-- Ye destructive setup.sql nahi hai aur existing user/chat data ko drop nahi karta.

-- =========================
-- 1) POOJA CATALOG + BOOKING
-- =========================
create table if not exists public.poojas(
 id uuid primary key default gen_random_uuid(),
 astrologer_id uuid not null references public.astrologer_accounts(id) on delete cascade,
 name text not null,
 description text not null default '',
 price numeric(12,2) not null default 0 check(price >= 0),
 image_url text,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.pooja_bookings(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.user_accounts(id) on delete cascade,
 astrologer_id uuid not null references public.astrologer_accounts(id) on delete cascade,
 pooja_id uuid not null references public.poojas(id) on delete restrict,
 user_name text not null default '',
 phone text not null default '',
 preferred_date date,
 preferred_time time,
 notes text not null default '',
 amount numeric(12,2) not null default 0 check(amount >= 0),
 status text not null default 'pending' check(status in ('pending','confirmed','rejected','completed','cancelled')),
 astrologer_note text not null default '',
 admin_note text not null default '',
 wallet_debited boolean not null default false,
 wallet_refunded boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

alter table public.pooja_bookings add column if not exists user_name text not null default '';
alter table public.pooja_bookings add column if not exists phone text not null default '';
alter table public.pooja_bookings add column if not exists preferred_date date;
alter table public.pooja_bookings add column if not exists preferred_time time;
alter table public.pooja_bookings add column if not exists notes text not null default '';
alter table public.pooja_bookings add column if not exists amount numeric(12,2) not null default 0;
alter table public.pooja_bookings add column if not exists astrologer_note text not null default '';
alter table public.pooja_bookings add column if not exists admin_note text not null default '';
alter table public.pooja_bookings add column if not exists wallet_debited boolean not null default false;
alter table public.pooja_bookings add column if not exists wallet_refunded boolean not null default false;

create index if not exists idx_poojas_astro_active on public.poojas(astrologer_id,active,created_at desc);
create index if not exists idx_pooja_bookings_user on public.pooja_bookings(user_id,created_at desc);
create index if not exists idx_pooja_bookings_astro on public.pooja_bookings(astrologer_id,status,created_at desc);
create index if not exists idx_pooja_bookings_status on public.pooja_bookings(status,created_at desc);
create index if not exists idx_pooja_bookings_user_status on public.pooja_bookings(user_id,status,created_at desc);
alter table public.poojas enable row level security;
alter table public.pooja_bookings enable row level security;

-- =========================
-- 2) WALLET + PAYMENT + PAYOUT
-- =========================
create table if not exists public.wallets(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references public.user_accounts(id) on delete cascade,
 balance numeric(12,2) not null default 0,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.user_accounts(id) on delete cascade,
 amount numeric(12,2) not null,
 type text not null check(type in ('credit','debit')),
 source text not null default 'manual',
 payment_id uuid references public.payments(id) on delete set null,
 description text not null default '',
 created_at timestamptz not null default now()
);

create table if not exists public.payouts(
 id uuid primary key default gen_random_uuid(),
 astrologer_id uuid not null references public.astrologer_accounts(id) on delete cascade,
 period_start date not null,
 period_end date not null,
 gross_amount numeric(12,2) not null default 0,
 commission_amount numeric(12,2) not null default 0,
 net_amount numeric(12,2) not null default 0,
 payout_date date,
 status text not null default 'pending' check(status in ('pending','processing','paid','held')),
 reference text,
 admin_note text,
 paid_at timestamptz,
 created_at timestamptz not null default now(),
 unique(astrologer_id,period_start,period_end)
);

alter table public.astrologers add column if not exists fee_per_minute numeric(12,2) not null default 0;
alter table public.payments add column if not exists gateway text;
alter table public.payments add column if not exists gateway_order_id text;
alter table public.payments add column if not exists gateway_payment_id text;
alter table public.payments add column if not exists purpose text not null default 'general';
alter table public.astrologer_earnings add column if not exists gross_amount numeric(12,2) not null default 0;
alter table public.astrologer_earnings add column if not exists commission_amount numeric(12,2) not null default 0;
alter table public.astrologer_earnings add column if not exists net_amount numeric(12,2) not null default 0;
alter table public.astrologer_earnings add column if not exists paid_amount numeric(12,2) not null default 0;
alter table public.astrologer_earnings add column if not exists paid_minutes numeric(12,2) not null default 0;
alter table public.astrologer_earnings add column if not exists paid_out boolean not null default false;
alter table public.astrologer_earnings add column if not exists payout_id uuid;
alter table public.astrologer_earnings add column if not exists conversation_id uuid references public.conversations(id) on delete set null;
alter table public.conversations add column if not exists billed_seconds integer not null default 0;
alter table public.conversations add column if not exists billed_amount numeric(12,2) not null default 0;
alter table public.conversations add column if not exists chat_started_at timestamptz;
alter table public.conversations add column if not exists chat_budget_seconds integer not null default 0;
update public.astrologers set fee_per_minute=fee where fee_per_minute=0 and fee>0;

insert into public.platform_settings(key,value) values('payment_settings','{"commission_percent":20,"payout_start_day":1,"payout_end_day":10}'::jsonb) on conflict(key) do nothing;

drop index if exists uq_earnings_conversation;
create unique index if not exists uq_earnings_conversation on public.astrologer_earnings(conversation_id) where conversation_id is not null;
create index if not exists idx_wallet_tx_user on public.wallet_transactions(user_id,created_at desc);
create index if not exists idx_earnings_astro_day on public.astrologer_earnings(astrologer_id,earned_at desc);
create index if not exists idx_payouts_astro_period on public.payouts(astrologer_id,period_start,period_end);
create index if not exists idx_conversations_chat_started on public.conversations(status,chat_started_at);

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check check(status in ('pending','approved','failed','rejected','refunded'));

-- =========================
-- 3) FREE CHAT MINUTES + FESTIVAL OFFERS
-- =========================
alter table public.user_accounts add column if not exists free_chat_minutes numeric(12,4) not null default 0;
alter table public.user_accounts alter column free_chat_minutes type numeric(12,4) using free_chat_minutes::numeric;
alter table public.user_accounts add column if not exists free_chat_minutes_used numeric(12,4) not null default 0;
alter table public.user_accounts alter column free_chat_minutes_used type numeric(12,4) using free_chat_minutes_used::numeric;

create table if not exists public.chat_free_minute_transactions(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.user_accounts(id) on delete cascade,
 minutes integer not null check(minutes > 0),
 type text not null check(type in ('credit','debit')),
 source text not null default 'admin',
 conversation_id uuid references public.conversations(id) on delete set null,
 description text not null default '',
 created_at timestamptz not null default now()
);

create table if not exists public.chat_festival_offers(
 id uuid primary key default gen_random_uuid(),
 name text not null,
 minutes integer not null check(minutes > 0),
 target text not null default 'all' check(target in ('all','selected')),
 user_ids uuid[] not null default '{}',
 start_at timestamptz not null,
 end_at timestamptz not null,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.chat_offer_claims(
 id uuid primary key default gen_random_uuid(),
 offer_id uuid not null references public.chat_festival_offers(id) on delete cascade,
 user_id uuid not null references public.user_accounts(id) on delete cascade,
 minutes_granted integer not null check(minutes_granted > 0),
 claimed_at timestamptz not null default now(),
 unique(offer_id,user_id)
);

create index if not exists idx_chat_free_tx_user on public.chat_free_minute_transactions(user_id,created_at desc);
create index if not exists idx_chat_festival_offers_active on public.chat_festival_offers(active,start_at,end_at);
create index if not exists idx_chat_offer_claims_user on public.chat_offer_claims(user_id,claimed_at desc);

insert into public.platform_settings(key,value) values('chat_offer_settings','{"new_user_free_minutes":0}'::jsonb) on conflict(key) do nothing;
insert into public.platform_settings(key,value) values('recharge_offer_settings','{"active":false,"percent":0,"start_at":null,"end_at":null}'::jsonb) on conflict(key) do nothing;

-- =========================
-- 4) SECURITY / RLS
-- =========================
DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY['wallets','wallet_transactions','payouts','chat_free_minute_transactions','chat_festival_offers','chat_offer_claims']) LOOP
    EXECUTE format('alter table public.%I enable row level security',t);
  END LOOP;
END $$;

-- API uses the service role, so existing application policies remain authoritative for client access.

-- Bhavishya Gyani: atomic chat settlement + user confirmation fields
-- Safe to run repeatedly.
alter table public.conversations add column if not exists chat_started_at timestamptz;
alter table public.conversations add column if not exists chat_budget_seconds integer not null default 0;
alter table public.conversations add column if not exists billed_seconds integer not null default 0;
alter table public.conversations add column if not exists billed_amount numeric(12,2) not null default 0;
alter table public.astrologer_earnings add column if not exists gross_amount numeric(12,2) not null default 0;
alter table public.astrologer_earnings add column if not exists commission_amount numeric(12,2) not null default 0;
alter table public.astrologer_earnings add column if not exists net_amount numeric(12,2) not null default 0;
alter table public.astrologer_earnings add column if not exists paid_amount numeric(12,2) not null default 0;
alter table public.astrologer_earnings add column if not exists paid_minutes numeric(12,2) not null default 0;
alter table public.astrologer_earnings add column if not exists conversation_id uuid references public.conversations(id) on delete set null;
create unique index if not exists uq_earnings_conversation on public.astrologer_earnings(conversation_id) where conversation_id is not null;

create or replace function public.settle_chat_billing(
  p_conversation_id uuid,
  p_user_id uuid,
  p_astrologer_id uuid,
  p_minutes integer,
  p_rate numeric,
  p_commission_percent numeric,
  p_seconds integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  w wallets%rowtype;
  ua user_accounts%rowtype;
  existing astrologer_earnings%rowtype;
  v_minutes integer := greatest(0, coalesce(p_minutes,0));
  v_rate numeric(12,2) := greatest(0, coalesce(p_rate,0));
  v_comm numeric(7,2) := least(100,greatest(0,coalesce(p_commission_percent,20)));
  v_free integer := 0;
  v_free_used integer := 0;
  v_paid_minutes integer := 0;
  v_paid_amount numeric(12,2) := 0;
  v_gross numeric(12,2) := 0;
  v_commission numeric(12,2) := 0;
  v_net numeric(12,2) := 0;
  v_payment_id uuid;
  v_earning_id uuid;
begin
  if p_conversation_id is null or p_user_id is null or p_astrologer_id is null then
    raise exception 'Invalid chat billing identifiers';
  end if;

  select * into existing from public.astrologer_earnings
    where conversation_id = p_conversation_id limit 1;
  if found then
    return jsonb_build_object('charged',true,'existing',true,'earning_id',existing.id,
      'net',coalesce(existing.net_amount,existing.amount,0),'wallet_amount',coalesce(existing.paid_amount,0),
      'paid_minutes',coalesce(existing.paid_minutes,0));
  end if;

  select * into ua from public.user_accounts where id=p_user_id for update;
  if not found then raise exception 'User account not found'; end if;
  select * into w from public.wallets where user_id=p_user_id for update;
  if not found then
    insert into public.wallets(user_id,balance) values(p_user_id,0) returning * into w;
  end if;

  v_free := greatest(0, coalesce(ua.free_chat_minutes,0));
  v_free_used := least(v_minutes,v_free);
  v_paid_minutes := greatest(0,v_minutes-v_free_used);
  v_paid_amount := round((v_rate*v_paid_minutes)::numeric,2);
  v_gross := v_paid_amount;
  v_commission := round((v_gross*v_comm/100)::numeric,2);
  v_net := greatest(0,round((v_gross-v_commission)::numeric,2));

  if coalesce(w.balance,0) < v_paid_amount then
    raise exception 'INSUFFICIENT_WALLET:%:%',v_paid_amount,coalesce(w.balance,0);
  end if;

  if v_free_used > 0 then
    update public.user_accounts
      set free_chat_minutes=greatest(0,coalesce(free_chat_minutes,0)-v_free_used),
          free_chat_minutes_used=coalesce(free_chat_minutes_used,0)+v_free_used,
          updated_at=now()
      where id=p_user_id;
    begin
      insert into public.chat_free_minute_transactions(user_id,minutes,type,source,conversation_id,description)
      values(p_user_id,v_free_used,'debit','chat',p_conversation_id,
             'Free chat minutes used');
    exception when undefined_table then null; end;
  end if;

  if v_paid_amount > 0 then
    update public.wallets set balance=round((coalesce(balance,0)-v_paid_amount)::numeric,2),updated_at=now() where id=w.id;
    insert into public.payments(user_id,astrologer_id,conversation_id,amount,currency,method,purpose,status,reference)
      values(p_user_id,p_astrologer_id,p_conversation_id,v_paid_amount,'INR','wallet','chat_minutes','approved','CHAT-'||p_conversation_id)
      returning id into v_payment_id;
    insert into public.wallet_transactions(user_id,amount,type,source,payment_id,description)
      values(p_user_id,v_paid_amount,'debit','chat',v_payment_id,
             'Astrologer chat '||v_paid_minutes||' paid minute(s) @ ₹'||v_rate||'/min');
  end if;

  insert into public.astrologer_earnings(astrologer_id,amount,gross_amount,commission_amount,net_amount,paid_amount,paid_minutes,category,conversation_id,earned_at)
    values(p_astrologer_id,v_net,v_gross,v_commission,v_net,v_paid_amount,v_paid_minutes,'chat',p_conversation_id,now())
    returning id into v_earning_id;

  update public.conversations set billed_seconds=greatest(0,coalesce(p_seconds,0)),billed_amount=v_paid_amount where id=p_conversation_id;

  return jsonb_build_object('charged',true,'existing',false,'earning_id',v_earning_id,
    'payment_id',v_payment_id,'minutes',v_minutes,'seconds',greatest(0,coalesce(p_seconds,0)),
    'rate',v_rate,'gross',v_gross,'commission',v_commission,'net',v_net,
    'free_minutes_used',v_free_used,'paid_minutes',v_paid_minutes,'wallet_amount',v_paid_amount);
exception when unique_violation then
  select * into existing from public.astrologer_earnings where conversation_id=p_conversation_id limit 1;
  if found then
    return jsonb_build_object('charged',true,'existing',true,'earning_id',existing.id,
      'net',coalesce(existing.net_amount,existing.amount,0),'wallet_amount',coalesce(existing.paid_amount,0),
      'paid_minutes',coalesce(existing.paid_minutes,0));
  end if;
  raise;
end;
$$;

grant execute on function public.settle_chat_billing(uuid,uuid,uuid,integer,numeric,numeric,integer) to service_role;

-- One-time reconciliation: if a prior chat payment was recorded but its earning row
-- is missing, create the missing net earning without charging the wallet again.
do $$
declare
  r record;
  pct numeric := 20;
  comm numeric;
  net numeric;
begin
  begin
    select coalesce((value->>'commission_percent')::numeric,20) into pct
    from public.platform_settings where key='payment_settings' limit 1;
  exception when others then pct := 20;
  end;
  for r in
    select p.conversation_id,p.astrologer_id,p.amount,p.created_at
    from public.payments p
    left join public.astrologer_earnings e on e.conversation_id=p.conversation_id
    where p.purpose='chat_minutes' and p.status='approved' and p.conversation_id is not null
      and p.astrologer_id is not null and e.id is null
  loop
    comm := round((r.amount*least(100,greatest(0,pct))/100)::numeric,2);
    net := greatest(0,round((r.amount-comm)::numeric,2));
    insert into public.astrologer_earnings(astrologer_id,amount,gross_amount,commission_amount,net_amount,paid_amount,paid_minutes,category,conversation_id,earned_at)
    values(r.astrologer_id,net,r.amount,comm,net,r.amount,0,'chat',r.conversation_id,r.created_at)
    on conflict (conversation_id) do nothing;
  end loop;
end $$;

-- FINAL EXACT-TIME CHAT BILLING OVERRIDE
create or replace function public.settle_chat_billing(
  p_conversation_id uuid,
  p_user_id uuid,
  p_astrologer_id uuid,
  p_minutes integer,
  p_rate numeric,
  p_commission_percent numeric,
  p_seconds integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  w wallets%rowtype;
  ua user_accounts%rowtype;
  existing astrologer_earnings%rowtype;
  v_seconds integer := greatest(0,coalesce(p_seconds,0));
  v_rate numeric(12,2) := greatest(0,coalesce(p_rate,0));
  v_comm numeric(7,2) := least(100,greatest(0,coalesce(p_commission_percent,20)));
  v_total_minutes numeric(12,4) := round((v_seconds::numeric/60),4);
  v_free numeric(12,4) := 0;
  v_free_used numeric(12,4) := 0;
  v_paid_minutes numeric(12,4) := 0;
  v_paid_amount numeric(12,2) := 0;
  v_gross numeric(12,2) := 0;
  v_commission numeric(12,2) := 0;
  v_net numeric(12,2) := 0;
  v_payment_id uuid;
  v_earning_id uuid;
begin
  if p_conversation_id is null or p_user_id is null or p_astrologer_id is null then
    raise exception 'Invalid chat billing identifiers';
  end if;
  select * into existing from public.astrologer_earnings where conversation_id=p_conversation_id limit 1;
  if found then
    return jsonb_build_object('charged',true,'existing',true,'earning_id',existing.id,
      'net',coalesce(existing.net_amount,existing.amount,0),'wallet_amount',coalesce(existing.paid_amount,0),
      'paid_minutes',coalesce(existing.paid_minutes,0));
  end if;
  if v_seconds<=0 or v_rate<=0 then
    return jsonb_build_object('charged',false,'reason','zero_duration','seconds',v_seconds,'minutes',v_total_minutes,'wallet_amount',0);
  end if;
  select * into ua from public.user_accounts where id=p_user_id for update;
  if not found then raise exception 'User account not found'; end if;
  select * into w from public.wallets where user_id=p_user_id for update;
  if not found then insert into public.wallets(user_id,balance) values(p_user_id,0) returning * into w; end if;

  -- Bill exactly the elapsed chat duration. Free minutes are consumed fractionally first;
  -- only the remaining seconds are charged to the wallet.
  v_free := greatest(0,coalesce(ua.free_chat_minutes,0));
  v_free_used := least(v_total_minutes,v_free);
  v_paid_minutes := greatest(0,v_total_minutes-v_free_used);
  v_paid_amount := round((v_rate*v_paid_minutes)::numeric,2);
  v_gross := v_paid_amount;
  v_commission := round((v_gross*v_comm/100)::numeric,2);
  v_net := greatest(0,round((v_gross-v_commission)::numeric,2));

  if coalesce(w.balance,0) < v_paid_amount then
    raise exception 'INSUFFICIENT_WALLET:%:%',v_paid_amount,coalesce(w.balance,0);
  end if;

  if v_free_used>0 then
    update public.user_accounts
      set free_chat_minutes=greatest(0,coalesce(free_chat_minutes,0)-v_free_used),
          free_chat_minutes_used=coalesce(free_chat_minutes_used,0)+v_free_used,
          updated_at=now()
      where id=p_user_id;
    begin
      insert into public.chat_free_minute_transactions(user_id,minutes,type,source,conversation_id,description)
      values(p_user_id,v_free_used,'debit','chat',p_conversation_id,
             'Free chat time used: '||round(v_free_used,2)||' minute(s)');
    exception when undefined_table or undefined_column or invalid_text_representation then null; end;
  end if;

  if v_paid_amount>0 then
    update public.wallets set balance=round((coalesce(balance,0)-v_paid_amount)::numeric,2),updated_at=now() where id=w.id;
    insert into public.payments(user_id,astrologer_id,conversation_id,amount,currency,method,purpose,status,reference)
      values(p_user_id,p_astrologer_id,p_conversation_id,v_paid_amount,'INR','wallet','chat_minutes','approved','CHAT-'||p_conversation_id)
      returning id into v_payment_id;
    insert into public.wallet_transactions(user_id,amount,type,source,payment_id,description)
      values(p_user_id,v_paid_amount,'debit','chat',v_payment_id,
             'Astrologer chat '||round(v_paid_minutes,2)||' minute(s) @ ₹'||v_rate||'/min');
  end if;

  insert into public.astrologer_earnings(astrologer_id,amount,gross_amount,commission_amount,net_amount,paid_amount,paid_minutes,category,conversation_id,earned_at)
    values(p_astrologer_id,v_net,v_gross,v_commission,v_net,v_paid_amount,v_paid_minutes,'chat',p_conversation_id,now())
    returning id into v_earning_id;

  update public.conversations set billed_seconds=v_seconds,billed_amount=v_paid_amount where id=p_conversation_id;
  return jsonb_build_object('charged',true,'existing',false,'earning_id',v_earning_id,
    'payment_id',v_payment_id,'minutes',v_total_minutes,'seconds',v_seconds,'rate',v_rate,
    'gross',v_gross,'commission',v_commission,'net',v_net,'free_minutes_used',v_free_used,
    'paid_minutes',v_paid_minutes,'wallet_amount',v_paid_amount);
exception when unique_violation then
  select * into existing from public.astrologer_earnings where conversation_id=p_conversation_id limit 1;
  if found then return jsonb_build_object('charged',true,'existing',true,'earning_id',existing.id,
    'net',coalesce(existing.net_amount,existing.amount,0),'wallet_amount',coalesce(existing.paid_amount,0),
    'paid_minutes',coalesce(existing.paid_minutes,0)); end if;
  raise;
end;
$$;

grant execute on function public.settle_chat_billing(uuid,uuid,uuid,integer,numeric,numeric,integer) to service_role;

-- =========================
-- 13) ASTROLOGER PAYMENT DETAILS + CLEAN WALLET LEDGER
-- =========================
alter table public.payouts add column if not exists payment_details jsonb not null default '{}'::jsonb;
create index if not exists idx_payouts_astro_period_status on public.payouts(astrologer_id, period_start desc, status);
create index if not exists idx_wallet_tx_user_created on public.wallet_transactions(user_id, created_at desc);
create index if not exists idx_wallet_tx_type_source_created on public.wallet_transactions(type, source, created_at desc);

-- ============================================================================
-- SOURCE: supabase/FINAL_CHAT_PAYMENT_FIX.sql
-- ============================================================================
-- BHAVISHYA GYANI - FINAL CHAT + PAYMENT FIX
-- Run this ONE file in Supabase SQL Editor after the existing project migrations.
-- Safe to run repeatedly. Does not delete users, chats, wallets or payments.

-- 1) Exact-time chat billing fields
alter table public.conversations add column if not exists chat_started_at timestamptz;
alter table public.conversations add column if not exists chat_budget_seconds integer not null default 0;
alter table public.conversations add column if not exists billed_seconds integer not null default 0;
alter table public.conversations add column if not exists billed_amount numeric(12,2) not null default 0;
alter table public.conversations add column if not exists astrologer_accepted_at timestamptz;
alter table public.conversations add column if not exists user_confirm_deadline timestamptz;
alter table public.conversations add column if not exists user_confirmed_at timestamptz;

-- 2) Fractional free-chat minutes so 30 seconds = 0.5 minute.
alter table public.user_accounts add column if not exists free_chat_minutes numeric(12,4) not null default 0;
alter table public.user_accounts add column if not exists free_chat_minutes_used numeric(12,4) not null default 0;
alter table public.user_accounts alter column free_chat_minutes type numeric(12,4) using free_chat_minutes::numeric;
alter table public.user_accounts alter column free_chat_minutes_used type numeric(12,4) using free_chat_minutes_used::numeric;

create table if not exists public.chat_free_minute_transactions(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.user_accounts(id) on delete cascade,
 minutes numeric(12,4) not null check(minutes > 0),
 type text not null check(type in ('credit','debit')),
 source text not null default 'admin',
 conversation_id uuid references public.conversations(id) on delete set null,
 description text not null default '',
 created_at timestamptz not null default now()
);
alter table public.chat_free_minute_transactions alter column minutes type numeric(12,4) using minutes::numeric;
create index if not exists idx_chat_free_tx_user on public.chat_free_minute_transactions(user_id,created_at desc);

-- 3) Allow Razorpay failures to be recorded instead of getting stuck at pending.
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check
  check(status in ('pending','approved','rejected','refunded','failed'));

-- 4) Required earning columns + one earning per chat.
alter table public.astrologer_earnings add column if not exists gross_amount numeric(12,2) not null default 0;
alter table public.astrologer_earnings add column if not exists commission_amount numeric(12,2) not null default 0;
alter table public.astrologer_earnings add column if not exists net_amount numeric(12,2) not null default 0;
alter table public.astrologer_earnings add column if not exists paid_amount numeric(12,2) not null default 0;
alter table public.astrologer_earnings add column if not exists paid_minutes numeric(12,4) not null default 0;
alter table public.astrologer_earnings add column if not exists conversation_id uuid references public.conversations(id) on delete set null;
create unique index if not exists uq_earnings_conversation_final on public.astrologer_earnings(conversation_id) where conversation_id is not null;

-- 5) Atomic exact chat billing.
create or replace function public.settle_chat_billing_exact(
  p_conversation_id uuid,
  p_user_id uuid,
  p_astrologer_id uuid,
  p_rate numeric,
  p_commission_percent numeric,
  p_seconds integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  w wallets%rowtype;
  ua user_accounts%rowtype;
  existing astrologer_earnings%rowtype;
  v_seconds integer := greatest(0,coalesce(p_seconds,0));
  v_total_minutes numeric(12,4) := round((v_seconds::numeric / 60),4);
  v_rate numeric(12,4) := greatest(0,coalesce(p_rate,0));
  v_comm numeric(7,2) := least(100,greatest(0,coalesce(p_commission_percent,20)));
  v_free numeric(12,4) := 0;
  v_free_used numeric(12,4) := 0;
  v_paid_minutes numeric(12,4) := 0;
  v_paid_amount numeric(12,2) := 0;
  v_gross numeric(12,2) := 0;
  v_commission numeric(12,2) := 0;
  v_net numeric(12,2) := 0;
  v_payment_id uuid;
  v_earning_id uuid;
begin
  if p_conversation_id is null or p_user_id is null or p_astrologer_id is null then
    raise exception 'Invalid chat billing identifiers';
  end if;

  select * into existing from public.astrologer_earnings
    where conversation_id=p_conversation_id limit 1;
  if found then
    return jsonb_build_object(
      'charged',true,'existing',true,'earning_id',existing.id,
      'net',coalesce(existing.net_amount,existing.amount,0),
      'wallet_amount',coalesce(existing.paid_amount,0),
      'paid_minutes',coalesce(existing.paid_minutes,0)
    );
  end if;

  if v_seconds <= 0 or v_rate <= 0 then
    return jsonb_build_object('charged',false,'reason','zero_duration',
      'seconds',v_seconds,'minutes',v_total_minutes,'wallet_amount',0);
  end if;

  select * into ua from public.user_accounts where id=p_user_id for update;
  if not found then raise exception 'User account not found'; end if;

  select * into w from public.wallets where user_id=p_user_id for update;
  if not found then
    insert into public.wallets(user_id,balance) values(p_user_id,0) returning * into w;
  end if;

  -- Free time is consumed first and fractionally.
  v_free := greatest(0,coalesce(ua.free_chat_minutes,0));
  v_free_used := least(v_total_minutes,v_free);
  v_paid_minutes := greatest(0,v_total_minutes-v_free_used);
  v_paid_amount := round((v_rate*v_paid_minutes)::numeric,2);
  v_gross := v_paid_amount;
  v_commission := round((v_gross*v_comm/100)::numeric,2);
  v_net := greatest(0,round((v_gross-v_commission)::numeric,2));

  if coalesce(w.balance,0) < v_paid_amount then
    raise exception 'INSUFFICIENT_WALLET:%:%',v_paid_amount,coalesce(w.balance,0);
  end if;

  if v_free_used > 0 then
    update public.user_accounts
      set free_chat_minutes=greatest(0,coalesce(free_chat_minutes,0)-v_free_used),
          free_chat_minutes_used=coalesce(free_chat_minutes_used,0)+v_free_used,
          updated_at=now()
      where id=p_user_id;

    insert into public.chat_free_minute_transactions(
      user_id,minutes,type,source,conversation_id,description
    ) values(
      p_user_id,v_free_used,'debit','chat',p_conversation_id,
      'Free chat time used: '||round(v_free_used,4)||' minute(s)'
    );
  end if;

  if v_paid_amount > 0 then
    update public.wallets
      set balance=round((coalesce(balance,0)-v_paid_amount)::numeric,2),updated_at=now()
      where id=w.id;

    insert into public.payments(
      user_id,astrologer_id,conversation_id,amount,currency,method,purpose,status,reference
    ) values(
      p_user_id,p_astrologer_id,p_conversation_id,v_paid_amount,'INR','wallet',
      'chat_minutes','approved','CHAT-'||p_conversation_id
    ) returning id into v_payment_id;

    insert into public.wallet_transactions(
      user_id,amount,type,source,payment_id,description
    ) values(
      p_user_id,v_paid_amount,'debit','chat',v_payment_id,
      'Astrologer chat '||round(v_paid_minutes,4)||' minute(s) @ ₹'||v_rate||'/min'
    );
  end if;

  insert into public.astrologer_earnings(
    astrologer_id,amount,gross_amount,commission_amount,net_amount,
    paid_amount,paid_minutes,category,conversation_id,earned_at
  ) values(
    p_astrologer_id,v_net,v_gross,v_commission,v_net,
    v_paid_amount,v_paid_minutes,'chat',p_conversation_id,now()
  ) returning id into v_earning_id;

  update public.conversations
    set billed_seconds=v_seconds,billed_amount=v_paid_amount
    where id=p_conversation_id;

  return jsonb_build_object(
    'charged',true,'existing',false,'earning_id',v_earning_id,
    'payment_id',v_payment_id,'minutes',v_total_minutes,'seconds',v_seconds,
    'rate',v_rate,'gross',v_gross,'commission',v_commission,'net',v_net,
    'free_minutes_used',v_free_used,'paid_minutes',v_paid_minutes,
    'wallet_amount',v_paid_amount
  );
exception when unique_violation then
  select * into existing from public.astrologer_earnings
    where conversation_id=p_conversation_id limit 1;
  if found then
    return jsonb_build_object(
      'charged',true,'existing',true,'earning_id',existing.id,
      'net',coalesce(existing.net_amount,existing.amount,0),
      'wallet_amount',coalesce(existing.paid_amount,0),
      'paid_minutes',coalesce(existing.paid_minutes,0)
    );
  end if;
  raise;
end;
$$;
grant execute on function public.settle_chat_billing_exact(uuid,uuid,uuid,numeric,numeric,integer) to service_role;

-- 6) Atomic Razorpay wallet credit + recharge bonus.
create or replace function public.settle_wallet_topup(
  p_payment_id uuid,
  p_user_id uuid,
  p_base_amount numeric,
  p_description text default 'Wallet top-up via Razorpay'
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pay payments%rowtype;
  w wallets%rowtype;
  setting jsonb;
  v_pct numeric(7,2) := 0;
  v_bonus numeric(12,2) := 0;
  v_base numeric(12,2) := round(greatest(0,coalesce(p_base_amount,0))::numeric,2);
  v_total numeric(12,2);
  existing_id uuid;
begin
  select * into pay from public.payments where id=p_payment_id and user_id=p_user_id for update;
  if not found then raise exception 'Payment record not found'; end if;
  if pay.status <> 'approved' then raise exception 'Payment is not approved'; end if;
  if v_base <= 0 then raise exception 'Invalid wallet top-up amount'; end if;

  select id into existing_id from public.wallet_transactions
    where payment_id=p_payment_id and source='razorpay' limit 1;
  if found then
    select coalesce(sum(case when type='credit' and payment_id=p_payment_id then amount else 0 end),0)
      into v_total from public.wallet_transactions;
    return jsonb_build_object('already_processed',true,'base_amount',v_base,
      'bonus_amount',greatest(0,v_total-v_base),'total_amount',v_total);
  end if;

  begin
    select value into setting from public.platform_settings where key='recharge_offer_settings' limit 1;
    if setting is not null then
      v_pct := least(100,greatest(0,coalesce((setting->>'percent')::numeric,0)));
      if coalesce((setting->>'active')::boolean,true)=false then v_pct:=0; end if;
      if setting ? 'start_at' and nullif(setting->>'start_at','') is not null and (setting->>'start_at')::timestamptz > now() then v_pct:=0; end if;
      if setting ? 'end_at' and nullif(setting->>'end_at','') is not null and (setting->>'end_at')::timestamptz < now() then v_pct:=0; end if;
    end if;
  exception when others then v_pct:=0;
  end;

  v_bonus := round((v_base*v_pct/100)::numeric,2);
  v_total := v_base+v_bonus;

  select * into w from public.wallets where user_id=p_user_id for update;
  if not found then
    insert into public.wallets(user_id,balance) values(p_user_id,0) returning * into w;
  end if;

  update public.wallets
    set balance=round((coalesce(balance,0)+v_total)::numeric,2),updated_at=now()
    where id=w.id;

  insert into public.wallet_transactions(
    user_id,amount,type,source,payment_id,description
  ) values(
    p_user_id,v_base,'credit','razorpay',p_payment_id,
    coalesce(p_description,'Wallet top-up via Razorpay')
  );

  if v_bonus>0 then
    insert into public.wallet_transactions(
      user_id,amount,type,source,payment_id,description
    ) values(
      p_user_id,v_bonus,'credit','recharge_offer',p_payment_id,
      'Recharge offer bonus '||v_pct||'%'
    );
  end if;

  return jsonb_build_object('already_processed',false,'base_amount',v_base,
    'bonus_amount',v_bonus,'total_amount',v_total);
end;
$$;
grant execute on function public.settle_wallet_topup(uuid,uuid,numeric,text) to service_role;

-- 7) Helpful indexes for polling and settlement.
create index if not exists idx_conversations_astro_status_created
  on public.conversations(astrologer_id,status,created_at desc);
create index if not exists idx_conversations_user_status_created
  on public.conversations(user_id,status,created_at desc);
create index if not exists idx_wallet_tx_payment
  on public.wallet_transactions(payment_id);

-- Done.

-- 7) LIVE free-chat timer consumption.
-- Free minutes are deducted while the chat is actually running, so the timer
-- cannot reset to the original free-minute amount on every refresh/reopen.
alter table public.conversations add column if not exists free_minutes_snapshot numeric(12,4) not null default 0;
alter table public.conversations add column if not exists free_minutes_consumed_live numeric(12,4) not null default 0;

create or replace function public.consume_chat_free_time_live(
  p_conversation_id uuid,
  p_user_id uuid,
  p_minutes numeric
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c conversations%rowtype;
  ua user_accounts%rowtype;
  v_target numeric(12,4) := greatest(0,coalesce(p_minutes,0));
  v_prev numeric(12,4) := 0;
  v_delta numeric(12,4) := 0;
  v_available numeric(12,4) := 0;
  v_used numeric(12,4) := 0;
begin
  select * into c from public.conversations where id=p_conversation_id for update;
  if not found then raise exception 'Conversation not found'; end if;
  if c.user_id <> p_user_id then raise exception 'User does not own this conversation'; end if;
  if c.status <> 'accepted' or c.chat_started_at is null then
    return jsonb_build_object('used_total',coalesce(c.free_minutes_consumed_live,0),'used_delta',0,'remaining_free',0);
  end if;

  v_prev := greatest(0,coalesce(c.free_minutes_consumed_live,0));
  v_target := least(greatest(0,coalesce(c.free_minutes_snapshot,0)),v_target);
  v_delta := greatest(0,round((v_target-v_prev)::numeric,4));
  if v_delta <= 0 then
    select greatest(0,coalesce(free_chat_minutes,0)) into v_available from public.user_accounts where id=p_user_id;
    return jsonb_build_object('used_total',v_prev,'used_delta',0,'remaining_free',v_available);
  end if;

  select * into ua from public.user_accounts where id=p_user_id for update;
  if not found then raise exception 'User account not found'; end if;
  v_available := greatest(0,coalesce(ua.free_chat_minutes,0));
  v_delta := least(v_delta,v_available);
  if v_delta > 0 then
    update public.user_accounts
      set free_chat_minutes=greatest(0,coalesce(free_chat_minutes,0)-v_delta),
          free_chat_minutes_used=coalesce(free_chat_minutes_used,0)+v_delta,
          updated_at=now()
      where id=p_user_id;
    insert into public.chat_free_minute_transactions(user_id,minutes,type,source,conversation_id,description)
      values(p_user_id,v_delta,'debit','chat',p_conversation_id,
             'Live free chat time used: '||round(v_delta,4)||' minute(s)');
  end if;
  v_used := v_prev+v_delta;
  update public.conversations set free_minutes_consumed_live=v_used where id=p_conversation_id;
  return jsonb_build_object('used_total',v_used,'used_delta',v_delta,
    'remaining_free',greatest(0,v_available-v_delta));
end;
$$;
grant execute on function public.consume_chat_free_time_live(uuid,uuid,numeric) to service_role;

-- Update exact settlement so free time already deducted live is not deducted twice.
create or replace function public.settle_chat_billing_exact(
  p_conversation_id uuid,
  p_user_id uuid,
  p_astrologer_id uuid,
  p_rate numeric,
  p_commission_percent numeric,
  p_seconds integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  w wallets%rowtype;
  ua user_accounts%rowtype;
  c conversations%rowtype;
  existing astrologer_earnings%rowtype;
  v_seconds integer := greatest(0,coalesce(p_seconds,0));
  v_total_minutes numeric(12,4) := round((v_seconds::numeric / 60),4);
  v_rate numeric(12,4) := greatest(0,coalesce(p_rate,0));
  v_comm numeric(7,2) := least(100,greatest(0,coalesce(p_commission_percent,20)));
  v_free numeric(12,4) := 0;
  v_free_used numeric(12,4) := 0;
  v_paid_minutes numeric(12,4) := 0;
  v_paid_amount numeric(12,2) := 0;
  v_gross numeric(12,2) := 0;
  v_commission numeric(12,2) := 0;
  v_net numeric(12,2) := 0;
  v_payment_id uuid;
  v_earning_id uuid;
begin
  select * into existing from public.astrologer_earnings where conversation_id=p_conversation_id limit 1;
  if found then
    return jsonb_build_object('charged',true,'existing',true,'earning_id',existing.id,
      'net',coalesce(existing.net_amount,existing.amount,0),'wallet_amount',coalesce(existing.paid_amount,0),
      'paid_minutes',coalesce(existing.paid_minutes,0));
  end if;
  if v_seconds<=0 or v_rate<=0 then return jsonb_build_object('charged',false,'reason','zero_duration','seconds',v_seconds,'minutes',v_total_minutes,'wallet_amount',0); end if;
  select * into c from public.conversations where id=p_conversation_id for update;
  if not found or c.user_id<>p_user_id then raise exception 'Conversation not found'; end if;
  select * into ua from public.user_accounts where id=p_user_id for update;
  if not found then raise exception 'User account not found'; end if;
  select * into w from public.wallets where user_id=p_user_id for update;
  if not found then insert into public.wallets(user_id,balance) values(p_user_id,0) returning * into w; end if;

  -- If the live timer already consumed free time, use that exact amount.
  -- Legacy chats without the live fields continue to use current free balance.
  if coalesce(c.free_minutes_snapshot,0)>0 or coalesce(c.free_minutes_consumed_live,0)>0 then
    v_free_used := least(v_total_minutes,coalesce(c.free_minutes_consumed_live,0));
  else
    v_free := greatest(0,coalesce(ua.free_chat_minutes,0));
    v_free_used := least(v_total_minutes,v_free);
  end if;
  v_paid_minutes := greatest(0,v_total_minutes-v_free_used);
  v_paid_amount := round((v_rate*v_paid_minutes)::numeric,2);
  v_gross := v_paid_amount;
  v_commission := round((v_gross*v_comm/100)::numeric,2);
  v_net := greatest(0,round((v_gross-v_commission)::numeric,2));
  if coalesce(w.balance,0)<v_paid_amount then raise exception 'INSUFFICIENT_WALLET:%:%',v_paid_amount,coalesce(w.balance,0); end if;

  -- For legacy chats only, deduct free minutes here. Live-consumed chats already did it.
  if coalesce(c.free_minutes_consumed_live,0)<=0 and v_free_used>0 then
    update public.user_accounts set free_chat_minutes=greatest(0,coalesce(free_chat_minutes,0)-v_free_used),
      free_chat_minutes_used=coalesce(free_chat_minutes_used,0)+v_free_used,updated_at=now() where id=p_user_id;
    insert into public.chat_free_minute_transactions(user_id,minutes,type,source,conversation_id,description)
      values(p_user_id,v_free_used,'debit','chat',p_conversation_id,'Free chat time used: '||round(v_free_used,4)||' minute(s)');
  end if;
  if v_paid_amount>0 then
    update public.wallets set balance=round((coalesce(balance,0)-v_paid_amount)::numeric,2),updated_at=now() where id=w.id;
    insert into public.payments(user_id,astrologer_id,conversation_id,amount,currency,method,purpose,status,reference)
      values(p_user_id,p_astrologer_id,p_conversation_id,v_paid_amount,'INR','wallet','chat_minutes','approved','CHAT-'||p_conversation_id) returning id into v_payment_id;
    insert into public.wallet_transactions(user_id,amount,type,source,payment_id,description)
      values(p_user_id,v_paid_amount,'debit','chat',v_payment_id,'Astrologer chat '||round(v_paid_minutes,4)||' minute(s) @ ₹'||v_rate||'/min');
  end if;
  insert into public.astrologer_earnings(astrologer_id,amount,gross_amount,commission_amount,net_amount,paid_amount,paid_minutes,category,conversation_id,earned_at)
    values(p_astrologer_id,v_net,v_gross,v_commission,v_net,v_paid_amount,v_paid_minutes,'chat',p_conversation_id,now()) returning id into v_earning_id;
  update public.conversations set billed_seconds=v_seconds,billed_amount=v_paid_amount where id=p_conversation_id;
  return jsonb_build_object('charged',true,'existing',false,'earning_id',v_earning_id,'payment_id',v_payment_id,
    'minutes',v_total_minutes,'seconds',v_seconds,'rate',v_rate,'gross',v_gross,'commission',v_commission,
    'net',v_net,'free_minutes_used',v_free_used,'paid_minutes',v_paid_minutes,'wallet_amount',v_paid_amount);
exception when unique_violation then
  select * into existing from public.astrologer_earnings where conversation_id=p_conversation_id limit 1;
  if found then return jsonb_build_object('charged',true,'existing',true,'earning_id',existing.id,'net',coalesce(existing.net_amount,existing.amount,0),'wallet_amount',coalesce(existing.paid_amount,0),'paid_minutes',coalesce(existing.paid_minutes,0)); end if;
  raise;
end;
$$;
grant execute on function public.settle_chat_billing_exact(uuid,uuid,uuid,numeric,numeric,integer) to service_role;


-- v2: supports live free-minute consumption already deducted during an active chat.
create or replace function public.settle_chat_billing_exact_v2(
  p_conversation_id uuid,
  p_user_id uuid,
  p_astrologer_id uuid,
  p_rate numeric,
  p_commission_percent numeric,
  p_seconds integer,
  p_free_already_used numeric default 0
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  w wallets%rowtype;
  ua user_accounts%rowtype;
  existing astrologer_earnings%rowtype;
  v_seconds integer := greatest(0,coalesce(p_seconds,0));
  v_total_minutes numeric(12,4) := round((v_seconds::numeric / 60),4);
  v_rate numeric(12,4) := greatest(0,coalesce(p_rate,0));
  v_comm numeric(7,2) := least(100,greatest(0,coalesce(p_commission_percent,20)));
  v_free numeric(12,4) := 0;
  v_already_free numeric(12,4) := 0;
  v_additional_free numeric(12,4) := 0;
  v_free_used numeric(12,4) := 0;
  v_paid_minutes numeric(12,4) := 0;
  v_paid_amount numeric(12,2) := 0;
  v_gross numeric(12,2) := 0;
  v_commission numeric(12,2) := 0;
  v_net numeric(12,2) := 0;
  v_payment_id uuid;
  v_earning_id uuid;
begin
  if p_conversation_id is null or p_user_id is null or p_astrologer_id is null then
    raise exception 'Invalid chat billing identifiers';
  end if;

  select * into existing from public.astrologer_earnings
    where conversation_id=p_conversation_id limit 1;
  if found then
    return jsonb_build_object(
      'charged',true,'existing',true,'earning_id',existing.id,
      'net',coalesce(existing.net_amount,existing.amount,0),
      'wallet_amount',coalesce(existing.paid_amount,0),
      'paid_minutes',coalesce(existing.paid_minutes,0)
    );
  end if;

  if v_seconds <= 0 or v_rate <= 0 then
    return jsonb_build_object('charged',false,'reason','zero_duration',
      'seconds',v_seconds,'minutes',v_total_minutes,'wallet_amount',0);
  end if;

  select * into ua from public.user_accounts where id=p_user_id for update;
  if not found then raise exception 'User account not found'; end if;

  select * into w from public.wallets where user_id=p_user_id for update;
  if not found then
    insert into public.wallets(user_id,balance) values(p_user_id,0) returning * into w;
  end if;

  -- Free time is consumed first and fractionally.
  v_free := greatest(0,coalesce(ua.free_chat_minutes,0));
  v_already_free := least(v_total_minutes,greatest(0,coalesce(p_free_already_used,0)));
  v_additional_free := least(greatest(0,v_total_minutes-v_already_free),v_free);
  v_free_used := v_already_free + v_additional_free;
  v_paid_minutes := greatest(0,v_total_minutes-v_free_used);
  v_paid_amount := round((v_rate*v_paid_minutes)::numeric,2);
  v_gross := v_paid_amount;
  v_commission := round((v_gross*v_comm/100)::numeric,2);
  v_net := greatest(0,round((v_gross-v_commission)::numeric,2));

  if coalesce(w.balance,0) < v_paid_amount then
    raise exception 'INSUFFICIENT_WALLET:%:%',v_paid_amount,coalesce(w.balance,0);
  end if;

  if v_free_used > 0 then
    update public.user_accounts
      set free_chat_minutes=greatest(0,coalesce(free_chat_minutes,0)-v_additional_free),
          free_chat_minutes_used=coalesce(free_chat_minutes_used,0)+v_additional_free,
          updated_at=now()
      where id=p_user_id;

    insert into public.chat_free_minute_transactions(
      user_id,minutes,type,source,conversation_id,description
    ) values(
      p_user_id,v_additional_free,'debit','chat',p_conversation_id,
      'Free chat time used: '||round(v_additional_free,4)||' minute(s)'
    );
  end if;

  if v_paid_amount > 0 then
    update public.wallets
      set balance=round((coalesce(balance,0)-v_paid_amount)::numeric,2),updated_at=now()
      where id=w.id;

    insert into public.payments(
      user_id,astrologer_id,conversation_id,amount,currency,method,purpose,status,reference
    ) values(
      p_user_id,p_astrologer_id,p_conversation_id,v_paid_amount,'INR','wallet',
      'chat_minutes','approved','CHAT-'||p_conversation_id
    ) returning id into v_payment_id;

    insert into public.wallet_transactions(
      user_id,amount,type,source,payment_id,description
    ) values(
      p_user_id,v_paid_amount,'debit','chat',v_payment_id,
      'Astrologer chat '||round(v_paid_minutes,4)||' minute(s) @ ₹'||v_rate||'/min'
    );
  end if;

  insert into public.astrologer_earnings(
    astrologer_id,amount,gross_amount,commission_amount,net_amount,
    paid_amount,paid_minutes,category,conversation_id,earned_at
  ) values(
    p_astrologer_id,v_net,v_gross,v_commission,v_net,
    v_paid_amount,v_paid_minutes,'chat',p_conversation_id,now()
  ) returning id into v_earning_id;

  update public.conversations
    set billed_seconds=v_seconds,billed_amount=v_paid_amount
    where id=p_conversation_id;

  return jsonb_build_object(
    'charged',true,'existing',false,'earning_id',v_earning_id,
    'payment_id',v_payment_id,'minutes',v_total_minutes,'seconds',v_seconds,
    'rate',v_rate,'gross',v_gross,'commission',v_commission,'net',v_net,
    'free_minutes_used',v_free_used,'paid_minutes',v_paid_minutes,
    'wallet_amount',v_paid_amount
  );
exception when unique_violation then
  select * into existing from public.astrologer_earnings
    where conversation_id=p_conversation_id limit 1;
  if found then
    return jsonb_build_object(
      'charged',true,'existing',true,'earning_id',existing.id,
      'net',coalesce(existing.net_amount,existing.amount,0),
      'wallet_amount',coalesce(existing.paid_amount,0),
      'paid_minutes',coalesce(existing.paid_minutes,0)
    );
  end if;
  raise;
end;
$$;
grant execute on function public.settle_chat_billing_exact_v2(uuid,uuid,uuid,numeric,numeric,integer,numeric) to service_role;

-- ============================================================================
-- SOURCE: supabase/CHAT_FINAL_FIX.sql
-- ============================================================================
-- Bhavishya Gyani chat final fix
-- Safe to run after the main wallet/payment migration.
alter table public.astrologer_earnings add column if not exists paid_amount numeric(12,2) not null default 0;
alter table public.astrologer_earnings add column if not exists paid_minutes numeric(12,2) not null default 0;
alter table public.user_accounts alter column free_chat_minutes type numeric(12,4) using free_chat_minutes::numeric;
alter table public.user_accounts alter column free_chat_minutes_used type numeric(12,4) using free_chat_minutes_used::numeric;
alter table public.conversations add column if not exists chat_started_at timestamptz;
alter table public.conversations add column if not exists chat_budget_seconds integer not null default 0;
alter table public.conversations add column if not exists billed_seconds integer not null default 0;
alter table public.conversations add column if not exists billed_amount numeric(12,2) not null default 0;
create unique index if not exists uq_earnings_conversation on public.astrologer_earnings(conversation_id) where conversation_id is not null;
create index if not exists idx_earnings_astro_day on public.astrologer_earnings(astrologer_id,earned_at desc);

-- Bhavishya Gyani: atomic chat settlement + user confirmation fields
-- Safe to run repeatedly.
alter table public.conversations add column if not exists chat_started_at timestamptz;
alter table public.conversations add column if not exists chat_budget_seconds integer not null default 0;
alter table public.conversations add column if not exists billed_seconds integer not null default 0;
alter table public.conversations add column if not exists billed_amount numeric(12,2) not null default 0;
alter table public.astrologer_earnings add column if not exists gross_amount numeric(12,2) not null default 0;
alter table public.astrologer_earnings add column if not exists commission_amount numeric(12,2) not null default 0;
alter table public.astrologer_earnings add column if not exists net_amount numeric(12,2) not null default 0;
alter table public.astrologer_earnings add column if not exists paid_amount numeric(12,2) not null default 0;
alter table public.astrologer_earnings add column if not exists paid_minutes numeric(12,2) not null default 0;
alter table public.user_accounts alter column free_chat_minutes type numeric(12,4) using free_chat_minutes::numeric;
alter table public.user_accounts alter column free_chat_minutes_used type numeric(12,4) using free_chat_minutes_used::numeric;
alter table public.astrologer_earnings add column if not exists conversation_id uuid references public.conversations(id) on delete set null;
create unique index if not exists uq_earnings_conversation on public.astrologer_earnings(conversation_id) where conversation_id is not null;

create or replace function public.settle_chat_billing(
  p_conversation_id uuid,
  p_user_id uuid,
  p_astrologer_id uuid,
  p_minutes integer,
  p_rate numeric,
  p_commission_percent numeric,
  p_seconds integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  w wallets%rowtype;
  ua user_accounts%rowtype;
  existing astrologer_earnings%rowtype;
  v_seconds integer := greatest(0,coalesce(p_seconds,0));
  v_rate numeric(12,2) := greatest(0,coalesce(p_rate,0));
  v_comm numeric(7,2) := least(100,greatest(0,coalesce(p_commission_percent,20)));
  v_total_minutes numeric(12,4) := round((v_seconds::numeric/60),4);
  v_free numeric(12,4) := 0;
  v_free_used numeric(12,4) := 0;
  v_paid_minutes numeric(12,4) := 0;
  v_paid_amount numeric(12,2) := 0;
  v_gross numeric(12,2) := 0;
  v_commission numeric(12,2) := 0;
  v_net numeric(12,2) := 0;
  v_payment_id uuid;
  v_earning_id uuid;
begin
  if p_conversation_id is null or p_user_id is null or p_astrologer_id is null then
    raise exception 'Invalid chat billing identifiers';
  end if;
  select * into existing from public.astrologer_earnings where conversation_id=p_conversation_id limit 1;
  if found then
    return jsonb_build_object('charged',true,'existing',true,'earning_id',existing.id,
      'net',coalesce(existing.net_amount,existing.amount,0),'wallet_amount',coalesce(existing.paid_amount,0),
      'paid_minutes',coalesce(existing.paid_minutes,0));
  end if;
  if v_seconds<=0 or v_rate<=0 then
    return jsonb_build_object('charged',false,'reason','zero_duration','seconds',v_seconds,'minutes',v_total_minutes,'wallet_amount',0);
  end if;
  select * into ua from public.user_accounts where id=p_user_id for update;
  if not found then raise exception 'User account not found'; end if;
  select * into w from public.wallets where user_id=p_user_id for update;
  if not found then insert into public.wallets(user_id,balance) values(p_user_id,0) returning * into w; end if;

  -- Bill exactly the elapsed chat duration. Free minutes are consumed fractionally first;
  -- only the remaining seconds are charged to the wallet.
  v_free := greatest(0,coalesce(ua.free_chat_minutes,0));
  v_free_used := least(v_total_minutes,v_free);
  v_paid_minutes := greatest(0,v_total_minutes-v_free_used);
  v_paid_amount := round((v_rate*v_paid_minutes)::numeric,2);
  v_gross := v_paid_amount;
  v_commission := round((v_gross*v_comm/100)::numeric,2);
  v_net := greatest(0,round((v_gross-v_commission)::numeric,2));

  if coalesce(w.balance,0) < v_paid_amount then
    raise exception 'INSUFFICIENT_WALLET:%:%',v_paid_amount,coalesce(w.balance,0);
  end if;

  if v_free_used>0 then
    update public.user_accounts
      set free_chat_minutes=greatest(0,coalesce(free_chat_minutes,0)-v_free_used),
          free_chat_minutes_used=coalesce(free_chat_minutes_used,0)+v_free_used,
          updated_at=now()
      where id=p_user_id;
    begin
      insert into public.chat_free_minute_transactions(user_id,minutes,type,source,conversation_id,description)
      values(p_user_id,v_free_used,'debit','chat',p_conversation_id,
             'Free chat time used: '||round(v_free_used,2)||' minute(s)');
    exception when undefined_table or undefined_column or invalid_text_representation then null; end;
  end if;

  if v_paid_amount>0 then
    update public.wallets set balance=round((coalesce(balance,0)-v_paid_amount)::numeric,2),updated_at=now() where id=w.id;
    insert into public.payments(user_id,astrologer_id,conversation_id,amount,currency,method,purpose,status,reference)
      values(p_user_id,p_astrologer_id,p_conversation_id,v_paid_amount,'INR','wallet','chat_minutes','approved','CHAT-'||p_conversation_id)
      returning id into v_payment_id;
    insert into public.wallet_transactions(user_id,amount,type,source,payment_id,description)
      values(p_user_id,v_paid_amount,'debit','chat',v_payment_id,
             'Astrologer chat '||round(v_paid_minutes,2)||' minute(s) @ ₹'||v_rate||'/min');
  end if;

  insert into public.astrologer_earnings(astrologer_id,amount,gross_amount,commission_amount,net_amount,paid_amount,paid_minutes,category,conversation_id,earned_at)
    values(p_astrologer_id,v_net,v_gross,v_commission,v_net,v_paid_amount,v_paid_minutes,'chat',p_conversation_id,now())
    returning id into v_earning_id;

  update public.conversations set billed_seconds=v_seconds,billed_amount=v_paid_amount where id=p_conversation_id;
  return jsonb_build_object('charged',true,'existing',false,'earning_id',v_earning_id,
    'payment_id',v_payment_id,'minutes',v_total_minutes,'seconds',v_seconds,'rate',v_rate,
    'gross',v_gross,'commission',v_commission,'net',v_net,'free_minutes_used',v_free_used,
    'paid_minutes',v_paid_minutes,'wallet_amount',v_paid_amount);
exception when unique_violation then
  select * into existing from public.astrologer_earnings where conversation_id=p_conversation_id limit 1;
  if found then return jsonb_build_object('charged',true,'existing',true,'earning_id',existing.id,
    'net',coalesce(existing.net_amount,existing.amount,0),'wallet_amount',coalesce(existing.paid_amount,0),
    'paid_minutes',coalesce(existing.paid_minutes,0)); end if;
  raise;
end;
$$;

grant execute on function public.settle_chat_billing(uuid,uuid,uuid,integer,numeric,numeric,integer) to service_role;

-- One-time reconciliation: if a prior chat payment was recorded but its earning row
-- is missing, create the missing net earning without charging the wallet again.
do $$
declare
  r record;
  pct numeric := 20;
  comm numeric;
  net numeric;
begin
  begin
    select coalesce((value->>'commission_percent')::numeric,20) into pct
    from public.platform_settings where key='payment_settings' limit 1;
  exception when others then pct := 20;
  end;
  for r in
    select p.conversation_id,p.astrologer_id,p.amount,p.created_at
    from public.payments p
    left join public.astrologer_earnings e on e.conversation_id=p.conversation_id
    where p.purpose='chat_minutes' and p.status='approved' and p.conversation_id is not null
      and p.astrologer_id is not null and e.id is null
  loop
    comm := round((r.amount*least(100,greatest(0,pct))/100)::numeric,2);
    net := greatest(0,round((r.amount-comm)::numeric,2));
    insert into public.astrologer_earnings(astrologer_id,amount,gross_amount,commission_amount,net_amount,paid_amount,paid_minutes,category,conversation_id,earned_at)
    values(r.astrologer_id,net,r.amount,comm,net,r.amount,0,'chat',r.conversation_id,r.created_at)
    on conflict (conversation_id) do nothing;
  end loop;
end $$;

-- ============================================================================
-- SOURCE: supabase/CHAT_LIVE_FREE_BILLING_FIX.sql
-- ============================================================================
-- v2: supports live free-minute consumption already deducted during an active chat.
create or replace function public.settle_chat_billing_exact_v2(
  p_conversation_id uuid,
  p_user_id uuid,
  p_astrologer_id uuid,
  p_rate numeric,
  p_commission_percent numeric,
  p_seconds integer,
  p_free_already_used numeric default 0
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  w wallets%rowtype;
  ua user_accounts%rowtype;
  existing astrologer_earnings%rowtype;
  v_seconds integer := greatest(0,coalesce(p_seconds,0));
  v_total_minutes numeric(12,4) := round((v_seconds::numeric / 60),4);
  v_rate numeric(12,4) := greatest(0,coalesce(p_rate,0));
  v_comm numeric(7,2) := least(100,greatest(0,coalesce(p_commission_percent,20)));
  v_free numeric(12,4) := 0;
  v_already_free numeric(12,4) := 0;
  v_additional_free numeric(12,4) := 0;
  v_free_used numeric(12,4) := 0;
  v_paid_minutes numeric(12,4) := 0;
  v_paid_amount numeric(12,2) := 0;
  v_gross numeric(12,2) := 0;
  v_commission numeric(12,2) := 0;
  v_net numeric(12,2) := 0;
  v_payment_id uuid;
  v_earning_id uuid;
begin
  if p_conversation_id is null or p_user_id is null or p_astrologer_id is null then
    raise exception 'Invalid chat billing identifiers';
  end if;

  select * into existing from public.astrologer_earnings
    where conversation_id=p_conversation_id limit 1;
  if found then
    return jsonb_build_object(
      'charged',true,'existing',true,'earning_id',existing.id,
      'net',coalesce(existing.net_amount,existing.amount,0),
      'wallet_amount',coalesce(existing.paid_amount,0),
      'paid_minutes',coalesce(existing.paid_minutes,0)
    );
  end if;

  if v_seconds <= 0 or v_rate <= 0 then
    return jsonb_build_object('charged',false,'reason','zero_duration',
      'seconds',v_seconds,'minutes',v_total_minutes,'wallet_amount',0);
  end if;

  select * into ua from public.user_accounts where id=p_user_id for update;
  if not found then raise exception 'User account not found'; end if;

  select * into w from public.wallets where user_id=p_user_id for update;
  if not found then
    insert into public.wallets(user_id,balance) values(p_user_id,0) returning * into w;
  end if;

  -- Free time is consumed first and fractionally.
  v_free := greatest(0,coalesce(ua.free_chat_minutes,0));
  v_already_free := least(v_total_minutes,greatest(0,coalesce(p_free_already_used,0)));
  v_additional_free := least(greatest(0,v_total_minutes-v_already_free),v_free);
  v_free_used := v_already_free + v_additional_free;
  v_paid_minutes := greatest(0,v_total_minutes-v_free_used);
  v_paid_amount := round((v_rate*v_paid_minutes)::numeric,2);
  v_gross := v_paid_amount;
  v_commission := round((v_gross*v_comm/100)::numeric,2);
  v_net := greatest(0,round((v_gross-v_commission)::numeric,2));

  if coalesce(w.balance,0) < v_paid_amount then
    raise exception 'INSUFFICIENT_WALLET:%:%',v_paid_amount,coalesce(w.balance,0);
  end if;

  if v_free_used > 0 then
    update public.user_accounts
      set free_chat_minutes=greatest(0,coalesce(free_chat_minutes,0)-v_additional_free),
          free_chat_minutes_used=coalesce(free_chat_minutes_used,0)+v_additional_free,
          updated_at=now()
      where id=p_user_id;

    insert into public.chat_free_minute_transactions(
      user_id,minutes,type,source,conversation_id,description
    ) values(
      p_user_id,v_additional_free,'debit','chat',p_conversation_id,
      'Free chat time used: '||round(v_additional_free,4)||' minute(s)'
    );
  end if;

  if v_paid_amount > 0 then
    update public.wallets
      set balance=round((coalesce(balance,0)-v_paid_amount)::numeric,2),updated_at=now()
      where id=w.id;

    insert into public.payments(
      user_id,astrologer_id,conversation_id,amount,currency,method,purpose,status,reference
    ) values(
      p_user_id,p_astrologer_id,p_conversation_id,v_paid_amount,'INR','wallet',
      'chat_minutes','approved','CHAT-'||p_conversation_id
    ) returning id into v_payment_id;

    insert into public.wallet_transactions(
      user_id,amount,type,source,payment_id,description
    ) values(
      p_user_id,v_paid_amount,'debit','chat',v_payment_id,
      'Astrologer chat '||round(v_paid_minutes,4)||' minute(s) @ ₹'||v_rate||'/min'
    );
  end if;

  insert into public.astrologer_earnings(
    astrologer_id,amount,gross_amount,commission_amount,net_amount,
    paid_amount,paid_minutes,category,conversation_id,earned_at
  ) values(
    p_astrologer_id,v_net,v_gross,v_commission,v_net,
    v_paid_amount,v_paid_minutes,'chat',p_conversation_id,now()
  ) returning id into v_earning_id;

  update public.conversations
    set billed_seconds=v_seconds,billed_amount=v_paid_amount
    where id=p_conversation_id;

  return jsonb_build_object(
    'charged',true,'existing',false,'earning_id',v_earning_id,
    'payment_id',v_payment_id,'minutes',v_total_minutes,'seconds',v_seconds,
    'rate',v_rate,'gross',v_gross,'commission',v_commission,'net',v_net,
    'free_minutes_used',v_free_used,'paid_minutes',v_paid_minutes,
    'wallet_amount',v_paid_amount
  );
exception when unique_violation then
  select * into existing from public.astrologer_earnings
    where conversation_id=p_conversation_id limit 1;
  if found then
    return jsonb_build_object(
      'charged',true,'existing',true,'earning_id',existing.id,
      'net',coalesce(existing.net_amount,existing.amount,0),
      'wallet_amount',coalesce(existing.paid_amount,0),
      'paid_minutes',coalesce(existing.paid_minutes,0)
    );
  end if;
  raise;
end;
$$;
grant execute on function public.settle_chat_billing_exact_v2(uuid,uuid,uuid,numeric,numeric,integer,numeric) to service_role;

-- ============================================================================
-- SOURCE: supabase/EXACT_CHAT_BILLING_FIX.sql
-- ============================================================================
-- Bhavishya Gyani: exact chat-time billing
-- Run once in Supabase SQL Editor after the existing chat/payment migrations.
-- Safe to run repeatedly.

alter table public.user_accounts
  alter column free_chat_minutes type numeric(12,4)
  using free_chat_minutes::numeric;

alter table public.user_accounts
  alter column free_chat_minutes_used type numeric(12,4)
  using free_chat_minutes_used::numeric;

alter table public.chat_free_minute_transactions
  alter column minutes type numeric(12,4)
  using minutes::numeric;

-- Exact-time atomic settlement. The old settle_chat_billing function is left intact
-- for backward compatibility; the application now calls this function first.
drop function if exists public.settle_chat_billing_exact(uuid,uuid,uuid,numeric,numeric,integer);

create or replace function public.settle_chat_billing_exact(
  p_conversation_id uuid,
  p_user_id uuid,
  p_astrologer_id uuid,
  p_rate numeric,
  p_commission_percent numeric,
  p_seconds integer,
  p_free_already_used numeric default 0
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  w wallets%rowtype;
  ua user_accounts%rowtype;
  existing astrologer_earnings%rowtype;
  v_seconds integer := greatest(0,coalesce(p_seconds,0));
  v_total_minutes numeric(12,4) := round((v_seconds::numeric / 60),4);
  v_rate numeric(12,4) := greatest(0,coalesce(p_rate,0));
  v_comm numeric(7,2) := least(100,greatest(0,coalesce(p_commission_percent,20)));
  v_already_free numeric(12,4) := least(v_total_minutes,greatest(0,coalesce(p_free_already_used,0)));
  v_available_free numeric(12,4) := 0;
  v_additional_free numeric(12,4) := 0;
  v_free_used numeric(12,4) := 0;
  v_paid_minutes numeric(12,4) := 0;
  v_paid_amount numeric(12,2) := 0;
  v_gross numeric(12,2) := 0;
  v_commission numeric(12,2) := 0;
  v_net numeric(12,2) := 0;
  v_payment_id uuid;
  v_earning_id uuid;
begin
  if p_conversation_id is null or p_user_id is null or p_astrologer_id is null then
    raise exception 'Invalid chat billing identifiers';
  end if;

  select * into existing from public.astrologer_earnings
    where conversation_id=p_conversation_id limit 1;
  if found then
    return jsonb_build_object('charged',true,'existing',true,'earning_id',existing.id,
      'net',coalesce(existing.net_amount,existing.amount,0),'wallet_amount',coalesce(existing.paid_amount,0),
      'paid_minutes',coalesce(existing.paid_minutes,0));
  end if;

  if v_seconds<=0 or v_rate<=0 then
    return jsonb_build_object('charged',false,'reason','zero_duration','seconds',v_seconds,
      'minutes',v_total_minutes,'wallet_amount',0);
  end if;

  select * into ua from public.user_accounts where id=p_user_id for update;
  if not found then raise exception 'User account not found'; end if;
  select * into w from public.wallets where user_id=p_user_id for update;
  if not found then insert into public.wallets(user_id,balance) values(p_user_id,0) returning * into w; end if;

  -- p_free_already_used was already deducted by the live timer. Only the
  -- additional free minutes are deducted in this atomic settlement.
  v_available_free := greatest(0,coalesce(ua.free_chat_minutes,0));
  v_additional_free := least(greatest(0,v_total_minutes-v_already_free),v_available_free);
  v_free_used := v_already_free + v_additional_free;
  v_paid_minutes := greatest(0,v_total_minutes-v_free_used);
  v_paid_amount := round((v_rate*v_paid_minutes)::numeric,2);
  v_gross := v_paid_amount;
  v_commission := round((v_gross*v_comm/100)::numeric,2);
  v_net := greatest(0,round((v_gross-v_commission)::numeric,2));

  if coalesce(w.balance,0)<v_paid_amount then
    raise exception 'INSUFFICIENT_WALLET:%:%',v_paid_amount,coalesce(w.balance,0);
  end if;

  if v_additional_free>0 then
    update public.user_accounts
      set free_chat_minutes=greatest(0,coalesce(free_chat_minutes,0)-v_additional_free),
          free_chat_minutes_used=coalesce(free_chat_minutes_used,0)+v_additional_free,
          updated_at=now()
      where id=p_user_id;
    insert into public.chat_free_minute_transactions(user_id,minutes,type,source,conversation_id,description)
      values(p_user_id,v_additional_free,'debit','chat',p_conversation_id,
             'Free chat time used: '||round(v_additional_free,4)||' minute(s)');
  end if;

  if v_paid_amount>0 then
    update public.wallets set balance=round((coalesce(balance,0)-v_paid_amount)::numeric,2),updated_at=now() where id=w.id;
    insert into public.payments(user_id,astrologer_id,conversation_id,amount,currency,method,purpose,status,reference)
      values(p_user_id,p_astrologer_id,p_conversation_id,v_paid_amount,'INR','wallet','chat_minutes','approved','CHAT-'||p_conversation_id)
      returning id into v_payment_id;
    insert into public.wallet_transactions(user_id,amount,type,source,payment_id,description)
      values(p_user_id,v_paid_amount,'debit','chat',v_payment_id,
             'Astrologer chat '||round(v_paid_minutes,4)||' minute(s) @ ₹'||v_rate||'/min');
  end if;

  insert into public.astrologer_earnings(astrologer_id,amount,gross_amount,commission_amount,net_amount,paid_amount,paid_minutes,category,conversation_id,earned_at)
    values(p_astrologer_id,v_net,v_gross,v_commission,v_net,v_paid_amount,v_paid_minutes,'chat',p_conversation_id,now())
    returning id into v_earning_id;

  update public.conversations set billed_seconds=v_seconds,billed_amount=v_paid_amount where id=p_conversation_id;
  return jsonb_build_object('charged',true,'existing',false,'earning_id',v_earning_id,
    'payment_id',v_payment_id,'minutes',v_total_minutes,'seconds',v_seconds,'rate',v_rate,
    'gross',v_gross,'commission',v_commission,'net',v_net,'free_minutes_used',v_free_used,
    'paid_minutes',v_paid_minutes,'wallet_amount',v_paid_amount);
exception when unique_violation then
  select * into existing from public.astrologer_earnings where conversation_id=p_conversation_id limit 1;
  if found then return jsonb_build_object('charged',true,'existing',true,'earning_id',existing.id,
    'net',coalesce(existing.net_amount,existing.amount,0),'wallet_amount',coalesce(existing.paid_amount,0),
    'paid_minutes',coalesce(existing.paid_minutes,0)); end if;
  raise;
end;
$$;

grant execute on function public.settle_chat_billing_exact(uuid,uuid,uuid,numeric,numeric,integer,numeric) to service_role;

-- ============================================================================
-- SOURCE: supabase/LIVE_FREE_CHAT_TIMER_FIX.sql
-- ============================================================================
-- Bhavishya Gyani: live free-chat minute deduction
-- Run once in Supabase SQL Editor after the existing chat/payment migrations.
-- Safe to rerun.

alter table public.conversations add column if not exists free_minutes_snapshot numeric(12,4) not null default 0;
alter table public.conversations add column if not exists free_minutes_consumed_live numeric(12,4) not null default 0;

create or replace function public.consume_chat_free_time_live(
  p_conversation_id uuid, p_user_id uuid, p_minutes numeric
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare c conversations%rowtype; ua user_accounts%rowtype;
  v_target numeric(12,4):=greatest(0,coalesce(p_minutes,0));
  v_prev numeric(12,4):=0; v_delta numeric(12,4):=0; v_available numeric(12,4):=0; v_used numeric(12,4):=0;
begin
 select * into c from public.conversations where id=p_conversation_id for update;
 if not found then raise exception 'Conversation not found'; end if;
 if c.user_id<>p_user_id then raise exception 'User does not own this conversation'; end if;
 if c.status<>'accepted' or c.chat_started_at is null then
   return jsonb_build_object('used_total',coalesce(c.free_minutes_consumed_live,0),'used_delta',0,'remaining_free',0);
 end if;
 v_prev:=greatest(0,coalesce(c.free_minutes_consumed_live,0));
 v_target:=least(greatest(0,coalesce(c.free_minutes_snapshot,0)),v_target);
 v_delta:=greatest(0,round((v_target-v_prev)::numeric,4));
 if v_delta<=0 then
   select greatest(0,coalesce(free_chat_minutes,0)) into v_available from public.user_accounts where id=p_user_id;
   return jsonb_build_object('used_total',v_prev,'used_delta',0,'remaining_free',v_available);
 end if;
 select * into ua from public.user_accounts where id=p_user_id for update;
 if not found then raise exception 'User account not found'; end if;
 v_available:=greatest(0,coalesce(ua.free_chat_minutes,0));
 v_delta:=least(v_delta,v_available);
 if v_delta>0 then
   update public.user_accounts set free_chat_minutes=greatest(0,coalesce(free_chat_minutes,0)-v_delta), free_chat_minutes_used=coalesce(free_chat_minutes_used,0)+v_delta, updated_at=now() where id=p_user_id;
   insert into public.chat_free_minute_transactions(user_id,minutes,type,source,conversation_id,description) values(p_user_id,v_delta,'debit','chat',p_conversation_id,'Live free chat time used: '||round(v_delta,4)||' minute(s)');
 end if;
 v_used:=v_prev+v_delta;
 update public.conversations set free_minutes_consumed_live=v_used where id=p_conversation_id;
 return jsonb_build_object('used_total',v_used,'used_delta',v_delta,'remaining_free',greatest(0,v_available-v_delta));
end; $$;
grant execute on function public.consume_chat_free_time_live(uuid,uuid,numeric) to service_role;

-- ============================================================================
-- SOURCE: supabase/CALL_SYSTEM_SQL.sql
-- ============================================================================
-- BHAVISHYA GYANI — CALL SYSTEM SQL (FIXED)
-- Safe/idempotent migration for the existing Bhavishya Gyani schema.
-- IMPORTANT: public.profiles is a READ-ONLY VIEW in this project, not a table,
-- so call_signals deliberately does NOT create a foreign key to profiles.
-- Existing Chat, Wallet, Review and Pooja data is not deleted.

-- 1) Call-specific fields on the existing conversations table.
alter table public.conversations add column if not exists call_started_at timestamptz;
alter table public.conversations add column if not exists call_budget_seconds integer not null default 0;
alter table public.conversations add column if not exists call_free_minutes_snapshot numeric(12,4) not null default 0;
alter table public.conversations add column if not exists call_free_minutes_consumed_live numeric(12,4) not null default 0;
alter table public.conversations add column if not exists call_mode text not null default 'voice';

-- 2) Call earning fields on the existing astrologer_earnings table.
alter table public.astrologer_earnings add column if not exists gross_amount numeric(12,2) not null default 0;
alter table public.astrologer_earnings add column if not exists commission_amount numeric(12,2) not null default 0;
alter table public.astrologer_earnings add column if not exists net_amount numeric(12,2) not null default 0;
alter table public.astrologer_earnings add column if not exists paid_amount numeric(12,2) not null default 0;
alter table public.astrologer_earnings add column if not exists paid_minutes numeric(12,4) not null default 0;
alter table public.astrologer_earnings add column if not exists conversation_id uuid references public.conversations(id) on delete set null;
create unique index if not exists uq_call_earnings_conversation
  on public.astrologer_earnings(conversation_id)
  where conversation_id is not null;

-- 2.5) Atomic live free-minute consumption for calls.
-- The call API must use the same shared free-chat-minute pool as chat,
-- but must record the consumption as a call transaction and update the
-- call-specific live counter atomically.
create or replace function public.consume_call_free_time_live(
  p_conversation_id uuid, p_user_id uuid, p_minutes numeric
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  c conversations%rowtype;
  ua user_accounts%rowtype;
  v_target numeric(12,4):=greatest(0,coalesce(p_minutes,0));
  v_prev numeric(12,4):=0;
  v_delta numeric(12,4):=0;
  v_available numeric(12,4):=0;
  v_used numeric(12,4):=0;
begin
  select * into c from public.conversations where id=p_conversation_id for update;
  if not found then raise exception 'Conversation not found'; end if;
  if c.user_id<>p_user_id then raise exception 'User does not own this conversation'; end if;
  if c.channel<>'call' or c.status<>'call_accepted' or c.call_started_at is null then
    return jsonb_build_object('used_total',coalesce(c.call_free_minutes_consumed_live,0),'used_delta',0,'remaining_free',0);
  end if;
  v_prev:=greatest(0,coalesce(c.call_free_minutes_consumed_live,0));
  v_target:=least(greatest(0,coalesce(c.call_free_minutes_snapshot,0)),v_target);
  v_delta:=greatest(0,round((v_target-v_prev)::numeric,4));
  if v_delta<=0 then
    select greatest(0,coalesce(free_chat_minutes,0)) into v_available from public.user_accounts where id=p_user_id;
    return jsonb_build_object('used_total',v_prev,'used_delta',0,'remaining_free',coalesce(v_available,0));
  end if;
  select * into ua from public.user_accounts where id=p_user_id for update;
  if not found then raise exception 'User account not found'; end if;
  v_available:=greatest(0,coalesce(ua.free_chat_minutes,0));
  v_delta:=least(v_delta,v_available);
  if v_delta>0 then
    update public.user_accounts
      set free_chat_minutes=greatest(0,coalesce(free_chat_minutes,0)-v_delta),
          free_chat_minutes_used=coalesce(free_chat_minutes_used,0)+v_delta,
          updated_at=now()
      where id=p_user_id;
    insert into public.chat_free_minute_transactions(
      user_id,minutes,type,source,conversation_id,description
    ) values(
      p_user_id,v_delta,'debit','call',p_conversation_id,
      'Live free call time used: '||round(v_delta,4)||' minute(s)'
    );
  end if;
  v_used:=v_prev+v_delta;
  update public.conversations
    set call_free_minutes_consumed_live=v_used
    where id=p_conversation_id;
  return jsonb_build_object(
    'used_total',v_used,
    'used_delta',v_delta,
    'remaining_free',greatest(0,v_available-v_delta)
  );
end; $$;
grant execute on function public.consume_call_free_time_live(uuid,uuid,numeric) to service_role;

-- 3) Exact call billing settlement.
create or replace function public.settle_call_billing_exact(
  p_conversation_id uuid,
  p_user_id uuid,
  p_astrologer_id uuid,
  p_rate numeric,
  p_commission_percent numeric,
  p_seconds integer,
  p_free_already_used numeric default 0
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  w wallets%rowtype;
  ua user_accounts%rowtype;
  existing astrologer_earnings%rowtype;
  v_seconds integer := greatest(0,coalesce(p_seconds,0));
  v_minutes numeric(12,4) := round(v_seconds::numeric/60,4);
  v_rate numeric(12,4) := greatest(0,coalesce(p_rate,0));
  v_comm numeric(7,2) := least(100,greatest(0,coalesce(p_commission_percent,20)));
  v_free numeric(12,4) := 0;
  v_free_used numeric(12,4) := 0;
  v_paid numeric(12,4) := 0;
  v_paid_amount numeric(12,2) := 0;
  v_gross numeric(12,2) := 0;
  v_commission numeric(12,2) := 0;
  v_net numeric(12,2) := 0;
  v_payment_id uuid;
  v_earning_id uuid;
begin
  select * into existing
  from public.astrologer_earnings
  where conversation_id=p_conversation_id
  limit 1;

  if found then
    return jsonb_build_object(
      'charged',true,
      'existing',true,
      'earning_id',existing.id,
      'net',coalesce(existing.net_amount,existing.amount,0),
      'wallet_amount',coalesce(existing.paid_amount,0)
    );
  end if;

  if v_seconds<=0 or v_rate<=0 then
    return jsonb_build_object('charged',false,'reason','zero_duration');
  end if;

  select * into ua
  from public.user_accounts
  where id=p_user_id
  for update;
  if not found then
    raise exception 'User account not found';
  end if;

  select * into w
  from public.wallets
  where user_id=p_user_id
  for update;

  if not found then
    insert into public.wallets(user_id,balance)
    values(p_user_id,0)
    returning * into w;
  end if;

  v_free := greatest(0,coalesce(ua.free_chat_minutes,0));
  v_minutes := greatest(0,v_minutes-greatest(0,coalesce(p_free_already_used,0)));
  v_free_used := least(v_minutes,v_free);
  v_paid := greatest(0,v_minutes-v_free_used);
  v_paid_amount := round(v_rate*v_paid,2);
  v_gross := v_paid_amount;
  v_commission := round(v_gross*v_comm/100,2);
  v_net := greatest(0,round(v_gross-v_commission,2));

  if coalesce(w.balance,0)<v_paid_amount then
    raise exception 'INSUFFICIENT_WALLET:%:%',v_paid_amount,coalesce(w.balance,0);
  end if;

  if v_free_used>0 then
    update public.user_accounts
    set free_chat_minutes=greatest(0,coalesce(free_chat_minutes,0)-v_free_used),
        free_chat_minutes_used=coalesce(free_chat_minutes_used,0)+v_free_used,
        updated_at=now()
    where id=p_user_id;

    insert into public.chat_free_minute_transactions(
      user_id,minutes,type,source,conversation_id,description
    ) values(
      p_user_id,v_free_used,'debit','call',p_conversation_id,
      'Free call time used: '||round(v_free_used,4)||' minute(s)'
    );
  end if;

  if v_paid_amount>0 then
    update public.wallets
    set balance=round((coalesce(balance,0)-v_paid_amount)::numeric,2),
        updated_at=now()
    where id=w.id;

    insert into public.payments(
      user_id,astrologer_id,conversation_id,amount,currency,method,
      purpose,status,reference
    ) values(
      p_user_id,p_astrologer_id,p_conversation_id,v_paid_amount,'INR',
      'wallet','call_minutes','approved','CALL-'||p_conversation_id
    ) returning id into v_payment_id;

    insert into public.wallet_transactions(
      user_id,amount,type,source,payment_id,description
    ) values(
      p_user_id,v_paid_amount,'debit','call',v_payment_id,
      'Astrologer call '||round(v_paid,4)||' minute(s) @ ₹'||v_rate||'/min'
    );
  end if;

  insert into public.astrologer_earnings(
    astrologer_id,amount,gross_amount,commission_amount,net_amount,
    paid_amount,paid_minutes,category,conversation_id,earned_at
  ) values(
    p_astrologer_id,v_net,v_gross,v_commission,v_net,
    v_paid_amount,v_paid,'call',p_conversation_id,now()
  ) returning id into v_earning_id;

  update public.conversations
  set billed_seconds=v_seconds,
      billed_amount=v_paid_amount
  where id=p_conversation_id;

  return jsonb_build_object(
    'charged',true,
    'existing',false,
    'earning_id',v_earning_id,
    'payment_id',v_payment_id,
    'minutes',v_minutes,
    'seconds',v_seconds,
    'rate',v_rate,
    'gross',v_gross,
    'commission',v_commission,
    'net',v_net,
    'free_minutes_used',v_free_used,
    'paid_minutes',v_paid,
    'wallet_amount',v_paid_amount
  );

exception when unique_violation then
  select * into existing
  from public.astrologer_earnings
  where conversation_id=p_conversation_id
  limit 1;

  if found then
    return jsonb_build_object(
      'charged',true,
      'existing',true,
      'earning_id',existing.id,
      'net',coalesce(existing.net_amount,existing.amount,0),
      'wallet_amount',coalesce(existing.paid_amount,0)
    );
  end if;
  raise;
end;
$$;

grant execute on function public.settle_call_billing_exact(
  uuid,uuid,uuid,numeric,numeric,integer,numeric
) to service_role;

-- 4) Dedicated call signaling storage.
-- Do NOT reference public.profiles here: in this project profiles is a VIEW.
-- sender_id is intentionally a plain UUID because a sender can be a user or astrologer.
create table if not exists public.call_signals (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null,
  signal_type text not null check (signal_type in ('offer','answer','ice','bye')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_call_signals_conversation_created
  on public.call_signals(conversation_id, created_at);

-- 5) Keep call signaling separate from Chat messages.
-- Server/API uses the service role, so no browser RLS policy is required here.

-- ============================================================================
-- SOURCE: supabase/HISTORY_PERMANENT_MIGRATION.sql
-- ============================================================================
-- Bhavishya Gyani v37.1
-- Permanent User Chat + Call History
--
-- Chat/call conversation records are permanent application history.
-- retention_until is retained for backward schema compatibility but is no
-- longer used as an expiry/deletion marker for conversations.
-- This migration is additive/non-destructive and does not delete history.

alter table public.conversations
  add column if not exists retention_until timestamptz;

-- Preserve every existing conversation indefinitely.
update public.conversations
set retention_until = null
where retention_until is not null;

comment on column public.conversations.retention_until is
  'Legacy compatibility field. Chat and Call history is permanent; application code must keep this NULL and must not use it to delete or hide conversation history.';

-- There is intentionally no DELETE statement for conversations/messages here.
-- User Panel history APIs read historical conversations without retention filters.

-- ============================================================================
-- SOURCE: supabase/NOTIFICATIONS_AND_AUDIT_FIX.sql
-- ============================================================================
-- Run once in Supabase SQL Editor after deploying this ZIP.
-- Extends the existing notifications table for both users and astrologers.
alter table public.notifications alter column user_id drop not null;
alter table public.notifications add column if not exists recipient_id uuid;
alter table public.notifications add column if not exists recipient_role text not null default 'user';
alter table public.notifications add column if not exists notification_type text not null default 'general';
alter table public.notifications add column if not exists link text;
alter table public.notifications add column if not exists sent_by uuid;
create index if not exists notifications_recipient_created_idx on public.notifications(recipient_id, created_at desc);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
-- Backfill recipient_id for legacy user notifications.
update public.notifications set recipient_id=user_id, recipient_role='user' where recipient_id is null and user_id is not null;

-- Notify followers when an astrologer transitions from offline to online.
create or replace function public.bg_notify_followers_online() returns trigger language plpgsql as $$
begin
  if coalesce(new.online,false)=true and coalesce(old.online,false)=false then
    insert into public.notifications(user_id,recipient_id,recipient_role,title,body,notification_type,created_at)
    select f.user_id,f.user_id,'user','Astrologer Online',coalesce(new.full_name,'आपके follow किए हुए astrologer')||' अब online हैं।', 'followed_astrologer_online',now()
    from public.astrologer_follows f where f.astrologer_id=new.id;
  end if;
  return new;
end $$;
drop trigger if exists bg_notify_followers_online on public.astrologers;
create trigger bg_notify_followers_online after update of online on public.astrologers for each row execute function public.bg_notify_followers_online();

-- Notify all users when a new active festival offer is published.
create or replace function public.bg_notify_users_offer() returns trigger language plpgsql as $$
begin
  if coalesce(new.active,false)=true and (tg_op='INSERT' or coalesce(old.active,false)=false) then
    insert into public.notifications(user_id,recipient_id,recipient_role,title,body,notification_type,created_at)
    select u.id,u.id,'user','नया Offer उपलब्ध है',coalesce(new.name,'Bhavishya Gyani पर नया offer देखें'),'offer',now()
    from public.user_accounts u where coalesce(u.blocked,false)=false;
  end if;
  return new;
end $$;
drop trigger if exists bg_notify_users_offer on public.chat_festival_offers;
create trigger bg_notify_users_offer after insert or update of active on public.chat_festival_offers for each row execute function public.bg_notify_users_offer();

-- Ensure the astrologer review-report workflow has its required table.
create table if not exists public.review_reports (
 id uuid primary key default gen_random_uuid(),
 review_id uuid not null references public.reviews(id) on delete cascade,
 astrologer_id uuid not null references public.astrologer_accounts(id) on delete cascade,
 reporter_id uuid not null references public.astrologer_accounts(id) on delete cascade,
 message text not null,
 status text not null default 'open' check(status in ('open','resolved','dismissed')),
 created_at timestamptz not null default now(),
 resolved_at timestamptz
);
create index if not exists review_reports_status_created_idx on public.review_reports(status,created_at desc);

-- Chat/call request and status notifications for both sides.
create or replace function public.bg_notify_conversation() returns trigger language plpgsql as $$
declare astro_name text; channel_label text;
begin
  channel_label := case when coalesce(new.channel,'chat')='call' then 'Call' else 'Chat' end;
  if tg_op='INSERT' and coalesce(new.status,'requested')='requested' and new.astrologer_id is not null then
    insert into public.notifications(recipient_id,recipient_role,title,body,notification_type,created_at)
    values(new.astrologer_id,'astrologer','New '||channel_label||' Request','आपको एक नया user '||lower(channel_label)||' request मिला है।','consultation_request',now());
  elsif tg_op='UPDATE' and coalesce(new.status,'') is distinct from coalesce(old.status,'') and new.status in ('astrologer_accepted','accepted','rejected','missed','closed') then
    insert into public.notifications(user_id,recipient_id,recipient_role,title,body,notification_type,created_at)
    values(new.user_id,new.user_id,'user',channel_label||' Update',case when new.status in ('astrologer_accepted','accepted') then 'Astrologer ने आपका '||lower(channel_label)||' request स्वीकार किया है।' when new.status='rejected' then 'Astrologer आपका '||lower(channel_label)||' request स्वीकार नहीं कर पाए।' when new.status='missed' then 'आपका '||lower(channel_label)||' request miss हो गया।' else 'आपका '||lower(channel_label)||' session समाप्त हो गया।' end,'consultation_update',now());
  end if;
  return new;
end $$;
drop trigger if exists bg_notify_conversation_insert on public.conversations;
create trigger bg_notify_conversation_insert after insert on public.conversations for each row execute function public.bg_notify_conversation();
drop trigger if exists bg_notify_conversation_update on public.conversations;
create trigger bg_notify_conversation_update after update of status on public.conversations for each row execute function public.bg_notify_conversation();

-- ============================================================================
-- SOURCE: supabase/FIREBASE_PUSH_SETUP.sql
-- ============================================================================
-- Bhavishya Gyani — Firebase Cloud Messaging token storage
-- Run once in Supabase SQL Editor.
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  token text not null unique,
  platform text not null default 'web-pwa',
  device_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user_id_idx on public.push_tokens(user_id);
create index if not exists push_tokens_updated_at_idx on public.push_tokens(updated_at desc);

-- The application API uses the Supabase service role, so browser RLS is not
-- required for this table. If you later expose it through Supabase client-side
-- APIs, add explicit RLS policies instead of making the table public.

-- ============================================================================
-- SOURCE: supabase/PASSWORD_RESET_GMAIL.sql
-- ============================================================================
-- Run this once in Supabase SQL Editor for the Gmail password-reset system.
create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  account_type text not null check (account_type in ('user','astrologer','admin')),
  account_id uuid not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz null,
  created_at timestamptz not null default now()
);
create index if not exists password_reset_tokens_lookup_idx
  on public.password_reset_tokens(token_hash, account_type, expires_at, used_at);

-- Server uses the Supabase service-role key, so no public client access is required.
alter table public.password_reset_tokens enable row level security;

-- Optional cleanup helper; safe to run repeatedly.
create or replace function public.cleanup_expired_password_reset_tokens()
returns void language sql security definer set search_path=public as $$
  delete from public.password_reset_tokens
  where expires_at < now() or used_at is not null;
$$;

-- ============================================================================
-- SOURCE: supabase/PROFILE_PHOTO_CONSENT_MIGRATION.sql
-- ============================================================================
-- Bhavishya Gyani: profile-photo rights/consent audit trail
-- Run once in Supabase SQL Editor before enabling the updated registration flow.
-- Non-destructive: existing photos/accounts are not deleted.

alter table public.astrologers
  add column if not exists avatar_consent_at timestamptz;

alter table public.astrologer_applications
  add column if not exists avatar_consent_at timestamptz;

comment on column public.astrologers.avatar_consent_at is
  'Timestamp when the astrologer confirmed they have rights/permission to display the uploaded profile photo on Bhavishya Gyani.';
comment on column public.astrologer_applications.avatar_consent_at is
  'Timestamp when the applicant confirmed they have rights/permission to display the uploaded profile photo on Bhavishya Gyani.';

-- ============================================================================
-- SOURCE: supabase/FINAL_ADMIN_ASTROLOGER_MIGRATION.sql
-- ============================================================================
-- Bhavishya Gyani: FINAL Admin + Astrologer migration
-- Run this file ONCE in Supabase SQL Editor.
-- Combines review-report/training and payout/payment-details/wallet-ledger changes.
-- Non-destructive: existing data is not deleted.

-- ============================================================
-- 1) ASTROLOGER REVIEW REPORTS / MODERATION
-- ============================================================
create table if not exists public.review_reports(
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  astrologer_id uuid not null references public.astrologer_accounts(id) on delete cascade,
  reporter_id uuid not null references public.astrologer_accounts(id) on delete cascade,
  message text not null default '',
  status text not null default 'open' check(status in ('open','resolved','dismissed')),
  admin_id uuid references public.admin_accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists idx_review_reports_status
  on public.review_reports(status,created_at desc);
create index if not exists idx_review_reports_review
  on public.review_reports(review_id);

alter table public.review_reports enable row level security;
-- Server uses service-role access, like the other application tables.

-- ============================================================
-- 2) PAYOUT PAYMENT DETAILS SNAPSHOT
-- ============================================================
alter table public.payouts
  add column if not exists payment_details jsonb not null default '{}'::jsonb;

create index if not exists idx_payouts_astro_period_status
  on public.payouts(astrologer_id, period_start desc, status);

-- Payment details themselves are stored server-side in platform_settings under:
-- astrologer_payment_details_<astrologer_uuid>
-- The API only exposes them to the logged-in astrologer and admins.

-- ============================================================
-- 3) WALLET LEDGER INDEXES
-- Recharge and actual wallet usage can be queried separately without
-- changing or deleting existing wallet transaction data.
-- ============================================================
create index if not exists idx_wallet_tx_user_created
  on public.wallet_transactions(user_id, created_at desc);

create index if not exists idx_wallet_tx_type_source_created
  on public.wallet_transactions(type, source, created_at desc);

-- END FINAL MIGRATION

-- ============================================================================
-- SOURCE: supabase/PRODUCTION_RELEASE_37.sql
-- ============================================================================
-- Bhavishya Gyani v37 production hardening migration.
-- Run once in Supabase SQL Editor after the existing project migrations.
-- Swiss Ephemeris is intentionally untouched by this migration.

create table if not exists public.api_rate_limits(
  key text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from anon, authenticated;

create or replace function public.consume_api_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare r public.api_rate_limits%rowtype; now_ts timestamptz:=now();
begin
  if coalesce(p_limit,0)<=0 or coalesce(p_window_seconds,0)<=0 then
    return jsonb_build_object('allowed',true,'remaining',0);
  end if;
  insert into public.api_rate_limits(key,window_started_at,request_count,updated_at)
  values(left(p_key,180),now_ts,1,now_ts)
  on conflict(key) do update set
    window_started_at=case when extract(epoch from (now_ts-public.api_rate_limits.window_started_at)) >= p_window_seconds then now_ts else public.api_rate_limits.window_started_at end,
    request_count=case when extract(epoch from (now_ts-public.api_rate_limits.window_started_at)) >= p_window_seconds then 1 else public.api_rate_limits.request_count+1 end,
    updated_at=now_ts
  returning * into r;
  return jsonb_build_object('allowed',r.request_count<=p_limit,'remaining',greatest(0,p_limit-r.request_count),'count',r.request_count);
end;
$$;
revoke all on function public.consume_api_rate_limit(text,integer,integer) from public;
grant execute on function public.consume_api_rate_limit(text,integer,integer) to service_role;

create unique index if not exists uq_payments_gateway_order
  on public.payments(gateway_order_id) where gateway_order_id is not null;
create unique index if not exists uq_wallet_razorpay_payment
  on public.wallet_transactions(payment_id) where source='razorpay' and payment_id is not null;
create index if not exists idx_api_rate_limits_updated on public.api_rate_limits(updated_at);

-- Remove stale hardcoded admin registration values if an older migration inserted one.
-- Existing system_settings rows are preserved. Admin registration now reads
-- ADMIN_REGISTRATION_CODE from server environment variables; no DB rows are deleted.

-- Password reset tokens must remain server-only.
alter table if exists public.password_reset_tokens enable row level security;
revoke all on public.password_reset_tokens from anon, authenticated;

-- Basic payment integrity constraints.
create index if not exists idx_payments_user_created on public.payments(user_id,created_at desc);
create index if not exists idx_payments_gateway_payment on public.payments(gateway_payment_id) where gateway_payment_id is not null;

-- Cleanup old rate-limit rows; schedule this with pg_cron if available.

-- ============================================================================
-- SOURCE: supabase/PRODUCTION_FIXES.sql
-- ============================================================================
-- BHAVISHYA GYANI (14) - production safety fixes
-- Run this AFTER the existing setup/CALL_SYSTEM/CHAT billing migrations.
-- This file intentionally does NOT modify admin registration settings.

-- Ensure the Pooja wallet flags exist before the functions are created.
alter table if exists public.pooja_bookings add column if not exists wallet_debited boolean not null default false;
alter table if exists public.pooja_bookings add column if not exists wallet_refunded boolean not null default false;

-- ------------------------------------------------------------
-- 1) Atomic Pooja booking: wallet lock + booking + ledger
-- ------------------------------------------------------------
create or replace function public.book_pooja_atomic(
  p_user_id uuid,
  p_astrologer_id uuid,
  p_pooja_id uuid,
  p_user_name text,
  p_phone text,
  p_preferred_date date,
  p_preferred_time time,
  p_notes text,
  p_amount numeric,
  p_pooja_name text
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  w wallets%rowtype;
  p poojas%rowtype;
  b pooja_bookings%rowtype;
  v_amount numeric(12,2) := greatest(0,coalesce(p_amount,0));
begin
  select * into p from public.poojas where id=p_pooja_id and active=true for share;
  if not found then raise exception 'Pooja is not available'; end if;

  if coalesce(p.price,0)::numeric(12,2) <> v_amount then
    v_amount := greatest(0,coalesce(p.price,0));
  end if;

  select * into w from public.wallets where user_id=p_user_id for update;
  if not found then
    insert into public.wallets(user_id,balance) values(p_user_id,0) returning * into w;
  end if;

  if coalesce(w.balance,0) < v_amount then
    raise exception 'INSUFFICIENT_WALLET:%:%',v_amount,coalesce(w.balance,0);
  end if;

  if v_amount > 0 then
    update public.wallets
      set balance=round((coalesce(balance,0)-v_amount)::numeric,2),updated_at=now()
      where id=w.id;
  end if;

  insert into public.pooja_bookings(
    user_id,astrologer_id,pooja_id,user_name,phone,preferred_date,
    preferred_time,notes,amount,status,wallet_debited,wallet_refunded
  ) values(
    p_user_id,p_astrologer_id,p_pooja_id,coalesce(p_user_name,''),coalesce(p_phone,''),
    p_preferred_date,p_preferred_time,coalesce(p_notes,''),v_amount,'pending',v_amount>0,false
  ) returning * into b;

  if v_amount > 0 then
    insert into public.wallet_transactions(
      user_id,amount,type,source,description
    ) values(
      p_user_id,v_amount,'debit','pooja',
      'Pooja booking — '||coalesce(p.name,p_pooja_name,'Pooja')
    );
  end if;

  return jsonb_build_object('booking',to_jsonb(b));
exception when unique_violation then
  raise;
end;
$$;

grant execute on function public.book_pooja_atomic(uuid,uuid,uuid,text,text,date,time,text,numeric,text) to service_role;

-- ------------------------------------------------------------
-- 2) Atomic Pooja refund: lock booking + lock wallet + one refund
-- ------------------------------------------------------------
create or replace function public.refund_pooja_atomic(
  p_booking_id uuid,
  p_astrologer_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  b pooja_bookings%rowtype;
  w wallets%rowtype;
  v_amount numeric(12,2);
  v_name text;
begin
  select * into b
  from public.pooja_bookings
  where id=p_booking_id and astrologer_id=p_astrologer_id
  for update;
  if not found then raise exception 'Booking not found'; end if;

  if coalesce(b.wallet_refunded,false) then
    return jsonb_build_object('booking',to_jsonb(b),'refunded',false,'existing',true);
  end if;

  if not coalesce(b.wallet_debited,false) then
    update public.pooja_bookings
      set wallet_refunded=true,updated_at=now()
      where id=b.id;
    select * into b from public.pooja_bookings where id=b.id;
    return jsonb_build_object('booking',to_jsonb(b),'refunded',false);
  end if;

  v_amount := greatest(0,coalesce(b.amount,0));
  select name into v_name from public.poojas where id=b.pooja_id;
  select * into w from public.wallets where user_id=b.user_id for update;
  if not found then
    insert into public.wallets(user_id,balance) values(b.user_id,0) returning * into w;
  end if;

  if v_amount > 0 then
    update public.wallets
      set balance=round((coalesce(balance,0)+v_amount)::numeric,2),updated_at=now()
      where id=w.id;
    v_name:=coalesce(v_name,'Pooja');
    insert into public.wallet_transactions(
      user_id,amount,type,source,description
    ) values(
      b.user_id,v_amount,'credit','pooja_refund',
      'Pooja booking refund — '||v_name
    );
  end if;

  update public.pooja_bookings
    set wallet_refunded=true,updated_at=now()
    where id=b.id;
  select * into b from public.pooja_bookings where id=b.id;

  return jsonb_build_object('booking',to_jsonb(b),'refunded',true,'amount',v_amount);
end;
$$;

grant execute on function public.refund_pooja_atomic(uuid,uuid) to service_role;

-- ------------------------------------------------------------
-- 3) Helpful indexes for call/chat settlement and signal polling
-- ------------------------------------------------------------
create unique index if not exists uq_earning_conversation_once
  on public.astrologer_earnings(conversation_id)
  where conversation_id is not null;

create index if not exists idx_conversations_call_active
  on public.conversations(channel,status,created_at desc)
  where channel='call';

create index if not exists idx_call_signals_poll
  on public.call_signals(conversation_id,created_at,id);

-- Do NOT alter admin_registration_code here by design.

-- ============================================================================
-- SOURCE: supabase/PREMIUM_FINAL_UPDATES.sql
-- ============================================================================
-- Bhavishya Gyani Premium Final Updates
-- Run this once in Supabase SQL Editor after the existing project migrations.

-- ============================================================
-- 1) Notification compatibility for User + Astrologer panels
-- ============================================================
alter table public.notifications alter column user_id drop not null;
alter table public.notifications add column if not exists recipient_id uuid;
alter table public.notifications add column if not exists recipient_role text not null default 'user';
alter table public.notifications add column if not exists notification_type text not null default 'general';
alter table public.notifications add column if not exists link text;
alter table public.notifications add column if not exists sent_by uuid;
update public.notifications set recipient_id=user_id,recipient_role='user' where recipient_id is null and user_id is not null;
create index if not exists notifications_recipient_created_idx on public.notifications(recipient_id,created_at desc);

-- ============================================================
-- 2) Chat/call fields required by the current billing flow
-- ============================================================
alter table public.conversations add column if not exists chat_started_at timestamptz;
alter table public.conversations add column if not exists chat_budget_seconds integer not null default 0;
alter table public.conversations add column if not exists free_minutes_snapshot numeric(12,4) not null default 0;
alter table public.conversations add column if not exists free_minutes_consumed_live numeric(12,4) not null default 0;
alter table public.conversations add column if not exists call_started_at timestamptz;
alter table public.conversations add column if not exists call_budget_seconds integer not null default 0;
alter table public.conversations add column if not exists call_mode text default 'voice';
alter table public.conversations add column if not exists call_free_minutes_snapshot numeric(12,4) not null default 0;
alter table public.conversations add column if not exists call_free_minutes_consumed_live numeric(12,4) not null default 0;

-- ============================================================
-- 3) Ensure astrologer earnings can show actual astrologer net earning
-- ============================================================
alter table public.astrologer_earnings add column if not exists gross_amount numeric(12,2) not null default 0;
alter table public.astrologer_earnings add column if not exists commission_amount numeric(12,2) not null default 0;
alter table public.astrologer_earnings add column if not exists net_amount numeric(12,2) not null default 0;
alter table public.astrologer_earnings add column if not exists conversation_id uuid references public.conversations(id) on delete set null;
create unique index if not exists uq_earning_conversation_once on public.astrologer_earnings(conversation_id) where conversation_id is not null;
create index if not exists idx_earnings_astro_day on public.astrologer_earnings(astrologer_id,earned_at desc);

-- ============================================================
-- 4) Rating/review aggregation indexes
-- ============================================================
create index if not exists reviews_astrologer_created_idx on public.reviews(astrologer_id,created_at desc);
create index if not exists reviews_astrologer_rating_idx on public.reviews(astrologer_id,rating);

-- ============================================================
-- 5) Fair-reach algorithm notes
-- ============================================================
-- The application calculates rank_score using:
--   35% rating quality
--   20% completed-chat ratio
--   20% request acceptance rate
--   15% response speed
--   10% reliability / low-missed-request rate
-- The user astrologer API then converts rank_score into reach_weight:
--   base 1.0 + up to 4.0x performance + optional boost/online factors.
-- Every approved astrologer remains in rotation; higher performers receive
-- more exposure slots, while time-based rotation prevents a permanent order.

-- ============================================================
-- 6) Optional review notification trigger (schema-safe)
-- ============================================================
-- The API already creates the notification after a successful review.
-- No database trigger is added here to avoid duplicate notifications.

-- ============================================================================
-- SOURCE: supabase/CHAT_PRODUCTION_RELIABILITY_MIGRATION.sql
-- ============================================================================
-- Bhavishya Gyani Production Chat Reliability Migration
-- SAFE / additive only. Does NOT reset, drop or delete application data.
-- Run after the existing chat/payment migrations.
begin;

alter table public.conversations add column if not exists kundli_id uuid references public.kundalis(id) on delete set null;
alter table public.conversations add column if not exists session_end_at timestamptz;
alter table public.conversations add column if not exists waiting_for_conversation_id uuid references public.conversations(id) on delete set null;
alter table public.conversations add column if not exists waiting_until timestamptz;

-- Fast current-session / waiting lookups.
create index if not exists idx_conv_kundli on public.conversations(kundli_id) where kundli_id is not null;

create index if not exists idx_conv_astro_chat_state
  on public.conversations(astrologer_id, channel, status, created_at desc);

create index if not exists idx_conv_user_chat_state
  on public.conversations(user_id, channel, status, created_at desc);

create index if not exists idx_conv_waiting
  on public.conversations(astrologer_id, status, waiting_until)
  where status='waiting';

create index if not exists idx_messages_conv_created_desc
  on public.messages(conversation_id, created_at desc, id desc);

create index if not exists idx_messages_kundli
  on public.messages(conversation_id, kundali_id, created_at desc)
  where kundali_id is not null;

-- Preserve existing data while making the central states explicit for application logic.
comment on column public.conversations.session_end_at is
  'Server-authoritative expected session end. Client clocks are display-only.';
comment on column public.conversations.waiting_until is
  'Server-authoritative waiting estimate while another chat is active.';

commit;

-- ============================================================================
-- SOURCE: supabase/payment_failed_status_migration.sql
-- ============================================================================
-- Adds a real failed state for Razorpay checkout failures.
-- Run this once in Supabase SQL Editor.
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check check(status in ('pending','approved','failed','rejected','refunded'));

-- ============================================================================
-- SOURCE: supabase/pooja_compatibility.sql
-- ============================================================================
-- Optional one-time migration for older Bhavishya Gyani Pooja tables.
-- The deployed API is already backward-compatible, so running this is not required for booking to work.

alter table if exists public.pooja_bookings add column if not exists user_name text not null default '';
alter table if exists public.pooja_bookings add column if not exists phone text not null default '';
alter table if exists public.pooja_bookings add column if not exists preferred_date date;
alter table if exists public.pooja_bookings add column if not exists preferred_time time;
alter table if exists public.pooja_bookings add column if not exists notes text not null default '';
alter table if exists public.pooja_bookings add column if not exists amount numeric(12,2) not null default 0;
alter table if exists public.pooja_bookings add column if not exists astrologer_note text not null default '';
alter table if exists public.pooja_bookings add column if not exists admin_note text not null default '';

-- The canonical pooja_bookings columns are created above; no legacy-column backfill is needed.

-- After existing rows are backfilled, these can be made NOT NULL manually if desired.

-- ============================================================================
-- SOURCE: supabase/PRODUCTION_FINAL_MIGRATION_37_1_3.sql
-- ============================================================================
-- Bhavishya Gyani v37.1.3 final production hardening.
-- Run AFTER the existing payment/call/history migrations.
-- This migration is additive/idempotent and does not delete user data.

create table if not exists public.razorpay_webhook_events(
  event_id text primary key,
  event_type text not null,
  order_id text,
  payment_id text,
  created_at timestamptz not null default now()
);
create index if not exists idx_razorpay_webhook_events_order on public.razorpay_webhook_events(order_id);
revoke all on public.razorpay_webhook_events from anon, authenticated;

-- Reconcile one Razorpay event atomically. Duplicate webhook delivery is harmless.
create or replace function public.reconcile_razorpay_payment(
  p_event_id text,
  p_order_id text,
  p_payment_id text default null,
  p_status text default 'approved'
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  pay payments%rowtype;
  existing_event text;
  v_status text := lower(coalesce(p_status,''));
  v_payment_id text := nullif(trim(coalesce(p_payment_id,'')),'');
  credit_result jsonb;
begin
  if nullif(trim(coalesce(p_event_id,'')),'') is null then raise exception 'Webhook event id is required'; end if;
  if nullif(trim(coalesce(p_order_id,'')),'') is null then raise exception 'Razorpay order id is required'; end if;
  if v_status not in ('approved','failed') then raise exception 'Unsupported payment reconciliation status'; end if;

  select event_id into existing_event from public.razorpay_webhook_events where event_id=p_event_id;
  if found then return jsonb_build_object('processed',true,'duplicate',true); end if;

  select * into pay from public.payments
    where gateway_order_id=p_order_id
    order by created_at desc limit 1
    for update;
  if not found then
    raise exception 'Payment order not found: %',p_order_id;
  end if;

  insert into public.razorpay_webhook_events(event_id,event_type,order_id,payment_id)
  values(p_event_id,case when v_status='approved' then 'payment.captured' else 'payment.failed' end,p_order_id,v_payment_id)
  on conflict (event_id) do nothing;

  -- A concurrent delivery can win the event row between the SELECT above and
  -- this INSERT. Re-check it and return duplicate only in that specific case.
  if not found then
    return jsonb_build_object('processed',true,'duplicate',true);
  end if;

  if pay.status='approved' then
    if v_status='failed' then
      return jsonb_build_object('processed',true,'already_approved',true,'status','approved');
    end if;
    if v_payment_id is not null and pay.gateway_payment_id is null then
      update public.payments set gateway_payment_id=v_payment_id,updated_at=now() where id=pay.id;
    end if;
    return jsonb_build_object('processed',true,'already_approved',true,'status','approved');
  end if;

  if v_status='failed' then
    update public.payments set status='failed',gateway_payment_id=coalesce(v_payment_id,gateway_payment_id),updated_at=now() where id=pay.id;
    return jsonb_build_object('processed',true,'status','failed','wallet_credited',false);
  end if;

  update public.payments set status='approved',gateway_payment_id=coalesce(v_payment_id,gateway_payment_id),approved_at=coalesce(approved_at,now()),updated_at=now() where id=pay.id;

  if pay.purpose='wallet_topup' then
    select public.settle_wallet_topup(pay.id,pay.user_id,pay.amount,'Wallet top-up via Razorpay') into credit_result;
  else
    credit_result := jsonb_build_object('already_processed',true,'skipped',true,'reason','non_wallet_payment');
  end if;

  return jsonb_build_object('processed',true,'status','approved','wallet_credited',pay.purpose='wallet_topup','credit',credit_result);
end;
$$;
revoke all on function public.reconcile_razorpay_payment(text,text,text,text) from public;
grant execute on function public.reconcile_razorpay_payment(text,text,text,text) to service_role;

-- The webhook itself is authoritative for final Razorpay state. Keep the client
-- status check as a recovery mechanism when a webhook was delayed/unavailable.
create index if not exists idx_payments_pending_gateway_order
  on public.payments(gateway_order_id,created_at)
  where status='pending' and gateway_order_id is not null;

-- ============================================================================
-- FINAL SANITY CHECKS
-- ============================================================================
DO $$
BEGIN
  IF to_regclass('public.user_accounts') IS NULL THEN RAISE EXCEPTION 'Fresh install failed: public.user_accounts is missing'; END IF;
  IF to_regclass('public.conversations') IS NULL THEN RAISE EXCEPTION 'Fresh install failed: public.conversations is missing'; END IF;
  IF to_regclass('public.wallets') IS NULL THEN RAISE EXCEPTION 'Fresh install failed: public.wallets is missing'; END IF;
  IF to_regclass('public.payments') IS NULL THEN RAISE EXCEPTION 'Fresh install failed: public.payments is missing'; END IF;
  IF to_regclass('public.razorpay_webhook_events') IS NULL THEN RAISE EXCEPTION 'Fresh install failed: Razorpay webhook table is missing'; END IF;
  IF to_regprocedure('public.settle_wallet_topup(uuid,uuid,numeric,text)') IS NULL THEN RAISE EXCEPTION 'Fresh install failed: settle_wallet_topup is missing'; END IF;
  IF to_regprocedure('public.reconcile_razorpay_payment(text,text,text,text)') IS NULL THEN RAISE EXCEPTION 'Fresh install failed: reconcile_razorpay_payment is missing'; END IF;
  IF to_regprocedure('public.settle_chat_billing_exact(uuid,uuid,uuid,numeric,numeric,integer,numeric)') IS NULL THEN RAISE EXCEPTION 'Fresh install failed: exact chat billing RPC is missing'; END IF;
  IF to_regprocedure('public.settle_call_billing_exact(uuid,uuid,uuid,numeric,numeric,integer,numeric)') IS NULL THEN RAISE EXCEPTION 'Fresh install failed: exact call billing RPC is missing'; END IF;
END $$;

COMMIT;
