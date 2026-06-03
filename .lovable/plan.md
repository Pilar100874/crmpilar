## Objetivo

Criar dois mapas de calor (sistema interno e ecommerce) com rastreamento de uso, e adicionar blocos de automação no workflow para disparar ações baseadas em comportamento.

---

## 1. Mapa de Calor do Sistema (uso interno)

**Menu**: nova entrada no sidebar, logo abaixo de "Ticket de Suporte" → `/mapa-calor-sistema`.

**Rastreamento (frontend):**
- Hook global `useUsageTracker` montado no `Layout.tsx` que registra:
  - Rota atual + tempo de permanência (a cada mudança de rota)
  - Última interação (mousemove/keydown/click com throttle 30s)
  - Tempo ocioso (sem interação)
- Envio em batch a cada 30s (ou no `beforeunload`) via `supabase.from('usage_events').insert(...)`

**Tela `/mapa-calor-sistema`:**
- Filtros: período (hoje/7d/30d), usuário (multi-select)
- KPIs: usuários ativos agora, tempo médio de sessão, telas mais acessadas
- Tabela: ranking de telas (rota, acessos, tempo total, tempo médio)
- Heatmap visual (grid colorido por intensidade de uso por rota × hora)
- Lista de usuários com tempo ocioso atual (cor vermelho > 15min)

---

## 2. Mapa de Calor do Ecommerce

**Menu**: card em `/ecommerce-config` → `/ecommerce-config/mapa-calor`.

**Rastreamento (loja pública):**
- Hook injetado no layout do ecommerce que captura:
  - Page views (rota, produto_id quando aplicável, sessão anônima ou customer_id)
  - Tempo em cada tela
  - Eventos de clique em produtos / add-to-cart
  - Snapshot do carrinho (itens, valor, última atividade)

**Tela `/ecommerce-config/mapa-calor`:**
- KPIs: visitantes ativos, tempo médio por página, produtos mais visualizados sem conversão
- Heatmap de páginas (produtos/categorias × intensidade de visualização)
- Funil: visualização → adicionado ao carrinho → checkout → pago
- Lista de carrinhos abertos (cliente, valor, tempo desde última ação)

---

## 3. Blocos de Automação no Workflow

Adicionar 2 novos node types no editor de workflow (`/workflow` ou similar existente):

**a) Bloco "Tempo em Tela" (sistema OU ecommerce)**
- Config: escopo (sistema/ecom), tela específica, tempo mínimo (min)
- Dispara quando usuário/visitante excede o tempo configurado em uma tela
- Saída: contexto com usuário, tela, tempo

**b) Bloco "Carrinho Abandonado"**
- Config: tempo sem interação (min), valor mínimo do carrinho (opcional)
- Dispara quando carrinho fica X minutos sem checkout
- Saída: cliente, itens, valor, link de recuperação

**Execução**: edge function `process-heatmap-triggers` (cron a cada 5min) varre eventos recentes e dispara workflows configurados.

---

## Mudanças técnicas

**Banco de dados (migração):**
- `usage_events` — eventos de uso do sistema (user_id, route, duration_ms, idle_ms, ts)
- `ecom_usage_events` — eventos da loja (session_id, customer_id?, route, product_id?, event_type, duration_ms, ts)
- `ecom_active_carts` — snapshot de carrinhos (session_id, customer_id?, items jsonb, total, last_activity_at)
- Índices por estabelecimento_id + ts; RLS por estabelecimento; GRANTs para `authenticated` e `service_role`; `anon` insert em `ecom_usage_events` e `ecom_active_carts` (loja pública)

**Frontend:**
- `src/hooks/useUsageTracker.ts` (sistema) + integração em `Layout.tsx`
- `src/hooks/useEcomTracker.ts` + integração no layout do ecommerce
- `src/pages/MapaCalorSistema.tsx` (rota + entrada no sidebar abaixo de Ticket de Suporte)
- `src/pages/MapaCalorEcommerce.tsx` (rota + card em `/ecommerce-config`)
- 2 novos node components no editor de workflow + handlers no engine

**Backend:**
- Edge function `process-heatmap-triggers` + cron pg_cron (5min)
- Edge function `track-usage-event` (opcional, para batch da loja pública sem expor RLS)

**Idioma**: tudo em PT-BR conforme padrão do projeto.

---

## Fora do escopo

- Replay/gravação de sessão (rrweb) — não pedido
- Heatmap pixel-a-pixel (cliques na coordenada) — usaremos por tela/elemento
- Dashboards exportáveis em PDF (pode vir depois)
