-- Sorry with Love: authentication + privacy-conscious page analytics
-- Run this entire file in Supabase Dashboard > SQL Editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile"
on public.profiles for select to authenticated
using (id = auth.uid());

create table if not exists public.site_events (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in ('page_view', 'card_view', 'share_click', 'message_view')),
  page_path text not null check (char_length(page_path) between 1 and 300),
  card_template text check (card_template is null or char_length(card_template) <= 60),
  message_id text check (message_id is null or char_length(message_id) <= 80),
  created_at timestamptz not null default now()
);
alter table public.site_events add column if not exists message_id text;
alter table public.site_events drop constraint if exists site_events_event_type_check;
alter table public.site_events add constraint site_events_event_type_check check (event_type in ('page_view', 'card_view', 'share_click', 'message_view'));
create index if not exists site_events_message_id_idx on public.site_events (message_id) where message_id is not null;
create index if not exists site_events_created_at_idx on public.site_events (created_at desc);
create index if not exists site_events_path_type_idx on public.site_events (page_path, event_type);

alter table public.site_events enable row level security;
revoke all on public.site_events from anon, authenticated;
grant insert on public.site_events to anon, authenticated;
drop policy if exists "visitors may record allowed anonymous analytics events" on public.site_events;
create policy "visitors may record allowed anonymous analytics events"
on public.site_events for insert to anon, authenticated
with check (
  event_type in ('page_view', 'card_view', 'share_click', 'message_view')
  and char_length(page_path) between 1 and 300
  and (card_template is null or char_length(card_template) <= 60)
  and (message_id is null or char_length(message_id) <= 80)
);

create or replace function public.admin_site_analytics()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare result jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ) then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'total_page_views', count(*) filter (where event_type = 'page_view'),
    'total_card_views', count(*) filter (where event_type = 'card_view'),
    'total_share_clicks', count(*) filter (where event_type = 'share_click'),
    'total_message_views', count(*) filter (where event_type = 'message_view'),
    'messages', coalesce((
      select jsonb_agg(to_jsonb(msg) order by msg.views desc, msg.last_viewed desc)
      from (
        select message_id, coalesce(max(card_template), 'unknown') as card_template, coalesce(max(page_path), '/') as page_path, count(*) as views, max(created_at) as last_viewed
        from public.site_events where event_type = 'message_view' and message_id is not null
        group by message_id
      ) msg
    ), '[]'::jsonb),
    'pages', coalesce((
      select jsonb_agg(to_jsonb(pg) order by pg.page_views desc, pg.page_path asc)
      from (
        select page_path,
          count(*) filter (where event_type = 'page_view') as page_views,
          count(*) filter (where event_type = 'card_view') as card_views,
          count(*) filter (where event_type = 'share_click') as share_clicks
        from public.site_events group by page_path
      ) pg
    ), '[]'::jsonb),
    'recent_events', coalesce((
      select jsonb_agg(to_jsonb(recent) order by recent.created_at desc)
      from (
        select event_type, page_path, card_template, created_at
        from public.site_events order by created_at desc limit 100
      ) recent
    ), '[]'::jsonb)
  ) into result
  from public.site_events;
  return result;
end;
$$;
revoke all on function public.admin_site_analytics() from public, anon;
grant execute on function public.admin_site_analytics() to authenticated;

-- IMPORTANT: register your own account on the deployed site first, then replace
-- YOUR_AUTH_USER_UUID with that account's UUID from Authentication > Users.
-- Run the following separately after replacing the placeholder:
-- update public.profiles set role = 'admin' where id = 'YOUR_AUTH_USER_UUID';

-- User panel: saved cards, share links, recipient choices, and owner-only dashboard.
create table if not exists public.user_cards (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'My sorry card' check (char_length(title) between 1 and 100),
  card_template text not null default 'storybook' check (char_length(card_template) <= 60),
  sender_name text check (sender_name is null or char_length(sender_name) <= 50),
  recipient_name text check (recipient_name is null or char_length(recipient_name) <= 50),
  page_path text not null default '/' check (char_length(page_path) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists user_cards_owner_created_idx on public.user_cards(owner_id, created_at desc);
alter table public.user_cards enable row level security;
revoke all on public.user_cards from anon, authenticated;
grant select, insert, update, delete on public.user_cards to authenticated;
grant usage, select on sequence public.user_cards_id_seq to authenticated;
drop policy if exists "users manage own cards" on public.user_cards;
create policy "users manage own cards" on public.user_cards for all to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table if not exists public.share_links (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  share_id text not null unique check (char_length(share_id) between 1 and 80),
  title text not null default 'My sorry card' check (char_length(title) between 1 and 100),
  card_template text not null default 'storybook' check (char_length(card_template) <= 60),
  page_path text not null default '/' check (char_length(page_path) <= 300),
  share_url text not null default '',
  sender_name text check (sender_name is null or char_length(sender_name) <= 50),
  recipient_name text check (recipient_name is null or char_length(recipient_name) <= 50),
  created_at timestamptz not null default now()
);
alter table public.share_links add column if not exists share_url text not null default '';
alter table public.share_links add column if not exists sender_name text;
alter table public.share_links add column if not exists recipient_name text;
create index if not exists share_links_owner_created_idx on public.share_links(owner_id, created_at desc);
alter table public.share_links enable row level security;
revoke all on public.share_links from anon, authenticated;
grant select, insert, update, delete on public.share_links to authenticated;
grant usage, select on sequence public.share_links_id_seq to authenticated;
drop policy if exists "users manage own share links" on public.share_links;
create policy "users manage own share links" on public.share_links for all to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create table if not exists public.share_responses (
  id bigint generated always as identity primary key,
  share_id text not null check (char_length(share_id) between 1 and 80),
  response text not null check (response in ('accepted', 'not_yet')),
  created_at timestamptz not null default now()
);
create index if not exists share_responses_share_id_idx on public.share_responses(share_id, created_at desc);
alter table public.share_responses enable row level security;
revoke all on public.share_responses from public, anon, authenticated;
grant execute on function public.admin_site_analytics() to authenticated;

create or replace function public.record_share_response(p_share_id text, p_response text)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if p_share_id is null or char_length(p_share_id) < 1 or char_length(p_share_id) > 80 then
    raise exception 'Invalid share link';
  end if;
  if p_response not in ('accepted', 'not_yet') then raise exception 'Invalid response'; end if;
  -- Only links created and registered by a signed-in user are included in their panel.
  if exists (select 1 from public.share_links where share_id = p_share_id) then
    insert into public.share_responses(share_id, response) values (p_share_id, p_response);
  end if;
end;
$$;
revoke all on function public.record_share_response(text, text) from public;
grant execute on function public.record_share_response(text, text) to anon, authenticated;

create or replace function public.user_dashboard_data()
returns jsonb language plpgsql security definer set search_path = public, auth as $$
declare result jsonb; uid uuid;
begin
  uid := auth.uid();
  if uid is null then raise exception 'Login required' using errcode = '42501'; end if;
  select jsonb_build_object(
    'total_cards', (select count(*) from public.user_cards where owner_id = uid),
    'total_links', (select count(*) from public.share_links where owner_id = uid),
    'total_link_views', (select count(*) from public.site_events e join public.share_links l on l.share_id = e.message_id where l.owner_id = uid and e.event_type = 'message_view'),
    'accepted_responses', (select count(*) from public.share_responses r join public.share_links l on l.share_id = r.share_id where l.owner_id = uid and r.response = 'accepted'),
    'not_yet_responses', (select count(*) from public.share_responses r join public.share_links l on l.share_id = r.share_id where l.owner_id = uid and r.response = 'not_yet'),
    'cards', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc) from (select id, title, card_template, sender_name, recipient_name, created_at from public.user_cards where owner_id = uid) c), '[]'::jsonb),
    'links', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
      select l.share_id, l.title, l.card_template, l.page_path, l.created_at,
        coalesce(nullif(l.share_url, ''), 'https://sorry-withlove.vercel.app' || l.page_path || '?shared=1&shareId=' || l.share_id) as url,
        (select count(*) from public.site_events e where e.event_type = 'message_view' and e.message_id = l.share_id) as views,
        (select count(*) from public.share_responses r where r.share_id = l.share_id and r.response = 'accepted') as accepted_responses,
        (select count(*) from public.share_responses r where r.share_id = l.share_id and r.response = 'not_yet') as not_yet_responses,
        (select r.response from public.share_responses r where r.share_id = l.share_id order by r.created_at desc limit 1) as latest_response,
        (select max(e.created_at) from public.site_events e where e.event_type = 'message_view' and e.message_id = l.share_id) as last_viewed
      from public.share_links l where l.owner_id = uid
    ) x), '[]'::jsonb),
    'pages', coalesce((select jsonb_agg(to_jsonb(p) order by p.views desc) from (
      select e.page_path, count(*) as views from public.site_events e join public.share_links l on l.share_id = e.message_id
      where l.owner_id = uid and e.event_type = 'message_view' group by e.page_path
    ) p), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.user_dashboard_data() from public, anon;
grant execute on function public.user_dashboard_data() to authenticated;
