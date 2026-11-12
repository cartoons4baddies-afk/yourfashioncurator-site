-- Yourfashioncurator: enable the Curating TV Fashion category for existing databases.
-- Run once in Supabase SQL Editor. Safe for existing posts and other categories.
begin;
alter table public.posts drop constraint if exists posts_category_check;
alter table public.posts add constraint posts_category_check
 check (category in (
  'bring-back','predictions','brands','beauty','shop','basics',
  'archives','jewelry','collections','gifts','tv-fashion'
 ));
commit;
