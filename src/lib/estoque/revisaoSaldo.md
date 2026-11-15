# Revisão do saldo fracionado

Regra: entradas e saídas de produtos em kg, metros ou outras unidades fracionadas não podem perder casas decimais ao calcular ou consultar o saldo.

## Pontos revisados

| Tela / fluxo | Código | Resultado |
|---|---|---|
| Saldos, ajustes, movimentações e CSV | `src/pages/estoque/Estoque.tsx`, `contexto.ts` | Saldo decimal; ajuste aceita frações. Histórico mantém quantidades registradas. |
| Entrada XML/manual, conversão e desmembramento | `Estoque.tsx`, `compras/entradaNfe.ts` | Quantidade × fator sem arredondamento inteiro. |
| Notas recebidas DF-e | `components/estoque/NotasRecebidasDfe.tsx` | Usa a mesma entrada de XML; não calcula saldo por conta própria. |
| Saída fiscal e devolução | `src/pages/fiscal/Faturamento.tsx` | Insere quantidades numéricas nos movimentos; não altera saldo diretamente. |
| Necessidade de compras e cotações | `src/pages/compras/Compras.tsx`, `necessidadeCompra.ts` | Lê decimal; sugestão tem precisão de três casas, sem alterar saldo. |
| Cadastro, duplicação e colagem de produtos | `components/config/ProdutosCRUD.tsx`, `lib/produtos/colarDadosProduto.ts` | Lê decimal; edição não sobrescreve saldo; cópia inicia em zero. |
| Simulação de produção e substitutos | `FichaProducaoEditor.tsx`, `producao/montagemFicha.ts` | Recebe os produtos do cadastro atualizado e compara saldos sem arredondar. |
| Orçamento, conjuntos e pedido carregado | `AddItemForm.tsx`, `ConjuntoItensEditor.tsx`, `POSView.tsx` | Consultas genéricas e relacionamentos passaram a devolver o saldo decimal. Quantidades históricas dos pedidos não são modificadas. |
| Atendimento, inserir tabela no editor e etiquetas | `ConsultaEstoqueDialog.tsx`, `EstoqueSearchDialog.tsx`, `EtiquetasZebra.tsx` | Consultam saldo decimal; não gravam saldo. |
| Loja, catálogo, produto, relacionados e favoritos | `EcommerceHome.tsx`, `EcommerceCatalog.tsx`, `EcommerceProduct.tsx`, `EcommerceWishlist.tsx` | Disponibilidade e limite de estoque recebem decimal. |
| Carrinho, vitrine por regras e categorias | `CartContext.tsx`, `EcommerceCart.tsx`, `EcommerceRulesVitrine.tsx`, `useEcommerceCategories.ts` | Consultam preço, identidade ou categorias; não calculam nem sobrescrevem saldo. |
| Importação completa / somente estoque | `ApiImportWizardStep7.tsx` | Escreve saldo decimal, preservando o comportamento anterior da importação. |
| API de produtos | `functions/api-produtos/index.ts` | Retorna decimal sob o nome externo estoque_atual. |
| Chat e prévias de dados | `chat-agent-execute`, `AgentDataPreviewDialog.tsx`, `ChatAgentsCRUD.tsx` | Saldo decimal, inclusive vínculo legado configurado como produtos.estoque. |
| Catálogo de voz | `functions/_shared/catalogoVenda.ts` | Decimal e unidade de estoque do produto; corrigida confusão com tipo de preço. |
| MCP | `lib/mcp/tools/list-produtos.ts`, `functions/mcp/index.ts` | Saldo decimal; publicação disponibiliza a versão do servidor MCP. |
| Mercado Livre | `functions/mercadolivre-sync/index.ts` | Lê decimal e não modifica saldo interno. Conversões para unidades comerciais da plataforma não são inferidas. |
| Demais conectores de marketplace | `services/marketplaces/*`, funções de sincronização | Não acessam produtos.estoque; não participam do arredondamento interno. |
| Buscas de produtos em marketing, robô de preços, bots e WhatsApp | Consultas de produtos em `src` e `functions` | Selecionam identidade, preço, imagens ou categorias; não consomem saldo. |
| Banco: movimento e compatibilidade | `estoque_aplicar_movimento`, `produtos_saldo_compatibilidade` (definições atuais consultadas) | Movimento usa numeric sob bloqueio; inteiro é apenas projeção legada. Nenhuma view pública depende do campo inteiro. |
| EPI, ferramentas e materiais operacionais | Controles de estoque separados | Fora do saldo de produtos; nenhuma alteração. |

## Verificação

- Teste transacional: 12,4; três entradas de 0,4 = 1,2; saída de 0,25 = 0,95; devolução e edição preservam 1,2.
- Fluxo autenticado pela tela: entrada de 0,4 kg lida novamente e estorno imediato, sem mudar o saldo original.
- Testes de compras, produção e catálogo de voz.
- Nenhum documento fiscal concluído foi recalculado; frações perdidas antes da correção não são reconstruídas.