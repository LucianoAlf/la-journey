create table if not exists public.pdf_tokens (
  token uuid primary key,
  material_id uuid not null references public.generated_materials(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.pdf_tokens enable row level security;

drop policy if exists "pdf_tokens_public_valid_select" on public.pdf_tokens;
create policy "pdf_tokens_public_valid_select"
on public.pdf_tokens
for select
using (expires_at > now());

create index if not exists pdf_tokens_material_id_idx
on public.pdf_tokens(material_id);

create index if not exists pdf_tokens_expires_at_idx
on public.pdf_tokens(expires_at);
