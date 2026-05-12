# Fluxo de Aprovação e Publicação via WhatsApp

## Objetivo
Automação que: gera mídias com IA → envia para WhatsApp do aprovador → ele escolhe quais gostou → escolhe destino (Instagram, Facebook, etc.) → sistema publica → envia confirmação com link da publicação.

## Visão geral do fluxo no Bot Builder

```text
[Início]
   ↓
[Gerar Mídia IA]  (gera N variações, salva URLs em {{midias_geradas}})
   ↓
[Enviar WhatsApp para número]  (envia cada mídia numerada: 1, 2, 3...)
   ↓
[Aguardar Resposta]  (waitForReply = true; usuário responde "1,3" ou "1 e 3")
   ↓
[Processar Seleção]  (parse da resposta → {{midias_aprovadas}})
   ↓
[Enviar WhatsApp]  ("Para qual rede deseja publicar? 1-Instagram 2-Facebook")
   ↓
[Aguardar Resposta]  → {{destino}}
   ↓
[Publicar em Rede Social]  (novo bloco — usa API Instagram/Facebook/etc.)
   ↓
[Enviar WhatsApp]  ("✅ Publicado! Veja: {{link_publicacao}}")
   ↓
[Fim]
```

## O que já existe
- Bloco **Gerar Mídia IA** ✅
- Bloco **Enviar WhatsApp para número** ✅ (já suporta `mediaUrl` e `waitForReply`)
- Bloco **Aguardar Resposta** ✅ (via `waitForReply` no envio)

## O que precisa ser criado

### 1. Bloco "Enviar Múltiplas Mídias para Aprovação"
Novo bloco em `src/components/flow/block-configs/` — `SendMediasForApprovalConfig.tsx`:
- Recebe array `{{midias_geradas}}`
- Envia cada mídia numerada com legenda "Opção 1/N — responda com os números das que gostou"
- Aguarda resposta única
- Output: `{{midias_aprovadas}}` (array filtrado)

### 2. Bloco "Escolher Destino de Publicação"
`ChoosePublishTargetConfig.tsx`:
- Envia menu interativo no WhatsApp ("1-Instagram, 2-Facebook, 3-LinkedIn")
- Aguarda resposta
- Output: `{{destino}}` ("instagram" | "facebook" | etc.)

### 3. Bloco "Publicar em Rede Social"
`PublishToSocialConfig.tsx`:
- Inputs: `medias`, `caption`, `destino`
- Chama edge function `publish-social-media`
- Output: `{{link_publicacao}}`, `{{post_id}}`

### 4. Edge Function `publish-social-media`
Em `supabase/functions/publish-social-media/index.ts`:
- Recebe `{ destino, medias[], caption, estabelecimento_id }`
- Roteia para API correspondente:
  - **Instagram**: Graph API (Container → Publish)
  - **Facebook**: Graph API `/me/feed` com `attached_media`
  - **LinkedIn**: UGC Posts API
- Retorna `{ permalink, post_id }`

### 5. Tabela `social_media_credentials`
Armazena tokens OAuth por estabelecimento e plataforma:
- `estabelecimento_id`, `platform`, `access_token`, `account_id`, `expires_at`
- RLS: usuário só vê do seu estabelecimento

### 6. Tela de configuração de credenciais
`src/pages/SocialMediaConfig.tsx`:
- Conecta contas Instagram/Facebook via OAuth (Meta)
- Lista contas conectadas
- Permite revogar

## Detalhes técnicos

**Engine do bot** (`src/services/automacaoFlowEngine.ts` ou equivalente do bot builder):
- Já processa blocos sequencialmente — basta registrar os 3 novos tipos no `BlockLibrary`
- `waitForReply` precisa pausar a execução e retomar quando o webhook do WAHA receber resposta do mesmo número
- Estado de pausa salvo em tabela `bot_executions_pending` (id, fluxo_id, contexto, aguardando_de, criado_em)

**Webhook WAHA** (`supabase/functions/waha-webhook`):
- Quando chega mensagem, verifica se há execução pendente para aquele número
- Se sim, injeta a resposta como `{{resposta_usuario}}` e retoma o fluxo

**Credenciais Meta (Instagram/Facebook)**:
- Requer App Meta com Instagram Graph API + permissões `instagram_basic`, `instagram_content_publish`, `pages_manage_posts`
- Usuário cria App em developers.facebook.com, fornece `META_APP_ID` e `META_APP_SECRET` como secrets
- OAuth callback gera tokens por conta

## Pré-requisitos do usuário
1. Conta business no Instagram conectada a uma Página do Facebook
2. App Meta criado em developers.facebook.com (ou usar conector existente, se houver)
3. Aprovação de permissões Meta para publicação (review necessário para produção)

## Ordem de implementação sugerida
1. Tabela `social_media_credentials` + tela de config (sem OAuth ainda — entrada manual de token para teste)
2. Edge function `publish-social-media` só com Instagram primeiro
3. Bloco "Publicar em Rede Social"
4. Blocos de aprovação WhatsApp (múltiplas mídias + escolha destino)
5. Lógica de pausa/retomada no engine + webhook WAHA
6. OAuth Meta completo

## Perguntas antes de começar
1. **Quais redes sociais** no MVP? (sugiro só Instagram + Facebook)
2. Você já tem **App Meta** criado, ou precisa de guia para criar?
3. A **aprovação por WhatsApp** será sempre para um único número fixo (configurado no bloco), ou dinâmico via variável?
4. Deseja que o sistema **agende** a publicação (ex.: "publicar amanhã 9h") ou só publicação imediata?