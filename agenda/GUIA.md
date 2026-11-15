# Agenda Aniele Scarpi — configuração inicial

Esta é uma versão independente do login e da hospedagem ChatGPT. O código fica no seu GitHub. Os registros devem ficar no seu projeto privado Supabase, protegidos por login e regras RLS. Não existe banco ou senha de demonstração dentro do código. A configuração real precisa ser concluída e testada antes de migrar o histórico.

## 1. Criar/conectar o banco na sua conta

Crie ou conecte sua conta Supabase. Crie um projeto para o estúdio e guarde as informações de recuperação da conta. Confira as condições e limites do plano no provedor; não há garantia de gratuidade permanente. Escolha a região e as configurações do seu projeto.

No SQL Editor de um projeto novo, execute `database/setup.sql` uma vez. O script cria `agenda_studio`, `agenda_history`, regras que limitam cada usuário aos próprios registros e um gatilho que preserva a versão anterior a cada atualização. Caso uma política já exista, a operação é cancelada em transação: não remova regras de segurança para forçar a execução.

Em Authentication > Users, crie a conta de acesso da proprietária, usando seu e-mail e senha própria. Guarde a senha de forma segura. Desative cadastros públicos se apenas você for usar a agenda. Não envie a senha por chat nem escreva senhas no GitHub. Recuperação de senha pode ser feita pelo painel da proprietária do projeto; confirme o e-mail de recuperação.

## 2. Conectar o site

Em Settings / API Keys, obtenha a Project URL e a chave **publicável** (`sb_publishable_…`) ou a antiga chave `anon`. Elas identificam o projeto e não substituem o login. Nunca coloque uma chave `service_role` ou `sb_secret_…` neste site.

Preencha a conexão na tela inicial da agenda. Ela fica registrada apenas no navegador para indicar o projeto; os registros das clientes ficam no banco. Para deixar a conexão preparada em todos os dispositivos, altere `config.js` com a URL e a chave publicável e salve no GitHub. Entre com a conta criada na etapa anterior. A sessão dura enquanto o navegador mantiver a aba/sessão; ao fechar ou sair, entre novamente.

## 3. Conferir antes de migrar

1. Com a conexão e login reais, crie uma cliente de teste e um atendimento de teste, sem dados reais.
2. Abra em outro dispositivo e confirme que ambos aparecem no mesmo login.
3. Saia da conta e confirme que os dados não aparecem; teste outra conta e confirme que ela não lê o banco da primeira.
4. Edite um atendimento e confira Configurações > Cópias anteriores no banco.
5. Baixe um backup JSON. Confira se o arquivo abre na consulta offline.
6. Só então use Recuperar registros de um backup com o JSON exportado da agenda anterior. Os IDs existentes são preservados e registros ausentes são adicionados.
7. Confira nomes, telefones, datas, técnicas e observações antes de parar de usar a versão anterior. Não publique o JSON/CSV das clientes no GitHub.

## 4. Uso diário

Cadastre clientes, atendimentos e disponibilidade. Marque como Realizado após o procedimento para gerar a manutenção. O prazo padrão é 21 dias, respeitando o prazo específico de cada cliente, o retorno específico do atendimento e as datas manuais.

Os botões de WhatsApp abrem mensagens preenchidas; você revisa e envia. A área Lembretes para amanhã usa a data de Brasília. A versão GitHub não herda automaticamente as notificações do ChatGPT: os lembretes aparecem quando você abre a agenda. Alertas com o site fechado exigem configurar uma automação separada apontada para este banco. As tarefas antigas continuam consultando apenas a agenda antiga até serem adaptadas.

Baixe um backup JSON ao encerrar atendimentos e guarde em dois locais privados, sob seu controle. CSV permite consultar os dados em planilhas. As versões anteriores são preservadas no mesmo banco a cada atualização; elas não substituem a cópia fora do provedor. Armazenamento e planos têm limites e devem ser acompanhados.

## Hospedagem

A pasta `agenda/` não modifica a página principal do estúdio. Todos os caminhos são relativos, permitindo transferir o site para outra hospedagem estática. O GitHub Pages é um serviço de páginas estáticas e tem restrições de uso comercial. Para uso operacional do estúdio, confirme as condições aplicáveis ou publique a mesma pasta em uma hospedagem que permita esse uso, em sua conta. O banco e o login continuam separados da hospedagem do visual.

## Manutenção do código

`src/` contém os arquivos editáveis; `app.js` e `app.css` são a versão compilada. Para recompilar localmente, instale Node.js e rode `npm install` e `npm run build` nesta pasta. Não é necessário recompilar para alterar apenas `config.js`.

Nenhum sistema oferece risco zero. O controle da conta, a proteção do login e as cópias externas são partes essenciais da continuidade da agenda.
