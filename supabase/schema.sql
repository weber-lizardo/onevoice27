-- =====================================================================
-- OneVoice27 - Turnos de Oração
-- Execute este script no Supabase: Dashboard > SQL Editor > New query
-- =====================================================================

-- ---------------------------------------------------------------------
-- Participantes
-- ---------------------------------------------------------------------
create table if not exists public.onevoice27_participantes (
  id          bigint generated always as identity primary key,
  nome        text        not null check (length(trim(nome)) > 0),
  campo       text        not null default '',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Turnos de oração (duplas)
-- ---------------------------------------------------------------------
create table if not exists public.onevoice27_turno_oracao (
  id                bigint generated always as identity primary key,
  horario_inicial   timestamptz not null,
  horario_final     timestamptz not null,
  participante1_id  bigint      not null,
  participante2_id  bigint      not null,
  created_at        timestamptz not null default now(),

  constraint onevoice27_turno_p1_fkey foreign key (participante1_id)
    references public.onevoice27_participantes (id) on delete restrict,
  constraint onevoice27_turno_p2_fkey foreign key (participante2_id)
    references public.onevoice27_participantes (id) on delete restrict,
  constraint onevoice27_turno_horario_chk check (horario_final > horario_inicial),
  constraint onevoice27_turno_dupla_chk   check (participante1_id <> participante2_id)
);

create index if not exists onevoice27_turno_final_idx
  on public.onevoice27_turno_oracao (horario_final);
create index if not exists onevoice27_turno_inicial_idx
  on public.onevoice27_turno_oracao (horario_inicial);

-- ---------------------------------------------------------------------
-- Segurança (Row Level Security)
--   * Leitura pública (a TV usa a chave "anon" sem login)
--   * Cadastro/edição/exclusão apenas para usuários autenticados
-- ---------------------------------------------------------------------
alter table public.onevoice27_participantes enable row level security;
alter table public.onevoice27_turno_oracao  enable row level security;

drop policy if exists "leitura publica"       on public.onevoice27_participantes;
drop policy if exists "escrita autenticados"  on public.onevoice27_participantes;
drop policy if exists "leitura publica"       on public.onevoice27_turno_oracao;
drop policy if exists "escrita autenticados"  on public.onevoice27_turno_oracao;

create policy "leitura publica" on public.onevoice27_participantes
  for select to anon, authenticated using (true);
create policy "escrita autenticados" on public.onevoice27_participantes
  for all to authenticated using (true) with check (true);

create policy "leitura publica" on public.onevoice27_turno_oracao
  for select to anon, authenticated using (true);
create policy "escrita autenticados" on public.onevoice27_turno_oracao
  for all to authenticated using (true) with check (true);

grant select on public.onevoice27_participantes, public.onevoice27_turno_oracao to anon;
grant select, insert, update, delete
  on public.onevoice27_participantes, public.onevoice27_turno_oracao to authenticated;
