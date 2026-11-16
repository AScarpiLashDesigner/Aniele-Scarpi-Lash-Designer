begin;
create function public.feedback_primeiro_nome() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 new.nome := left((regexp_split_to_array(ltrim(btrim(new.nome),'@'), '[[:space:]_.]+'))[1],30);
 return new;
end $$;
create trigger feedback_primeiro_nome before insert or update of nome on public.feedback_studio for each row execute function public.feedback_primeiro_nome();
update public.feedback_studio set nome=nome;
update public.feedback_studio set nome='Gil',imagem_path=null where id='31ec5cfc-380c-42aa-8802-004863ef4287';
notify pgrst,'reload schema';
commit;