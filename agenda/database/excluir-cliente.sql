create or replace function public.excluir_cliente_studio(p_client_id text, p_confirm boolean default false, p_expected_version bigint default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
 owner uuid := auth.uid(); agenda jsonb; ver bigint; digital public.clientes_studio%rowtype;
 client jsonb; phone text; ids text[] := array[p_client_id]; n integer; appointments integer; result jsonb;
begin
 if owner is null then raise exception 'Entre novamente para excluir uma cliente.'; end if;
 select a.data,a.version into agenda,ver from public.agenda_studio a where a.owner_id=owner for update;
 agenda:=coalesce(agenda,'{"clients":[],"appointments":[]}'::jsonb);ver:=coalesce(ver,0);
 select c.* into digital from public.clientes_studio c where c.owner_id=owner and c.id::text=p_client_id for update;
 select c.value into client from jsonb_array_elements(coalesce(agenda->'clients','[]'::jsonb)) c where c.value->>'id'=p_client_id limit 1;
 if digital.id is null and client is null then raise exception 'Cliente não encontrada. Atualize a lista.';end if;
 phone:=regexp_replace(coalesce(digital.whatsapp,client->>'phone',''),'\D','','g');
 if length(phone) in (12,13) and left(phone,2)='55' then phone:=substr(phone,3);end if;
 if digital.id is null and length(phone)>=10 then
  select count(*) into n from public.clientes_studio c where c.owner_id=owner and regexp_replace(regexp_replace(c.whatsapp,'\D','','g'),'^55(?=[0-9]{10,11}$)','','g')=phone;
  if n>1 then raise exception 'Há mais de uma ficha com este telefone. Confira os cadastros antes de excluir.';end if;
  select c.* into digital from public.clientes_studio c where c.owner_id=owner and regexp_replace(regexp_replace(c.whatsapp,'\D','','g'),'^55(?=[0-9]{10,11}$)','','g')=phone for update;
 end if;
 if digital.id is not null then ids:=array_append(ids,digital.id::text);end if;
 if client is null then
  select count(*) into n from jsonb_array_elements(coalesce(agenda->'clients','[]'::jsonb)) c where c.value->>'id'=any(ids) or (length(phone)>=10 and regexp_replace(regexp_replace(c.value->>'phone','\D','','g'),'^55(?=[0-9]{10,11}$)','','g')=phone);
  if n>1 then raise exception 'Há mais de um cadastro da agenda com este telefone. Confira antes de excluir.';end if;
  select c.value into client from jsonb_array_elements(coalesce(agenda->'clients','[]'::jsonb)) c where c.value->>'id'=any(ids) or (length(phone)>=10 and regexp_replace(regexp_replace(c.value->>'phone','\D','','g'),'^55(?=[0-9]{10,11}$)','','g')=phone) limit 1;
  if client is not null then ids:=array_append(ids,client->>'id');end if;
 end if;
 select count(*) into appointments from jsonb_array_elements(coalesce(agenda->'appointments','[]'::jsonb)) a where a.value->>'clientId'=any(ids);
 result:=jsonb_build_object('name',coalesce(digital.nome,client->>'name'),'appointments',appointments,'version',ver);
 if not coalesce(p_confirm,false) then return result;end if;
 if p_expected_version is null or p_expected_version<>ver then raise exception 'A agenda mudou. Atualize a página e confira a exclusão novamente.';end if;
 if ver>0 then
  agenda:=jsonb_set(agenda,'{clients}',coalesce((select jsonb_agg(c.value order by c.ord) from jsonb_array_elements(coalesce(agenda->'clients','[]'::jsonb)) with ordinality c(value,ord) where not coalesce(c.value->>'id'=any(ids),false)),'[]'::jsonb));
  agenda:=jsonb_set(agenda,'{appointments}',coalesce((select jsonb_agg(a.value order by a.ord) from jsonb_array_elements(coalesce(agenda->'appointments','[]'::jsonb)) with ordinality a(value,ord) where not coalesce(a.value->>'clientId'=any(ids),false)),'[]'::jsonb));
  update public.agenda_studio set data=agenda,version=ver+1 where owner_id=owner and version=ver;
 end if;
 if digital.id is not null then delete from public.clientes_studio where id=digital.id and owner_id=owner;end if;
 return result||jsonb_build_object('deleted',true);
end;$$;
revoke all on function public.excluir_cliente_studio(text,boolean,bigint) from public,anon;
grant execute on function public.excluir_cliente_studio(text,boolean,bigint) to authenticated;