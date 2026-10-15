-- How many pages (images) a carousel has, e.g. 7 for a 7-image Diwali carousel.
-- Only used when content_type = 'carousel'. Instagram allows up to 20.
alter table public.posts
  add column if not exists slide_count smallint
  check (slide_count between 1 and 20);
