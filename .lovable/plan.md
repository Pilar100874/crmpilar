# Plano — Expansão do módulo Editores

## 1. Nova tela unificada `/editores` (Hub em cards)

Substitui a lista atual por **duas seções em cards**:

- **📄 Documentos** — documentos criados avulsos (sem modelo).
- **📐 Modelos** — modelos reutilizáveis.

Cada card mostra: título, data, prévia curta e ações: **Abrir · Duplicar · Excluir · Imprimir PDF**.

Botões no topo:
- **+ Criar Modelo** → abre editor em modo `modelo` (salva em `doc_modelos`).
- **+ Criar Documento** → abre editor em modo `documento` (salva em `doc_gerados` sem `modelo_id`).

## 2. Editor unificado (mesma tela para modelo e documento)

Reaproveita `ModeloEditor.tsx` renomeado para `EditorDocumento.tsx`, aceitando `?tipo=modelo|documento`.

Muda apenas: destino do save + rótulo do botão. Saída **exclusivamente PDF** (remove HTML/DOCX; mantém Imprimir).

## 3. Novo: Merge Builder Visual (popup)

Substitui a sidebar estática de campos por um **construtor de query** acessível via botão **"🔗 Vincular dados"** na toolbar.

Popup com 3 abas:

**a) Tabelas & Joins**
- Selecionar tabela principal (customers, empresas, pedidos_ecommerce, orcamentos, ponto_funcionarios, etc.).
- Adicionar tabelas relacionadas via FK (dropdown com joins sugeridos).
- Visual estilo blocos empilhados.

**b) Filtros**
- Linhas condicionais: `campo` `operador` `valor` (=, !=, ilike, >, <, between, in).
- AND/OR entre linhas.

**c) Campos disponíveis**
- Após montar a query, lista todos os campos como chips arrastáveis: `{{cliente.nome}}`, `{{pedido.total}}`, etc.
- Clique = insere no editor no cursor.

Estado do merge salvo em `doc_modelos.merge_config` (jsonb novo) e `doc_gerados.merge_config`.

## 4. Navegação registro-a-registro (simulação)

No modo Simular (mantém tab existente), após executar a query o usuário vê:
- **⬅ Anterior | Registro 3 de 47 | Próximo ➡** + campo "ir para #".
- Cada mudança re-renderiza o preview com os dados daquele registro.
- Executa `supabase.from(tabela).select(campos_da_query).match(filtros)` uma vez, pagina em memória.

## 5. Campos de formulário preenchíveis (novos tipos)

Expande o sistema `[[label]]` atual para tipos ricos. Nova sintaxe:

```
[[texto:Nome do cliente]]
[[textarea:Observações]]
[[data:Vencimento]]
[[numero:Valor]]
[[check:Aceito os termos]]
[[lista:Estado|SP,RJ,MG,RS]]
[[radio:Sexo|M,F]]
```

**Componente `FormFieldPicker`** — botão na toolbar abre popup para escolher tipo, rótulo e opções; insere o token no cursor.

Render (`applyFillables`) passa a gerar `<input>`, `<textarea>`, `<select>`, `<input type=checkbox>` etc. conforme o tipo.

## 6. Modo "Formulário travado" (Tab entre campos)

Toggle **"🔒 Modo preenchimento"** na tela de geração/simulação:
- Todo o texto fica `contentEditable=false` / com `user-select: none`.
- Apenas os inputs de `[[...]]` ficam ativos.
- **Tab** navega automaticamente entre eles (ordem natural do DOM já cobre isso).
- Botão **"Gerar PDF"** coleta valores e produz PDF final.

## 7. Ajustes de banco (migração)

```sql
ALTER TABLE doc_modelos ADD COLUMN merge_config jsonb DEFAULT '{}'::jsonb;
ALTER TABLE doc_gerados ADD COLUMN merge_config jsonb DEFAULT '{}'::jsonb;
ALTER TABLE doc_gerados ALTER COLUMN modelo_id DROP NOT NULL;
ALTER TABLE doc_gerados ADD COLUMN tipo text DEFAULT 'documento'; -- 'documento' | 'gerado_de_modelo'
```

## 8. Detalhes técnicos

- **Arquivos novos**:
  - `src/pages/editores/EditoresHub.tsx` (cards documentos + modelos)
  - `src/components/editores/MergeBuilderDialog.tsx`
  - `src/components/editores/FormFieldPicker.tsx`
  - `src/components/editores/RegistroNavigator.tsx`
  - `src/lib/editores/queryBuilder.ts` (monta query Supabase a partir do merge_config)
  - `src/lib/editores/formFields.ts` (parse/serialize dos novos tokens `[[tipo:label|opções]]`)

- **Arquivos editados**:
  - `mergeEngine.ts` — regex ampliada para `[[tipo:label|opts]]`, novo `applyFillables` que renderiza inputs tipados.
  - `SimuladorInline.tsx` — integra `RegistroNavigator` + modo formulário travado.
  - `ModeloEditor.tsx` — aceita `?tipo=documento`, toolbar ganha botões Merge/Campo.
  - `GerarDocumento.tsx` — botão único "Gerar PDF" (remove HTML).
  - `App.tsx` + `menus.ts` — rota `/editores` = hub; remove sub-itens redundantes.
  - `pdfExport.ts` — mantém só PDF/print.

- **Fora de escopo agora**: DOCX, e-mail, WhatsApp, assinatura digital (já marcados como futuros).

Confirma que sigo?
