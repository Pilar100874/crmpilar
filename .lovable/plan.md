# Central de Atualizações em Apps

## Resultado
Criar um item lateral **Atualizações** dentro de Apps e concentrar nele tudo sobre versões, equipamentos e atualização remota. A tela antiga **Versões dos aplicativos** deixa de existir como item separado e passa a redirecionar para a nova central.

## O que será feito
- Reaproveitar na nova central o envio, publicação, download e exclusão das versões já existentes.
- Mostrar telas remotas e celulares registrados, versão instalada, última versão disponível, último contato e situação.
- Adicionar seleção individual ou em massa e a ação **Enviar atualização**.
- Para Pilar Remotas, reutilizar o comando remoto já existente e seu histórico de confirmação/erro.
- Para celulares Pilar SMS e Pilar Hub, criar uma fila segura de comandos por empresa; o aparelho consulta a fila junto da comunicação periódica, baixa a versão publicada e abre a instalação.
- Exibir o andamento por equipamento: aguardando, recebido, concluído ou erro.
- Manter a tela adaptada para computador, tablet e celular, com cartões nos tamanhos menores.
- Atualizar menu principal, rota antiga e busca por voz para apontarem à nova central.

## Limite do Android
Em celulares Android comuns, o sistema pode exigir a confirmação do usuário para instalar o APK. O envio e o download serão remotos; a confirmação final só é automática em aparelhos configurados como dispositivo gerenciado.

## Detalhes técnicos
- Criar tabela multiempresa para comandos de atualização de aplicativos, com permissões e regras de acesso por estabelecimento.
- Criar função pública autenticada por token do aparelho para buscar e confirmar comandos de celular.
- Integrar a consulta nos serviços em segundo plano do Pilar SMS e Pilar Hub.
- Manter os comandos de telas remotas em `tv_commands`, usando `atualizar_versao`.
- Remover os controles de atualização das telas antigas de Apps, sem apagar os pacotes publicados.

## Validação
- Confirmar envio individual e em massa para telas remotas e celulares.
- Confirmar atualização dos estados após o aparelho receber o comando.
- Conferir versões publicadas, equipamentos e histórico nos três tamanhos de tela.
- Executar testes e validar a compilação web; os APKs seguem pelo fluxo automático de geração assinada.
