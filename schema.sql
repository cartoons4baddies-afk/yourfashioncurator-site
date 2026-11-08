-- Run once in Supabase SQL Editor. Do NOT place secret keys into the web files.
create table if not exists public.editors (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 180),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  excerpt text not null default '',
  category text not null check(category in ('bring-back','predictions','brands','beauty','shop','basics','archives','jewelry','collections')),
  cover_url text,
  blocks jsonb not null default '[]'::jsonb check (jsonb_typeof(blocks)='array'),
  status text not null default 'draft' check (status in ('draft','published')),
  featured boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.site_settings (
 key text primary key check (key in ('intro','about','instagram','tiktok','email')),
 value text not null default ''
);
create or replace function public.update_post_timestamp() returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end $$;
drop trigger if exists posts_updated_at on public.posts;
create trigger posts_updated_at before update on public.posts for each row execute function public.update_post_timestamp();

alter table public.editors enable row level security;
alter table public.posts enable row level security;
alter table public.site_settings enable row level security;

-- Nobody can add themselves as editor from the website.
create policy "Editor reads own permission" on public.editors for select to authenticated using (user_id=auth.uid());

create policy "Public can read published posts" on public.posts for select to anon,authenticated using (
 status='published' or exists(select 1 from public.editors e where e.user_id=auth.uid())
);
create policy "Editors insert posts" on public.posts for insert to authenticated with check (
 exists(select 1 from public.editors e where e.user_id=auth.uid())
);
create policy "Editors update posts" on public.posts for update to authenticated using (
 exists(select 1 from public.editors e where e.user_id=auth.uid())
) with check (
 exists(select 1 from public.editors e where e.user_id=auth.uid())
);
create policy "Editors delete posts" on public.posts for delete to authenticated using (
 exists(select 1 from public.editors e where e.user_id=auth.uid())
);
create policy "Public reads settings" on public.site_settings for select to anon,authenticated using (true);
create policy "Editors add settings" on public.site_settings for insert to authenticated with check (
 exists(select 1 from public.editors e where e.user_id=auth.uid())
);
create policy "Editors update settings" on public.site_settings for update to authenticated using (
 exists(select 1 from public.editors e where e.user_id=auth.uid())
) with check (
 exists(select 1 from public.editors e where e.user_id=auth.uid())
);
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('media','media',true,8388608,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public=true,file_size_limit=8388608,allowed_mime_types=excluded.allowed_mime_types;
create policy "Public view media" on storage.objects for select to anon,authenticated using(bucket_id='media');
create policy "Editor upload media" on storage.objects for insert to authenticated with check (
 bucket_id='media' and exists(select 1 from public.editors e where e.user_id=auth.uid())
);
create policy "Editor delete media" on storage.objects for delete to authenticated using (
 bucket_id='media' and exists(select 1 from public.editors e where e.user_id=auth.uid())
);

-- AFTER creating your admin user in Supabase Authentication -> Users, run separately:
-- insert into public.editors(user_id) values ('YOUR-AUTH-USER-UUID');
