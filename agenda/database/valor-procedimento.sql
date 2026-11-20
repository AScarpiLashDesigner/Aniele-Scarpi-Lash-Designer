create or replace function agenda_private.registrar_valor_procedimento()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  previous_appointments jsonb := '{}'::jsonb;
  appointment jsonb;
  previous jsonb;
  amount numeric;
begin
  if tg_op = 'UPDATE' then
    if new.data->'appointments' is not distinct from old.data->'appointments' then
      return new;
    end if;
    select coalesce(jsonb_object_agg(item->>'id', item), '{}'::jsonb)
      into previous_appointments
      from jsonb_array_elements(old.data->'appointments') item
      where item->>'id' is not null;
  end if;

  for appointment in
    select item from jsonb_array_elements(new.data->'appointments') item
    where item->>'status' in ('Confirmado', 'Realizado')
      and jsonb_typeof(item->'price') = 'number'
      and item->>'id' is not null
  loop
    previous := previous_appointments->(appointment->>'id');
    if previous->>'status' in ('Confirmado', 'Realizado')
       and previous->'price' = appointment->'price' then
      continue;
    end if;

    amount := (appointment->>'price')::numeric;
    if amount < 0 or amount > 99999.99 or amount <> round(amount, 2) then
      raise exception 'Informe um valor de procedimento válido.';
    end if;

    insert into public.pagamentos_studio as payment (owner_id, appointment_id, valor, status)
    values (new.owner_id, appointment->>'id', amount, 'pendente')
    on conflict (owner_id, appointment_id) do update
      set valor = excluded.valor, atualizado_em = now()
      where payment.status = 'pendente'
        and (
          payment.valor is null
          or (previous->>'status' in ('Confirmado', 'Realizado')
              and previous->'price' is distinct from appointment->'price')
        )
        and payment.valor is distinct from excluded.valor;
  end loop;
  return new;
end;
$$;

revoke all on function agenda_private.registrar_valor_procedimento() from public, anon, authenticated;

create trigger agenda_registrar_valor_procedimento
after insert or update of data on public.agenda_studio
for each row execute function agenda_private.registrar_valor_procedimento();

create or replace function public.aprovar_solicitacao_com_valor(p_id uuid, p_valor numeric)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  result jsonb;
begin
  if p_valor is null or p_valor < 0 or p_valor > 99999.99 or p_valor <> round(p_valor, 2) then
    raise exception 'Informe um valor de procedimento válido.';
  end if;

  result := public.decidir_solicitacao(p_id, true);
  update public.agenda_studio agenda
     set data = jsonb_set(agenda.data, array['appointments', (entry.position - 1)::text, 'price'], to_jsonb(p_valor)),
         version = agenda.version + 1,
         updated_at = now()
    from public.agenda_studio source
    cross join lateral jsonb_array_elements(source.data->'appointments') with ordinality as entry(item, position)
   where agenda.owner_id = (select auth.uid())
     and source.owner_id = agenda.owner_id
     and entry.item->>'id' = result->>'appointment_id';
  if not found then
    raise exception 'O atendimento confirmado não foi localizado.';
  end if;
  return result;
end;
$$;

revoke all on function public.aprovar_solicitacao_com_valor(uuid, numeric) from public, anon, authenticated;
grant execute on function public.aprovar_solicitacao_com_valor(uuid, numeric) to authenticated;
