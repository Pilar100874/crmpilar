# Guia de Uso do Sistema Omnichannel

## Visão Geral

O sistema omnichannel agora está completamente integrado ao Lovable, oferecendo gerenciamento inteligente de chats, roteamento automático, filas de atendimento e muito mais.

## Recursos Implementados

### 1. Dashboards de Atendimento

#### Dashboard do Atendente (`/dashboard-atendente`)
- Visualização dos chats atribuídos
- Métricas pessoais em tempo real
- Histórico de atendimentos
- Status de disponibilidade

#### Dashboard do Supervisor (`/dashboard-supervisor`)
- Visão geral de todos os atendentes
- Métricas globais do atendimento
- Análise de desempenho
- Monitoramento de filas

### 2. Configuração de Filas e Skills

Acessível em: **Configurações > Cadastro de Estabelecimentos > Filas/Skills**

#### Filas de Atendimento
Configure filas com:
- Nome e descrição
- Tipo de roteamento:
  - **Round Robin**: Distribui igualmente entre atendentes
  - **Por Disponibilidade**: Prioriza quem tem menos chats
  - **Por Habilidade (Skill)**: Atribui baseado em competências
  - **Por Prioridade**: Usa prioridade definida manualmente
  - **Por Carteira Fixa**: Atribui clientes fixos a atendentes
- Horário de funcionamento
- Limite de chats por atendente

#### Skills (Habilidades)
Gerencie as competências dos atendentes:
- Crie skills personalizadas (Ex: "Inglês", "Vendas", "Suporte Técnico")
- Atribua skills aos atendentes com níveis (1-5)
- Configure filas que exigem skills específicas

### 3. Gerenciamento de Chat na Tela de Atendimento

No painel direito da tela `/atendimento`, você encontra:

#### Meu Status
- **Disponível**: Aceita novos chats
- **Em Pausa**: Não aceita novos chats (com motivo)
- **Offline**: Totalmente indisponível
- **Ocupado**: Atendendo, mas não aceita novos chats

#### Chat Atual
- **Tags**: Categorize chats com tags coloridas
- **Transferir**: Transfira para outra fila ou atendente
- **Status**: Gerenciepara prioridade do chat

### 4. Roteamento Automático

O sistema roteia automaticamente quando:

#### Mensagem Recebida
1. Verifica se há chat encerrado nas últimas 24h → **Reabre automaticamente**
2. Se não, cria nova conversa
3. Aplica estratégia de roteamento:
   - Verifica **carteira fixa** primeiro
   - Busca atendente disponível na fila
   - Se nenhum disponível, coloca em **fila de espera**

#### Reabertura Automática
- Chats encerrados há menos de 24h são reabertos
- Mantém histórico e contexto
- Registra número de reaberturas
- Tenta rotear para mesmo atendente se possível

### 5. Edge Functions

Três Edge Functions gerenciam o sistema:

#### `rotear-chat-automatico`
- Atribui chats a atendentes
- Aplica regras de roteamento
- Gerencia filas de espera

#### `reabrir-chat-automatico`
- Reabre chats recentes
- Incrementa contador de reaberturas
- Registra eventos no histórico

#### `processar-fila-atendimento`
- Processa chats em fila periodicamente
- Reatribui quando atendentes ficam disponíveis
- Pode ser executado via cron job

## Como Usar

### Configuração Inicial

1. **Crie Filas de Atendimento**
   - Acesse: Configurações > Estabelecimentos > Filas
   - Defina nome, tipo de roteamento e limite
   - Ative a fila

2. **Configure Skills** (Opcional)
   - Acesse: Configurações > Estabelecimentos > Skills
   - Crie skills relevantes
   - Atribua skills aos atendentes

3. **Configure Atendentes**
   - Sistema cria automaticamente atendente ao entrar em `/atendimento`
   - Configure status inicial como "Disponível"
   - Defina limite de chats simultâneos

### Operação Diária

#### Para Atendentes:

1. **Iniciar Atendimento**
   - Acesse `/dashboard-atendente` ou `/atendimento`
   - Mude status para "Disponível"
   - Aguarde atribuição automática de chats

2. **Durante Atendimento**
   - Responda mensagens normalmente
   - Use tags para organizar
   - Mude prioridade se necessário
   - Transfira se precisar de ajuda especializada

3. **Pausas**
   - Mude status para "Em Pausa"
   - Informe o motivo
   - Chats não serão atribuídos durante a pausa

4. **Encerrar Chat**
   - Use botão "Encerrar" no gerenciador
   - Informe motivo do encerramento
   - Chat será reaberto automaticamente se cliente retornar

#### Para Supervisores:

1. **Monitorar Equipe**
   - Acesse `/dashboard-supervisor`
   - Veja métricas em tempo real
   - Identifique gargalos

2. **Gerenciar Filas**
   - Visualize chats em espera
   - Ajuste prioridades
   - Reatribua manualmente se necessário

3. **Análise**
   - Revise métricas de atendimento
   - Identifique necessidade de treinamento
   - Otimize distribuição de skills

### Recursos Avançados

#### Carteira Fixa
- Atribua clientes específicos a atendentes
- Quando esse cliente envia mensagem, vai direto para o atendente
- Configure em: Dashboard Supervisor > Gerenciar Carteiras

#### Roteamento por Skill
- Defina skills necessárias para cada fila
- Sistema atribui apenas atendentes qualificados
- Útil para atendimento especializado

#### Transferências
- Transfira entre filas ou atendentes
- Registra histórico completo
- Mantém contexto do cliente

#### Tags
- Categorize chats (Vendas, Suporte, Urgente, etc.)
- Use cores para identificação visual
- Filtre chats por tags

## Monitoramento e Métricas

### Métricas do Atendente
- Chats atendidos
- Tempo médio de atendimento
- Avaliações recebidas
- Chats transferidos
- Tempo em pausa

### Métricas do Sistema
- Chats em fila
- Tempo médio de espera
- Taxa de abandono
- Taxa de reabertura
- Distribuição por fila

## Troubleshooting

### Chat não está sendo roteado
1. Verifique se há atendentes com status "Disponível"
2. Confirme que a fila está ativa
3. Verifique se atendentes estão atribuídos à fila
4. Confira limite de chats simultâneos

### Reabertura não funciona
1. Verifique se passou mais de 24h do encerramento
2. Confirme que é o mesmo canal
3. Revise Edge Function logs

### Atendente não recebe chats
1. Status deve ser "Disponível"
2. Aceitar novos chats deve estar marcado
3. Verificar se não atingiu limite de chats
4. Confirmar atribuição à fila

## Integrações

### Com Bot Builder
- Bot pode transferir para atendimento humano
- Define fila de destino
- Passa contexto e variáveis

### Com Campanhas
- Mensagens de campanha podem criar chats
- Roteamento automático aplicado
- Métricas separadas

### Com CRM
- Tags sincronizam com CRM
- Histórico completo de atendimento
- Dados do cliente acessíveis

## Próximos Passos

Para expandir o sistema:
1. Implemente relatórios personalizados
2. Adicione integração com WhatsApp Business
3. Configure chatbot inicial antes da fila
4. Implemente SLA e alertas automáticos
5. Adicione gravação de chamadas (se usando VoIP)

## Suporte

Para dúvidas ou problemas:
1. Verifique os logs das Edge Functions
2. Revise as políticas RLS no banco
3. Consulte `ARQUITETURA-OMNICHANNEL.md` para detalhes técnicos
