# Corrigir vínculo multiempresa do coletor

## Objetivo
Garantir que as versões Windows, Linux e ISO do coletor acessem somente filiais e relógios de ponto do estabelecimento associado à chave de ativação.

## Alterações
- Exigir a chave do estabelecimento nas consultas de filiais e inicialização do coletor.
- Validar a chave no servidor em cada consulta, incluindo tipo do aplicativo e bloqueio.
- Obter o estabelecimento exclusivamente pela chave validada; não confiar em um identificador enviado pelo instalador.
- Filtrar equipamentos, filiais e atualizações de estado pelo estabelecimento validado.
- Impedir que um equipamento de outra empresa receba atualização por identificador manipulado.
- Atualizar o coletor compartilhado por Windows/Linux/ISO para enviar a chave salva em todas essas consultas.

## Validação
- Testar chave ausente, inválida, bloqueada e de outro aplicativo.
- Confirmar que uma chave válida retorna apenas dados do seu estabelecimento.
- Confirmar que atualizações de equipamentos de outra empresa são ignoradas.
- Verificar os testes existentes e a compilação do projeto.

## Observação técnica
O arquivo ISO não será personalizado por cliente. O isolamento continuará sendo feito pela chave digitada após a instalação, validada novamente pelo servidor em cada sincronização.
