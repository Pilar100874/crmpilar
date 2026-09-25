# Nova versão do Painel de Atendimento

## Objetivo
Criar uma nova tela chamada **Painel de Atendimento**, como item adicional dentro de **Chats**, fiel às referências de desktop, tablet e celular. A tela atual permanecerá disponível e sem mudanças de funcionamento.

A nova versão continuará usando os dados reais, autenticação, permissões, canais, histórico, agenda, cadastro, vínculos e regras existentes. Não será publicada automaticamente.

## Decisões confirmadas
- Nome no menu: **Painel de Atendimento**.
- Próximos contatos conflitantes no envio em massa: **revisar cada conflito antes de enviar**, escolhendo manter ou substituir.
- Mensagens ou e-mails sem contato correspondente: mostrar em **Recebidos** como **não identificado**, com ação para localizar ou cadastrar o contato.

## O que será reaproveitado
- Conversas, mensagens, anexos, histórico e recebimento em tempo real do painel atual.
- Telefone/Pilar Fone e regras atuais de discagem, sem alterar UCM, WebSocket ou TLS.
- Atendimento por WhatsApp, telefone, e-mail, visita e orçamento.
- Agenda, filtros de equipe, contatos assumidos, indicadores e regras de cartões pendentes.
- Finalização, resumo obrigatório, próxima data, regras de calendário e tratamento de conflitos.
- Formulários atuais de contato e empresa, pesquisa, cadastro e vínculo nos dois sentidos.
- Regra de empresa principal e confirmações obrigatórias antes de desvincular ou excluir.
- Infraestrutura atual de envio em massa, modelos, respostas rápidas, galeria e permissões de campanha.
- Componentes visuais e controles existentes, adaptados ao novo desenho em vez de recriados sem necessidade.

## Etapa 1 — Estrutura isolada e dados compartilhados
- Adicionar a rota nova e o item **Painel de Atendimento** no menu de Chats, permissões internas e busca por voz.
- Manter `/atendimento` como está e criar uma página independente para a nova versão.
- Extrair da tela atual apenas a lógica compartilhável de carregamento, seleção, mensagens, agenda e indicadores, evitando duplicar consultas e assinaturas em tempo real.
- Preservar separadamente na nova tela: contato selecionado, canal, filtros, datas, posição da fila, largura/recolhimento do cadastro e rascunhos.

## Etapa 2 — Estrutura responsiva fiel às referências
### Desktop
- Navegação compacta, cabeçalho com busca e **Agendar** e faixa de datas com contagens reais.
- Três áreas: **Fila do dia**, **Atendimento** e **Cadastro e vínculos**.
- Painel direito recolhível e redimensionável, com preferência salva; ao recolher, o atendimento ocupa o espaço livre.

### Tablet
- Paisagem: fila e atendimento lado a lado; cadastro em painel lateral sobreposto.
- Retrato: alternância entre fila e atendimento, sem comprimir colunas; cadastro sobreposto com retorno ao contexto anterior.

### Celular
- Quatro telas do mesmo fluxo: **Agenda**, **Atendimento**, **Cadastro e vínculos** e **Finalização**.
- Navegação de retorno preservando contato, filtros, rolagem e rascunhos.
- Seleção em massa ativada somente pelo comando **Selecionar**.
- Controles com área mínima de toque, foco visível, teclado virtual seguro e nenhuma rolagem horizontal.

## Etapa 3 — Faixa de datas e fila unificada
- Montar **Atrasados**, **Hoje** e próximos dias com contagens obtidas da agenda real.
- Criar filtros **Tudo / Agendados / Recebidos** e ordenação por prioridade, atraso, horário e mensagens novas.
- Unificar tarefa agendada e mensagem recebida do mesmo contato em uma única linha, sem duplicação.
- Exibir contato, empresa, motivo, canal, horário e não lidas, usando cor somente para seleção, atraso e novidade.
- Manter o contato selecionado ao trocar canal ou data quando ele continuar no escopo.
- Mostrar recebidos não identificados com ações **Localizar contato** e **Cadastrar contato**.

## Etapa 4 — Área de atendimento
- Reorganizar os canais WhatsApp, telefone, e-mail e visita conforme a referência, mantendo os recursos reais de cada canal.
- Se faltar telefone, WhatsApp ou e-mail, explicar o dado ausente e oferecer acesso direto à edição.
- Preservar anexos, histórico, orçamento, respostas rápidas e recebimento em tempo real.
- Guardar rascunho por contato e canal ao trocar de tela, abrir cadastro ou mudar a orientação.
- Abrir histórico sem desmontar nem limpar o atendimento atual.

## Etapa 5 — Cadastro e vínculos no mesmo painel
- Criar os contextos **Contato** e **Empresa** dentro do painel lateral ou da tela móvel.
- Permitir edição ao clicar/tocar no valor, com `Enter` ou confirmação para salvar e `Esc` ou cancelamento para desfazer.
- Manter o valor digitado quando o salvamento falhar e mostrar o erro junto ao campo.
- Separar campos editáveis dos comandos de ligar, enviar mensagem, enviar e-mail e abrir cadastro.
- No contato: listar empresas e pesquisar por nome ou CNPJ sem sair do atendimento.
- Na empresa: listar contatos e pesquisar por nome, telefone ou e-mail; oferecer **Cadastrar e vincular** quando não existir.
- Impedir vínculo duplicado, preservar a regra de vínculo principal e garantir que o primeiro vínculo seja principal quando ainda não houver outro.
- Abrir cadastros relacionados no mesmo painel com ação de voltar; desvincular nunca excluirá o cadastro.

## Etapa 6 — Finalizar e reagendar
- Transformar a finalização em área integrada no desktop/tablet e tela própria no celular.
- Campos: resultado, resumo/observações, próxima data, horário e canal do próximo contato.
- Mostrar o resumo do próximo contato antes de salvar.
- Reutilizar obrigatoriedades e exceções atuais, inclusive resumo obrigatório para telefone e visita e ajustes pelas regras do calendário.
- Desabilitar repetição de clique durante o salvamento e preservar todos os campos em erro.
- Atualizar fila, contagens e agenda somente após conclusão integral.

## Etapa 7 — Envio em massa em etapas
- Fluxo: selecionar contatos → escolher WhatsApp ou e-mail → preparar mensagem → definir retorno → revisar → enviar.
- Separar claramente destinatários aptos e sem o dado necessário para o canal; inaptos não serão enviados.
- Mostrar a regra de próximo contato e os agendamentos existentes antes da confirmação.
- Para cada conflito, permitir **manter a data atual** ou **substituir pela nova regra**, conforme decidido.
- Processar por destinatário, registrar sucesso ou falha real e permitir tentar novamente somente os que falharem.
- Nunca contar falhas como concluídas nem fechar a revisão enquanto houver resultado sem tratamento.

## Alterações de banco e regras — etapa separada
Estas mudanças são necessárias para cumprir consistência e evitar operações parciais; serão apresentadas e aplicadas antes da integração final:

1. **Finalização atômica:** criar uma operação transacional no backend para registrar o atendimento, concluir a tarefa atual e criar/manter o próximo contato como uma única ação. Hoje essas gravações são sequenciais e podem terminar pela metade.
2. **Idempotência:** impedir finalização duplicada por clique repetido ou chamadas concorrentes.
3. **Unicidade da agenda:** reforçar no backend a regra de uma tarefa aberta por contato e usuário, sem depender somente da tela.
4. **Resultado em massa:** registrar resultado individual e permitir nova tentativa segura apenas para falhas.
5. **Canal do próximo contato e horário:** primeiro reutilizar os campos atuais; se o modelo atual não conservar ambos de forma confiável, adicionar somente os campos mínimos necessários.
6. **Recebidos não identificados:** usar os identificadores já existentes nas conversas/e-mails; criar persistência adicional somente se a relação temporária não puder ser mantida com segurança.

Não haverá mudança nas integrações de telefonia, no UCM, no WebSocket ou no TLS.

## Ordem de entrega no preview
1. Nova rota, menu e estrutura responsiva com dados reais da fila.
2. Atendimento por canais e preservação de contexto/rascunhos.
3. Cadastro, edição inline e vínculos.
4. Finalização transacional e reagendamento.
5. Envio em massa com revisão de conflitos e relatório por destinatário.
6. Refinamento visual, acessibilidade e correções encontradas na validação.

Cada etapa será validada no preview antes de avançar; a tela atual continuará como alternativa durante todo o processo.

## Validação
- Desktop: 1440 e 1920 px.
- Tablet: retrato e paisagem.
- Celular: 360, 390 e 430 px.
- Abrir atendimento por agendado, recebido e item não identificado.
- Trocar canal, data, orientação e cadastro sem perder cliente, filtros, rolagem ou rascunho.
- Relacionar mensagem recebida ao contato agendado sem criar linha duplicada.
- Editar contato/empresa e testar vínculo, criação, principal, duplicidade e desvinculação.
- Finalizar com sucesso, erro intermediário, clique repetido e conflito de próxima data.
- Confirmar que fila e agenda só mudam após a operação completa.
- Envio em massa com aptos, inaptos, conflito de agenda, falha parcial e nova tentativa.
- Navegação por teclado, foco visível, leitores de tela, toque e ausência de rolagem horizontal.

## Premissas adotadas
- A nova tela coexistirá com o painel atual até validação completa.
- O envio em massa seguirá as permissões e regras anti-bloqueio atuais; não será criado envio paralelo fora da infraestrutura existente.
- As preferências da nova tela terão chaves próprias para não alterar o comportamento do painel atual.
- Nenhuma publicação será feita sem pedido explícito.
