# Validação F01–F16 — 11/09/2026

| ID | Alteração realizada | Arquivos/migrações | Teste executado e resultado | Situação e pendências |
|---|---|---|---|---|
| F01 | Removida promoção automática; papéis permanecem em tabela própria. | Migrações de segurança de 11/09/2026 | Auditoria não encontrou desvio por e-mail. | Implementado e implantado; administradores legados auditados sem alteração automática. |
| F02 | Acesso de Ferramentas e Automação limitado por estabelecimento e papel. | Migração `20260911194455...`; regras atuais | Auditoria encontrou zero ambientes órfãos. | Implementado e implantado; matriz completa de dois papéis/duas empresas bloqueada por falta das quatro sessões. |
| F03 | SMS e push exigem autorização no servidor e leitura dos históricos respeita estabelecimento. | Funções de envio; novas migrações RLS de 11/09/2026 | Sem sessão foi bloqueado; dois logs antigos sem empresa ficaram preservados e inacessíveis a usuários comuns. | Implementado e implantado; envio real bloqueado sem destinatários de homologação. |
| F04 | Disparo exige destinatário explícito, auditoria e idempotência. | Funções de SMS/push; migração `20260911194455...` | SMS sem campos retornou erro 400; nenhum envio real foi executado. | Implementado e implantado; teste com custo pendente. |
| F05 | SQL livre removido do cliente e funções revogadas para visitantes e usuários. | Função segura de prévia; migrações de segurança | `has_function_privilege` retornou falso para visitante e autenticado nas duas funções SQL. | Implementado, testado e implantado. |
| F06 | Dependências móveis alinhadas e lockfile único. | `package.json`, `bun.lock` | `bun install --frozen-lockfile` aprovado. | Implementado e testado. |
| F07 | Indicadores usam conversas reais, período selecionável e erros visíveis. | `src/pages/Dashboard.tsx` | Tipos, lint, testes e build aprovados. | Implementado e testado; consulta detalhada mantém limite técnico de 1.000 registros. |
| F08 | Lead persiste cliente, responsável, segmento e cluster. | Funil e diálogo de negócio | Verificação de tipos aprovada; leitura consistente em duas sessões. | Implementado; segmento/cluster permanecem em campos personalizados, sem índice dedicado. |
| F09 | Etapa selecionada é respeitada e formulários só limpam após confirmação. | Componentes do Funil | Testes automatizados e tipos aprovados. | Implementado e testado sem criar dados comerciais reais. |
| F10 | Criação, ordenação, movimentação e exclusão de etapas agora são atômicas. | Função `salvar_etapas_funil`; `src/pages/Funil.tsx` | Migração aplicada; tipos e build aprovados. | Implementado e implantado; gravação real não executada em produção. |
| F11 | Dias parados usam datas reais e zeram ao mover negócio. | `src/pages/Funil.tsx`; função transacional | Tipos e testes aprovados. | Implementado e testado estaticamente. |
| F12 | Filtros combinados são aplicados no servidor; orçamento inclui todas as cinco etapas. | Contatos, Empresas e `src/pages/Orcamentos.tsx` | Tipos e build aprovados. | Implementado e testado. |
| F13 | Paginação e busca no servidor; itens do orçamento carregam ao abrir. | Contatos, Empresas, Orçamentos e POS | Consulta aninhada removida da listagem; tipos/build aprovados. | Implementado e testado. |
| F14 | Telas são carregadas por módulo e falhas oferecem recuperação. | `src/App.tsx`; `RouteErrorBoundary.tsx` | Build aprovado. | Implementado e testado tecnicamente. |
| F15 | Fluxo reproduzível executa instalação, tipos, lint, testes e build. | `.github/workflows/validate-web.yml`; `eslint.config.js` | Todas as etapas locais aprovadas; 80 testes. | Implementado e testado; alertas legados permanecem visíveis como avisos. |
| F16 | Rótulos acessíveis, estados vazios e confirmação segura de exclusão. | Dashboard e componentes de Orçamentos | Lint e build aprovados. | Implementado no escopo auditado; confirmações nativas em telas não relacionadas permanecem fora deste relatório. |

## Bloqueios reais

- A matriz autenticada completa exige sessões de usuário comum e administrador em cada um dos dois estabelecimentos.
- SMS e push reais exigem ambiente e destinatários de homologação para evitar custo e contato indevido.
- O verificador do banco ainda lista 131 alertas preexistentes; eles exigem revisão funcional individual e não foram alterados em massa para não interromper integrações válidas.