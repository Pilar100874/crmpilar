## Editores — Módulo de Documentos (tipo Word)

Sistema para criar modelos de documento com editor rich text, campos dinâmicos `{{campo}}`, geração de PDF e histórico. Primeira versão funcional, preparada para evoluir.

### Escopo desta 1ª versão
Entrego cadastro de modelos + editor Tiptap + campos dinâmicos + preview com merge + geração de PDF + histórico. Recursos avançados (assinatura eletrônica, QR code, comparação de versões, DOCX, ZapSign, comentários) ficam como estrutura preparada, não implementados agora.

### 1. Menu
- Novo item **Editores** no menu principal, com sub-itens:
  - **Modelos de Documento** → `/editores/modelos`
  - **Documentos Gerados** → `/editores/documentos`

### 2. Banco de dados (Lovable Cloud)
Novas tabelas com RLS por `estabelecimento_id`:

- `doc_categorias` — id, estabelecimento_id, nome, cor, ordem
- `doc_modelos` — id, estabelecimento_id, categoria_id, titulo, descricao, content_html, content_json (jsonb), ativo, versao_atual, created_by, updated_by
- `doc_modelo_versoes` — id, modelo_id, versao, content_html, content_json, criado_por, snapshot em cada save de "Publicar versão"
- `doc_campos` — id, estabelecimento_id, chave (ex.: `nome_cliente`), rotulo, categoria, tipo (texto/data/moeda/booleano), origem_tabela, origem_coluna, personalizado (bool)
- `doc_gerados` — id, estabelecimento_id, modelo_id, modelo_versao, registro_tipo (cliente/pedido/orcamento/livre), registro_id, titulo, content_html_final, dados_merge (jsonb), status (rascunho/gerado/enviado/assinado/cancelado), gerado_por
- `doc_permissoes` — id, estabelecimento_id, usuario_id, pode_criar_modelo, pode_editar_modelo, pode_excluir_modelo, pode_gerar, pode_ver_gerados, pode_ver_historico

Seed inicial de `doc_campos` com os campos pedidos (nome_cliente, cpf_cnpj, endereco, telefone, email, data_atual, valor, descricao, nome_empresa, responsavel, numero_contrato, data_vencimento).

### 3. Editor (Tiptap)
Instalar `@tiptap/react`, `@tiptap/starter-kit` e extensões: Underline, TextAlign, TextStyle, Color, Highlight, FontFamily, Link, Image, Table, TaskList, Placeholder, CharacterCount.

Toolbar com: negrito, itálico, sublinhado, tachado, H1-H3, parágrafo, alinhamentos, listas, recuo, fonte, tamanho, cor texto/fundo, link, imagem, tabela (add/rem linha/coluna), quebra de página, desfazer/refazer, limpar formatação, tela cheia, zoom.

Área de edição com aparência de folha A4 (`210mm × 297mm`, sombra, margens). Cabeçalho/rodapé configuráveis por modelo. Salvamento automático (debounce 2s) em `content_json`/`content_html`.

### 4. Campos dinâmicos
Sidebar direita **Campos do Sistema**:
- Lista agrupada por categoria com busca
- Clique insere `{{chave}}` na posição do cursor (nó custom do Tiptap com estilo destacado — chip azul)
- Drag & drop para o editor
- Painel "Campos usados neste modelo" com validação (destaque em vermelho se chave inexistente)
- Botão "Criar campo personalizado"
- Suporte a `{{#if chave}}...{{/if}}` e `{{#each lista}}...{{/each}}` via engine Handlebars leve própria

### 5. Merge & Preview
Tela **Gerar Documento**:
1. Escolher modelo
2. Escolher origem: Cliente / Fornecedor / Funcionário / Pedido / Orçamento / Contrato / Atendimento / Livre (preenchimento manual)
3. Selecionar registro (autocomplete nas tabelas existentes: `customers`, `empresas`, `ponto_funcionarios`, `pedidos_ecommerce`, `orcamentos`, etc.)
4. Preview em modal A4 com campos substituídos destacados em amarelo e alerta amarelo para campos vazios
5. Ações: **Gerar PDF** (html2canvas + jsPDF), **Imprimir**, **Baixar HTML**, **Salvar no histórico**

Merge feito no client: engine Handlebars-like resolve `{{campo}}`, `{{#if}}`, `{{#each}}` sobre um objeto `dados` montado a partir do registro.

### 6. Telas
- **Modelos de Documento**: lista lateral (busca + filtro por categoria) + editor central + sidebar direita de campos. Ações: novo, editar, duplicar, excluir (com `DeleteConfirmDialog`), ativar/inativar, publicar versão, ver histórico de versões.
- **Documentos Gerados**: tabela com filtros (modelo, status, período, usuário), abrir para visualizar/reimprimir/duplicar/mudar status.

### 7. Permissões
Verificação via `doc_permissoes` no client + RLS. Admin do estabelecimento sempre tem acesso total.

### 8. Design
Segue o design system atual (tokens semânticos, tema escuro/claro, `DeleteConfirmDialog`, toasts em `@/lib/toast-config`). Layout: sidebar esquerda de modelos, editor central com toolbar sticky, sidebar direita de campos, header com ações.

### Arquivos principais a criar
```text
supabase/migrations/<timestamp>_editores_documentos.sql
src/pages/editores/EditoresLayout.tsx
src/pages/editores/ModelosLista.tsx
src/pages/editores/ModeloEditor.tsx
src/pages/editores/DocumentosGerados.tsx
src/pages/editores/GerarDocumento.tsx
src/components/editores/TiptapEditor.tsx
src/components/editores/EditorToolbar.tsx
src/components/editores/CamposSidebar.tsx
src/components/editores/A4Page.tsx
src/components/editores/PreviewModal.tsx
src/components/editores/VersoesHistorico.tsx
src/lib/editores/mergeEngine.ts          // handlebars-like: {{campo}}, {{#if}}, {{#each}}
src/lib/editores/dataResolvers.ts        // monta objeto de dados por tipo de registro
src/lib/editores/pdfExport.ts            // html2canvas + jsPDF
src/hooks/useAutoSave.ts
```
Alterações no menu principal (arquivo `src/lib/menus.ts`) e rotas em `App.tsx`.

### O que fica para versões futuras (estrutura preparada, não implementado)
Exportação DOCX, assinatura eletrônica/desenhada, QR code de validação, comentários internos, modo revisão com diff de versões, envio por e-mail/WhatsApp, integração ZapSign/Clicksign/DocuSign, cláusulas reutilizáveis / biblioteca de blocos, aprovação de modelo antes de publicar.

Se aprovar, começo pela migração do banco e depois construo as telas e o editor.
