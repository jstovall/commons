-- ============================================================================
-- COMMONS APP — Core Database Schema
-- Multi-tenant neighborhood item-sharing platform
-- Target: Supabase (Postgres + Auth + RLS + Storage)
-- ============================================================================
-- Run this in the Supabase SQL Editor (or via `supabase db push` / migrations)
-- on a fresh project. Assumes Supabase Auth is enabled (auth.users exists)
-- and pgcrypto is available for gen_random_uuid() (default on Supabase).
-- ============================================================================


-- ============================================================================
-- 1. ENUMS
-- ============================================================================

create type member_role as enum ('member', 'moderator', 'admin');
create type member_status as enum ('pending', 'active', 'suspended', 'removed');
create type item_status as enum ('available', 'requested', 'checked_out', 'unavailable');
create type loan_status as enum (
  'requested', 'approved', 'denied', 'checked_out',
  'returned', 'overdue', 'cancelled'
);
create type report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type report_target as enum ('item', 'comment', 'user');


-- ============================================================================
-- 2. CORE TABLES
-- ============================================================================

-- --- Neighborhoods (tenants) -------------------------------------------------
create table public.neighborhoods (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,                 -- e.g. "Hilltop" -> displayed as "Hilltop Commons"
  slug             text not null unique,           -- e.g. "hilltop-98104" (globally unique, URL/subdomain safe)
  city             text,
  state            text,
  zip              text,
  accent_color     text,                           -- optional per-neighborhood theming
  banner_image_url text,
  invite_code      text unique,                    -- shared code required to request membership
  created_at       timestamptz not null default now()
);

comment on table public.neighborhoods is 'Each row is one independent "Commons" instance/tenant.';

-- --- Profiles (1:1 extension of auth.users) ---------------------------------
create table public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  display_name      text not null,
  profile_image_url text,
  phone             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

comment on table public.profiles is 'Public-safe user info only. No address/PII here — that lives in neighborhood_members, scoped per tenant.';

-- --- Neighborhood membership (join table + per-tenant profile data) --------
create table public.neighborhood_members (
  id                 uuid primary key default gen_random_uuid(),
  neighborhood_id    uuid not null references public.neighborhoods(id) on delete cascade,
  user_id            uuid not null references public.profiles(id) on delete cascade,
  role               member_role not null default 'member',
  status             member_status not null default 'pending',
  address_line1      text,
  address_line2      text,
  show_exact_address boolean not null default false,  -- if false, only approx area is shown to other members
  joined_at          timestamptz not null default now(),
  unique (neighborhood_id, user_id)
);

comment on table public.neighborhood_members is 'A user can belong to multiple neighborhoods. Address lives here (per-tenant), not on profiles.';

-- --- Categories (shared lookup, not per-tenant) -----------------------------
create table public.categories (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text
);

-- --- Items -------------------------------------------------------------------
create table public.items (
  id              uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references public.neighborhoods(id) on delete cascade,
  owner_id        uuid not null references public.profiles(id) on delete cascade,
  category_id     uuid references public.categories(id),
  name            text not null,
  description     text,
  image_url       text,
  status          item_status not null default 'available',
  is_active       boolean not null default true,   -- soft delete / owner-hidden
  content_flag    boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- --- Loans (borrow requests + full lifecycle/audit trail) -------------------
create table public.loans (
  id                    uuid primary key default gen_random_uuid(),
  item_id               uuid not null references public.items(id) on delete cascade,
  neighborhood_id       uuid not null references public.neighborhoods(id) on delete cascade, -- denormalized for RLS
  borrower_id           uuid not null references public.profiles(id) on delete cascade,
  owner_id              uuid not null references public.profiles(id) on delete cascade,      -- denormalized from item at insert time
  status                loan_status not null default 'requested',
  borrower_message      text,
  owner_response_message text,
  requested_at          timestamptz not null default now(),
  approved_at           timestamptz,
  checked_out_at        timestamptz,
  due_date              date,
  returned_at           timestamptz,

  constraint borrower_not_owner check (borrower_id <> owner_id)
);

-- --- Comments ------------------------------------------------------------------
create table public.comments (
  id              uuid primary key default gen_random_uuid(),
  item_id         uuid not null references public.items(id) on delete cascade,
  neighborhood_id uuid not null references public.neighborhoods(id) on delete cascade, -- denormalized for RLS
  user_id         uuid not null references public.profiles(id) on delete cascade,
  comment         text not null,
  content_flag    boolean not null default false,
  created_at      timestamptz not null default now()
);

-- --- Favorites -----------------------------------------------------------------
create table public.favorites (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  item_id    uuid not null references public.items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- --- Reports (moderation queue) -------------------------------------------------
create table public.reports (
  id              uuid primary key default gen_random_uuid(),
  neighborhood_id uuid not null references public.neighborhoods(id) on delete cascade,
  reporter_id     uuid not null references public.profiles(id) on delete cascade,
  target_type     report_target not null,
  target_id       uuid not null,   -- polymorphic: items.id, comments.id, or profiles.id
  reason          text not null,
  status          report_status not null default 'open',
  reviewed_by     uuid references public.profiles(id),
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now()
);

-- --- Push subscriptions (Web Push / PWA) ----------------------------------------
create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  device_type text,   -- 'ios' | 'android' | 'other' — informational only
  created_at  timestamptz not null default now()
);


-- ============================================================================
-- 3. INDEXES
-- ============================================================================

create index idx_neighborhood_members_neighborhood on public.neighborhood_members (neighborhood_id);
create index idx_neighborhood_members_user on public.neighborhood_members (user_id);
create index idx_neighborhood_members_status on public.neighborhood_members (neighborhood_id, status);

create index idx_items_neighborhood on public.items (neighborhood_id) where is_active;
create index idx_items_owner on public.items (owner_id);
create index idx_items_category on public.items (category_id);
create index idx_items_status on public.items (neighborhood_id, status);
create index idx_items_search on public.items using gin (to_tsvector('english', name || ' ' || coalesce(description, '')));

create index idx_loans_item on public.loans (item_id);
create index idx_loans_borrower on public.loans (borrower_id);
create index idx_loans_owner on public.loans (owner_id);
create index idx_loans_neighborhood_status on public.loans (neighborhood_id, status);
create index idx_loans_due_date on public.loans (due_date) where status in ('checked_out', 'overdue');

create index idx_comments_item on public.comments (item_id);
create index idx_comments_neighborhood on public.comments (neighborhood_id);

create index idx_reports_neighborhood_status on public.reports (neighborhood_id, status);

create index idx_push_subs_user on public.push_subscriptions (user_id);


-- ============================================================================
-- 4. HELPER FUNCTIONS (SECURITY DEFINER — avoid RLS recursion)
-- ============================================================================

-- Is the given (or current) user an ACTIVE member of this neighborhood?
create or replace function public.is_neighborhood_member(_neighborhood_id uuid, _user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.neighborhood_members
    where neighborhood_id = _neighborhood_id
      and user_id = _user_id
      and status = 'active'
  );
$$;

-- Is the given (or current) user a moderator/admin of this neighborhood?
create or replace function public.is_neighborhood_admin(_neighborhood_id uuid, _user_id uuid default auth.uid())
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.neighborhood_members
    where neighborhood_id = _neighborhood_id
      and user_id = _user_id
      and status = 'active'
      and role in ('moderator', 'admin')
  );
$$;

-- Look up the neighborhood_id for a given item (used in trigger + policies)
create or replace function public.neighborhood_for_item(_item_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select neighborhood_id from public.items where id = _item_id;
$$;


-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- --- Auto-create a profile row when a new auth user signs up ----------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --- Generic updated_at maintenance ------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_items_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

-- --- Stamp neighborhood_id on loans/comments from the item, don't trust client
create or replace function public.stamp_neighborhood_from_item()
returns trigger
language plpgsql
as $$
begin
  new.neighborhood_id := public.neighborhood_for_item(new.item_id);
  return new;
end;
$$;

create trigger loans_stamp_neighborhood
  before insert on public.loans
  for each row execute function public.stamp_neighborhood_from_item();

create trigger comments_stamp_neighborhood
  before insert on public.comments
  for each row execute function public.stamp_neighborhood_from_item();

-- --- Keep item.status in sync with loan lifecycle ---------------------------
create or replace function public.sync_item_status_from_loan()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('approved', 'requested') then
    update public.items set status = 'requested' where id = new.item_id and status = 'available';
  elsif new.status = 'checked_out' then
    update public.items set status = 'checked_out' where id = new.item_id;
  elsif new.status in ('returned', 'denied', 'cancelled') then
    update public.items set status = 'available' where id = new.item_id;
  end if;
  return new;
end;
$$;

create trigger loans_sync_item_status
  after insert or update of status on public.loans
  for each row execute function public.sync_item_status_from_loan();


-- ============================================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================================

alter table public.neighborhoods         enable row level security;
alter table public.profiles              enable row level security;
alter table public.neighborhood_members  enable row level security;
alter table public.categories            enable row level security;
alter table public.items                 enable row level security;
alter table public.loans                 enable row level security;
alter table public.comments              enable row level security;
alter table public.favorites             enable row level security;
alter table public.reports               enable row level security;
alter table public.push_subscriptions    enable row level security;

-- --- neighborhoods ------------------------------------------------------------
-- Anyone authenticated can look up a neighborhood by slug/invite code (needed
-- for the join flow before they're a member). Contains no sensitive data.
create policy "neighborhoods_select_authenticated"
  on public.neighborhoods for select
  to authenticated
  using (true);

-- Creating new neighborhoods is an admin/ops action for now (done via
-- service_role from a dashboard or onboarding script), not self-serve.
create policy "neighborhoods_write_service_role_only"
  on public.neighborhoods for all
  to service_role
  using (true) with check (true);

-- --- profiles -------------------------------------------------------------
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);   -- name/avatar only; no PII stored here

create policy "profiles_insert_self"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_delete_self"
  on public.profiles for delete
  to authenticated
  using (id = auth.uid());

-- --- neighborhood_members ---------------------------------------------------
-- Members can see the roster of neighborhoods they belong to; everyone can
-- always see their own membership rows (incl. while still 'pending').
create policy "members_select_own_or_same_neighborhood"
  on public.neighborhood_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_neighborhood_member(neighborhood_id)
  );

-- A user requests to join by inserting their own row (starts 'pending').
-- Invite-code validation happens in an Edge Function / RPC before this insert.
create policy "members_insert_self_pending"
  on public.neighborhood_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
  );

-- Users may edit their own address/visibility fields; admins/mods may change
-- status/role for anyone in their neighborhood (approve, suspend, promote).
create policy "members_update_self_fields"
  on public.neighborhood_members for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "members_update_admin"
  on public.neighborhood_members for update
  to authenticated
  using (public.is_neighborhood_admin(neighborhood_id))
  with check (public.is_neighborhood_admin(neighborhood_id));

-- Users can remove themselves (leave); admins can remove others.
create policy "members_delete_self_or_admin"
  on public.neighborhood_members for delete
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_neighborhood_admin(neighborhood_id)
  );

-- --- categories (shared, read-only for members) -----------------------------
create policy "categories_select_authenticated"
  on public.categories for select
  to authenticated
  using (true);

create policy "categories_write_service_role_only"
  on public.categories for all
  to service_role
  using (true) with check (true);

-- --- items ------------------------------------------------------------------
create policy "items_select_members"
  on public.items for select
  to authenticated
  using (public.is_neighborhood_member(neighborhood_id));

create policy "items_insert_members"
  on public.items for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and public.is_neighborhood_member(neighborhood_id)
  );

create policy "items_update_owner_or_admin"
  on public.items for update
  to authenticated
  using (
    owner_id = auth.uid()
    or public.is_neighborhood_admin(neighborhood_id)
  )
  with check (
    owner_id = auth.uid()
    or public.is_neighborhood_admin(neighborhood_id)
  );

create policy "items_delete_owner_or_admin"
  on public.items for delete
  to authenticated
  using (
    owner_id = auth.uid()
    or public.is_neighborhood_admin(neighborhood_id)
  );

-- --- loans --------------------------------------------------------------------
create policy "loans_select_participant_or_admin"
  on public.loans for select
  to authenticated
  using (
    borrower_id = auth.uid()
    or owner_id = auth.uid()
    or public.is_neighborhood_admin(neighborhood_id)
  );

-- Requesting a loan: must be the borrower, must be a member of the item's
-- neighborhood, and the item must actually belong there (checked via trigger).
create policy "loans_insert_borrower"
  on public.loans for insert
  to authenticated
  with check (
    borrower_id = auth.uid()
    and public.is_neighborhood_member(public.neighborhood_for_item(item_id))
  );

-- Status transitions: owner approves/denies/checks-out/marks-returned;
-- borrower can cancel their own pending request. Admins can override.
create policy "loans_update_participant_or_admin"
  on public.loans for update
  to authenticated
  using (
    borrower_id = auth.uid()
    or owner_id = auth.uid()
    or public.is_neighborhood_admin(neighborhood_id)
  )
  with check (
    borrower_id = auth.uid()
    or owner_id = auth.uid()
    or public.is_neighborhood_admin(neighborhood_id)
  );

-- No delete policy: loans are an audit trail and are never removed by users.

-- --- comments -----------------------------------------------------------------
create policy "comments_select_members"
  on public.comments for select
  to authenticated
  using (public.is_neighborhood_member(neighborhood_id));

create policy "comments_insert_members"
  on public.comments for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_neighborhood_member(public.neighborhood_for_item(item_id))
  );

create policy "comments_update_own"
  on public.comments for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "comments_delete_own_or_admin"
  on public.comments for delete
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_neighborhood_admin(neighborhood_id)
  );

-- --- favorites ------------------------------------------------------------------
create policy "favorites_select_own"
  on public.favorites for select
  to authenticated
  using (user_id = auth.uid());

create policy "favorites_insert_own"
  on public.favorites for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "favorites_delete_own"
  on public.favorites for delete
  to authenticated
  using (user_id = auth.uid());

-- --- reports (moderation queue) --------------------------------------------
create policy "reports_select_own_or_admin"
  on public.reports for select
  to authenticated
  using (
    reporter_id = auth.uid()
    or public.is_neighborhood_admin(neighborhood_id)
  );

create policy "reports_insert_members"
  on public.reports for insert
  to authenticated
  with check (
    reporter_id = auth.uid()
    and public.is_neighborhood_member(neighborhood_id)
  );

create policy "reports_update_admin_only"
  on public.reports for update
  to authenticated
  using (public.is_neighborhood_admin(neighborhood_id))
  with check (public.is_neighborhood_admin(neighborhood_id));

-- --- push_subscriptions -----------------------------------------------------
create policy "push_subs_all_own"
  on public.push_subscriptions for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ============================================================================
-- 7. SEED DATA (adjust/remove before production)
-- ============================================================================

insert into public.categories (name, icon) values
  ('Tools', 'wrench'),
  ('Outdoor & Garden', 'sprout'),
  ('Kitchen & Appliances', 'chef-hat'),
  ('Kids & Baby', 'baby'),
  ('Sports & Recreation', 'dumbbell'),
  ('Electronics', 'plug'),
  ('Books & Media', 'book'),
  ('Furniture', 'armchair'),
  ('Other', 'box');

-- Example neighborhood (delete before launch, or keep as your first tenant):
-- insert into public.neighborhoods (name, slug, city, state, invite_code)
-- values ('Hilltop', 'hilltop-98104', 'Seattle', 'WA', 'HILLTOP2026');
