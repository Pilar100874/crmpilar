# Corrigir discagem externa do Pilar Fone

## Alteração
- Remover o `#` acrescentado automaticamente aos números externos.
- Enviar ao servidor telefônico apenas o número digitado, limpando espaços, parênteses e hífens.
- Manter `*` e `#` somente quando forem digitados intencionalmente para códigos de serviço.

## Validação
- Confirmar que `999611194` gera o destino SIP `999611194`, sem `%23`.
- Verificar compilação e os registros da chamada.

## Detalhe técnico
Os registros mostram que a chamada atual foi enviada como `999611194%23`. O servidor aceitou esse destino como uma sessão SIP e a encerrou, fazendo a tela mostrar “Em conversa” sem completar a ligação externa.
