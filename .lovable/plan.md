## Objetivo

Padronizar em todo o sistema a regra de exclusão dos cadastros:

1. Antes de excluir, verificar automaticamente onde o registro está sendo usado (inclusive dentro de workflows, bots, automações, campanhas, blocos de nós etc.).
2. Se **não** tiver uso → mostrar diálogo de confirmação e permitir excluir.
3. Se **tiver** uso → listar os locais onde está sendo usado e permitir **apenas inativar** (soft-delete). O botão "Excluir" fica desabilitado com aviso claro: "Remova os vínculos antes de excluir".

## Cadastros cobertos

Grupo A – Cadastros base:
- Empresas (cliente / prospect / vendedor / transportadora)
- Contatos (customers) – já feito, será padronizado ao mesmo componente
- Produtos, Grupos de produtos, Categorias de produtos
- Veículos, Grupos de veículos, Motoristas (cv_drivers), Dispositivos de rastreamento
- Usuários, Atendentes, Filas, Skills
- Canais de atendimento / sessões WhatsApp – já bloqueia, será alinhado à UI padrão
- Vendedores e Transportadoras (via empresas)
- Fornecedores/estabelecimentos aplicáveis

Grupo B – Configuração e conteúdo:
- Workflows (bot, logística, TV, omnichannel), Bots/Flows, Automações de vendas
- Mensagens pré-definidas, Quick replies, Macros
- Tabelas de preço, Condições de pagamento, Cupons
- Modelos de documento, Templates de e-mail/SMS
- Campanhas, Envio em massa (templates e contatos)
- Agentes de IA, Bases de conhecimento

## Como será feito

### 1) Coluna `ativo` (soft-delete) onde não existir
Adicionar `ativo boolean not null default true` nas tabelas dos cadastros acima que ainda não possuem, mais índice parcial `where ativo`.

### 2) Função genérica de checagem de dependências
Criar `public.check_entity_dependencies(p_entity text, p_id uuid) returns jsonb` que:
- Recebe o nome lógico da entidade (`empresa`, `produto`, `veiculo`, `usuario`, `whatsapp_sessao`, `motorista`, `quick_reply`, `mensagem_grupo`, `workflow`, `bot_flow`, `automacao`, `campanha`, `agente_ia`, `modelo_doc`, `tabela_preco`, `cupom`, `grupo_produto`, `grupo_veiculo`, `fila`, `skill`, `atendente`, `canal`, `vendedor`, `transportadora`, `contato`).
- Faz `SELECT count(*)` em cada tabela referenciadora, incluindo varredura JSONB nos configs dos workflows/bots/automations com `jsonb_path_exists` para achar o id embutido em nós/blocos.
- Retorna `{ "tabela_amigavel": n, ... }`.

### 3) Função genérica de exclusão segura
`public.safe_delete_entity(p_entity text, p_id uuid) returns jsonb`:
- Chama `check_entity_dependencies`. Se houver qualquer contagem > 0 → `raise exception 'HAS_DEPENDENCIES' using detail = jsonb_texto` (o front lê e mostra).
- Caso contrário, executa `DELETE` na tabela alvo com cascade dos vínculos puramente de junção (many-to-many).

E `public.inactivate_entity(p_entity text, p_id uuid) returns boolean` que faz `UPDATE ... SET ativo = false`.

### 4) Componente único de UI
`src/components/common/DeleteWithDependenciesDialog.tsx`:
- Props: `entity`, `id`, `label`, `onDeleted`, `onInactivated`.
- Ao abrir, chama a RPC de checagem, mostra lista amigável dos vínculos.
- Botões dinâmicos:
  - Sem vínculos: **Excluir** (destrutivo) + Cancelar.
  - Com vínculos: **Inativar** + Cancelar (Excluir desabilitado + tooltip).
- Sempre passa por confirmação (conforme regra global do projeto).

### 5) Adoção nas telas
Substituir os fluxos de delete atuais pelo novo componente em:
- Empresas (todos os tipos), Contatos, Produtos, Veículos, Motoristas, Usuários, Atendentes, Filas, Skills, Canais/Sessões WhatsApp, Workflows (bot/logística/TV/omnichannel), Bot Flows, Automações de vendas, Quick Replies, Macros, Mensagens pré-definidas, Tabelas de preço, Cupons, Agentes de IA, Modelos de documento, Campanhas, Envio em massa.

### 6) Filtros de "Mostrar inativos"
Onde já existir listagem, filtrar por `ativo = true` por padrão e adicionar toggle "Mostrar inativos".

## Detalhes técnicos

- Todas as funções: `SECURITY DEFINER`, `SET search_path = public`, uso de `has_role`/`user_in_estabelecimento` para isolamento multi-tenant onde aplicável.
- Varredura em workflows/bots usa `jsonb @? '$.** ? (@ == "<uuid>")'` para localizar o id em qualquer nó de fluxo.
- Nomes amigáveis das entidades e dos vínculos ficam em uma tabela de dicionário no próprio componente (pt-BR), respeitando a Core rule de idioma.
- Nenhum breaking change no schema atual — só adições (coluna `ativo`, funções, índices).

## Entrega

1 migração de banco (colunas + funções + índices) + 1 componente React + edits pontuais nas ~25 telas listadas para trocar o handler de delete. Nada muda em regras de negócio já existentes; apenas o fluxo de exclusão fica uniforme e seguro.
