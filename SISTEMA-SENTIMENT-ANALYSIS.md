# Sistema de Análise de Sentimento (Sentiment Analysis)

## Visão Geral
Sistema de análise de sentimento em tempo real que monitora conversas de atendimento, identifica emoções e sentimentos dos clientes, e gera alertas proativos para supervisores.

## Arquitetura do Sistema

### Tabelas do Banco de Dados

#### 1. `sentiment_analysis`
Armazena análises individuais de cada mensagem.

**Campos:**
- `id`: UUID da análise
- `estabelecimento_id`: Estabelecimento
- `chat_id`: Conversa analisada
- `message_id`: Mensagem específica
- `sentiment`: Sentimento detectado (`positivo`, `neutro`, `negativo`)
- `score`: Score numérico (0.0000 a 1.0000)
- `emotion`: Emoção específica (`feliz`, `triste`, `irritado`, `frustrado`, `satisfeito`)
- `confidence`: Confiança da análise (0.0000 a 1.0000)
- `keywords`: Palavras-chave detectadas (JSONB)
- `analysis_metadata`: Metadados adicionais (JSONB)
- `created_at`: Timestamp

#### 2. `sentiment_conversation_summary`
Resumo agregado por conversa completa.

**Campos:**
- `id`: UUID do resumo
- `estabelecimento_id`: Estabelecimento
- `chat_id`: Conversa (único por chat)
- `sentiment_geral`: Sentimento predominante
- `score_medio`: Score médio de toda a conversa
- `total_mensagens_analisadas`: Quantidade de mensagens
- `mensagens_positivas`: Contador de positivas
- `mensagens_neutras`: Contador de neutras
- `mensagens_negativas`: Contador de negativas
- `emocoes_predominantes`: Emoções mais frequentes (JSONB)
- `pontos_escalacao`: Momentos críticos (JSONB)
- `requer_atencao`: Flag de atenção necessária
- `created_at`, `updated_at`: Timestamps

#### 3. `sentiment_config`
Configurações de análise por estabelecimento.

**Campos:**
- `id`: UUID da configuração
- `estabelecimento_id`: Estabelecimento (único)
- `ativo`: Se análise está ativa
- `threshold_negativo`: Limite para negativo (padrão: 0.3000)
- `threshold_positivo`: Limite para positivo (padrão: 0.7000)
- `alerta_sentimento_negativo`: Alertar em sentimento negativo
- `alerta_threshold`: Quantidade de mensagens negativas seguidas para alertar (padrão: 2)
- `canais_ativos`: Canais monitorados (array)
- `escalar_automaticamente`: Escalar automaticamente
- `fila_escalacao_id`: Fila para escalação
- `created_at`, `updated_at`: Timestamps

#### 4. `sentiment_alerts`
Alertas gerados por sentimentos negativos.

**Campos:**
- `id`: UUID do alerta
- `estabelecimento_id`: Estabelecimento
- `chat_id`: Conversa
- `atendente_id`: Atendente
- `tipo_alerta`: Tipo (`sentimento_negativo`, `escalacao_necessaria`, `frustracao_alta`)
- `descricao`: Descrição do alerta
- `score_sentimento`: Score no momento do alerta
- `resolvido`: Se foi resolvido
- `resolvido_por`: Quem resolveu
- `resolvido_em`: Quando foi resolvido
- `created_at`: Timestamp

---

## Funcionalidades Principais

### 1. Análise em Tempo Real

**Processo:**
1. Mensagem do cliente é enviada
2. Sistema analisa sentimento usando IA
3. Classifica como positivo, neutro ou negativo
4. Identifica emoção específica
5. Calcula confidence score
6. Atualiza resumo da conversa

**Algoritmo de Classificação:**
```
Score < threshold_negativo (0.30) → NEGATIVO
Score >= threshold_negativo e <= threshold_positivo → NEUTRO
Score > threshold_positivo (0.70) → POSITIVO
```

### 2. Detecção de Emoções

**Emoções Identificadas:**
- **Feliz:** Cliente satisfeito, elogiando
- **Triste:** Cliente decepcionado
- **Irritado:** Cliente com raiva
- **Frustrado:** Cliente com dificuldades
- **Satisfeito:** Cliente contente com solução

### 3. Alertas Proativos

**Triggers de Alerta:**
- **N mensagens negativas seguidas:** Padrão 2 mensagens
- **Score extremamente baixo:** < 0.2
- **Palavras-chave de escalação:** Detectadas (ex: "gerente", "cancelar", "processo")
- **Mudança brusca de sentimento:** De positivo para muito negativo

**Ações Automáticas:**
- Notificar supervisor em tempo real
- Destacar conversa no painel
- Opcionalmente: escalar para fila especializada
- Registrar ponto de escalação no histórico

### 4. Dashboard e Métricas

**Visualizações:**
- **Em Tempo Real:**
  - Alertas ativos não resolvidos
  - Chats com sentimento negativo
  - Distribuição de sentimentos atual
  
- **Histórico:**
  - Evolução de sentimento por período
  - Atendentes com mais chats negativos
  - Horários com pior sentimento
  - Correlação sentimento x tempo de atendimento

- **Por Atendente:**
  - Score médio de sentimento
  - Percentual de chats positivos/negativos
  - Evolução temporal
  - Comparativo com equipe

### 5. Integração com CSAT/NPS

**Correlações:**
- Sentimento da conversa x nota CSAT
- Emoções predominantes x NPS
- Identificar se sentimento negativo prevê baixa avaliação
- Antecipar insatisfação antes do envio de pesquisa

---

## Edge Functions

### 1. `analisar-sentimento/index.ts`
Analisa sentimento de mensagens em tempo real.

**Trigger:** Nova mensagem em conversa
**Processo:**
1. Recebe mensagem do webhook
2. Chama API de análise de sentimento (Lovable AI)
3. Armazena resultado em `sentiment_analysis`
4. Atualiza `sentiment_conversation_summary`
5. Verifica condições de alerta
6. Dispara alerta se necessário

### 2. `verificar-alertas-sentimento/index.ts`
Monitora conversas e gera alertas.

**Trigger:** Atualização em `sentiment_analysis`
**Processo:**
1. Busca últimas N mensagens do chat
2. Verifica padrões negativos
3. Verifica score extremo
4. Cria alerta se condições atendidas
5. Notifica supervisor via realtime

---

## Fluxo de Trabalho

### 1. Configuração Inicial
```
1. Admin acessa configurações de Sentiment Analysis
2. Ativa análise de sentimento
3. Define thresholds personalizados
4. Configura canais a monitorar
5. Define regras de alerta
6. Opcionalmente: ativa escalação automática
```

### 2. Durante Atendimento
```
1. Cliente envia mensagem
2. Sistema analisa sentimento automaticamente
3. Se negativo: marca conversa visualmente
4. Se múltiplas negativas: gera alerta para supervisor
5. Supervisor visualiza alerta em tempo real
6. Supervisor pode intervir ou escalar
7. Atendente recebe feedback sobre sentimento da conversa
```

### 3. Pós-Atendimento
```
1. Sistema gera resumo de sentimento da conversa
2. Correlaciona com avaliação CSAT/NPS
3. Identifica padrões de melhoria
4. Gera insights para treinamento
```

---

## Configurações Recomendadas

### Thresholds:
- **Conservador:** Negativo < 0.4, Positivo > 0.6
- **Padrão:** Negativo < 0.3, Positivo > 0.7
- **Agressivo:** Negativo < 0.2, Positivo > 0.8

### Alertas:
- **Call center pequeno:** 2 mensagens negativas
- **Call center médio:** 3 mensagens negativas
- **Call center grande:** 2 mensagens + score < 0.2

### Canais:
- Sempre monitorar: WhatsApp, WebChat
- Opcional: Email (análise pode ser menos precisa)

---

## Boas Práticas

### 1. Uso de Alertas
- **Não ignore:** Alertas são indicadores importantes
- **Aja rápido:** Intervenha antes de perder o cliente
- **Aprenda:** Use alertas para identificar gaps de treinamento

### 2. Análise de Dados
- **Correlacione:** Sentimento x CSAT x QA
- **Identifique padrões:** Horários, atendentes, tipos de problema
- **Previna:** Use insights para melhorias proativas

### 3. Feedback para Atendentes
- **Construtivo:** Mostre onde podem melhorar
- **Contextual:** Explique porque sentimento foi negativo
- **Treinamento:** Use casos reais em capacitações

---

## Integração com IA (Lovable AI)

**Modelo Recomendado:** `google/gemini-2.5-flash` ou `google/gemini-2.5-pro`

**Prompt de Análise:**
```
Analise o sentimento e emoção da seguinte mensagem de cliente:

"{mensagem}"

Retorne JSON com:
- sentiment: "positivo" | "neutro" | "negativo"
- score: número entre 0 e 1
- emotion: "feliz" | "triste" | "irritado" | "frustrado" | "satisfeito"
- confidence: número entre 0 e 1
- keywords: array de palavras-chave importantes
```

---

## Métricas e KPIs

### Principais Indicadores:
- **Sentiment Score Médio:** Meta > 0.65
- **% Chats Positivos:** Meta > 70%
- **% Chats Negativos:** Meta < 15%
- **Tempo Médio de Resolução de Alerta:** Meta < 5 minutos
- **Correlação Sentiment x CSAT:** Ideal > 0.7

### Benchmarks:
- **Excelente:** Score médio > 0.75, < 10% negativos
- **Bom:** Score médio 0.60-0.75, 10-20% negativos
- **Regular:** Score médio 0.50-0.60, 20-30% negativos
- **Crítico:** Score médio < 0.50, > 30% negativos

---

## Políticas de RLS

### Permissões:
- **Visualização:** Todos os usuários autenticados do estabelecimento
- **Alertas:** Supervisores e admins podem resolver
- **Configuração:** Apenas supervisores e admins

### Segurança:
- Análises isoladas por `estabelecimento_id`
- Realtime ativo para alertas
- Sistema pode inserir análises sem autenticação

---

## Melhorias Futuras

1. **Análise multi-idioma:** Detectar idioma e analisar adequadamente
2. **Análise de áudio:** Sentimento em chamadas de voz
3. **Análise de imagens:** Emoções em emojis e imagens
4. **Predição de churn:** IA prevê risco de cancelamento
5. **Recomendações automáticas:** IA sugere respostas baseadas em sentimento
6. **Análise de trends:** Identificar tendências de sentimento ao longo do tempo
7. **Integração CRM:** Enriquecer perfil do cliente com histórico de sentimento
8. **Gamificação:** Badges para atendentes com melhor sentimento médio
9. **A/B Testing:** Testar diferentes abordagens baseadas em sentimento
10. **Analytics avançado:** Machine learning para patterns complexos

---

## Documentação Técnica

### API de Análise:
```typescript
interface SentimentAnalysis {
  sentiment: 'positivo' | 'neutro' | 'negativo';
  score: number; // 0.0000 to 1.0000
  emotion: 'feliz' | 'triste' | 'irritado' | 'frustrado' | 'satisfeito';
  confidence: number; // 0.0000 to 1.0000
  keywords: string[];
  metadata?: Record<string, any>;
}
```

### Realtime Subscription:
```typescript
const channel = supabase
  .channel('sentiment-alerts')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'sentiment_alerts',
    filter: `estabelecimento_id=eq.${estabelecimentoId}`
  }, (payload) => {
    // Handle new alert
    handleNewSentimentAlert(payload.new);
  })
  .subscribe();
```
