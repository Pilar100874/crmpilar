## Objetivo

Apagar a implementação atual de `PontoNotificacaoBuilder` e criá-la do zero replicando fielmente o padrão do `BotBuilder` (visual, interações, atalhos, painéis) — mantendo o domínio Ponto (eventos: atraso, falta, HE pendente, atestado pendente, banco de horas expirando, fraude; canais: push, WhatsApp, SMS, e-mail, webhook; blocos de condição, quiet hours, delay, template, escalonar, log).

## O que será apagado

- `src/pages/ponto/PontoNotificacaoBuilder.tsx` inteiro (1143 linhas) será substituído por um arquivo novo.
- Rota `notificacoes/:id` em `App.tsx` permanece inalterada.
- Persistência continua em `ponto_notif_workflows` (`flow_data`, `nome`, `ativo`, `evento_gatilho`) — sem migrações de banco.

## Estrutura da nova tela (espelhando o BotBuilder)

1. `WorkflowBuilderLayout` (header padrão com título, nome do fluxo, controles de zoom/lock, testar, salvar, fechar).
2. Sidebar esquerda: `BlockLibrary`-style customizada com grupos colapsáveis (Início, Lógica, Conteúdo, Canais, Ações) e drag-and-drop.
3. Canvas central `ReactFlow` com:
   - `nodeTypes.custom` — nó visual usando `getWorkflowBlockCardClass` (mesmo card do bot).
   - Handles no estilo bot: alvo `w-3 h-3 rounded-full`, saída `w-5 h-5 rounded-full` com hover-scale.
   - Edges `smoothstep` animados com stroke primary e `MarkerType.ArrowClosed`.
   - `Background` (dots), `Controls`, `MiniMap`.
   - `boxSelectionProps`, autopan on drag.
4. `SmartConnectMenu` (make.com style) que abre ao soltar o link no pane, filtrando blocos permitidos por `NEXT_ALLOWED`.
5. Painel direito de propriedades (`PropsPanel`) por tipo de bloco: gatilho, condição, quiet hours, delay, template (com variáveis `{funcionario}`, `{data}`, `{link_aprovacao}`), canais (destino, template ref), escalonar, log.
6. `FloatingAddBlockButton` mobile (botão flutuante) + biblioteca em drawer.
7. Simulador passo-a-passo (`FlowSimulator`-like) com JSON de entrada, log de execução e destaque do nó ativo.
8. Recursos idênticos ao bot: duplicar bloco, breakpoint, pular execução, adicionar nota, excluir com `DeleteConfirmDialog`, exportar/importar JSON, gerador AI (`WorkflowAIGenerator`), controle de dirty state, dialog de saída sem salvar.

## Blocos suportados

```text
Início:    trigger (Gatilho — evento do ponto)
Lógica:    condicao (SIM/NÃO), quiet_hours, delay
Conteúdo:  template
Canais:    canal_push, canal_whatsapp, canal_sms, canal_email, canal_webhook
Ações:     escalonamento, log
```

Regras `NEXT_ALLOWED` mantidas do arquivo atual.

## Detalhes técnicos

- Nó `custom` com header (ícone + label + menu `MoreVertical` com Duplicar / Breakpoint / Pular / Nota / Excluir), preview do config (evento, mensagem, url) e nota opcional.
- Condição renderiza dois handles source (`sim` verde, `nao` vermelho) com labels e botões `+` para Smart Connect por handle.
- Trigger não tem handle target e não pode ser excluído.
- `isValidConnection` + `isSingleEdgePerHandleAllowed` para evitar múltiplas saídas em handles single-output e conexões duplicadas.
- Persistência: `useEffect` calcula hash JSON de nodes/edges/meta para setar `dirty`; ao salvar, roda `update` em `ponto_notif_workflows` e reseta hash.
- Import/Export: JSON com `{ nodes, edges, meta }` via `<input type="file">` oculto.
- Toasts via `sonner` (padrão do projeto).
- Layout responsivo: sidebar vira drawer < lg, painel de propriedades vira drawer full-screen < lg (padrão do bot).

## Fora de escopo

- Nenhuma alteração no listing `PontoNotificacoes.tsx` nem na tela de entregabilidade.
- Sem mudanças em edge functions ou schema do banco.
- Sem mudanças em `App.tsx` (rota reutilizada).

## Riscos

- Workflows já salvos em `ponto_notif_workflows.flow_data` continuam compatíveis pois os tipos de bloco e formato React Flow são mantidos.

Confirma que posso executar essa reescrita completa (arquivo único ~900-1000 linhas) mantendo o schema atual de blocos?
