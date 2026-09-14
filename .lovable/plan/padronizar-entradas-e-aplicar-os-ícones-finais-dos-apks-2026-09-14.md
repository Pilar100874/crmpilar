# Padronizar entradas e aplicar os ícones finais dos APKs

## Resultado
Pilar SMS e Pilar Controle terão a tela de ativação com a mesma composição, alinhamento, cores e proporções do Pilar Fone. O Pilar Automação terá uma única entrada nativa solicitando chave da empresa, e-mail e senha, abrindo automaticamente o painel definido no cadastro do usuário.

## Alterações
- Replicar no SMS e Controle as medidas visuais da entrada do Pilar Fone: fundo azul-marinho, cartão central, marca Pilar, chave laranja, textos, campo e botão.
- Unificar no Pilar Automação a ativação e o login em uma única tela com chave, e-mail e senha.
- Validar primeiro a chave, depois o usuário e a empresa, e selecionar automaticamente o painel de celular ou tablet cadastrado para esse usuário.
- Manter sessões já válidas entrando diretamente no painel e preservar as configurações existentes dos aplicativos.
- Recortar da imagem anexada os cinco ícones aprovados e aplicá-los diretamente a Fone, SMS, Automação, Controle e Remotas, gerando os tamanhos Android comuns, redondos e adaptativos sem redesenhar os símbolos.
- Avançar as versões dos APKs alterados para garantir que os aparelhos reconheçam a atualização.

## Validação
- Comparar SMS e Controle com a referência do Pilar Fone em celular e tablet.
- Validar no Automação: chave inválida, login inválido, usuário de outra empresa, painel não configurado e entrada bem-sucedida.
- Conferir os cinco ícones lado a lado contra a imagem anexada, incluindo centralização, escala, fundo e faixa laranja.
- Validar recursos Android e compilações disponíveis no ambiente; a geração assinada continuará pelo fluxo automático caso o SDK local não esteja disponível.

## Detalhes técnicos
- O painel do Automação continuará vindo de `automacao_ambiente_celular` ou `automacao_ambiente_tablet` do cadastro do usuário, conforme o aparelho.
- A imagem anexada será a fonte visual dos ícones; não será feita nova interpretação ou geração por IA.
