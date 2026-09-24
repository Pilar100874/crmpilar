# Corrigir a cascata de vínculos em Todos os Contatos

## Objetivo
Exibir em cada árvore somente os registros realmente vinculados à origem escolhida, sem expandir um gerente ou vendedor para vínculos pertencentes a outros ramos.

## Alterações
- Tornar a expansão sensível à origem e ao caminho atual da árvore.
- Manter a hierarquia correta por aba:
  - Gerente → vendedores/empresas vinculados → empresas → contatos.
  - Vendedor → gerente vinculado e suas próprias empresas → contatos.
  - Empresa → gerente, vendedor e contatos vinculados à própria empresa.
  - Contato → empresas vinculadas → gerente/vendedor vinculados àquelas empresas.
  - Transportadora → contatos vinculados à própria transportadora.
- Encerrar cada ramo quando a próxima expansão sair do vínculo da origem, evitando misturar outras carteiras.
- Preservar a abertura automática da árvore e a proteção contra ciclos.

## Verificação
- Conferir as abas Empresas, Vendedores, Gerentes, Contatos e Transportadoras.
- Validar que nenhum gerente ou vendedor aberto por um item secundário carregue toda a própria carteira.
