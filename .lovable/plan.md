# Gestão centralizada de grupos de acesso

## Objetivo
Transformar a tela de Grupos de Acesso em uma central onde o administrador configure menus, módulos e ações de vários grupos sem abrir e editar cada grupo separadamente.

## O que será construído

### 1. Visão centralizada por permissões
- Manter a lista de grupos e a criação/edição dos dados básicos do grupo.
- Adicionar uma área “Gerenciar permissões” com a árvore completa de menu, submenu e módulo.
- Ao selecionar um item da árvore, mostrar todos os grupos lado a lado, cada um com Ver, Criar, Editar e Excluir.
- Permitir marcar uma ação para vários grupos, uma linha inteira ou uma coluna inteira.
- Exibir estado parcial quando apenas parte dos grupos ou descendentes estiver marcada.
- Manter busca por menu, submenu, módulo e grupo.

### 2. Copiar e replicar permissões
- Permitir escolher um grupo como modelo e um ou mais grupos como destino.
- Oferecer duas formas: substituir todas as permissões do destino ou acrescentar às permissões existentes.
- Exibir confirmação antes de aplicar, informando claramente os grupos afetados.
- Manter a opção de ajustar exceções individualmente depois da cópia.

### 3. Salvamento seguro
- Salvar somente os grupos alterados, em uma única ação “Salvar alterações”.
- Mostrar quais grupos têm mudanças pendentes e permitir descartar alterações.
- Em caso de falha parcial, identificar quais grupos não foram salvos sem perder as demais mudanças da tela.
- Atualizar imediatamente o acesso dos usuários após o salvamento, usando o mecanismo de atualização de permissões já existente.

### 4. Compatibilidade
- Preservar o formato atual de `menus_permitidos`; não será necessária alteração no banco.
- Administradores e grupos com perfil Administrador continuam com acesso total.
- A regra atual permanece: somente menus, módulos e ações explicitamente liberados aparecem para usuários comuns.
- Novos menus e módulos continuam entrando automaticamente pelo catálogo já gerado.

## Detalhes técnicos
- Criar um componente de matriz de permissões reutilizando `getCatalogoPermissoes`, `idsDoRamo`, `getMapaPais` e os tipos atuais.
- Refatorar `GruposAcessoCRUD` para separar cadastro do grupo, gestão centralizada, cópia e controle de alterações pendentes.
- Reutilizar os componentes visuais existentes, incluindo caixas de seleção, busca, seletor e diálogo de confirmação.
- Manter a exclusão protegida pelo diálogo obrigatório já existente.

## Validação
- Validar criação e edição básica de grupos.
- Validar marcação comparativa para vários grupos e salvamento em lote.
- Validar os modos substituir e acrescentar da cópia.
- Confirmar que grupos não alterados não são gravados.
- Confirmar no menu, nas abas e nos botões que as permissões salvas entram em vigor imediatamente.
- Verificar a tela em computador e celular.
