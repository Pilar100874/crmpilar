# Fase 1 — Análise do sistema atual para Faturamento, Fiscal e NF-e de Entrada

Esta é apenas a análise pedida. Nada foi alterado. Todas as telas novas seguirão o visual atual (mesmos cabeçalhos, cartões, abas, cores do tema, sem rolagem horizontal, tudo em português).

## O que já existe e será reaproveitado

| Área | Já existe |
|---|---|
| Empresas / unidades (multiempresa) | `estabelecimentos` + unidades, com separação por empresa nas regras de acesso |
| Clientes e fornecedores | `empresas` (com flag de transportadora), `customers` |
| Produtos | `produtos` com NCM, unidade, campos fiscais, `produto_fornecedores` (código do fornecedor + qtd. mínima) |
| Vendas | `orcamentos` / `pedidos_recebidos` (pedidos aprovados) |
| Compras | tela Compras + `compras_cotacoes` |
| Estoque | tela Estoque + `estoque_movimentos` (saldo travado por produto) |
| Fiscal | telas Faturamento, Tipos de Operação, Config. NF-e, Config. Systax; tabelas `notas_fiscais` (54 campos), `notas_fiscais_itens`, `fiscal_tipos_operacao`, `ncm_codigos`, `systax_config`, `nfe_config` |
| Certificado A1 | leitura no navegador, arquivo em pasta privada, senha guardada sem poder ser lida de volta |
| Systax | função `systax-calcular` + montagem da consulta (`motorFiscal.ts`), sem alíquotas inventadas |
| Emissão atual | função `nfe-focus` (via Focus NFe) e `nfe-recebidas` (DF-e via Focus) |
| Entrada por XML | leitura do XML, divisão de itens em vários produtos, auditoria Systax da entrada |

Hoje não há nenhuma nota, configuração de NF-e ou Systax salva no banco, então nada em uso será afetado.

## O que não existe

- **Financeiro:** não há contas a receber nem a pagar. A integração da seção 8 exige criar esse módulo primeiro ou deixá-la para depois.
- **Motor próprio SEFAZ:** a emissão atual depende da Focus NFe.

## Tabelas novas (só acréscimos)

- `nfe_series` — série e próximo número por unidade, com reserva de número que não se repete
- `nfe_eventos` — cancelamento, carta de correção, inutilização, manifestação, com protocolo
- `nfe_transmissoes` — histórico de cada envio, separando falha de rede de rejeição fiscal
- `fiscal_consultas_systax` — auditoria: o que foi enviado, o que voltou, quem consultou e quando
- `fiscal_ajustes_manuais` — alterações manuais autorizadas nos tributos
- `nfe_entrada_conferencia` (+ itens) — quantidade faturada × recebida e divergências
- `dfe_controle_nsu` / `dfe_documentos` — distribuição DF-e com NSU e intervalo mínimo entre consultas
- Campos novos em `notas_fiscais`: situação detalhada (os 11 estados), chave de idempotência e vínculo com o pedido

## Menus e telas

- **Faturamento:** Painel, Faturar Pedidos, Nova NF-e (8 abas, rascunho automático), Emitidas, Rascunhos, Rejeitadas, Canceladas, Devoluções, Eventos, Inutilização, Séries, Relatórios
- **Notas de Entrada:** Painel, Recebidos, Importar XML, Consultar SEFAZ, Manifestação, Conferência, Vincular Pedido de Compra, Entrada de Estoque, Devolução a Fornecedor, Divergências, Histórico, Relatórios
- **Fiscal:** Painel, Integração Systax, Consultas, Simulador, Conferência de Tributos, Auditoria, Documentos, Eventos, Relatórios, Configurações
- As telas atuais (Faturamento, Tipos de Operação, Config. NF-e, Config. Systax) entram nesses menus, sem duplicar.

## Dependências externas (dependem de você)

1. **Contrato e credenciais da Systax** e a documentação das APIs contratadas. Sem isso, as consultas ficam marcadas como "não configurado".
2. **Certificado A1 real** de cada empresa e cadastro em homologação na SEFAZ.
3. **Motor próprio SEFAZ:** precisa de um servidor fora do Lovable (ex.: biblioteca NFePHP ou Unimake, que podem ser usadas comercialmente). O motivo é a comunicação com certificado do cliente, a assinatura do XML e os serviços de cada estado. Aqui eu crio o contrato (OpenAPI e interfaces) e a ligação com ele. Enquanto o motor não existir, a emissão continua pela Focus NFe, se você quiser.

## Riscos técnicos

- Emitir direto na SEFAZ a partir das funções do Lovable é instável: há limites de tempo e de certificados. Por isso a recomendação é um servidor externo.
- Numeração: dois cliques ou uma queda de rede podem gerar número duplicado ou pulado. A solução é reservar o número no banco e usar chave de idempotência.
- Estoque e financeiro só mudam com eventos definidos (autorização, aprovação da conferência), nunca na importação do XML.
- A Reforma Tributária (IBS, CBS e IS) depende do leiaute vigente e do que a Systax retornar.
- Nenhuma tela será marcada como "funcional" antes da homologação real.

## Ordem de implementação (uma fase por vez, após sua aprovação)

1. **Fase 2:** menus, rotas, tabelas novas e telas com dados reais (painéis, listas, séries, simulador ligado à Systax)
2. **Fase 3:** importar XML, conferência, vínculo de produtos e entrada de estoque sem duplicar
3. **Fase 4:** Systax completa com auditoria e ajustes manuais
4. **Fase 5:** contrato do motor SEFAZ, transmissão, DANFE e estados de envio
5. **Fase 6:** eventos, DF-e, manifestação, relatórios CSV/Excel e testes

## Detalhes técnicos

- Políticas de acesso por `estabelecimento_id` com `get_auth_user_estabelecimento_id()`, mais as permissões de menu atuais
- Toda alteração no banco é só acréscimo, sem apagar ou renomear nada
- Cada fase entra no catálogo de rotas de voz e na personalização do menu, e inclui testes de duplicidade, numeração e isolamento entre empresas
