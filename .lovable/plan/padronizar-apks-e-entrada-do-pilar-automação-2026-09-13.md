# Padronizar APKs e entrada do Pilar Automação

## Resultado esperado
- Todos os APKs usarão a mesma base visual do ícone do Pilar Fone: fundo azul-marinho, detalhe laranja e símbolo branco específico para cada produto.
- O Pilar Remotas permitirá informar a chave/código em posição vertical no celular e no tablet, mantendo a experiência horizontal nas TVs.
- O Pilar Automação terá uma tela própria de login, visualmente alinhada ao Pilar Fone, exibida depois da ativação pela chave.
- Após entrar, o Pilar Automação abrirá diretamente apenas o painel atribuído ao usuário e à empresa da chave, sem menus, chat, telefone ou fala.

## Implementação
1. Criar um gerador único dos ícones e aplicar os arquivos corretos em Pilar Fone, Automação, SMS, Remotas e Hub, preservando símbolos centrais distintos.
2. Ajustar a orientação das telas iniciais do Pilar Remotas e criar recursos de layout vertical para celular/tablet, sem alterar a exibição do conteúdo remoto em TV.
3. Adicionar ao APK Automação uma tela nativa de e-mail e senha entre a chave e o painel.
4. Autenticar diretamente no serviço existente, confirmar que o usuário pertence à empresa ativada e guardar a sessão com segurança no aparelho.
5. Abrir o endereço exclusivo do painel já autenticado; manter `app=1` e `barra=0` para não carregar navegação ou recursos paralelos.
6. Incrementar as versões dos APKs alterados e atualizar os textos de publicação quando necessário.

## Validação
- Compilar cada projeto Android afetado e verificar assinatura/instalação do APK.
- Conferir os ícones gerados em todas as densidades e no formato adaptável.
- Testar Pilar Remotas em retrato de celular/tablet e em paisagem de TV.
- Testar no Pilar Automação: chave válida, credenciais inválidas, usuário de outra empresa, painel não definido e entrada bem-sucedida no painel isolado.
- Validar que o aplicativo web continua compilando e que não há erros novos no preview.

## Observação técnica
- O login será nativo no APK, mas usará a autenticação atual e transferirá somente a sessão necessária para o painel interno. Nenhuma tela geral do sistema será mostrada nesse fluxo.