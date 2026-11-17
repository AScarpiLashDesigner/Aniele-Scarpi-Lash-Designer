create table public.site_eventos (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default '7e2fd9f8-959a-4d2d-b4e3-ffb46be58b91',
 ocorrido_em timestamptz not null default now(),
 evento text not null check (evento in ('visita','agendar','whatsapp')),
 pagina text not null check (pagina in ('inicio','agendamento')),
 origem text not null check (origem in ('instagram','google','facebook','direto','outros')),
 constraint site_eventos_owner check (owner_id = '7e2fd9f8-959a-4d2d-b4e3-ffb46be58b91')
);
alter table public.site_eventos enable row level security;
revoke all on public.site_eventos from anon, authenticated;
grant insert (evento,pagina,origem) on public.site_eventos to anon, authenticated;
grant select on public.site_eventos to authenticated;
create policy site_registrar on public.site_eventos for insert to anon, authenticated
 with check (owner_id = '7e2fd9f8-959a-4d2d-b4e3-ffb46be58b91');
create policy site_dona_ler on public.site_eventos for select to authenticated
 using ((select auth.uid()) = owner_id);
create index site_eventos_data on public.site_eventos (ocorrido_em);
create function public.site_resumo(p_periodo text default '7dias')
returns jsonb language sql stable security invoker set search_path = '' as $$
with limites as (
 select (now() at time zone 'America/Sao_Paulo')::date as hoje
), datas as (
 select hoje,
 case p_periodo when 'hoje' then hoje when 'mes' then date_trunc('month',hoje)::date else hoje-6 end as inicio
 from limites
), base as (
 select evento,pagina,origem,(ocorrido_em at time zone 'America/Sao_Paulo')::date as dia
 from public.site_eventos
 where ocorrido_em >= (select least(inicio,date_trunc('month',hoje)::date,hoje-6)::timestamp at time zone 'America/Sao_Paulo' from datas)
), periodo as (
 select * from base where dia between (select inicio from datas) and (select hoje from datas)
)
select jsonb_build_object(
 'hoje',(select count(*) from base where evento='visita' and dia=(select hoje from datas)),
 'sete_dias',(select count(*) from base where evento='visita' and dia >= (select hoje-6 from datas)),
 'mes',(select count(*) from base where evento='visita' and dia >= (select date_trunc('month',hoje)::date from datas)),
 'visitas',(select count(*) from periodo where evento='visita'),
 'agendar',(select count(*) from periodo where evento='agendar'),
 'whatsapp',(select count(*) from periodo where evento='whatsapp'),
 'origens',coalesce((select jsonb_agg(to_jsonb(t)) from (select origem,count(*) as total from periodo where evento='visita' group by origem order by count(*) desc) t),'[]'::jsonb),
 'paginas',coalesce((select jsonb_agg(to_jsonb(t)) from (select pagina,count(*) as total from periodo where evento='visita' group by pagina order by count(*) desc) t),'[]'::jsonb),
 'dias',coalesce((select jsonb_agg(to_jsonb(t) order by t.dia) from (
 select d::date as dia,count(p.evento) as total from datas,
 lateral generate_series(inicio::timestamp,hoje::timestamp,interval '1 day') d
 left join periodo p on p.dia=d::date and p.evento='visita'
 group by d
 ) t),'[]'::jsonb)
);
$$;
revoke all on function public.site_resumo(text) from public,anon;
grant execute on function public.site_resumo(text) to authenticated;
comment on table public.site_eventos is 'Contagem sem cookies ou identificadores de visitantes. Apenas páginas públicas e origens por categoria; leitura exclusiva da dona.';
