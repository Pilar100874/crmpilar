## Diagnóstico

O **simulador** (`src/components/flow/FlowSimulator.tsx`) executa ~40 tipos de bloco. Já o **WhatsApp real** roda em `supabase/functions/whatsapp-webhook/index.ts`, que só implementa um subconjunto pequeno. Por isso vários blocos "funcionam no teste, mas não no WhatsApp".

### Blocos já suportados no WhatsApp
`start`, `send_message`, `media`, `goodbye`, `ask_*` (11 tipos), `set_field`, `reply_buttons`, `list_buttons`, `crm_gerar_relatorio`, `publish_social_post`, `product_search_select`.

### Blocos do grupo Automação de Marketing (e correlatos) que **NÃO** rodam no WhatsApp hoje
Grupo "IA": `ai_agent`, `generate_ai_media`, `text_content`, `content_type`, `ask_influencer`, `ask_product_image`
Grupo "WhatsApp Essencial": `keyword_options`, `message_template`, `opt_in_out`, `opt_in_check`, `audience`
Grupo "Lógica": `condition`, `keyword_jump`, `global_keywords`, `formulas`, `jump_to`, `lead_scoring`, `goal`
Grupo "Código": `webhook`, `trigger_automation`, `dynamic_data`
Grupo "Integração CRM": `crm_cadastro_empresa`, `crm_agenda_rapida`
Grupo "Roteamento": `transferir_omnichannel`, `enviar_fila`, `atribuir_atendente`, `definir_prioridade`
Grupo "Disparo & Loops": `send_whatsapp_to_number`, `api_loop`

## Escopo da entrega

Portar para o webhook do WhatsApp **todos** os blocos acima, mantendo a mesma semântica do simulador (interpolação de variáveis, ramificações, pendência de resposta etc.). Quem ficar dependente de UI exclusiva (ex.: pré-visualização visual) cai num envio textual equivalente no WhatsApp.

## Plano de implementação

### Etapa 1 — Lógica pura (sem chamadas externas)
Implementar no `switch` do webhook:
- `condition` (já há `evalCondition` no simulador — replicar)
- `keyword_jump`, `global_keywords`, `jump_to`
- `formulas`, `lead_scoring`, `goal`
- `set_field` (já existe) + extensão de tipos
- `audience`, `opt_in_check`, `opt_in_out` (gravam flag de consentimento em `chat_sessions`/`contatos`)

### Etapa 2 — Blocos de mensagem WhatsApp
- `keyword_options` → envia lista numerada e marca `pendingNodeId` (como `reply_buttons`)
- `message_template` → resolve template e envia via `send_message`

### Etapa 3 — Integrações backend
- `webhook` → `fetch` com body interpolado, grava resposta em variável
- `dynamic_data` → consulta tabela com filtros interpolados (reaproveita `execute-dynamic-query`)
- `trigger_automation` → chama `marketing-automation-scheduler`/`trigger-automation`
- `crm_cadastro_empresa`, `crm_agenda_rapida` → reusam mesmas tabelas

### Etapa 4 — Roteamento humano
- `transferir_omnichannel`, `enviar_fila`, `atribuir_atendente`, `definir_prioridade` → atualizam `conversations` (fila/atendente/prioridade) e param o fluxo

### Etapa 5 — IA e mídia
- `ai_agent` → invoca `chat-agent-execute`, devolve texto
- `generate_ai_media`, `text_content`, `content_type`, `ask_influencer`, `ask_product_image` → invocam as edge functions `bot-generate-ai-media`, `bot-suggest-text-content`, `bot-generate-product-samples` e enviam mídia/texto ao número

### Etapa 6 — Disparo e loop
- `send_whatsapp_to_number` → envia mensagem para outro número via mesmo conector
- `api_loop` → fetch + iteração com limite de segurança

### Etapa 7 — Bloco desconhecido
Trocar o `default` para **logar** + enviar mensagem amigável "(bloco não suportado)" ao desenvolvedor (somente em modo debug), em vez de só pular silenciosamente.

## Detalhes técnicos

- Centralizar todos os handlers em um helper `executors.ts` dentro de `supabase/functions/whatsapp-webhook/` para evitar inflar mais o `index.ts` (já com 1660 linhas).
- Reaproveitar `itp()` (interpolação) e `nexts()` (próximos nós) já existentes.
- Para blocos que pausam (perguntas/listas), seguir o padrão atual: `context.pendingNodeId = node.id` + upsert em `chat_sessions` + `return`.
- Tudo passa por `await onResponse(...)` — não muda a camada de transporte (WAHA/Cloud API) já existente.

## Verificação

1. `supabase--deploy_edge_functions` no `whatsapp-webhook`.
2. Para cada bloco portado, rodar `supabase--curl_edge_functions` simulando payload do webhook e conferir `edge_function_logs`.
3. Validar no console do bot real (um fluxo cobrindo IA + condição + roteamento).

## Riscos / Observações

- É uma mudança grande (≈ +800 linhas no webhook ou em helper novo). Vou entregar em **um único PR** para o usuário ter paridade completa de uma vez, mas posso fatiar por etapa se preferir.
- Alguns blocos (IA, geração de mídia) podem demorar > 10 s e exceder o timeout síncrono do webhook do WhatsApp; para esses o ideal é processamento assíncrono (background) — confirmo antes de mergulhar.

Posso seguir com a Etapa 1 → 7 nessa ordem em um único deploy? Ou prefere que eu entregue por etapa para revisar?