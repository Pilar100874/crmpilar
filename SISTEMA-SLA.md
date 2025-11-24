# Sistema de SLA (Service Level Agreement)

## Visão Geral

O Sistema de SLA monitora e gerencia os níveis de serviço do atendimento omnichannel, garantindo que os chats sejam respondidos e resolvidos dentro dos tempos esperados.

## Componentes Principais

### 1. Banco de Dados

#### Tabela: `sla_config`
Armazena as configurações de SLA por estabelecimento e fila.

**Campos principais:**
- `tempo_primeira_resposta`: Tempo máximo para primeira resposta (segundos)
- `tempo_resposta_subsequente`: Tempo máximo para respostas após primeira interação
- `tempo_resolucao`: Tempo máximo para resolução total do chat
- `multiplicador_*`: Ajustes de tempo baseados na prioridade do chat
- `alerta_porcentagem`: % do tempo para enviar alerta antes da violação
- `escalar_automaticamente`: Se deve escalar violações automaticamente
- `fila_escalacao_id`: Fila para onde escalar em caso de violação

#### Tabela: `sla_violations`
Registra todas as violações de SLA detectadas.

**Campos principais:**
- `tipo_violacao`: 'primeira_resposta', 'resposta_subsequente', 'resolucao'
- `tempo_esperado` / `tempo_real` / `tempo_excedido`: Métricas de tempo
- `porcentagem_excedida`: % do SLA violado
- `alerta_enviado`: Se notificação foi enviada
- `escalado`: Se o chat foi escalado automaticamente
- `resolvido`: Se a violação foi resolvida

#### Campos adicionados em `conversations`:
- `sla_config_id`: Configuração aplicada
- `sla_primeira_resposta_at`: Timestamp da primeira resposta
- `sla_tempo_primeira_resposta`: Tempo até primeira resposta (segundos)
- `sla_violacao_*`: Flags de violação por tipo
- `sla_ultima_resposta_cliente_at`: Timestamp da última mensagem do cliente
- `sla_tempo_total_resolucao`: Tempo total até resolução

### 2. Edge Function: `monitorar-sla`

Função que executa periodicamente (recomendado: a cada 1 minuto) para:

1. **Verificar conversas ativas** em cada estabelecimento com SLA configurado
2. **Calcular tempos decorridos** baseados em:
   - Criação da conversa
   - Última resposta do cliente
   - Status atual do chat
3. **Aplicar multiplicadores** de prioridade (urgente, alta, normal, baixa)
4. **Detectar violações** quando tempos excedem limites
5. **Enviar alertas** quando atingir % configurada do tempo
6. **Escalar automaticamente** se configurado

**Tipos de verificação:**

#### Primeira Resposta
- **Quando**: Chat criado mas ainda sem resposta do atendente
- **Tempo base**: `tempo_primeira_resposta` da config
- **Violação**: Se tempo decorrido > tempo esperado

#### Resposta Subsequente
- **Quando**: Cliente enviou mensagem e aguarda resposta
- **Tempo base**: `tempo_resposta_subsequente` da config
- **Violação**: Se tempo desde última mensagem do cliente > tempo esperado

#### Resolução Total
- **Quando**: Chat em atendimento
- **Tempo base**: `tempo_resolucao` da config
- **Violação**: Se tempo total desde criação > tempo esperado

### 3. Componentes Frontend

#### SLAConfigCRUD
Tela de configuração de SLA onde:
- Cria/edita/exclui configurações de SLA
- Define tempos de resposta para cada tipo
- Configura multiplicadores por prioridade
- Define alertas e escalação automática
- Associa a filas específicas ou usa como padrão

#### SLADashboard
Dashboard com:
- **Métricas principais**: Taxa de cumprimento, violações ativas, tempos médios
- **Violações por tipo**: Gráficos de primeira resposta, subsequente e resolução
- **Violações ativas**: Lista em tempo real das violações não resolvidas
- **Realtime**: Atualização automática via Supabase Realtime

## Fluxo de Funcionamento

### 1. Configuração Inicial
1. Acesse **Config > Atendimento > SLA**
2. Crie uma configuração com:
   - Nome descritivo
   - Tempos de resposta (em segundos)
   - Multiplicadores por prioridade
   - % para alerta
   - Opções de escalação (opcional)
3. Associe a uma fila específica ou deixe como padrão

### 2. Aplicação Automática
Quando um chat é criado ou roteado:
1. Sistema busca config de SLA da fila
2. Se não houver, usa config padrão do estabelecimento
3. Atribui `sla_config_id` ao chat
4. Inicia monitoramento

### 3. Monitoramento Contínuo
A função `monitorar-sla` executa periodicamente:
1. **Busca conversas ativas** com SLA configurado
2. **Para cada conversa**:
   - Calcula tempo decorrido
   - Aplica multiplicador de prioridade
   - Verifica se está próximo do limite (alerta)
   - Verifica se violou o SLA
3. **Se próximo do limite** (ex: 80% do tempo):
   - Envia notificação de alerta para atendente
4. **Se violou**:
   - Registra violação em `sla_violations`
   - Atualiza flags na conversa
   - Envia notificação para atendente e supervisores
   - Escala automaticamente se configurado

### 4. Escalação Automática
Quando habilitada:
1. Chat é transferido para fila de escalação
2. Status muda para `em_fila`
3. Registra transferência
4. Invoca roteamento automático
5. Atualiza violação com dados de escalação

## Multiplicadores de Prioridade

Os multiplicadores ajustam os tempos de SLA baseados na prioridade do chat:

```
Prioridade Urgente: 0.5x (50% do tempo) - Mais rigoroso
Prioridade Alta:    0.75x (75% do tempo)
Prioridade Normal:  1.0x (100% do tempo) - Tempo padrão
Prioridade Baixa:   1.5x (150% do tempo) - Mais flexível
```

**Exemplo:**
- Tempo primeira resposta configurado: 300 segundos (5 min)
- Chat com prioridade URGENTE: 150 segundos (2.5 min)
- Chat com prioridade BAIXA: 450 segundos (7.5 min)

## Integração com Sistema de Notificações

O SLA se integra ao sistema de notificações existente:

1. **Alertas de proximidade** (80% do tempo):
   - Enviados apenas para o atendente atual
   - Tipo: `sla_alerta`
   - Título: "⏰ SLA Próximo do Limite"

2. **Violações de SLA**:
   - Enviados para atendente + supervisores/gestores
   - Tipo: `sla_alerta`
   - Título: "⚠️ Violação de SLA - [Tipo]"

## Dashboards e Relatórios

### Métricas Disponíveis

1. **Taxa de Cumprimento**: % de chats dentro do SLA
2. **Violações Ativas**: Número de violações não resolvidas
3. **Tempo Médio Primeira Resposta**: Média dos últimos 30 dias
4. **Tempo Médio Resolução**: Média dos últimos 30 dias
5. **Violações por Tipo**: Distribuição entre primeira resposta, subsequente e resolução

### Visualizações

- **Cards de métricas**: Visão rápida dos principais indicadores
- **Gráficos de progresso**: Visualização da taxa de cumprimento
- **Tabela de violações**: Lista detalhada com filtros e ordenação
- **Badges de status**: Alertado, Escalado, Prioridade

## Boas Práticas

### Configuração de Tempos

1. **Primeira Resposta**: 3-5 minutos (180-300s)
   - Tempo crítico, primeira impressão
   - Impacta diretamente satisfação do cliente

2. **Respostas Subsequentes**: 5-10 minutos (300-600s)
   - Mantém engajamento
   - Evita cliente ficar esperando

3. **Resolução Total**: 30-60 minutos (1800-3600s)
   - Varia conforme complexidade média dos atendimentos
   - Considerar horário comercial

### Alertas

- Configure alerta em **75-80%** do tempo
- Dá margem para atendente reagir
- Evita violações desnecessárias

### Escalação

- Use para filas com supervisores especializados
- Não escale para mesma fila (loop infinito)
- Configure fila de escalação com atendentes experientes

### Multiplicadores

- **Urgente (0.5x)**: Problemas críticos, clientes VIP
- **Alta (0.75x)**: Clientes importantes, problemas sérios
- **Normal (1.0x)**: Atendimentos padrão
- **Baixa (1.5x)**: Dúvidas simples, pós-venda

## Monitoramento e Manutenção

### Configurar Cron Job

Para executar monitoramento automático, configure um cron job ou scheduler:

```bash
# Executar a cada 1 minuto
* * * * * curl -X POST https://[seu-projeto].supabase.co/functions/v1/monitorar-sla \
  -H "Authorization: Bearer [anon-key]"
```

Ou use o Supabase Cron (se disponível):

```sql
-- Executar função a cada 1 minuto
SELECT cron.schedule(
  'monitorar-sla-job',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://[seu-projeto].supabase.co/functions/v1/monitorar-sla',
    headers := '{"Authorization": "Bearer [service-role-key]"}'::jsonb
  );
  $$
);
```

### Monitorar Logs

Acompanhe os logs da função para identificar:
- Número de configs processadas
- Violações detectadas
- Alertas enviados
- Escalações realizadas
- Erros e falhas

### Ajustar Configurações

Revise periodicamente:
- Taxa de cumprimento (ideal: >90%)
- Número de violações
- Feedback dos atendentes
- Satisfação dos clientes

Ajuste tempos se necessário:
- **Taxa muito alta** (>95%): Pode relaxar tempos
- **Taxa baixa** (<80%): Revisar processos ou ajustar tempos

## Resolução de Problemas

### Violações Frequentes

**Problema**: Muitas violações de primeira resposta
- **Causa**: Poucos atendentes, alta demanda
- **Solução**: Aumentar equipe, ajustar distribuição, revisar tempos

**Problema**: Violações de resolução
- **Causa**: Problemas complexos, falta de skills
- **Solução**: Treinamento, knowledge base, escalação

### Alertas Não Funcionando

1. Verificar se função está executando (logs)
2. Verificar configurações de notificação dos usuários
3. Verificar se conversas têm `sla_config_id` atribuído

### Dashboard Sem Dados

1. Verificar se há configs de SLA ativas
2. Verificar se há conversas recentes (últimos 30 dias)
3. Verificar se função está processando (ver logs)

## Exemplo de Configuração Completa

### Setup Básico (Suporte Geral)

```
Nome: SLA Suporte Geral
Fila: (todas)
Primeira Resposta: 300s (5 min)
Resposta Subsequente: 600s (10 min)
Resolução: 3600s (1 hora)
Multiplicadores: Urgente 0.5x, Alta 0.75x, Normal 1.0x, Baixa 1.5x
Alerta: 80%
Escalação: Não
```

### Setup Premium (Clientes VIP)

```
Nome: SLA Premium
Fila: Suporte Premium
Primeira Resposta: 120s (2 min)
Resposta Subsequente: 300s (5 min)
Resolução: 1800s (30 min)
Multiplicadores: Urgente 0.3x, Alta 0.5x, Normal 0.75x, Baixa 1.0x
Alerta: 75%
Escalação: Sim
Fila Escalação: Supervisores
```

### Setup Pós-Venda

```
Nome: SLA Pós-Venda
Fila: Pós-Venda
Primeira Resposta: 600s (10 min)
Resposta Subsequente: 900s (15 min)
Resolução: 7200s (2 horas)
Multiplicadores: Urgente 0.5x, Alta 0.75x, Normal 1.0x, Baixa 2.0x
Alerta: 85%
Escalação: Não
```

## Próximos Passos

1. ✅ Configurar SLAs por fila
2. ✅ Ativar monitoramento (cron job)
3. ✅ Treinar equipe sobre alertas
4. ⏳ Monitorar métricas por 1 semana
5. ⏳ Ajustar tempos baseado em dados reais
6. ⏳ Implementar escalação se necessário

## Suporte e Dúvidas

Para dúvidas sobre o sistema de SLA:
1. Consulte esta documentação
2. Verifique logs da função `monitorar-sla`
3. Revise configurações no painel de Config
4. Entre em contato com suporte técnico

---

**Sistema implementado e pronto para uso!** 🎉
