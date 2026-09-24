# Padronizar os cartões do Atendimento

## Objetivo
Aplicar o estilo “Lista moderna” escolhido a todos os cartões das abas do Atendimento, mantendo as informações, cores de estado e ações existentes.

## Alterações
- Transformar o cartão compartilhado em uma ficha moderna e compacta, com hierarquia fixa: empresa, contato, contexto, horário/origem, indicadores e ações.
- Usar o mesmo espaçamento, tipografia, posição dos indicadores e rodapé em Tel, Visita, Chat, E-mail, Orçamentos e Agenda.
- Substituir os cartões duplicados da Agenda pelo mesmo componente compartilhado, preservando seleção, pendência, histórico, finalização e atalhos.
- Manter as bordas funcionais: vermelho para pendente, laranja para contato com empresa, azul para contato sem empresa e roxo para empresa sem contato.
- Aplicar Urbanist nos títulos dos cartões e Epilogue no conteúdo, sem alterar a tipografia do restante do sistema.
- Garantir boa leitura em tela estreita e modo escuro, com animações discretas e sem deslocar o conteúdo.

## Validação
- Conferir compilação e erros da tela.
- Verificar visualmente as abas com cartões, incluindo Agenda ligada e desligada.
- Confirmar que seleção, histórico e Finalizar continuam funcionando.

## Detalhes técnicos
- Centralizar a estrutura em `AtendimentoClientCard` e reaproveitar `AtendimentoCardIndicators` e os selos existentes.
- Eliminar marcação visual duplicada da Agenda onde possível, passando seus dados e ações ao cartão compartilhado.
- Adicionar somente tokens/variantes semânticos necessários ao padrão escolhido.
