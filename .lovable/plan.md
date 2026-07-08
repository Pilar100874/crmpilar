# Merge avançado no Editor Playground

## O que vai mudar

### 1. Nova sintaxe de template (`src/lib/editores/mergeEngine.ts`)
Amplia o `renderTemplate` para suportar, além de `{{campo}}`:

- **Caminhos aninhados**: `{{cliente.nome}}`, `{{pedido.itens.0.descricao}}`
- **Loops**: `{{#each itens}} ... {{descricao}} — {{valor}} ... {{/each}}` (com `{{@index}}`, `{{@first}}`, `{{@last}}`)
- **Condicional**: `{{#if valor}} ... {{/if}}` / `{{#unless}}`
- **Agregações inline**: `{{sum itens.valor}}`, `{{avg itens.valor}}`, `{{count itens}}`, `{{min}}`, `{{max}}`
- **Fórmulas**: `{{= valor * quantidade * (1 - desconto/100) }}` — avaliador seguro (whitelist de operadores + Math.*)
- **Formatação**: `{{moeda valor}}`, `{{data data_venda}}`, `{{numero qtd 2}}`

Compatível com a sintaxe atual (`{{campo}}` continua funcionando).

### 2. Merge Builder revisado (`src/components/editores/MergeBuilderDialog.tsx`)
Duas abas:

**Aba "Visual"**
- Tabela principal + alias (já existe)
- **Novo:** botão "Adicionar relação" → escolhe tabela relacionada, campo local, campo remoto, alias, cardinalidade (1:1 ou 1:N). Ex.: `pedidos` + relação `itens` via `pedidos_ecommerce_itens.pedido_id = pedidos.id` (1:N).
- Filtros e limite (já existem)
- Preview do JSON resultante

**Aba "SQL"**
- Textarea SQL livre executada via edge function `execute-merge-query` (nova, ver §4). Suporta apenas `SELECT`.
- Toggle "Usar SQL em vez do visual".

`MergeConfig` ganha campos:
```ts
{ tabela, alias, filtros, limite, calculados,
  relations?: { alias, tabela, localKey, foreignKey, cardinality: '1:1'|'1:N' }[],
  sql?: string,
  mode: 'visual' | 'sql'
}
```

### 3. Executor (`src/lib/editores/runMergeConfig.ts`)
- Modo `visual`: roda query principal, depois para cada relação faz um `select().in(foreignKey, ids)` e agrupa em memória (evita N+1).
- Modo `sql`: invoca edge function.
- Aplica `calculados` (já existe) por linha.

### 4. Edge function `execute-merge-query`
- Aceita `{ sql, params }`, valida que começa com `SELECT`, bloqueia `;`, `INSERT|UPDATE|DELETE|DROP|ALTER|GRANT|TRUNCATE`.
- Executa via `supabase.rpc` numa função `public.exec_readonly_sql(sql text)` criada por migration (SECURITY DEFINER, `SET default_transaction_read_only = on`, restrita ao role autenticado + filtro por `estabelecimento_id` do usuário).
- Retorna `{ rows }`.

### 5. UI do Simulador (`src/components/editores/SimuladorInline.tsx`)
- Detecta variáveis usadas no template (incluindo caminhos e loops) e mostra árvore navegável do registro atual em vez do painel plano atual.
- Painel "Sobrescrever" só aparece para campos raiz (compat).
- Botão "Ver dados brutos" (JSON) para debug.

### 6. UI do Editor (barra do Tiptap)
- Novo menu "Inserir": lista campos das tabelas configuradas (principal + relações), botão "Inserir loop de {{alias}}", botão "Inserir fórmula".

## Segurança
- SQL livre roda só via função `SECURITY DEFINER` read-only, escopada ao `estabelecimento_id` do usuário (WHERE injetado obrigatoriamente ou bloqueio).
- Fórmulas: parser próprio (sem `new Function` sobre string bruta do usuário; whitelist de tokens numéricos, operadores e `Math.*`).
- RLS das tabelas continua valendo (query roda como usuário autenticado).

## Entregáveis
1. Migration: `exec_readonly_sql` + grants.
2. Edge function `execute-merge-query`.
3. `mergeEngine.ts` reescrito com loops/condicionais/agregações/fórmulas + testes manuais no playground.
4. `MergeBuilderDialog` com abas Visual/SQL e editor de relações.
5. `runMergeConfig` com resolução de relações.
6. `SimuladorInline` com árvore de dados.
7. Menu "Inserir campos/loops" na toolbar do editor.

## Fora de escopo
- Editor visual de fórmulas tipo Excel (só textarea com autocomplete simples).
- Cache de queries.
- Salvar SQL como "view reutilizável" (fica para depois).

Confirma para eu começar a implementar?