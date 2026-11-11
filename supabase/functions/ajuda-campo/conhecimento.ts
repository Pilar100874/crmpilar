/** Conhecimento de negócio do CRM Pilar usado pela Ajuda global para explicar o "porquê" de cada item. */
export const VISAO_GERAL = `O CRM Pilar é usado por uma empresa comercial/industrial para atender clientes (WhatsApp, e-mail, telefone), vender (orçamentos e pedidos), ligar com agentes de voz de IA e controlar operação (frota, portaria, ferramentas, automação). Cada usuário tem uma carteira de clientes; a agenda/fila do dia diz quem atender hoje.`;

export const MODULOS: { chave: RegExp; nome: string; regras: string }[] = [
  { chave: /atendimento|fila|chat/, nome: "Atendimento", regras: `- A Fila do dia mostra os clientes com tarefa para hoje; cada cartão é um cliente.
- Todo atendimento precisa ser finalizado com a data do próximo contato; sem ela o cartão fica com aviso de "não finalizado" e o cliente pode se perder.
- Contatos com pedido em aberto aparecem todo dia na agenda até o pedido ser finalizado ou cancelado.
- Recados para colegas têm prioridade; urgentes piscam para quem recebe ou assumiu o responsável.
- Potenciais: lista calculada de clientes com chance de compra (recompra, orçamento parado), não vira tarefa até alguém agir.
- Copiloto e Auxiliar de vendas analisam hábitos de compra e sugerem produtos, prazos e próximo cliente; nunca enviam mensagem sozinhos.
- Disparo em massa (WhatsApp, e-mail, Ligação com IA) envia em sequência, com limites anti-bloqueio e trava de 3 dias entre canais para não incomodar o cliente.
- Histórico, Tarefa, Agenda e Orçamentos só aparecem quando o contato tem esse registro; Visita só com endereço.` },
  { chave: /orcament|pedido|venda|pos|perdid/, nome: "Vendas e orçamentos", regras: `- Orçamento exige empresa e contato com cadastro completo, para a proposta e o faturamento não saírem errados.
- O vendedor é registrado automaticamente; gerente vê os pedidos da equipe.
- Marcar como perdido exige motivo estruturado; isso alimenta a tela Pedidos perdidos (filtros por produto, marca, motivo, vendedor) para entender por que se perde venda.
- Produto exige marca, usada nas análises de perda.
- Orçamento perdido pode gerar reconquista automática como tarefa (nunca envio automático).` },
  { chave: /calendar|agenda|tarefa|selecionar \d|atrasad/, nome: "Agenda", regras: `- A barra de dias mostra Atrasados, Hoje e os próximos dias com o número de tarefas; clicar abre a lista daquele dia na área central sem trocar o cliente aberto.
- Tarefas podem ser arrastadas entre dias/horários; regras da agenda avisam fim de semana e dias reservados e sugerem data, mas a escolha é sempre do usuário.
- Concluir uma tarefa exige reprogramar o próximo contato ou inativar o cliente.
- Toda tarefa registra se foi criada manual, automática ou inteligente, e o motivo.` },
  { chave: /voz|agente|roteiro|telefon|ucm|ramal|telefonista|grava|pilar fone|liga|discad|chamad/, nome: "Telefonia e agentes de voz", regras: `- Pilar Fone é o telefone do navegador ligado ao PABX Grandstream UCM; abre como painel lateral em qualquer tela; liga, transfere e grava.
- Gravações: o Pilar Fone grava o áudio do microfone e do cliente e lista as ligações com data, número e duração; no Atendimento aparecem as do cliente aberto.
- O ramal pessoal fica no cadastro do usuário; sem ele, Ligação com IA, Ligar agora e Ouvir em silêncio ficam desativados, porque a IA transfere o cliente para esse ramal.
- Agente de voz é o perfil (nome, departamento, tom); roteiro é o que ele fala. Roteiros são workflows de blocos: Pergunta com saídas (Sim, Não, Dúvida, Silêncio, "Humano"/pediu atendente, não reconhecido), Ir para etapa, Reagendar (cria tarefa de retorno), Transferir e Disparar workflow.
- Dados preenchidos no disparo ({produto}, {condicao}, {desconto}, {aviso}) entram nas falas.
- Técnicas comerciais (ancoragem, espelhamento, BATNA, escada de sins etc.) adicionam regras às etapas para conversar melhor.
- Monitor ao vivo: Ouvir em silêncio usa o código de escuta do PABX (*54) + ramal; Assumir faz a IA se despedir e transferir.
- Testar/Simular roteiro mostra a conversa e permite corrigir respostas e falas direto no roteiro.` },
  { chave: /workflow|bot|fluxo|automac/, nome: "Workflows e automação", regras: `- Workflows são fluxos de blocos ligados por setas: cada bloco faz uma coisa (perguntar, condição, ação, envio, espera) e as saídas decidem o próximo passo.
- Bots de chat respondem clientes automaticamente e podem passar para um atendente.
- Automação controla equipamentos (luzes, portões, relés) com painéis por celular/tablet.` },
  { chave: /veicul|frota|portaria|checklist|transportad|ferrament/, nome: "Operação", regras: `- Checklist diário de saída de veículo: motorista confere itens (água, óleo...) e o porteiro confirma a saída; não cria manutenção programada.
- Transportadoras e ferramentas têm entrada, saída, liberação e empréstimos registrados para rastrear responsabilidade.` },
  { chave: /config|usuario|empresa|contato|cadastro|lista/, nome: "Cadastros e configurações", regras: `- Contatos têm e-mail e telefone únicos por empresa, para evitar duplicidade.
- Quem cria a empresa/contato fica vinculado como responsável.
- Configurações por usuário (ramais, permissões, telas de automação) definem o que cada pessoa pode fazer.
- Toda exclusão pede confirmação.` },
];

/** Escolhe as regras pelo item clicado primeiro (painéis como o Pilar Fone abrem em qualquer tela) e depois pela tela. */
export function contextoNegocio(rota: string, tela: string, item = ""): string {
  const doItem = MODULOS.filter((m) => m.chave.test(item.toLowerCase()));
  const daTela = MODULOS.filter((m) => m.chave.test(`${rota} ${tela}`.toLowerCase()));
  const usar = doItem.length ? doItem : daTela;
  return usar.length ? `${VISAO_GERAL}\n\n${usar.map((m) => `## ${m.nome}\n${m.regras}`).join("\n\n")}` : VISAO_GERAL;
}
