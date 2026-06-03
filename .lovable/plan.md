# Roteiro: "Criar Peça com IA" no Bot Builder

Vou montar o roteiro que você pediu como **blocos reutilizáveis** + um **template pronto** que já entrega os blocos conectados na sequência certa.

## Sequência final do roteiro

```text
[Tipo de Conteúdo]                  ← já existe (botões: Divulgação/Promoção/...)
        ↓
[Influencer?]                       ← NOVO
   ├─ Não → segue
   └─ Sim → pede foto/referência do influencer → segue
        ↓
[Imagem do Produto?]                ← NOVO
   ├─ Não → segue
   └─ Sim → 3 opções (botões):
         • Digitar código do produto  → busca no catálogo → mostra imagem
         • Tirar / enviar foto         → upload de imagem
         • Digitar descrição em texto  → texto livre
         → mostra o que foi enviado e pergunta:
              "Confirmar?" ✅  ou  "Refazer" 🔄 (volta ao início do bloco)
        ↓
[Conteúdo de Texto]                 ← AJUSTADO
   • Modos por campo: Fixo / Pedir ao usuário / **Gerar por IA (novo)**
   • Após coletar/preencher: mostra resumo e pede "Confirmar" / "Editar"
        ↓
[Gerar Mídia IA]                    ← AJUSTADO
   • Lê automaticamente upstream: tipo de conteúdo, influencer, imagem do
     produto e textos definidos
   • Mantém opção de usar prompt pronto OU identidade visual
```

## Mudanças técnicas

### Novos blocos (`src/types/flow.ts` + configs + simulator)
- **`ask_influencer`** — pergunta sim/não em botões; se sim, abre etapa de upload de imagem do influencer; salva em `influencer_image_url`.
- **`ask_product_image`** — pergunta sim/não; se sim, 3 botões (código / foto / texto). Cada modo:
  - **código** → reusa lógica de `product_search_select` (busca catálogo, pega imagem)
  - **foto** → upload direto
  - **texto** → descrição livre
  - Depois: mostra preview + botões **Confirmar** ou **Refazer** (loop para o início do bloco)
  - Saídas: `produto_imagem_url` (quando aplicável) e `produto_descricao`.

### Ajuste em `text_content`
- Adicionar 3º modo por campo: **"Gerar por IA"** (não pergunta; será gerado automaticamente pela IA usando contexto do upstream).
- Após coleta de campos pedidos ao usuário: tela de **confirmação** com resumo e botões **Confirmar** / **Editar**.

### Ajuste em `generate_ai_media` (simulator)
- Helpers já existem para `findUpstreamContentType` e `resolveTextContentValues`. Adicionar:
  - `findUpstreamInfluencer()` e `findUpstreamProductImage()` para injetar essas referências no prompt e como imagens base.
  - Quando um campo de texto estiver em modo "Gerar por IA", incluir diretiva no prompt para a IA criar aquele texto coerente com tipo + produto.

### Template pronto
- Botão **"Carregar roteiro: Criar Peça com IA"** no BlockLibrary (categoria IA) que insere os 5 blocos já conectados na ordem acima, prontos para uso.

## Arquivos afetados
- `src/types/flow.ts` — 2 novos NodeType + defaults
- `src/components/flow/block-configs/AskInfluencerConfig.tsx` (novo)
- `src/components/flow/block-configs/AskProductImageConfig.tsx` (novo)
- `src/components/flow/block-configs/TextContentConfig.tsx` (modo "Gerar por IA" + confirmação)
- `src/components/flow/block-configs/index.tsx` — exports
- `src/components/flow/BlockLibrary.tsx` — novos blocos + botão de template
- `src/components/flow/PropertiesPanel.tsx` — registro dos novos configs
- `src/components/flow/FlowSimulator.tsx` — execução, estados `ask_*`, confirmação, helpers upstream
- `src/pages/BotBuilder.tsx` — handler do template (criar nodes+edges)

## Pontos para confirmar antes de codar
1. **Template pronto**: ok criar o botão "Carregar roteiro" que já insere tudo conectado? (recomendo sim, evita o usuário ter que arrastar 5 blocos)
2. **Bloco Imagem do Produto — modo "código"**: prefere reusar internamente a mesma busca do bloco `product_search_select` existente, ou só pedir o código exato e buscar direto? (reuso é mais flexível, busca direta é mais rápida)
3. **"Gerar por IA" para texto**: a IA deve gerar **antes** de mostrar para o usuário confirmar (com opção de regenerar) ou gerar direto na imagem final sem preview? Recomendo **com preview + regenerar**.
