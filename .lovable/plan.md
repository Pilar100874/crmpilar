
# App Mobile + Push Notifications + Blocos de Workflow

Vou entregar em 3 blocos independentes para você validar cada etapa.

## Bloco 1 — Duas versões instaláveis do sistema

### 1a. PWA instalável (funciona hoje, iOS + Android)
- Adicionar `manifest.webmanifest` com ícones, cores e `display: standalone`
- Registrar Service Worker **guardado** (nunca ativa em preview/dev — segue a skill PWA do Lovable)
- Estratégia `NetworkFirst` para HTML → **atualização automática** a cada abertura, sem reinstalar
- Botão "Instalar App" na tela `Apps & Instaladores` (usa `beforeinstallprompt` no Android; guia visual "Compartilhar → Adicionar à Tela de Início" no iOS)

### 1b. App nativo Capacitor (APK Android + IPA iOS) baixável da tela Apps
- Configurar Capacitor com `server.url` apontando para `https://crmpilar.lovable.app` → o app é uma casca que carrega o site
- **Consequência boa**: toda atualização do sistema aparece automaticamente no app, sem reinstalar (só reinstala se mudar plugin nativo ou push)
- Workflow GitHub Actions para gerar:
  - `pilar-app.apk` (Android) — assinado com keystore de debug
  - `pilar-app.ipa` (iOS) — **só compila via macOS+Xcode**; vou entregar o projeto pronto e as instruções, mas o `.ipa` final você gera no seu Mac (ou serviço de build tipo Codemagic/EAS). Sem conta Apple Developer, o `.ipa` só instala em dispositivos registrados via sideload (AltStore/Sideloadly) — deixo isso claro na tela.
- Nova aba na página `AdminApps.tsx`: "App Mobile" com 2 cards (Android APK direto / iOS instruções sideload) + QR code para instalação rápida
- Endpoint público servindo o APK a partir de `public/mobile/pilar-app.apk`

## Bloco 2 — Push Notifications (funciona nas 2 versões)

### Backend
- Nova tabela `push_subscriptions` (usuario_id nullable, contato_id nullable, endpoint, p256dh, auth, plataforma: 'web'|'android'|'ios', ativo)
- Nova tabela `push_notifications_log` (destinatario, titulo, corpo, url, status, tentativas, workflow_id)
- Edge function `push-subscribe` — cliente registra endpoint
- Edge function `push-send` — envia via Web Push (VAPID) para PWA/Android Chrome/iOS 16.4+ Safari instalado
- Segredos: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (gero automaticamente)
- Para Capacitor nativo: usa o mesmo Service Worker do PWA (o Capacitor carrega o site, então o SW já funciona) — **sem Firebase/APNs necessário nessa arquitetura**

### Frontend
- Hook `usePushNotifications` — pede permissão, registra subscription, salva no banco
- Toggle "Ativar notificações push" em Configurações do usuário e na área do cliente do e-commerce
- Service Worker `push-sw.js` escuta evento `push` e mostra notificação nativa

## Bloco 3 — Bloco "Disparar Push" nos 4 workflows

Bloco unificado adicionado a:
1. **Criar/Editar Bot** (omnichannel flow)
2. **Logística e-commerce** (`automacaoFlowEngine`)
3. **Regras de Automação de Vendas** (`blocklyAutomacaoEngine`)
4. **Automações de Anúncios**

### Configuração do bloco (mesma UI nos 4 editores)
- **Destinatário**: seletor com 3 modos
  - `Usuário interno` → dropdown de funcionários (`usuarios`)
  - `Cliente final` → dropdown de contatos/segmentos (`contatos` ou variável do fluxo tipo `{{contato.id}}`)
  - `Segmento` → grupo pré-definido (ex: "todos vendedores", "clientes com pedido aberto")
- **Título** (com variáveis `{{nome}}`, `{{pedido.numero}}`)
- **Mensagem** (com variáveis)
- **URL de destino ao clicar** (opcional — deep link dentro do app)
- **Ícone/imagem** (opcional)

### Execução
- Cada engine chama o mesmo executor: `executarBlocoPush(config, contexto)` → resolve destinatários → chama edge function `push-send` → grava em `push_notifications_log`
- Se destinatário não tem subscription ativa, marca no log como "sem dispositivo" e continua o fluxo

## Detalhes técnicos

**Arquivos novos principais:**
- `public/manifest.webmanifest`, `public/push-sw.js`, `src/lib/pwaRegister.ts`
- `capacitor.config.ts` (atualizar), workflow `.github/workflows/build-mobile-app.yml`
- `supabase/functions/push-subscribe/index.ts`, `push-send/index.ts`
- Migração: `push_subscriptions`, `push_notifications_log` + GRANTs + RLS
- `src/hooks/usePushNotifications.ts`
- `src/components/workflows/PushBlockConfig.tsx` (UI compartilhada)
- Adicionar tipo de bloco `push_notification` em cada engine
- `src/lib/pushExecutor.ts` (executor unificado)

**Segredos necessários:** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (gero automático), `VAPID_SUBJECT` (seu email de contato — vou pedir).

**Limitações honestas:**
- iOS PWA push só funciona no iOS 16.4+ e **só depois** que o usuário instalar na tela inicial
- APK Android sem Play Store precisa habilitar "Fontes desconhecidas" no celular
- IPA iOS sem App Store precisa de Mac para compilar e sideload para instalar (sem conta Apple Developer, só dura 7 dias por instalação)

## Ordem de entrega
1. Bloco 1a (PWA) — pronto na hora
2. Bloco 2 (push backend + toggle usuário) — mesmo turno
3. Bloco 3 (blocos nos 4 workflows) — mesmo turno
4. Bloco 1b (Capacitor + workflow GitHub Actions APK) — separado, avisar quando começar

Aprovando, começo pelos blocos 1a + 2 + 3 (que já cobrem 90% do uso) e depois faço o Capacitor nativo.
