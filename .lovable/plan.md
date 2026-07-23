## O que vai ser construído

### 1. Banco de dados (migração)

Nova tabela `bot_response_tracking` para rastrear cada envio que aguarda resposta:
- `empresa_id`, `contato_telefone`, `flow_id`, `flow_nome`, `block_id`, `bot_execution_id`
- `enviado_em`, `respondido_em` (nullable), `resposta_texto`
- `timeout_horas`, `expira_em`, `status` (`aguardando` / `respondeu` / `sem_resposta`)
- `estabelecimento_id`
- RLS por estabelecimento + GRANTs corretos

Novos campos em `empresas`:
- `ja_respondeu_whatsapp` (bool, default false) — flag rápida "já respondeu algum bot"
- `ultima_resposta_bot_em` (timestamptz)
- `ultima_resposta_bot_nome` (text) — nome do fluxo/rotina que fez responder

Trigger em mensagens recebidas do WhatsApp: quando chega mensagem de um `telefone` que tem tracking `aguardando` e não expirou → marca `respondido`, atualiza empresa (`ja_respondeu_whatsapp=true`, timestamp, nome do fluxo).

Cron job (5 em 5 min) marca trackings vencidos como `sem_resposta`.

### 2. Novo bloco "Envio com espera de resposta" (bot builder)

- Baseado no `BroadcastVendedoresConfig` mas fixado para audiência = **Empresas** (com filtros: cliente/prospect/ambos, segmento, gerente vinculado, whatsapp válido, e novo filtro **"apenas quem já respondeu"**).
- Campos: mensagem, mídia (via mensagem pré-definida ou upload), `timeout_horas` (default 24), sessão WhatsApp.
- **Duas saídas no ReactFlow**: `respondeu` e `sem_resposta`.
- Executor (`FlowSimulator` + `workflowActionsExecutor`): grava um `bot_response_tracking` por destinatário e pausa o fluxo por empresa até resolver.
- Poller do executor (ou realtime na tabela) roteia para a saída certa quando trackings mudam de status.

### 3. Filtro "já respondeu" no Envio em Massa

- Em `BroadcastVendedoresConfig` e no filtro de empresas do `useContactsFilter*`: adicionar toggle "Somente empresas que já responderam algum bot" usando `empresas.ja_respondeu_whatsapp`.

### 4. Tela "Monitor de Respostas" (Marketing → Envio em Massa, nova aba)

- Lista por campanha/fluxo: total enviado, respondeu, sem resposta, aguardando.
- Detalhe por linha: empresa, telefone, enviado_em, respondido_em, texto da resposta, status, link para abrir a empresa.
- Filtros: fluxo, período, status, segmento.
- Export CSV.

### 5. Ícone de alertas no cadastro de empresa

Componente `EmpresaAlertsBadge` (⚠️ com Popover) exibido no header do card/lista de empresas, agregando:
- WhatsApp inválido (`whatsapp_status='invalid'`)
- Não respondeu ao último bot (último `bot_response_tracking` = `sem_resposta`) — mostra qual bot
- Sem contato há X dias (configurável, default 60) — baseado em última mensagem/atendimento
- Dados cadastrais incompletos (falta e-mail, endereço ou CNPJ)

Popover lista cada problema em uma linha. Aparece em `Empresas.tsx` (lista e header do form) e no `UnifiedDetailsPanel`.

## Detalhes técnicos

- Reuso: aproveitar `BroadcastVendedoresConfig`, executores existentes de WhatsApp e `markWhatsappStatus` já implementado.
- Roteamento das saídas do novo bloco: usar edges nomeadas (`sourceHandle: 'respondeu' | 'sem_resposta'`) — mesma abordagem do `ABTestConfig`.
- Trigger de resposta: hook no ponto onde mensagens recebidas de WhatsApp já são persistidas (edge function do webhook) — chama uma RPC `mark_bot_response(telefone, texto)` que atualiza tracking + empresa.
- Cron: `pg_cron` chamando `mark_expired_bot_responses()` a cada 5 min.
- Todas as telas/labels em português (memória do projeto).
- Confirmação de exclusão via `DeleteConfirmDialog` onde aplicável.

## Fora do escopo (posso fazer em seguida se quiser)

- Reenvio automático antes do timeout.
- Alerta por "palavra-chave" em vez de qualquer resposta.
- Notificação push ao gerente quando alguém responde.

Confirma que posso seguir com esse plano?