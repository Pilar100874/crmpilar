# Sistema de Advanced Reporting & Analytics

## Visão Geral

Sistema completo de análise e relatórios avançados para o omnichannel, com métricas detalhadas, comparações históricas e relatórios customizáveis.

## Métricas Disponíveis

### 1. FCR - First Contact Resolution
**O que é**: Taxa de resolução no primeiro contato  
**Como calcular**: (Chats resolvidos sem reabertura / Total de chats) × 100  
**Meta ideal**: >70%  
**Significado**: Alta FCR = menos retrabalho, maior eficiência

### 2. AHT - Average Handle Time
**O que é**: Tempo médio de atendimento  
**Como calcular**: Média do tempo desde início até encerramento  
**Meta ideal**: Varia por tipo de atendimento (15-30 min comum)  
**Significado**: Indica eficiência sem comprometer qualidade

### 3. CSAT - Customer Satisfaction Score
**O que é**: Pontuação de satisfação do cliente  
**Como calcular**: Média das avaliações (1-10)  
**Meta ideal**: >8.0  
**Significado**: Satisfação direta após atendimento

### 4. NPS - Net Promoter Score
**O que é**: Probabilidade de recomendar o serviço  
**Como calcular**: % Promotores (9-10) - % Detratores (0-6)  
**Faixas**:
- Promotores: 9-10 ⭐️ Excelente
- Neutros: 7-8 😐 Satisfeito
- Detratores: 0-6 😞 Insatisfeito

**Interpretação**:
- NPS > 50: Excelente
- NPS 0-50: Bom
- NPS < 0: Crítico

**Meta ideal**: >50  
**Significado**: Lealdade e satisfação geral

### 5. Taxa de Cumprimento de SLA
**O que é**: % de atendimentos dentro do prazo  
**Como calcular**: (Chats dentro do SLA / Total de chats) × 100  
**Meta ideal**: >90%  
**Significado**: Eficiência operacional

### 6. Taxa de Transferência
**O que é**: % de chats transferidos  
**Como calcular**: (Chats transferidos / Total de chats) × 100  
**Meta ideal**: <20%  
**Significado**: Especialização vs. necessidade de roteamento

### 7. Taxa de Reabertura
**O que é**: % de chats reabertos  
**Como calcular**: (Chats reabertos / Total encerrados) × 100  
**Meta ideal**: <10%  
**Significado**: Inverso do FCR, indica qualidade da resolução

## Estrutura de Banco de Dados

### Tabela: `metricas_agregadas`
Armazena métricas pré-calculadas por dia, otimizando consultas.

**Dimensões** (podem ser agregadas separadamente):
- Estabelecimento (global)
- Fila específica
- Atendente específico
- Canal (WhatsApp, Telegram, etc)

**Granularidades**:
- Dia
- Semana
- Mês
- Trimestre
- Ano

### Tabela: `relatorios_customizados`
Permite criar relatórios personalizados com:
- Seleção de métricas
- Filtros por dimensão
- Agendamento automático
- Compartilhamento

### Tabela: `relatorios_execucoes`
Histórico de execuções de relatórios com:
- Parâmetros usados
- Dados gerados
- Arquivo exportado
- Status e tempo de execução

## Edge Functions

### `agregar-metricas`
**Função**: Agrega dados brutos em métricas consolidadas  
**Frequência**: Diária (executar à meia-noite)  
**Processo**:
1. Busca conversas do dia
2. Calcula métricas por dimensão
3. Armazena em `metricas_agregadas`

**Parâmetros**:
```json
{
  "dataInicio": "2025-01-01",
  "dataFim": "2025-01-31",
  "estabelecimentoId": "uuid"
}
```

## Componentes Frontend

### AdvancedAnalyticsDashboard
Dashboard principal com:
- Cards de métricas consolidadas
- Gráficos interativos (ECharts)
- Filtros de período
- Exportação de relatórios
- Comparação histórica

**Abas disponíveis:**
1. **Volume**: Total de chats, SLA, tendências
2. **Tempos**: AHT, primeira resposta, análise temporal
3. **NPS**: Promotores, neutros, detratores, score
4. **Comparação**: Períodos anteriores (semana, mês, trimestre, ano)

### SLAConfigCRUD
(Já implementado no módulo anterior)

## Como Usar

### 1. Configurar Agregação Automática

Configure um cron job para executar diariamente:

```bash
# Executar às 00:30 todos os dias
30 0 * * * curl -X POST https://[projeto].supabase.co/functions/v1/agregar-metricas \
  -H "Authorization: Bearer [anon-key]" \
  -H "Content-Type: application/json" \
  -d '{
    "dataInicio": "2025-01-01",
    "dataFim": "2025-01-31",
    "estabelecimentoId": "uuid"
  }'
```

### 2. Acessar Dashboard

Navegue para **Dashboard > Analytics Avançado** e você verá:

#### Métricas Principais (Cards)
- **Volume Total**: Quantidade de chats no período
- **Taxa SLA**: % de cumprimento médio
- **FCR**: % de resolução no primeiro contato
- **NPS Score**: Pontuação de lealdade

#### Gráficos Interativos
- **Volume**: Linha temporal mostrando total, dentro e fora do SLA
- **Tempos**: AHT e tempo de primeira resposta
- **NPS**: Distribuição de promotores, neutros e detratores + score
- **Comparação**: Análise vs períodos anteriores

### 3. Criar Relatórios Customizados

1. Acesse **Config > Estabelecimento > Relatórios**
2. Clique em "Novo Relatório"
3. Configure:
   - Nome e descrição
   - Tipo (atendimento, vendas, performance, etc)
   - Métricas a incluir
   - Dimensões (período, fila, atendente, etc)
   - Filtros
4. Opcionalmente:
   - Agendar execução automática
   - Configurar destinatários
   - Definir formato de exportação
5. Salvar

### 4. Exportar Dados

No dashboard, clique em **Exportar** e escolha:
- **PDF**: Relatório visual com gráficos
- **Excel**: Dados tabulados para análise
- **CSV**: Dados brutos para processamento

## Interpretação de Métricas

### Volume e Distribuição
- **Alto volume + baixa FCR**: Problemas complexos ou treinamento necessário
- **Alto volume + alta FCR**: Operação eficiente
- **Baixo volume + baixa FCR**: Casos especiais ou problemas de processo

### Tempos
- **AHT crescente**: Complexidade aumentando ou ineficiência
- **Primeira resposta alta**: Falta de atendentes ou distribuição ruim
- **Grande diferença entre primeira resposta e AHT**: Resolução demorada

### Satisfação
- **NPS alto + FCR baixo**: Clientes satisfeitos mas precisam múltiplos contatos
- **NPS baixo + SLA ok**: Problema não é tempo, é qualidade
- **CSAT alto + NPS baixo**: Satisfação pontual mas não recomendam

### SLA
- **Violações concentradas em horários**: Picos de demanda
- **Violações por atendente**: Sobrecarga ou falta de skill
- **Violações por fila**: Priorização ou capacidade inadequada

## Benchmarks da Indústria

### FCR (First Contact Resolution)
- Excelente: >80%
- Bom: 70-80%
- Médio: 60-70%
- Abaixo: <60%

### AHT (Average Handle Time)
Varia por indústria:
- Suporte técnico: 15-20 min
- Vendas: 5-10 min
- Pós-venda: 10-15 min
- Reclamações: 20-30 min

### CSAT
- Excelente: >8.5
- Bom: 7.5-8.5
- Médio: 6.5-7.5
- Abaixo: <6.5

### NPS
- Excelente: >50
- Bom: 30-50
- Médio: 0-30
- Crítico: <0

### Taxa de SLA
- Excelente: >95%
- Bom: 90-95%
- Médio: 80-90%
- Abaixo: <80%

## Ações Baseadas em Dados

### Se FCR está baixo:
1. Revisar knowledge base
2. Treinar equipe
3. Simplificar processos
4. Melhorar ferramentas

### Se AHT está alto:
1. Automatizar tarefas repetitivas
2. Melhorar scripts
3. Integrar sistemas
4. Revisar complexidade

### Se NPS está baixo:
1. Analisar feedbacks
2. Identificar pain points
3. Melhorar processos
4. Treinar soft skills

### Se SLA está sendo violado:
1. Contratar mais atendentes
2. Redistribuir cargas
3. Revisar routing
4. Ajustar expectativas

## Próximos Passos

1. ✅ Configurar agregação automática (cron)
2. ⏳ Acessar dashboard e validar dados
3. ⏳ Criar 1-2 relatórios customizados
4. ⏳ Agendar relatórios semanais
5. ⏳ Compartilhar com gestores
6. ⏳ Monitorar tendências por 2 semanas
7. ⏳ Ajustar processos baseado em dados

---

**Sistema de Analytics implementado!** 📊
