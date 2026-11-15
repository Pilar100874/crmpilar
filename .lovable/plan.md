# Preservar quantidades fracionadas no estoque

## Problema confirmado
O saldo dos produtos é salvo como número inteiro. A cada movimento, a rotina arredonda o saldo: uma entrada de 12,4 kg vira 12 e entradas sucessivas de 0,4 kg podem continuar em zero. O cadastro de produtos também usa uma conversão para inteiro ao salvar.

## Correção proposta
- Criar um saldo decimal, inicialmente igual ao saldo atual de cada produto, sem recalcular nem modificar movimentos ou notas já concluídos.
- Registrar os próximos movimentos de entrada, saída e devolução com precisão decimal, mantendo a trava por produto e a validação da empresa.
- Usar esse saldo em todas as telas e integrações que hoje leem ou gravam o saldo inteiro: Estoque, entrada de NF-e e conversão/desmembramento, Faturamento e cancelamento, cadastro e importação de produtos, Compras, produção, orçamentos, catálogos, marketplaces e agentes de vendas.
- Manter unidades e permissões atuais. Não alterar estoques de ferramentas ou EPI, que são controles separados.

## Validação
- Testar entrada de 12,4 kg, três entradas de 0,4 kg (saldo 1,2), saída fracionada e devolução.
- Conferir leitura do saldo nas telas de estoque, produto e necessidade de compra.
- Verificar que editar informações do produto não trunca nem sobrescreve seu saldo.

## Detalhes técnicos
A alteração direta do tipo da coluna existente não é permitida pelo mecanismo de alterações do projeto. A solução será aditiva: novo campo numérico, preenchimento inicial a partir do saldo atual, atualização do gatilho `estoque_aplicar_movimento` e migração dos consumidores; o campo antigo será marcado como descontinuado. Há cerca de 90 arquivos de frontend com referências a estoque e integrações de servidor, portanto a mudança exige revisão coordenada, não apenas remover o arredondamento do gatilho.

Os históricos permanecerão intactos. Frações já perdidas não serão reconstruídas automaticamente; eventual correção de saldo antigo deve ser feita por ajuste de estoque conferido.
