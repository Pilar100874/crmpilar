
## Objetivo
Deixar todos os editores visuais (workflows) do sistema com o **mesmo padrão visual do Bot Builder**: header superior, biblioteca de blocos à esquerda (colapsável), canvas no centro com mesmos controles, painel de propriedades à direita (mesmo formato), e blocos com a mesma aparência.

## Workflows alvo (todos devem ficar idênticos visualmente ao Bot Builder)

1. **Bot Builder** — `src/pages/BotBuilder.tsx` (referência, sem mudanças visuais)
2. **Automações de Vendas** — `src/pages/AutomacoesVendas.tsx`
3. **Editor de Regras (automação)** — `src/pages/EditorRegras.tsx`
4. **Editor de Regras de E-commerce** — `src/pages/EcommerceRulesEditor.tsx`
5. **Automações de Logística** — `src/pages/LogisticaAutomacoes.tsx`
6. **Marketing Canvas** — `src/pages/MarketingCanvas.tsx`
7. **Omnichannel Builder** — `src/pages/OmnichannelBuilder.tsx`
8. **Ads Hub (automação de anúncios)** — `src/pages/AdsHub.tsx`

## Padrão do Bot Builder (o que vou replicar)

### Header superior (sticky)
- Altura ~56px, `bg-card/95 backdrop-blur border-b`.
- Esquerda: título + botão **"+ Blocos"** que abre a biblioteca.
- Direita: ações (Salvar, Simular, Importar/Exportar, Zoom In/Out/Fit, Lock/Unlock).
- Botões pequenos `size="sm"` com ícones lucide.

### Biblioteca de blocos (esquerda)
- Painel colapsável (largura 256px expandido, oculto colapsado).
- Header com título + botão X para fechar.
- Categorias com chips e busca no topo.
- Cards de bloco arrastáveis com ícone colorido + label + descrição.

### Canvas central
- ReactFlow com `BackgroundVariant.Dots`, gap 16, cor `hsl(var(--muted-foreground))`.
- `Controls` no canto inferior esquerdo, `MiniMap` no inferior direito (estilizado com tokens).
- Snap to grid 8px.

### Painel de propriedades (direita)
- `fixed right-0 top-[56px] w-full sm:w-[420px] lg:w-96 h-[calc(100vh-56px)]`
- `bg-card border-l shadow-2xl` com header sticky (ícone + nome do bloco + X).
- Conteúdo scrollável, footer sticky com ações (Salvar / Excluir).
- Sem scroll horizontal (regra já existente `workflow-props`).

### Blocos (nodes) no canvas
- Card arredondado `rounded-xl`, borda colorida por categoria.
- Header com ícone + label, badge de status, handles superior/inferior.
- Hover com `ring-2 ring-primary/40`, selecionado com `ring-2 ring-primary`.

## Como vou implementar

Em vez de reescrever cada BlockLibrary/PropertiesPanel/FlowNode separadamente, vou:

1. **Criar 3 componentes "shell" compartilhados** em `src/components/workflow-shell/`:
   - `WorkflowHeader.tsx` — header padronizado (recebe título + slots de ações).
   - `WorkflowLibraryShell.tsx` — wrapper visual padronizado para qualquer biblioteca de blocos (recebe categorias e itens como props).
   - `WorkflowPropertiesShell.tsx` — wrapper visual padronizado para painel de propriedades (recebe título, ícone, conteúdo e ações).
   - `WorkflowNodeShell.tsx` — wrapper visual padronizado para nodes do ReactFlow.

2. **Adaptar cada workflow** para usar esses shells, mantendo a lógica de negócio (handlers, configs, validações) intocada. Só troco a camada de apresentação.

3. **Adicionar tokens CSS globais** em `src/index.css` (classes `workflow-header`, `workflow-canvas`, `workflow-properties`, `workflow-node`) para garantir consistência mesmo se algum workflow não migrar totalmente.

4. **Manter responsividade** já implementada (mobile overlay para propriedades com X, edge-swipe, sem scroll horizontal).

## O que NÃO vou mudar
- Lógica de cada workflow (regras, validações, persistência, edge functions).
- Conjunto de blocos disponíveis em cada editor.
- Comportamento de simulação, breakpoints, AI Generator etc.

## Riscos
- Alguns workflows (Marketing Canvas, Ads Hub) têm estruturas bem diferentes (não usam ReactFlow da mesma forma). Para esses, vou padronizar apenas header + painel de propriedades + estilo dos cards, mantendo o canvas próprio.
- Pode haver pequenas regressões visuais em telas muito específicas — vou validar visualmente cada workflow após a migração.

## Entrega esperada
Todos os 8 workflows com a mesma identidade visual do Bot Builder: mesmo header, mesma biblioteca, mesmo painel de propriedades, mesmo estilo de bloco e mesma posição/comportamento dos menus.
