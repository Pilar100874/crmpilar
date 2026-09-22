# Mover discador e fluxo para Telefone

## Alterações
- Colocar as ações **Fluxo** e **Discador** na aba **Tel**, usando a mesma lista definida pela opção **Usar agenda**.
- Abrir o fluxo e o discador dentro da área de Telefone em computador, tablet e celular.
- Remover as ações **Fluxo** e **Discador** da aba **Agenda**, mantendo nela as tarefas, filtros e envio em massa.
- Fazer o atalho geral do Discador direcionar para a aba **Tel**.

## Validação
- Confirmar que Agenda não mostra mais Fluxo nem Discador.
- Confirmar que Tel mostra ambos e que o fluxo abre e fecha corretamente.
- Verificar a compilação e a apresentação em computador e celular.

## Detalhes técnicos
- Reaproveitar o `FluxoAtendimentoPanel` e a rotina atual de ligação, sem alterar regras de discagem, PABX ou sequência de chamadas.
- Ajustar as condições de exibição e navegação de `agenda` para `tel`, preservando o envio em massa na Agenda.
