-- Run this ONCE in Supabase SQL Editor to enable the new Gift Ideas category.
-- Existing articles, editor accounts and settings are preserved.
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_category_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_category_check
CHECK (category IN ('bring-back','predictions','brands','beauty','shop','basics','archives','jewelry','collections','gifts'));
