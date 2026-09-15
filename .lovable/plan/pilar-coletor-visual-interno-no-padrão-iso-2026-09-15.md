# Pilar Coletor: visual interno no padrão ISO

## Objetivo
Deixar a tela interna do APK visualmente próxima do Coletor ISO, mantendo o aplicativo sem câmeras, e corrigir a troca de unidade.

## Alterações
- Reorganizar a tela interna com cabeçalho azul-marinho, situação do coletor, unidade ativa, indicadores, módulos de Ponto e Automação e listas de equipamentos.
- Usar o padrão claro do ISO: fundo cinza-claro, cartões brancos, bordas suaves, indicadores verdes/vermelhos e destaque âmbar.
- Tornar a unidade ativa evidente, com ação separada “Trocar unidade” e lista com seleção atual marcada.
- Corrigir a consulta de unidades para aceitar a chave legada do antigo Pilar Controle e a chave nova do Pilar Coletor.
- Mostrar o erro real quando a busca de unidades falhar e impedir seleção inválida quando não houver unidades cadastradas.
- Manter atualização, sincronização, limpeza de avisos e saída acessíveis sem poluir a área principal.
- Avançar a versão do Pilar Coletor e atualizar o manifesto de download.

## Validação
- Validar os arquivos Android e a compilação disponível no projeto.
- Confirmar que trocar unidade persiste a escolha e reinicia a sincronização para a unidade selecionada.
- Confirmar que nenhum recurso de câmera aparece na tela interna.
