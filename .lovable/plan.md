## Resumo

Adicionar 7 blocos novos no Bot Builder (exclusivos da Evolution API), atualizar o webhook para enviar os payloads corretos, e bloquear vinculação de bots que usem esses blocos a números configurados como Cloud API oficial.

## Blocos novos (1 por tipo)

Todos com fallback automático para texto quando entrega falhar (já é o padrão do `sendWahaButtonsMessage`).

| Bloco | Type interno | Payload Evolution |
|---|---|---|
| Botão URL | `button_url` | `buttons:[{type:"url", displayText, url}]` |
| Botão Copy (cupom) | `button_copy` | `buttons:[{type:"copy", displayText, copyCode}]` |
| Botão Call (ligação) | `button_call` | `buttons:[{type:"call", displayText, phoneNumber}]` |
| Botão Pix | `button_pix` | `buttons:[{type:"pix", currency, name, keyType, key}]` |
| Botões Mistos | `buttons_mixed` | Lista de até 3 botões, cada um com seletor de tipo (reply/url/copy/call) |
| Botões com Mídia | `buttons_media` | Estende reply buttons com `thumbnailUrl` + `mediaType: image\|video` |
| Carrossel | `carousel` | `cards:[{header, body, footer, buttons:[...]}]` — modo Manual ou Dinâmico (lista de produtos) |

**Observação:** o bloco `reply_buttons` atual fica como está (já envia `type:"reply"`). Os novos blocos são adicionais.

## UI — Biblioteca de blocos

Nova seção "WhatsApp Avançado (Evolution)" em `BlockLibrary.tsx` com badge "Evolution-only" nos 7 blocos. Ícones e cores próprias para diferenciar.

Em `blockInteractionKind.ts`: mapear cada novo type para uma categoria visual (BUTTONS / LIST + nova categoria "PAGAMENTO" para Pix).

## Validação de canal (bloqueio Cloud API)

Quando o usuário tentar vincular um bot a um número via tela de vinculação:

1. Carrega o flow do bot e detecta se usa qualquer bloco em `EVOLUTION_ONLY_BLOCKS = ['button_url','button_copy','button_call','button_pix','buttons_mixed','buttons_media','carousel']`
2. Verifica `whatsapp_numeros.provider` (ou campo equivalente) do número selecionado
3. Se `provider === 'cloud'` (oficial) **e** o flow contém algum bloco Evolution-only → mostra `AlertDialog` listando os blocos incompatíveis e desabilita o botão "Vincular" até o usuário trocar o número ou remover os blocos.

A mesma checagem roda no webhook ao receber mensagem: se canal for Cloud e bloco for Evolution-only, registra erro no log e envia mensagem de fallback informando que aquele recurso requer Evolution API.

## Carrossel — modo Dinâmico

Config tem switch "Origem dos cards":
- **Manual**: lista editável de cards (header URL, body, footer, label do botão, payload do botão)
- **Dinâmico — Produtos**: select de "Tabela de preço" / "Grupo" / "Categoria" + limite (máx 10 cards do WhatsApp). No render do webhook, busca produtos via `produtos` table aplicando filtros e monta os cards usando imagem do produto, nome+preço no body, "Selecionar" como botão. Variável de saída salva o `id` do card selecionado.

## Mudanças no webhook (`supabase/functions/whatsapp-webhook/index.ts`)

1. Estender `sendWahaButtonsMessage` para aceitar botões com `type` variado (reply/url/copy/call/pix) e propagar campos extras (`url`, `copyCode`, `phoneNumber`, `currency`, `name`, `keyType`, `key`).
2. Nova função `sendWahaCarouselMessage` chamando `POST /message/sendCarousel/{instance}` da Evolution.
3. Suporte a `thumbnailUrl` + `mediaType` em `sendButtons` (Evolution já aceita).
4. Novos `case` no switch de tipos de bloco (`button_url`, `button_copy`, etc.) montando o `interactive` correto.
5. Resolver carrossel dinâmico server-side antes de enviar (consulta `produtos`).
6. Guard: se canal não-Evolution e bloco Evolution-only → log de erro + mensagem texto explicativa.

## Arquivos a editar / criar

**Criar:**
- `src/components/flow/block-configs/ButtonUrlConfig.tsx`
- `src/components/flow/block-configs/ButtonCopyConfig.tsx`
- `src/components/flow/block-configs/ButtonCallConfig.tsx`
- `src/components/flow/block-configs/ButtonPixConfig.tsx`
- `src/components/flow/block-configs/ButtonsMixedConfig.tsx`
- `src/components/flow/block-configs/ButtonsMediaConfig.tsx`
- `src/components/flow/block-configs/CarouselConfig.tsx`
- `src/lib/evolutionOnlyBlocks.ts` (constante + helper `detectEvolutionOnlyBlocks(flow)`)

**Editar:**
- `src/components/flow/BlockLibrary.tsx` — registrar os 7 blocos
- `src/components/flow/block-configs/index.tsx` — exportar e mapear nos PropertiesPanel
- `src/components/flow/blockInteractionKind.ts` — mapear tipos
- `src/components/flow/FlowNode.tsx` — renderizar visual dos novos blocos
- Tela de vinculação bot ↔ número (provavelmente `BotManager.tsx` ou similar) — adicionar checagem + AlertDialog
- `supabase/functions/whatsapp-webhook/index.ts` — switch dos novos tipos + funções de envio + guard de canal

## Fora de escopo

- Listas interativas, botões reply puros e botões com mídia para reply simples — esses já existem (`list_buttons`, `reply_buttons`) e não serão duplicados.
- Cloud API: não vamos implementar tradução desses tipos para Cloud (oficial não suporta os mesmos botões). Apenas o bloqueio na vinculação.
