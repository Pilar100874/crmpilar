
# Plataforma TV Signage — Painel + Backend

Plataforma multi-tenant para gerenciar milhares de dispositivos Android TV / Google TV remotamente. O Lovable entrega **painel administrativo + banco + APIs + Realtime**. O app Android nativo (Kotlin/Compose) fica para uma fase posterior e apenas consumirá as APIs desta plataforma.

Isolamento por `estabelecimento_id` (padrão já usado no CRM), com RLS em todas as tabelas e token por dispositivo para autenticação do app.

---

## Módulo no menu principal

Novo item **"TV Signage"** no menu principal, com sub-rotas:

- `/tv-signage` — Dashboard (visão geral)
- `/tv-signage/dispositivos` — Lista/CRUD de TVs + pareamento (QR Code)
- `/tv-signage/dashboards` — Cadastro de "dashboards" (telas do sistema ou URLs externas) que podem ser projetadas
- `/tv-signage/playlists` — Playlists (ordem + tempo por tela) para uma TV rodar múltiplas telas em rotação
- `/tv-signage/grupos` — Grupos e locais (para aplicar dashboards em massa)
- `/tv-signage/comandos` — Fila de comandos remotos + histórico
- `/tv-signage/eventos` — Logs e heartbeats
- `/tv-signage/config-api` — Guia de integração da API + chaves

Design: dark mode, cards, gráficos (recharts), sidebar interno, tabela paginada com busca e filtros, responsivo. Segue tokens semânticos (bg-background/text-foreground) do sistema.

---

## Seleção de telas do sistema para projetar

Além de URLs externas, o admin pode escolher **qualquer rota interna do CRM** para projetar. As rotas disponíveis vêm do `MENU_CONFIG` já existente em `src/lib/menus.ts` + rotas TV (`/tv-vendas`, `/tv-veiculos`, `/cameras/dashboard`, etc). Ao selecionar uma tela interna, a plataforma monta a URL absoluta com um token de "modo TV" para o app abrir em kiosk.

Quando o admin adiciona **múltiplas telas** para a mesma TV → vira uma **playlist automática** com temporizador configurável por item (segundos), ordem e loop.

---

## Banco de dados (novas tabelas — todas com RLS + GRANTs)

- `tv_devices` — dispositivos
  - `codigo` (único, 8 chars), `token_hash`, `nome`, `estabelecimento_id`, `grupo_id`, `local`, `status` (online/offline/erro/bloqueado), `dashboard_atual_id` OU `playlist_id`, `ultima_comunicacao`, `versao_app`, `versao_min_requerida`, `resolucao`, `ip`, `memoria_uso`, `cpu_uso`, `armazenamento`, `uptime_segundos`, `tema`, `idioma`, `bloqueado`, `parado_em`, `emparelhado_em`
- `tv_dashboards` — telas configuráveis
  - `nome`, `tipo` (`url_externa` | `tela_interna`), `url`, `rota_interna`, `refresh_segundos`, `fullscreen`, `cache_offline`, `auto_update`, `timeout_segundos`, `estabelecimento_id`
- `tv_playlists` + `tv_playlist_items` — sequência de dashboards com `ordem` e `duracao_segundos`
- `tv_groups` — agrupamento lógico (empresa/local/andar)
- `tv_commands` — fila de comandos por device
  - `device_id`, `tipo` (atualizar_dashboard, atualizar_url, reiniciar_app, limpar_cache, atualizar_config, alterar_refresh, bloquear, desbloquear, sincronizar, atualizar_versao), `payload jsonb`, `status` (pendente/enviado/confirmado/erro), `criado_por`, `confirmado_em`
- `tv_events` — logs enviados pelo dispositivo (heartbeat resumido + eventos livres)
- `tv_heartbeats` — snapshots leves para gráfico (particionável por data mais tarde)

Regras:
- RLS por `estabelecimento_id` via `get_auth_user_estabelecimento_id()` (já existe no projeto).
- Realtime habilitado em `tv_devices`, `tv_commands`, `tv_dashboards`, `tv_playlists`, `tv_playlist_items` para o app receber alterações imediatamente.
- Token do dispositivo: só o **hash** fica no banco; o token cru é mostrado uma única vez no pareamento.

---

## APIs (Edge Functions, `verify_jwt=false`, autenticadas por token do device)

Prefixo lógico `tv-` para não colidir com nada existente:

- `POST tv-device-auth` — recebe `{ codigo, token }`, retorna `{ device_id, session_jwt }` (JWT curto assinado com secret gerado).
- `GET  tv-device-config` — retorna dashboard atual OU playlist, refresh, fullscreen, timeout, tema, idioma, versão mínima.
- `GET  tv-device-dashboard` — payload completo do dashboard/playlist para render.
- `POST tv-device-heartbeat` — status, versão, mem, cpu, storage, ip, resolução, uptime.
- `POST tv-device-log` — evento livre (nível, mensagem, contexto).
- `GET  tv-device-commands` — comandos `pendente` para o device (o app pode fazer long-poll ou usar Realtime).
- `POST tv-device-command-confirm` — marca comando `confirmado`/`erro`.

Todas com CORS, validação Zod, checagem do JWT do device em cada request. Segredo de assinatura: `TV_DEVICE_JWT_SECRET` (gerado via `generate_secret`).

---

## Pareamento (QR Code)

No cadastro:
1. Gera `codigo` (8 chars A-Z0-9) único.
2. Gera `token` opaco (32 bytes → base64url), salva `token_hash` (sha-256).
3. Mostra 1x: código + token + **QR Code** com JSON `{codigo, token, api_url}` para o app ler.
4. Admin pode **reemitir token** (invalida o anterior).

---

## Painel — telas

- **Dashboard** (`/tv-signage`): cards com TVs Online / Offline / Erro / Total / Atualizações pendentes / Consumo API (24h); gráfico de heartbeats; lista dos últimos eventos.
- **Dispositivos**: tabela paginada (Nome, Código, Empresa, Local, Grupo, Status, Dashboard atual, Última comunicação, Versão, Ações). Filtros: Online/Offline/Empresa/Grupo/Local. Busca. Ação por linha: enviar comando, ver detalhes, editar, reemitir token, excluir (com `DeleteConfirmDialog` conforme regra do projeto).
- **Detalhe do dispositivo**: abas "Configuração" (dashboard/playlist, refresh, fullscreen, tema, idioma), "Comandos", "Eventos/Heartbeats", "Pareamento".
- **Dashboards**: CRUD; ao criar, escolher URL externa **ou** tela interna do sistema (combobox alimentado por lista de rotas).
- **Playlists**: builder com drag-and-drop (ordem) + duração em segundos por item + loop.
- **Comandos**: botões para disparar comandos em massa a um grupo ou a um device.

Realtime no painel: status dos devices atualiza em tempo real via `postgres_changes` em `tv_devices` (dentro de `useEffect` conforme regra do projeto).

---

## Segurança

- RLS em todas as tabelas com política por `estabelecimento_id`.
- GRANT `authenticated`/`service_role` em cada tabela pública (nunca `anon`).
- Token do device: guardado apenas como hash.
- JWT de sessão do device (`TV_DEVICE_JWT_SECRET`) com expiração e refresh via reautenticação com `codigo`+`token`.
- Bloqueio remoto (`bloqueado=true`) → APIs recusam config/commands.
- Logs de auditoria em `tv_events` para todo comando executado.

---

## Detalhes técnicos

- Estrutura: `src/pages/tv-signage/*`, `src/components/tv-signage/*`, `src/hooks/tv-signage/*`, `src/services/tvSignage/*`, `src/types/tvSignage.ts`.
- Roteamento adicionado em `src/App.tsx`, menu em `src/components/Layout.tsx` e `src/lib/menus.ts` (nova categoria "TV Signage").
- QR code via `qrcode.react` (já compatível; adicionar dep se ausente).
- Gráficos: `recharts` (já usado no projeto).
- Textos em português (regra do projeto).
- Confirmação obrigatória em toda exclusão com `DeleteConfirmDialog` (regra do projeto).
- Segredo `TV_DEVICE_JWT_SECRET` gerado automaticamente com `generate_secret`.

---

## Fora de escopo desta entrega

- App Android TV nativo (Kotlin + Compose) — fase posterior.
- Distribuição de APK / atualização OTA de binário — só marcamos a versão mínima requerida.
- Streaming de vídeo dedicado (por enquanto, dashboards são páginas web/kiosk).

---

## Ordem de implementação

1. Migração SQL (tabelas, RLS, GRANTs, Realtime, triggers `updated_at`).
2. Segredo `TV_DEVICE_JWT_SECRET`.
3. Edge functions `tv-device-*` + config em `supabase/config.toml`.
4. Types + services + hooks.
5. Páginas: Dashboard → Dispositivos → Dashboards → Playlists → Grupos → Comandos → Eventos.
6. Integração no menu principal.
7. QR code de pareamento + fluxo de reemissão de token.
8. Guia de integração da API (`/tv-signage/config-api`) com exemplos para o futuro app Android.

Confirmar para eu começar pela migração e edge functions.
