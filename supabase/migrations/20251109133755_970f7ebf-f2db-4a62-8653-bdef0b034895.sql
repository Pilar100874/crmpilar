-- Create table for async report preview jobs
create table if not exists public.report_preview_jobs (
  id uuid primary key default gen_random_uuid(),
  report_id uuid,
  requested_by uuid,
  status text not null default 'pending', -- pending | ready | error
  pdf_url text,
  truncated boolean,
  included integer,
  total integer,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger to keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_report_preview_jobs_updated
before update on public.report_preview_jobs
for each row execute function public.set_updated_at();

-- Enable RLS
alter table public.report_preview_jobs enable row level security;

-- Policies: allow authenticated users to read their own jobs
create policy "preview_jobs_select_own"
  on public.report_preview_jobs
  for select
  to authenticated
  using (
    requested_by is null or requested_by = auth.uid()
  );

-- Optional: allow users to delete their own jobs
create policy "preview_jobs_delete_own"
  on public.report_preview_jobs
  for delete
  to authenticated
  using (
    requested_by = auth.uid()
  );

-- We do not create insert/update policies; edge functions use service role and bypass RLS.

-- Helpful index
create index if not exists idx_preview_jobs_requested_by on public.report_preview_jobs(requested_by, created_at desc);
