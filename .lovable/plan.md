# Finalizar atendimento com próxima data obrigatória

## Regras
- **Agenda ligada:** as abas mostram só os clientes com contato marcado para hoje (ou atrasado).
- **Agenda desligada:** as abas mostram todos os clientes do usuário, com as mesmas regras.
- O atendimento pode ser feito por qualquer canal: Chat, E-mail, Tel ou a nova aba **Visita**.
- O **tipo de contato** vem sempre da aba em que a pessoa está. A escolha manual sai da tela de fluxo na aba Tel.
- Para finalizar, é **obrigatório** informar a **data do próximo contato**. Em **Tel** e **Visita** também é obrigatório escrever **o que foi conversado**.
- Depois de confirmar, o cartão some da lista e só volta na data escolhida.
- Se a pessoa escrever algo em qualquer aba (mensagem, e-mail, anotação), o sistema cobra a próxima data antes de ela sair do cliente ou trocar de cliente.
- A única forma de sair sem próxima data é **inativar o cliente**, com motivo obrigatório. O cliente sai do fluxo da agenda.
- **Só existe uma data futura por cliente:** se já houver um contato marcado para frente, o sistema pergunta "Manter a data atual (dd/mm) ou usar a nova (dd/mm)?". A data não escolhida é removida.
- As demais regras (dias padrão por tipo, fins de semana etc.) continuam vindo da tela de Configurações do Calendário.

## O que muda na tela
1. **Nova aba "Visita"**: igual à aba Tel (lista, fluxo e detalhes), mas sem discador.
2. **Botão "Finalizar" no cartão do cliente**, igual em todas as abas. Ele abre uma janela com:
   - o tipo de contato, preenchido pela aba e sem opção de troca;
   - a data do próximo contato, já sugerida pelos dias padrão;
   - o campo "O que foi conversado" (obrigatório em Tel e Visita, opcional nas demais);
   - o link "Inativar cliente", que troca o formulário pelo campo de motivo.
3. **Tela de fluxo (Tel)**: sai a seleção de tipo de contato e o botão de concluir passa a abrir essa mesma janela.
4. **Aviso de pendência**: depois de enviar uma mensagem ou e-mail, ou de escrever uma anotação, o cartão fica marcado como "pendente de finalizar". Ao tentar trocar de cliente ou de aba, a janela de finalizar abre automaticamente.

## Detalhes técnicos
- Novo componente `FinalizarAtendimentoDialog`, usado por `AtendimentoClientCard` (botão) e pelo `FluxoAtendimentoPanel`.
- Ao finalizar: grava o registro em `atendimento_registros` (canal = aba, resumo), conclui a tarefa do dia em `calendario_tarefas` e cria a próxima. Antes, procura tarefas futuras pendentes do cliente. Se existir alguma, pergunta qual data manter e apaga a outra, garantindo uma só.
- Inativar: gravação na tabela nova `customer_fluxo_inativacoes` (cliente, usuário, motivo, data), com as permissões de acesso por estabelecimento. As tarefas futuras do cliente são canceladas e o cliente sai das listas com e sem agenda.
- Lista com agenda desligada: vinculados do usuário, sem os inativados e sem quem tem próximo contato no futuro.
- A pendência fica em estado local por cliente (Set de ids com ação feita). `trocarAba` e a troca de seleção verificam essa pendência antes de continuar.
- Aba Visita: nova aba em Atendimento.tsx (desktop e celular), reaproveitando `ContatosCanalList` + fluxo com `semDiscador`, e incluída em `rotasSistema.ts` para a busca por voz.
- `useContatosAtendimento` / montagem de contatos: com a agenda ligada, entram as tarefas de hoje e as atrasadas.
