# Ramais de IA por usuário, resumo na transferência e Ajuda ao atendente

## O que muda para o usuário

1. **Cadastro da empresa** – novo campo "Ramal do atendente virtual da empresa" + escolha de qual agente de voz atende nele (ex.: URA/recepção geral).
2. **Editar usuário** – além do ramal próprio, dois blocos:
   - **Ramal de atendente virtual** (liga/desliga). Ligado: informar ramal + senha SIP e escolher um dos agentes de voz cadastrados. Ligações para esse ramal são atendidas pela IA e transferidas ao ramal do usuário.
   - **Ramal para fazer ligações** (liga/desliga). Ligado: informar ramal + senha SIP. As ligações em massa por IA desse usuário saem por esse ramal.
3. **Disparo em massa → Ligação com IA** – só aparece habilitado se o usuário tiver "fazer ligações" ligado (senão aparece bloqueado com aviso). Ao escolher, o usuário seleciona qual agente de voz vai fazer as ligações.
4. **Resumo na transferência** – quando a IA transferir a ligação para o usuário, abre automaticamente um painel no CRM (e no Pilar Fone) com: cliente, objetivo, resumo da conversa, o que o cliente pediu/objeções e sugestão de como continuar. Fica salvo no histórico da ligação.
5. **Só liga com ramal livre** – antes de cada número a campanha consulta o ramal do usuário na central. Se estiver ocupado, a campanha fica "Pausada – aguardando ramal livre" e retoma sozinha quando ele ficar disponível (o usuário ainda pode cancelar).
6. **Botão Ajuda ao atendente no Pilar Fone** – um botão liga/desliga. Ligado, durante as ligações do usuário a IA escuta e mostra sugestões em tempo real (usa o agente de voz em modo ajuda e o código de escuta já existente).

## Detalhes técnicos

- Banco: colunas em `usuarios` (`voz_ramal_virtual_ativo`, `voz_ramal_virtual`, `voz_ramal_virtual_senha`, `voz_agente_virtual_id`, `voz_ramal_ligacoes_ativo`, `voz_ramal_ligacoes`, `voz_ramal_ligacoes_senha`, `voz_ajuda_ativa`) e na empresa (`voz_ramal_empresa`, `voz_agente_empresa_id`, senha). Senhas lidas só pela função do dispositivo, nunca expostas no navegador além do dono/admin.
- `voz-dispositivo`: passa a devolver a lista de ramais a registrar (empresa + virtuais de cada usuário, cada um com seu agente) e, no comando "ligar", o ramal de ligações do usuário que criou o comando. Os apps (Coletor, 2 Android, servidor de voz) já sabem registrar ramal temporário para ligar; passam a manter vários ramais registrados para atender — exige nova compilação.
- Resumo: ao transferir, o dispositivo envia a transcrição; a função gera o resumo com a IA e grava em `voz_chamadas.resumo`; o CRM escuta em tempo real as chamadas transferidas para o ramal do usuário e abre o painel.
- Ramal livre: `campanhaIa.ts` consulta o estado do ramal via `ucm-status` antes de cada número, com espera em laço e estado "aguardando ramal".
- Ajuda ao atendente: botão grava `voz_ajuda_ativa`; o dispositivo cria escuta (código de escuta) nas chamadas do ramal do usuário e envia sugestões para `voz_chamadas.sugestoes`, exibidas no Pilar Fone.
- Atualizar catálogo de regras da agenda e rotas de voz quando aplicável; testes para "ligação IA bloqueada sem ramal de ligações" e "pausa com ramal ocupado".
