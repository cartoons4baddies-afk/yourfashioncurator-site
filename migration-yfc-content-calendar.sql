-- YFC Content Calendar: run ONCE in Supabase SQL Editor.
-- Private planning entries, visible and editable only to approved editors.
create table if not exists public.editorial_calendar (
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(title) between 1 and 180),
 scheduled_for timestamptz not null,
 channel text not null check(channel in ('Website','Instagram','TikTok','Pinterest','Newsletter','Other')),
 content_type text not null default 'Editorial' check (char_length(content_type) <= 80),
 campaign text not null default '' check (char_length(campaign) <= 120),
 status text not null default 'Idea' check (status in ('Idea','Draft','In progress','Scheduled','Published')),
 notes text not null default '' check (char_length(notes) <= 2500),
 content_url text not null default '' check (char_length(content_url) <= 600),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.editorial_calendar enable row level security;
drop policy if exists "YFC editors can view calendar" on public.editorial_calendar;
create policy "YFC editors can view calendar" on public.editorial_calendar
 for select to authenticated using (exists (select 1 from public.editors e where e.user_id=auth.uid()));
drop policy if exists "YFC editors can create calendar entries" on public.editorial_calendar;
create policy "YFC editors can create calendar entries" on public.editorial_calendar
 for insert to authenticated with check (exists (select 1 from public.editors e where e.user_id=auth.uid()));
drop policy if exists "YFC editors can update calendar entries" on public.editorial_calendar;
create policy "YFC editors can update calendar entries" on public.editorial_calendar
 for update to authenticated
 using (exists (select 1 from public.editors e where e.user_id=auth.uid()))
 with check (exists (select 1 from public.editors e where e.user_id=auth.uid()));
drop policy if exists "YFC editors can delete calendar entries" on public.editorial_calendar;
create policy "YFC editors can delete calendar entries" on public.editorial_calendar
 for delete to authenticated using (exists (select 1 from public.editors e where e.user_id=auth.uid()));
create index if not exists editorial_calendar_scheduled_idx on public.editorial_calendar(scheduled_for);
