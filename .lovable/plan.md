# Redesenho total do Atendimento

## Objetivo
Transformar o Atendimento em uma agenda de relacionamento única, inspirada nas três referências enviadas, sem trocar banco, autenticação, permissões, integrações, histórico ou regras já consolidadas.

O trabalho será entregue por etapas no preview. Cada etapa deve manter os canais reais funcionando e terminar com validação visual e funcional antes da próxima.

## Diagnóstico atual
- A tela já reúne agenda, WhatsApp, telefone, e-mail, visita, orçamento, histórico, cadastro, vínculos e envio em massa, mas concentra quase tudo em uma página muito extensa e em estados separados por canal.
- O desktop atual mostra uma lista estreita e o calendário completo; a referência pede uma fila operacional à esquerda, o atendimento ativo no centro e cadastro/vínculos à direita.
- Tablet e celular já possuem navegação própria, porém há estruturas duplicadas e o celular ainda expõe seis abas técnicas em vez das quatro telas do fluxo solicitado.
- A troca de canal já tenta manter o cliente selecionado. Histórico, anexos, telefonia, WhatsApp, e-mail e orçamentos já usam dados reais.
- O painel unificado já permite editar contato, vincular/desvincular empresa e abrir dados relacionados, mas a edição não é campo a campo e o painel não tem largura ajustável persistida.
- A finalização já exige próximo contato e, em telefone/visita, resumo; porém ainda não possui horário/canal no formulário completo e grava registro, conclusão e retorno em operações separadas, permitindo sucesso parcial.
- Existem fluxos duplicados de envio em massa. O assistente mais completo já cobre canal, filtros, seleção, conteúdo, prévia, data e confirmação, mas o processamento e os retornos não estão consolidados de forma segura.
- Há inconsistências reais a corrigir antes da nova experiência: alguns fluxos usam estados/origens inválidos para as regras atuais da agenda e há caminhos antigos que não gravam pelo mesmo mecanismo do calendário.

## O que será reaproveitado
- Banco, autenticação, permissões por equipe e resolução de gerente/vendedor.
- `calendario_tarefas`, `atendimento_registros`, conversas, mensagens, e-mails, orçamentos, contatos, empresas e vínculos existentes.
- Integrações atuais de WhatsApp, e-mail, Pilar Fone/PABX, anexos, histórico e atualização em tempo real.
- Regras atuais de uma tarefa aberta por contato/usuário, datas permitidas, fim de semana, horário comercial, inativação e bloqueio de troca enquanto existe atendimento pendente.
- Cartões e indicadores compartilhados, painel de detalhes unificado, filtros globais, histórico do cliente e assistente completo de envio em massa.
- Navegação lateral principal do CRM, mantendo-a compactável em vez de criar uma navegação paralela.

## Etapa 1 — Base segura e estado único do Atendimento
- Separar o grande arquivo atual em uma camada de dados/ações e componentes visuais menores, sem alterar comportamento.
- Criar um estado único de contexto: contato, compromisso, canal ativo, filtros, posição da fila, painel aberto e tela móvel.
- Preservar o mesmo contato ao alternar WhatsApp, telefone, e-mail e visita.
- Persistir preferências de interface: painel direito aberto/recolhido, largura inicial média ajustável e densidade da fila.
- Adicionar rascunhos por contato e canal para WhatsApp e e-mail, preservando texto e anexos ao trocar de tela.

## Etapa 2 — Estrutura responsiva das referências
### Desktop
- Navegação lateral compacta existente.
- Cabeçalho com “Minha agenda”, busca global e ação “Agendar”.
- Faixa horizontal de datas com contagens reais de atrasados, hoje e próximos dias.
- Três áreas: Fila do dia, Atendimento e Cadastro e vínculos.
- Painel direito iniciando em largura média, redimensionável, ampliável e recolhível; o atendimento ocupa automaticamente o espaço liberado.

### Tablet
- Paisagem: fila e atendimento lado a lado; cadastro abre sobreposto pela lateral.
- Retrato: navegação entre fila e atendimento, sem comprimir colunas; cadastro sobreposto e contexto preservado.

### Celular
- Quatro telas: Agenda, Atendimento, Cadastro e Finalização.
- Navegação inferior compacta somente onde fizer sentido no fluxo.
- Retorno entre telas preservando contato, filtros, rolagem da fila, rascunhos e formulário de finalização.
- Áreas de toque mínimas de 44×44 px, teclado virtual sem esconder campos e respeito às áreas seguras.

## Etapa 3 — Fila do dia unificada
- Substituir a divisão visual por abas técnicas por uma fila única do dia.
- Mostrar contato, empresa, motivo/canal, horário e mensagens não lidas.
- Criar filtros “Tudo”, “Agendados” e “Recebidos”, busca e ordenação por prioridade.
- Calcular contagens reais para atrasados, hoje e próximos dias.
- Destacar atraso e nova mensagem de modo discreto, com laranja reservado à seleção e ações principais.
- Relacionar mensagens/e-mails recebidos ao contato cadastrado.
- Regra confirmada: recebidos entram no compromisso de hoje; se não existir compromisso hoje, aparece uma linha recebida para o contato.
- Caixas de seleção aparecem somente no modo “Selecionar”, usado por ações em massa.

## Etapa 4 — Área central de atendimento
- Cabeçalho único do contato com empresa, próximo compromisso e acesso ao cadastro.
- Seletor claro de canais WhatsApp, Telefone, E-mail e Visita, mantendo o mesmo contato.
- WhatsApp: preservar mensagens reais, recebimento, envio, anexos, ferramentas, agentes e histórico.
- Telefone: preservar regras de discagem, PABX, discador sequencial, gravações e estados atuais.
- E-mail: preservar pastas, leitura, composição, resposta, encaminhamento, anexos e rastreamento.
- Visita: reaproveitar o fluxo presencial atual sem exibir controles de telefonia.
- Quando faltar telefone, WhatsApp ou e-mail, explicar o dado ausente e oferecer edição no cadastro, sem aparentar falha técnica.
- Histórico abre sem perder o atendimento e volta ao mesmo ponto.

## Etapa 5 — Cadastro e vínculos
- Reestruturar o painel unificado em abas Contato e Empresa, usando os dados reais existentes.
- Edição campo a campo: tocar/clicar no valor, Enter ou ✓ salva, Esc ou × cancela; erro mantém o valor digitado.
- Validar nome, telefone/WhatsApp e e-mail antes de gravar.
- Separar valores editáveis dos botões de ligar, abrir WhatsApp e enviar e-mail.
- Buscar/vincular empresa por nome ou CNPJ e contato por nome, telefone ou e-mail.
- Oferecer “Cadastrar e vincular” sem sair do Atendimento.
- Impedir vínculos duplicados pela restrição existente e manter “Principal”.
- Desvincular somente o vínculo, sempre com confirmação, sem excluir cadastro.
- Abrir contato/empresa relacionada dentro do mesmo painel com ação “Voltar”.

## Etapa 6 — Finalizar e reagendar com consistência
- Transformar a finalização em tela/painel dedicado com Resultado, Resumo, Data, Horário e Canal.
- Mostrar antes de salvar o resumo do próximo contato.
- Usar somente “Finalizar e reagendar” como ação conclusiva; voltar mantém o preenchimento.
- Aplicar regras atuais de data, fim de semana, horário comercial, tarefa única e conflito de próximo contato.
- Tornar a operação atômica e idempotente: registro do atendimento, conclusão da tarefa atual e criação/ajuste do próximo compromisso acontecem juntos ou nada é confirmado.
- Bloquear reenvio por clique repetido e não mostrar sucesso parcial.
- Após sucesso, atualizar fila, contagens e agenda e retornar ao contexto correto.

## Etapa 7 — Envio em massa consolidado
- Manter um único fluxo reutilizável: Selecionar → Canal → Mensagem → Regra de retorno → Revisar → Enviar.
- Reaproveitar filtros, proteção anti-bloqueio, respostas rápidas, mídia, catálogos, arquivos e variáveis existentes.
- Separar, antes do envio, destinatários aptos, bloqueados e sem telefone/e-mail.
- Na revisão, mostrar mensagem final, destinatários, retorno calculado e conflitos de agenda.
- Regra confirmada: quando já houver próximo contato, a revisão permitirá decidir entre manter o existente ou substituir pela nova regra.
- Processar por destinatário com resultado persistido, sem marcar falhas como concluídas; permitir repetir somente os que falharam.
- No celular, apresentar cada passo como uma tela e manter o progresso ao voltar.

## Mudanças de banco e regras — separadas
- Criar uma operação transacional no backend para finalizar/reagendar com uma chave de idempotência e retorno único de sucesso/erro.
- Reforçar no banco a regra de uma tarefa aberta por contato e usuário, compatível com criação manual, finalização, arraste e envio em massa.
- Criar execução e itens de envio em massa somente se as tabelas atuais não oferecerem estado por destinatário; registrar pendente, enviado, falhou, motivo e tentativas.
- Corrigir os valores antigos de status/origem usados pelos fluxos de massa para os valores aceitos atualmente.
- Não mudar dados ou regras nesta primeira etapa visual; cada mudança acima será apresentada e aprovada na etapa funcional correspondente.

## Decisões já confirmadas
- Mensagem recebida: associar ao compromisso de hoje; sem compromisso hoje, criar linha recebida.
- Próximo contato em massa: decidir na revisão se mantém o existente ou substitui pela nova regra.
- Painel Cadastro e vínculos: largura inicial média e ajustável.

## Decisões pendentes antes da Etapa 7
- Confirmar qual infraestrutura fará o disparo real em massa: canais nativos já conectados ou o webhook externo atualmente disponível em parte do sistema.
- Confirmar se o ritmo humano configurável deve valer para todo envio em massa manual; recomendação: sim, para WhatsApp.
- Confirmar se consentimento explícito deve bloquear WhatsApp em massa; hoje essa verificação existe no código, mas está desativada por falta do dado correspondente.

## Validação por etapa
- Desktop: 1440 e 1920 px.
- Tablet: retrato e paisagem.
- Celular: 360, 390 e 430 px.
- Fluxos: abrir agenda; filtrar fila; selecionar contato; alternar canais; receber mensagem de contato agendado; editar e vincular nos dois sentidos; abrir/voltar do histórico; finalizar e retornar à agenda correta; envio em massa com aptos, bloqueados, conflito de agenda, falhas e reprocessamento.
- Acessibilidade: teclado, foco visível, nomes acessíveis, contraste, toque mínimo e ausência de rolagem horizontal.
- Regressão: autenticação, permissões, telefonia, WhatsApp, e-mail, anexos, histórico, orçamentos e atualização em tempo real.
