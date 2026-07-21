## Objetivo

Trocar o CRUD de formulário atual da aba **Workflows** (Gerenciador de Telas Remotas) por um **editor visual em blocos** com o mesmo look & feel do **BotBuilder**: paleta lateral de blocos arrastáveis, canvas ReactFlow com fundo pontilhado, painel de propriedades à direita, MiniMap, botão de salvar/testar e simulador.

---

## Estrutura da tela

```text
+--------------------------------------------------------------+
| ⚡ Workflow XYZ    [Salvar] [Testar] [Simular] [◁ Voltar]     |
+---------+------------------------------------------+---------+
|         |                                          |         |
| Blocos  |            Canvas ReactFlow              | Props   |
| (lib)   |         (drag & drop, conexões)          | do bloco|
|         |                                          |         |
+---------+------------------------------------------+---------+
```

Reaproveita a mesma linguagem visual do BotBuilder: `BlockLibrary` estilo cartões coloridos por categoria, `FlowNode` custom com ícone + título + descrição, edges animadas, MiniMap e Controls do ReactFlow.

---

## Blocos disponíveis

**Gatilhos (roxo)**
- Evento do sistema (venda, caminhão parado, câmera, ponto, visita, manual…)
- Agendado (cron)
- Webhook externo

**Condições (amarelo)**
- Filtro por variável do evento (`placa`, `valor`, `motorista`, etc.) com operadores `=, ≠, >, <, contém`
- Horário / dia da semana
- Escopo do dispositivo (grupo, dashboard atual, ID)

**Ações (azul/verde)**
- Mostrar barra de notificação (mensagem, ícone, cores, posição, duração)
- Aguardar N segundos
- Trocar dashboard do dispositivo
- Enviar comando (reiniciar app, limpar cache, brilho…)
- Tocar som/beep (via app Android)
- Registrar evento no log

Cada bloco tem `defaultData`, ícone Lucide, cor da categoria, e um form próprio no painel de propriedades.

---

## Modelo de dados

Reaproveita `tv_workflows` já existente, adicionando:
- `flow_json` (jsonb) — nodes + edges do ReactFlow
- `versao` (int) — incrementa a cada salvamento

Mantém colunas antigas (`evento`, `mensagem_template`, `estilo`, `duracao_segundos`) como cache do **primeiro gatilho + primeira ação de barra** — assim a edge function `tv-workflow-dispatch` continua funcionando sem quebrar nada, mas passa a interpretar `flow_json` quando presente.

---

## Fluxo de execução

Quando um evento chega em `tv-workflow-dispatch`:
1. Carrega workflows ativos com `flow_json`.
2. Encontra nós **Gatilho** que casam com o evento.
3. Percorre as edges executando os blocos: condições filtram, ações produzem execuções.
4. Cada nó "Mostrar barra" gera uma linha em `tv_workflow_execucoes` para cada dispositivo alvo.
5. `TvNotificationBar` continua consumindo `tv_workflow_execucoes` via Realtime — nenhuma mudança no cliente.

---

## Arquivos afetados

Novos:
- `src/pages/tv-signage/TvWorkflowBuilder.tsx` — editor visual (equivalente enxuto do BotBuilder)
- `src/components/tv-workflow/TvBlockLibrary.tsx` — paleta lateral
- `src/components/tv-workflow/TvFlowNode.tsx` — nó customizado
- `src/components/tv-workflow/TvPropertiesPanel.tsx` — painel de propriedades
- `src/types/tvWorkflow.ts` — `BLOCK_DEFINITIONS` (tipos, ícones, cores, defaults)
- `supabase/functions/tv-workflow-dispatch/index.ts` — passa a interpretar `flow_json`

Alterados:
- `src/pages/tv-signage/TvSignageWorkflows.tsx` — vira lista simples (nome, gatilho, status) com botão "Editar no builder" que abre `/tv-signage/workflows/:id/builder`
- `src/App.tsx` — registra a rota do builder
- Migration para `ALTER TABLE tv_workflows ADD COLUMN flow_json jsonb, versao int DEFAULT 1`

---

## Detalhes técnicos

- ReactFlow já está instalado (`@xyflow/react`) e reutilizado em outros builders (bot, logistica, omnichannel), então nenhuma dependência nova.
- O `FlowNode` do bot é reaproveitável mas prefiro um `TvFlowNode` mais enxuto para não trazer ruído (variáveis, sub-fluxos, etc. que não fazem sentido aqui).
- Salvamento debounced, com atalho `Ctrl+S`.
- Templates prontos ("Alerta de caminhão parado", "Aviso de venda grande") disponíveis no primeiro acesso.

---

## Fora de escopo desta iteração

- Simulador passo-a-passo com dados fake (fica como próximo passo).
- Versionamento com rollback visual (só guarda `versao`).
- Sub-fluxos / nós reutilizáveis.

Confirma que posso seguir por esse caminho? Se quiser, posso restringir o conjunto inicial de blocos ou trocar a lista principal por thumbnails do canvas em vez de tabela.