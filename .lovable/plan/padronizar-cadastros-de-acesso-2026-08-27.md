# Padronizar cadastros de acesso

## Objetivo
Atualizar os cadastros de **Usuários**, **Unidades**, **Segmentos** e **Grupos de Acesso** para seguir o mesmo padrão visual e responsivo dos demais cadastros do sistema.

## Alterações
- Criar em cada cadastro um cabeçalho compacto com título, quantidade de registros, pesquisa e ação **Novo**.
- Manter o formulário fechado durante a consulta e abri-lo somente ao inserir ou editar um registro.
- Aplicar pesquisa imediata pelos principais campos de cada cadastro.
- Exibir tabelas organizadas no desktop e cartões responsivos no celular/tablet, reutilizando o padrão já existente no sistema.
- Padronizar estados vazios, carregamento, ações de editar/excluir e diálogos de confirmação.
- Preservar integralmente as regras atuais de usuários, permissões, unidades, segmentos e grupos de acesso.

## Detalhes técnicos
- Reutilizar os componentes de design e `CadastroCardList` já adotados nos demais cadastros.
- Ajustar apenas os componentes dos quatro cadastros dentro da configuração do estabelecimento.
- Validar pesquisa, abertura/fechamento dos formulários, edição, exclusão e responsividade.
