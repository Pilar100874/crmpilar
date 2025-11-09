-- Create table for async report preview jobs
create table if not exists public.report_preview_jobs (
  id uuid primary key default gen_random_uuid(),
  report_id uuid,
  requested_by uuid,
  status text not null default 'pending',
  pdf_url text,
  truncated boolean,
  included integer,
  total integer,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.report_preview_jobs enable row level security;

drop policy if exists "preview_jobs_select_own" on public.report_preview_jobs;
create policy "preview_jobs_select_own"
  on public.report_preview_jobs
  for select
  to authenticated
  using (requested_by is null or requested_by = auth.uid());

drop policy if exists "preview_jobs_delete_own" on public.report_preview_jobs;
create policy "preview_jobs_delete_own"
  on public.report_preview_jobs
  for delete
  to authenticated
  using (requested_by = auth.uid());

create index if not exists idx_preview_jobs_requested_by 
  on public.report_preview_jobs(requested_by, created_at desc);