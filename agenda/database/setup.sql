-- Execute UMA VEZ no SQL Editor do projeto Supabase da proprietária.
-- Não contém dados das clientes. Nunca desligue RLS para corrigir acesso.
begin;
create table if not exists public.agenda_studio (
 owner_id uuid primary key references auth.users(id) on delete restrict,
 data jsonb not null check (jsonb_typeof(data) = 'object' and jsonb_typeof(data->'clients')='array' and jsonb_typeof(data->'appointments')='array' and jsonb_typeof(data->'windows')='array' and octet_length(data::text)<=3000000),
 version bigint not null check (version>=1),
 updated_at timestamptz not null default now()
);
create table if not exists public.agenda_history (
 owner_id uuid not null references auth.users(id) on delete restrict,
 version bigint not null,
 data jsonb not null,
 saved_at timestamptz not null default now(),
 primary key(owner_id,version)
);
alter table public.agenda_studio enable row level security;
alter table public.agenda_history enable row level security;
revoke all on public.agenda_studio from anon,authenticated;
revoke all on public.agenda_history from anon,authenticated;
grant select,insert,update on public.agenda_studio to authenticated;
grant select on public.agenda_history to authenticated;
create policy "ler propria agenda" on public.agenda_studio for select to authenticated using ((select auth.uid())=owner_id);
create policy "criar propria agenda" on public.agenda_studio for insert to authenticated with check ((select auth.uid())=owner_id and version=1);
create policy "atualizar propria agenda" on public.agenda_studio for update to authenticated using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);
create policy "ler proprias copias" on public.agenda_history for select to authenticated using ((select auth.uid())=owner_id);
create or replace function public.agenda_preserve_version()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.owner_id<>old.owner_id then raise exception 'Proprietaria imutavel';end if;
 if new.version<>old.version+1 then raise exception 'Versao invalida; recarregue a agenda';end if;
 insert into public.agenda_history(owner_id,version,data) values(old.owner_id,old.version,old.data);
 new.updated_at=now();
 return new;
end;$$;
revoke all on function public.agenda_preserve_version() from public,anon,authenticated;
create trigger agenda_version_backup before update on public.agenda_studio for each row execute function public.agenda_preserve_version();
commit;
