-- Avaliações públicas: somente conteúdo consentido e aprovado fica visível.
begin;
create table public.feedback_studio (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default '7e2fd9f8-959a-4d2d-b4e3-ffb46be58b91' references auth.users(id),
 nome text not null check (char_length(btrim(nome)) between 2 and 50),
 nota smallint check (nota between 1 and 5),
 comentario text not null check (char_length(btrim(comentario)) between 10 and 800),
 origem text not null default 'site' check (origem in ('site','whatsapp','instagram')),
 status text not null default 'pendente' check (status in ('pendente','aprovado','recusado')),
 consentimento boolean not null check (consentimento = true),
 created_at timestamptz not null default now(),
 check (owner_id = '7e2fd9f8-959a-4d2d-b4e3-ffb46be58b91'),
 check (origem <> 'site' or nota is not null)
);
alter table public.feedback_studio enable row level security;
revoke all on public.feedback_studio from anon,authenticated;
grant select on public.feedback_studio to anon,authenticated;
grant insert(id,nome,nota,comentario,consentimento) on public.feedback_studio to anon;
grant insert,update on public.feedback_studio to authenticated;
create policy feedback_publico_le_aprovados on public.feedback_studio
 for select to anon,authenticated using (status = 'aprovado');
create policy feedback_publico_envia_pendente on public.feedback_studio
 for insert to anon,authenticated with check (
  owner_id = '7e2fd9f8-959a-4d2d-b4e3-ffb46be58b91'
  and status = 'pendente' and origem = 'site' and nota is not null and consentimento = true
 );
create policy feedback_dona_le_todos on public.feedback_studio
 for select to authenticated using (owner_id = (select auth.uid()));
create policy feedback_dona_cadastra on public.feedback_studio
 for insert to authenticated with check (owner_id = (select auth.uid()));
create policy feedback_dona_modera on public.feedback_studio
 for update to authenticated using (owner_id = (select auth.uid()))
 with check (owner_id = (select auth.uid()));
create index feedback_moderacao_idx on public.feedback_studio(owner_id,status,created_at desc,id desc);
create index feedback_publico_idx on public.feedback_studio(created_at desc,id desc) where status = 'aprovado';
comment on table public.feedback_studio is 'Depoimentos consentidos; publicação depende de aprovação da dona do estúdio.';
notify pgrst,'reload schema';
commit;
