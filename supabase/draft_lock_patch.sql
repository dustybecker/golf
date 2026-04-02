alter table public.tournament_meta
  add column if not exists draft_open boolean not null default false;

update public.tournament_meta
set draft_open = false
where draft_open is null;
