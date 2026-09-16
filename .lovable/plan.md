# Permissões completas de módulos e ações

## Objetivo
Garantir que cada usuário veja somente os módulos internos liberados no grupo e que as ações **Criar**, **Editar** e **Excluir** também controlem a exibição dos respectivos botões.

## Implementação
- Criar um contexto de permissão da tela/módulo atual, usando o catálogo já gerado de menus, submenus e módulos internos.
- Aplicar a permissão **Ver** aos seletores de módulos/abas, ocultando módulos não marcados e redirecionando automaticamente para o primeiro módulo permitido quando o atual não estiver liberado.
- Criar componentes reutilizáveis para ações protegidas e aplicar:
  - **Criar**: botões Novo, Adicionar, Criar, Importar e equivalentes.
  - **Editar**: botões Editar, Salvar, Atualizar, Configurar e equivalentes.
  - **Excluir**: botões Excluir, Remover e lixeiras.
- Começar pelos cadastros e telas internas mapeadas no editor de Grupos de Acesso, mantendo administradores com acesso total.
- Manter o bloqueio direto por endereço e corrigir o cache para refletir alterações de grupo e troca de usuário sem recarregar a página.

## Regras
- Permissão de ação no módulo tem prioridade sobre a permissão da tela.
- Quando o módulo não tiver regra própria, ele herda a regra da tela pai.
- Uma ação não liberada não aparece e também não pode ser executada pelo fluxo visual.
- Novos módulos encontrados pelo gerador entram automaticamente no catálogo e passam a usar o mesmo controle.

## Validação
- Testar um grupo sem acesso ao módulo e confirmar que sua aba/cartão não aparece.
- Testar separadamente Ver, Criar, Editar e Excluir.
- Confirmar que o grupo Gerente não vê módulos nem botões não marcados.
- Validar compilação e funcionamento em tela grande e celular.
