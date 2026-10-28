# Padronizar disparo por Telefone e Ligação com IA + corrigir funcionamento

## Diagnóstico (por que não funcionou)

- **Telefone**: o fluxo funciona — testei no navegador e o PABX aceitou a discagem (dialOutbound status 0, tela "Seu ramal está tocando"). O que falhou para o usuário: o Pilar Fone (ramal) estava desconectado, então a ligação nunca tocou para ele. O único aviso é um toast rápido que some.
- **Ligação com IA**: o comando é criado em `voz_comandos` mas fica "pendente" para sempre porque nenhum aparelho de voz (Coletor com módulo Voz / app Pilar Voz / servidor de voz) está conectado para executá-lo. Hoje a campanha só falha depois de 10 minutos, com erro genérico.

## Mudanças

### 1. Assistente de disparo passa a atender Telefone e Ligação com IA (mesmas etapas do WhatsApp/E-mail)
- `types.ts`: `CanalEnvio` ganha `'telefone' | 'ia'`; estado ganha campos de configuração de chamada (modo de discagem, parar ao receber, agente, ramal, objetivo).
- Novo `StepComposeChamada.tsx` (etapa "Montar"):
  - Telefone: cartões de modo (Discagem sequencial / Aprovação uma a uma), chave "Parar ao receber ligação" e aviso em destaque quando o Pilar Fone estiver desconectado (status ao vivo).
  - IA: seleção de agente de voz, seu ramal, objetivo da ligação e aviso de que é preciso um aparelho de voz conectado (Coletor/Pilar Voz).
- Etapas para chamadas: Filtrar → Montar → Agendar → Confirmar (sem Preview, pois não há mensagem).
- `StepConfirm`: para chamadas, mostra cartão-resumo da configuração (modo/agente/ramal/objetivo) no lugar do preview de mensagem.
- `useContactsFilter`: telefone/ia filtram contatos com telefone.
- Aplicado nos dois assistentes: `EnvioMassaWizardContent` (desktop) e `EnvioMassaWizardPanel` (mobile).

### 2. DisparoMassaPanel simplificado
- Telefone e IA passam a ter só o botão "Continuar" como WhatsApp/E-mail (a configuração sai do rodapé e vai para a etapa Montar do assistente).

### 3. Atendimento.tsx
- `iniciarEnvioDoDisparo` aceita os 4 canais e abre o assistente.
- Novo `onIniciarDiscador`: valida PABX + ramal, monta as tarefas e abre o Fluxo de Atendimento já com a data de retorno escolhida na etapa Agendar.
- Novo `onIniciarCampanhaIa`: valida agente + ramal, inicia a campanha e fecha o assistente (o popup global acompanha pausar/cancelar).

### 4. FluxoAtendimentoPanel
- Nova prop opcional `dataRetornoInicial` para pré-preencher a data do próximo contato vinda do assistente.

### 5. campanhaIa.ts — falha rápida e clara quando não há aparelho de voz
- Se o comando ficar "pendente" por 30s, marca o item como erro com o motivo ("Nenhum aparelho de voz conectado — ligue o Coletor (módulo Voz) ou o app Pilar Voz na rede do PABX") e encerra a campanha, em vez de esperar 10 minutos.
- Popup mostra o motivo do erro em cada item.

### 6. Catálogo de regras da agenda
- Atualizar os metadados das regras de disparo em massa (telefone/IA agora também passam pelo assistente com escolha da data de retorno).

## Verificação
- Testar no navegador: disparo por telefone abre o assistente, disca e mostra aviso do Pilar Fone; disparo por IA falha rápido com mensagem clara quando não há aparelho conectado.
- Rodar testes existentes do envio em massa.
