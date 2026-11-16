begin;
alter table public.feedback_studio add column imagem_path text
 check (imagem_path is null or imagem_path ~ '^imagens/feedback-[a-z0-9-]+[.]jpg$');
notify pgrst,'reload schema';
commit;