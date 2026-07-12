
# Ads: Scheduler configurável + Coleta real Meta/Google/TikTok

Vou entregar em 3 blocos, todos usando tabelas já existentes (`ads_automacoes`, `ad_accounts`, `ad_insights`, `ads_logs_coleta`, `ad_platforms`) e adicionando o mínimo necessário.

## Bloco 1 — Configuração do scheduler (tela + tabela)

**Nova tabela** `ads_scheduler_config` (uma linha por estabelecimento):

| Campo | Tipo | Uso |
|---|---|---|
| `estabelecimento_id` | uuid PK | escopo |
| `ativo` | bool | liga/desliga geral |
| `frequencia` | text | `desligado` \| `15min` \| `hora` \| `dia` \| `custom` |
| `cron_expr` | text | usado quando `frequencia='custom'` (ex `*/30 * * * *`) |
| `ultima_execucao` | timestamptz | telemetria |
| `proxima_execucao` | timestamptz | telemetria |

**Tela** em `src/pages/ads/AdsSchedulerConfig.tsx` (rota `/ads/scheduler`, adicionada ao menu Ads já existente):

- Switch **Ativo**
- Radio **Frequência**: Desligado / A cada 15 min / A cada hora / 1x por dia / Personalizado
- Campo cron aparece quando "Personalizado" com validador simples e explicação
- Bloco "Última execução / Próxima execução" (readonly)
- Botão **Executar agora** (chama a edge function manualmente)

**Cron dinâmico**: um único cron job `ads_scheduler_dispatcher` roda a cada minuto e chama uma edge function `ads-scheduler-dispatcher` que decide, por estabelecimento, se é hora de rodar (compara cron_expr / frequencia com `now()`). Isso evita ter que criar/dropar jobs no pg_cron sempre que o usuário mudar a frequência.

## Bloco 2 — Coleta real de métricas (Meta + Google + TikTok)

**Credenciais por estabelecimento**: já existe `ad_accounts` (`platform`, `account_id`, `access_token`, `refresh_token`, `estabelecimento_id`, `expires_at`). Vou reutilizar.

**Nova edge function** `coletar-metricas-ads`:
- Recebe `{ estabelecimento_id }`
- Para cada `ad_account` ativo do estabelecimento, chama a API oficial:
  - **Meta**: `GET graph.facebook.com/v19.0/act_<id>/insights?fields=spend,cpc,ctr,impressions,actions,reach,frequency&date_preset=today`
  - **Google Ads**: `POST googleads.googleapis.com/v18/customers/<id>/googleAds:searchStream` com GAQL de métricas do dia (requer developer token via secret)
  - **TikTok**: `GET business-api.tiktok.com/open_api/v1.3/report/integrated/get/` com dimensões campaign_id
- Faz refresh do `access_token` quando `expires_at` está vencido (Meta long-lived, Google refresh_token, TikTok refresh flow)
- Persiste em `ad_insights` (tabela já existe com 19 colunas) e loga em `ads_logs_coleta`

**Secrets adicionais que precisarei pedir**:
- `META_APP_ID`, `META_APP_SECRET` (para refresh long-lived tokens)
- `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `TIKTOK_APP_ID`, `TIKTOK_APP_SECRET`

Os `access_token` / `refresh_token` de cada conta ficam em `ad_accounts` (por estabelecimento) e são obtidos via um fluxo OAuth (fora deste plano — assumo que já existe ou virá em iteração seguinte; hoje `ad_accounts` já tem essas colunas).

## Bloco 3 — Executor server-side + integração fim-a-fim

**Nova edge function** `executar-ads-automacoes`:
- Recebe `{ estabelecimento_id, dry_run? }`
- Chama `coletar-metricas-ads` primeiro (garante insights frescos)
- Busca automações ativas em `ads_automacoes`
- Porta a lógica do `src/services/adsFlowEngine.ts` para Deno (walk de nodes/edges, avaliação de triggers/conditions/actions)
- Executa ações reais:
  - **Pause / Resume / Archive / Activate**: chama a API da plataforma correspondente (Meta `POST /<ad_id>?status=PAUSED`, Google `campaign.status`, TikTok `campaign/update/`)
  - **Budget increase/decrease / Bid adjust**: idem via API oficial
  - **Notify / Slack / Aviso**: insert em `avisos_sistema`
  - **Webhook / Email / Msg interna / SMS / Push**: chama edge functions já existentes (`execute-dynamic-query`, `send-email`, `send-sms`, `send-agent-message`, `send-push`)
- Loga cada execução em `ads_logs_coleta` com `status`, `payload`, `erro`

**Dispatcher `ads-scheduler-dispatcher`** (chamado pelo cron a cada minuto):
- Para cada `ads_scheduler_config` com `ativo=true`, avalia se `now() >= proxima_execucao`
- Se sim: invoca `executar-ads-automacoes` em background e atualiza `ultima_execucao`/`proxima_execucao`

## Ordem de implementação

1. Migration da tabela `ads_scheduler_config` + índices + RLS + GRANT
2. Edge functions `ads-scheduler-dispatcher`, `executar-ads-automacoes`, `coletar-metricas-ads`
3. Cron job (via `insert` tool, não migration) chamando dispatcher a cada minuto
4. Tela `AdsSchedulerConfig.tsx` + rota + entrada no menu
5. Extensão do simulador Bot (Modo Real) para e-mail, mensagem interna e aviso — só faz sentido se esses blocos existirem no editor Bot; hoje não existem, então este item é **skip** até que sejam adicionados

## Detalhes técnicos

- Toda comunicação com APIs externas passa pelas edge functions (nunca do browser) por causa de CORS/secrets.
- Refresh de token faz update em `ad_accounts.access_token` + `expires_at`.
- Timeout de coleta por plataforma: 20s; falha em uma plataforma não impede as outras.
- Ações destrutivas (pause/archive) respeitam `dry_run` para permitir teste no botão "Executar agora".

## Perguntas antes de codar

1. **Secrets Meta/Google/TikTok**: você já tem esses tokens de desenvolvedor? Vou precisar cadastrá-los via `add_secret` — cada plataforma exige registro prévio no console da empresa (Meta for Developers, Google Ads API access, TikTok for Business Developers). Confirme quais das 3 posso ativar de imediato — se não tiver alguma, deixo o coletor daquela plataforma stub (sem quebrar) e a gente ativa depois.

2. **OAuth por conta**: como cada anunciante conecta a conta dele? Existe hoje algum fluxo em `/ads/contas` que preencha `ad_accounts.access_token`? Se não existir, esse fluxo é um Bloco 4 separado (grande), fora deste plano.

Aprova este plano? Se sim, me confirme também os itens (1) e (2) acima para eu não travar no meio.
