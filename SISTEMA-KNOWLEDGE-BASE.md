# Sistema de Base de Conhecimento (Knowledge Base)

## Visão Geral

O Sistema de Base de Conhecimento (KB) permite criar, organizar e compartilhar artigos de conhecimento para suporte aos clientes e equipe interna. Inclui categorização, busca, feedback e integração com o sistema de atendimento.

## Componentes do Sistema

### Tabelas do Banco de Dados

#### `kb_categorias`
Organiza os artigos em categorias:
- **Identificação**: id, estabelecimento_id, nome
- **Aparência**: cor (hexadecimal), icone (lucide-react), ordem
- **Status**: ativa
- **Metadados**: descricao, created_at, updated_at

#### `kb_tags`
Tags para classificação adicional dos artigos:
- **Identificação**: id, estabelecimento_id, nome
- **Aparência**: cor
- **Unique**: (estabelecimento_id, nome)

#### `kb_artigos`
Artigos da base de conhecimento:
- **Identificação**: id, estabelecimento_id, categoria_id, autor_id
- **Conteúdo**: titulo, resumo, conteudo, palavras_chave[]
- **Status**: status (rascunho, publicado, arquivado), publico
- **Métricas**: visualizacoes, util_count, nao_util_count
- **Ordenação**: ordem
- **Datas**: created_at, updated_at, publicado_em

#### `kb_artigo_tags`
Relacionamento entre artigos e tags (muitos-para-muitos):
- **Relacionamentos**: artigo_id, tag_id
- **Unique**: (artigo_id, tag_id)

#### `kb_anexos`
Anexos dos artigos (imagens, PDFs):
- **Identificação**: id, artigo_id
- **Arquivo**: nome, tipo (MIME), tamanho (bytes), url

#### `kb_feedback`
Feedback dos usuários sobre artigos:
- **Identificação**: id, artigo_id, usuario_id, customer_id
- **Feedback**: util (boolean), comentario
- **Data**: created_at

#### `kb_artigos_relacionados`
Sugestões de artigos relacionados:
- **Relacionamentos**: artigo_id, artigo_relacionado_id
- **Ordenação**: ordem
- **Constraint**: artigo_id != artigo_relacionado_id

## Funcionalidades

### 1. Gerenciamento de Categorias
- Criar, editar e excluir categorias
- Definir cor e ícone para identificação visual
- Ordenar categorias por prioridade
- Ativar/desativar categorias

### 2. Gerenciamento de Artigos
- Editor de artigos com:
  - Título e resumo
  - Conteúdo em texto formatado
  - Categorização
  - Tags múltiplas
  - Palavras-chave para busca
- Status do artigo:
  - **Rascunho**: Visível apenas para editores
  - **Publicado**: Visível para todos os usuários
  - **Arquivado**: Oculto mas mantido no sistema
- Opção de artigo público (acessível sem login)
- Autor e data de publicação
- Anexos (imagens, PDFs, etc.)
- Artigos relacionados

### 3. Busca e Navegação
- Busca por texto em:
  - Título
  - Resumo
  - Conteúdo
  - Palavras-chave
- Filtros:
  - Por categoria
  - Por tag
  - Por status
  - Por autor
  - Por data
- Ordenação:
  - Mais recentes
  - Mais visualizados
  - Mais úteis
  - Alfabética

### 4. Sistema de Feedback
- Usuários podem marcar artigos como:
  - Útil (👍)
  - Não útil (👎)
- Comentários opcionais sobre o feedback
- Métricas agregadas por artigo
- Histórico de feedback por usuário

### 5. Métricas e Analytics
- Visualizações por artigo
- Taxa de utilidade (útil vs não útil)
- Artigos mais visualizados
- Artigos mais úteis
- Categorias mais acessadas
- Palavras-chave mais buscadas

## Componentes React

### `KnowledgeBaseCRUD`
Interface completa para gerenciamento de KB:
- **Tabs**:
  - Artigos: Lista, cria, edita e exclui artigos
  - Categorias: Gerencia categorias
- **Busca**: Campo de busca e filtros
- **Criação**: Formulários modais para artigos e categorias
- **Edição**: Edição inline ou modal
- **Exclusão**: Confirmação antes de deletar
- **Visualização**: Preview dos artigos

### `BaseConhecimento` (Página)
Página principal que integra o componente CRUD.

## Fluxo de Funcionamento

### 1. Criação de Estrutura
1. Admin/gestor cria categorias para organizar conteúdo
2. Define cores e ícones para identificação visual
3. Estabelece ordem de exibição

### 2. Criação de Artigos
1. Autor seleciona categoria
2. Escreve título, resumo e conteúdo
3. Adiciona tags e palavras-chave
4. Anexa arquivos se necessário
5. Define status (rascunho/publicado/arquivado)
6. Marca se é público (acessível sem login)
7. Adiciona artigos relacionados

### 3. Publicação
1. Artigo em rascunho é revisado
2. Ao publicar, data de publicação é registrada
3. Artigo se torna visível conforme configuração
4. Notificações podem ser enviadas (futura feature)

### 4. Uso pelos Usuários
1. Usuário acessa base de conhecimento
2. Navega por categorias ou busca
3. Lê o artigo
4. Visualização é contabilizada
5. Pode dar feedback (útil/não útil)
6. Pode deixar comentário
7. Vê artigos relacionados sugeridos

### 5. Integração com Atendimento
1. Atendente pode buscar artigos durante chat
2. Envia link do artigo ao cliente
3. Cliente acessa artigo (mesmo sem login se público)
4. Sistema rastreia origem (atendimento)
5. Métricas específicas para artigos via atendimento

## Boas Práticas

### Criação de Conteúdo
1. **Título Claro**: Use títulos descritivos e objetivos
2. **Resumo Útil**: Escreva um resumo que dê contexto
3. **Conteúdo Estruturado**: Use subtítulos e listas
4. **Palavras-chave**: Adicione termos que os usuários podem buscar
5. **Atualizações**: Mantenha artigos atualizados

### Organização
1. **Categorias Lógicas**: Agrupe artigos por tema
2. **Tags Consistentes**: Use nomenclatura padronizada
3. **Ordem Prioritária**: Coloque conteúdo importante no topo
4. **Relacionamentos**: Vincule artigos complementares

### Qualidade
1. **Revise Antes de Publicar**: Use status de rascunho
2. **Monitore Feedback**: Atue em artigos com feedback negativo
3. **Analise Métricas**: Identifique conteúdo mais valioso
4. **Remova Obsoleto**: Archive conteúdo desatualizado

## Segurança e Permissões

### Políticas de RLS
- **Categorias e Tags**: 
  - Visualização: Usuários do estabelecimento
  - Gestão: Admin e gestores
- **Artigos**:
  - Visualização: 
    - Artigos publicados: Todos do estabelecimento
    - Artigos públicos: Qualquer pessoa
    - Todos os status: Admin e gestores
  - Gestão: Admin e gestores
- **Feedback**:
  - Visualização: Usuários do estabelecimento
  - Criação: Qualquer usuário autenticado

## Integração Futura com Atendimento

### Sugestão Automática
- Sistema analisa mensagem do cliente
- Busca artigos relevantes
- Sugere ao atendente artigos que podem ajudar
- Atendente pode enviar link diretamente

### Chat Widget
- Artigos públicos podem ser acessados via widget
- Cliente busca antes de solicitar atendimento
- Reduz volume de atendimentos

### Métricas de Eficiência
- Quantidade de problemas resolvidos via KB
- Redução no tempo de atendimento
- Taxa de deflexão (problemas evitados)

## Próximas Melhorias

1. **Editor Rich Text**: Editor WYSIWYG para formatação
2. **Versionamento**: Histórico de alterações nos artigos
3. **Aprovação**: Workflow de aprovação antes da publicação
4. **Tradução**: Artigos em múltiplos idiomas
5. **AI-Powered Search**: Busca semântica com IA
6. **Auto-sugestão**: Sugestão automática durante atendimento
7. **Exportação**: Exportar KB para PDF, HTML
8. **Templates**: Templates pré-definidos para tipos de artigo
9. **Colaboração**: Múltiplos autores por artigo
10. **Gamificação**: Pontos para autores de artigos úteis

## Suporte e Dúvidas

Para suporte sobre o Sistema de Base de Conhecimento, consulte:
- Documentação técnica das tabelas do banco
- Políticas de RLS no banco de dados
- Componentes React no código fonte
