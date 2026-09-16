# Grupos de acesso com menus, submenus e módulos internos

Hoje a tela de grupos de acesso mostra uma lista simples e desatualizada de menus, e só o "Ver" tem efeito prático (esconder itens do menu lateral). O objetivo é mostrar a árvore completa — menu > submenu > módulos internos da tela (as abas, por exemplo "Chats > Configurações > Filas, Skills, Horários…") — e permitir marcar Ver / Criar / Editar / Excluir em cada nível.

## O que será construído

### 1. Catálogo completo de permissões
- Um catálogo em árvore gerado a partir do menu real do sistema (o mesmo que aparece na barra lateral), garantindo que nenhum menu ou submenu fique de fora.
- Para cada tela com abas internas, as abas entram como terceiro nível ("módulos internos"). Essa lista é gerada automaticamente a partir das telas do sistema, então continua fiel quando novas abas surgirem.
- Cada nó tem um identificador estável; os identificadores atuais dos menus são preservados, para que os grupos já cadastrados continuem funcionando.

### 2. Nova tela de edição do grupo
- Árvore recolhível em três níveis, com busca por nome.
- Em cada linha, quatro caixas: Ver, Criar, Editar, Excluir.
- Atalhos: marcar/desmarcar tudo no grupo, na categoria, no menu; marcar uma coluna inteira (ex.: "Ver" em tudo).
- Pai marcado parcialmente aparece como estado intermediário; marcar um filho garante o "Ver" do pai automaticamente.
- Resumo por grupo na listagem (quantos menus liberados e com quais ações).

### 3. Aplicação das permissões
- Menu lateral continua filtrando por "Ver" (comportamento atual preservado).
- Um mecanismo central de consulta de permissão (`podeVer`, `podeCriar`, `podeEditar`, `podeExcluir`) disponível para qualquer tela.
- As abas internas passam a respeitar o "Ver": abas sem permissão não aparecem.
- Nas telas de cadastro que já usam os botões padrão (novo / editar / excluir), os botões passam a respeitar Criar / Editar / Excluir.
- Administradores e o perfil admin do grupo continuam com acesso total.

## Detalhes técnicos

- Novo `src/lib/permissoes/catalogo.ts`: árvore derivada de `menuStructure` + módulos internos.
- Script de geração `scripts/gerarModulosInternos.ts` que varre as rotas de `App.tsx`, localiza as abas (`TabsTrigger`) de cada tela e grava `src/lib/permissoes/modulosInternos.gerado.ts`.
- Formato salvo em `grupos_acesso.menus_permitidos` continua `{ "<id>": { view, create, edit, delete } }` — sem migração de banco e sem quebra do que já existe.
- Novo hook `usePermissoesUsuario` (carrega o grupo do usuário uma vez, com cache de sessão) e componente utilitário `SeTiverPermissao`.
- `GruposAcessoCRUD.tsx` reescrito para a árvore; `menus.ts` passa a derivar do catálogo para evitar listas duplicadas.

## Fora do escopo

- Não altera papéis do banco (admin/gestor) nem as regras de segurança do backend; o controle é de interface e de navegação.
