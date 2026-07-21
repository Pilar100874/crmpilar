# Workflows do Gerenciador de Telas Remotas

Sistema de regras que dispara **mensagens temporárias em uma barra inferior** das telas remotas (Android/simulador) em resposta a eventos do sistema (ex.: caminhão parado, venda realizada, alerta de câmera, ponto batido, etc.).

## Como funcionará

1. **Cadastro do workflow** (nova tela `Gerenciador de Telas Remotas → Workflows`):
   - Nome / ativo
   - **Evento gatilho** (dropdown): `caminhao_parado`, `caminhao_movimento`, `venda_realizada`, `pedido_novo`, `alerta_camera`, `visita_iniciada`, `manual` (disparo por botão/API), etc.
   - **Filtros opcionais** do evento (ex.: valor mínimo da venda, veículo específico, grupo logístico).
   - **Mensagem** (texto com variáveis tipo `{placa}`, `{motorista}`, `{valor}`).
   - **Duração** (segundos que a barra fica visível).
   - **Estilo**: cor de fundo, cor do texto, ícone, posição (bottom/top), animação (slide/fade).
   - **Escopo de exibição**:
     - Todos os dispositivos
     - Dispositivos específicos (multi-select)
     - Grupos de dispositivos
     - Apenas quando dashboard atual = X (ex.: só na tela de vendas)
   - **Som** opcional (beep curto).

2. **Fila de exibição** (nova tabela `tv_workflow_execucoes`):
   - Quando um evento acontece, o workflow gera uma linha por dispositivo alvo com `mensagem_renderizada`, `expira_em`, `exibido_em`.
   - Cada dispositivo consome sua fila via Supabase Realtime.

3. **Overlay nas telas**:
   - Componente `TvNotificationBar` renderizado em `SignageActivity` (WebView Android) e nas rotas `/tv/*` + `/tv-signage/simulador`.
   - Escuta Realtime na tabela `tv_workflow_execucoes` filtrando pelo `device_id` (ou token) atual.
   - Empilha múltiplas mensagens em ordem, respeitando duração de cada.

4. **Gatilhos**:
   - **Automáticos**: hooks nos pontos onde eventos já existem (veículos, pedidos, câmeras, visitas) chamam edge function `tv-workflow-dispatch({evento, payload})`.
   - **Manual**: botão "Disparar agora" na tela do workflow (útil para avisos operacionais).
   - **API/Webhook**: endpoint público para integrações externas.

5. **Resolução de alvos** (edge function):
   - Recebe `{evento, payload}`.
   - Lista workflows ativos que casam com o evento + filtros.
   - Para cada workflow, resolve dispositivos:
     - Todos → todos os `tv_devices` do estabelecimento
     - Específicos → lista fixa
     - Por dashboard atual → filtra `dashboard_atual_id`
   - Interpola variáveis do payload na mensagem.
   - Insere execuções na fila com `expira_em = now() + duração`.

## Estrutura de dados

```text
tv_workflows
├─ id, estabelecimento_id, nome, ativo
├─ evento (text)                  -- 'caminhao_parado', 'venda_realizada', ...
├─ filtros (jsonb)                -- {valor_min, veiculo_ids, grupo_ids}
├─ mensagem_template (text)       -- "Venda de {valor} realizada!"
├─ duracao_segundos (int)
├─ estilo (jsonb)                 -- {bg, fg, icone, posicao, animacao, som}
├─ escopo_tipo (text)             -- 'todos' | 'dispositivos' | 'grupos' | 'dashboard'
├─ escopo_ids (uuid[])
├─ dashboard_id (uuid, nullable)  -- só aparece nesta tela
└─ timestamps

tv_workflow_execucoes
├─ id, workflow_id, device_id, estabelecimento_id
├─ mensagem_renderizada (text)
├─ estilo (jsonb)
├─ duracao_segundos, expira_em
├─ exibido_em (nullable)
└─ created_at
```

Realtime habilitado em `tv_workflow_execucoes`. RLS + GRANT normais.

## Componentes e arquivos

- **Backend**
  - Migração criando as duas tabelas + índices + realtime + RLS + GRANT.
  - Edge function `tv-workflow-dispatch` (recebe evento e enfileira execuções).
  - Cron/edge para limpar execuções expiradas (7 dias).

- **Frontend admin**
  - `src/pages/tv-signage/TvSignageWorkflows.tsx` — CRUD com dialog de edição (evento, filtros, mensagem, estilo, escopo, duração, botão "Disparar agora").
  - Link no menu lateral do Gerenciador de Telas Remotas.
  - Preview do estilo da barra em tempo real dentro do editor.

- **Overlay nas telas TV**
  - `src/components/tv/TvNotificationBar.tsx` — barra animada, fila, som opcional.
  - Injetada em `TvDashboardVeiculos`, `TvDashboardVendas`, `TvCameras`, `TvSignageSimulador`.
  - Usa `device_id` da URL (ou do token) para filtrar Realtime.

- **Integração de eventos existentes**
  - Chamada em `logistica-tracker-ingest` (veículo parado detectado) → dispara `caminhao_parado`.
  - Chamada ao criar pedido/venda → `venda_realizada`.
  - Alerta de câmera → `alerta_camera`.
  - (Só nos pontos que já existem; sem criar nova lógica de detecção.)

## Detalhes técnicos

- Interpolação de variáveis: função simples `str.replace(/\{(\w+)\}/g, (_, k) => payload[k] ?? '')`.
- Barra: `position: fixed; bottom: 0` (ou top conforme estilo), altura ~72px, texto grande legível a distância, ícone Lucide.
- Fila local: array de execuções em `useState`, remove ao expirar `duracao_segundos`.
- Realtime: `postgres_changes INSERT` em `tv_workflow_execucoes` com filtro `device_id=eq.<id>`.
- APK Android: a WebView já carrega as rotas `/tv/*`, então o overlay funciona automaticamente sem release novo do APK. Nenhum trabalho no lado nativo.

## Fora do escopo desta entrega

- Criação de novos detectores de eventos (só ligamos aos que já disparam algo hoje + gatilho manual).
- Novo release do APK.
- Editor visual estilo drag-and-drop — usaremos formulário estruturado.
