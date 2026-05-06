-- Per-baby milestone checklist: lets families check off month-by-month
-- developmental milestones for the first year and attach a photo + note.

alter table public.milestones
  add column if not exists photo_path text;
