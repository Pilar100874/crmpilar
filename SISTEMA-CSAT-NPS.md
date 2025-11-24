# Sistema de Pesquisas de Satisfação (CSAT/NPS)

## Visão Geral

O Sistema de Pesquisas de Satisfação permite coletar feedback estruturado dos clientes através de pesquisas CSAT, NPS e CES, com envio automático após atendimentos e análise detalhada dos resultados.

## Tipos de Pesquisas Suportados

### 1. CSAT (Customer Satisfaction Score)
- Mede a satisfação do cliente com um atendimento específico
- Escala configurável (geralmente 1-5 ou 1-10)
- Pergunta típica: "Como você avalia nosso atendimento?"

### 2. NPS (Net Promoter Score)
- Mede a probabilidade de recomendação
- Escala de 0-10
- Pergunta típica: "De 0 a 10, o quanto você recomendaria nossa empresa?"
- Classificação automática:
  - 0-6: Detratores
  - 7-8: Neutros
  - 9-10: Promotores
- Cálculo NPS: ((Promotores - Detratores) / Total) × 100

### 3. CES (Customer Effort Score)
- Mede o esforço necessário para resolver um problema
- Escala configurável
- Pergunta típica: "O quão fácil foi resolver seu problema?"

## Arquitetura do Sistema

### Tabelas do Banco de Dados

#### `pesquisas_satisfacao`
Armazena as configurações das pesquisas:
- **Identificação**: id, estabelecimento_id, nome, tipo
- **Configuração de Disparo**: 
  - trigger_tipo: apos_encerramento, apos_tempo, manual
  - trigger_delay_minutos: delay para envio (quando apos_tempo)
- **Configuração da Pesquisa**:
  - pergunta_principal
  - escala_minima, escala_maxima
  - label_minima, label_maxima
  - permite_comentario, pergunta_comentario
- **Filtros**: canais, aplica_filas, aplica_atendentes
- **Status**: ativa

#### `pesquisas_respostas`
Armazena as respostas dos clientes:
- **Identificadores**: pesquisa_id, conversation_id, customer_id, atendente_id, fila_id
- **Resposta**: nota, comentario, classificacao (para NPS)
- **Metadados**: canal, enviada_em, respondida_em, tempo_resposta_segundos

### Edge Functions

#### `enviar-pesquisa-satisfacao`
**Entrada:**
```typescript
{
  conversation_id: string,
  customer_id: string,
  atendente_id?: string,
  fila_id?: string,
  canal: string
}
```

**Processo:**
1. Busca pesquisas ativas aplicáveis ao estabelecimento e canal
2. Aplica filtros de fila e atendente (se configurados)
3. Verifica se já existe pesquisa pendente para esta conversação
4. Cria registro de resposta pendente
5. Monta mensagem da pesquisa
6. Retorna dados para envio ao cliente

**Saída:**
```typescript
{
  success: true,
  message: "Pesquisa enviada com sucesso",
  resposta_id: string,
  pesquisa: {
    id: string,
    nome: string,
    tipo: string
  }
}
```

#### `processar-resposta-pesquisa`
**Entrada:**
```typescript
{
  resposta_id: string,
  nota: number,
  comentario?: string
}
```

**Processo:**
1. Valida a nota (dentro da escala configurada)
2. Atualiza o registro de resposta com nota e comentário
3. Classifica automaticamente (para NPS)
4. Calcula tempo de resposta
5. Atualiza a conversação com avaliação
6. Gera mensagem de agradecimento contextual

**Saída:**
```typescript
{
  success: true,
  message: "Resposta processada com sucesso",
  resposta: RespostaAtualizada,
  mensagem_agradecimento: string
}
```

## Componentes React

### `PesquisasSatisfacaoCRUD`
Gerenciamento de pesquisas:
- Listagem de todas as pesquisas
- Criação e edição de pesquisas
- Configuração de:
  - Tipo (CSAT/NPS/CES)
  - Disparo (quando enviar)
  - Pergunta e escala
  - Labels e comentários
  - Canais ativos
  - Filtros de fila/atendente
- Ativação/desativação de pesquisas
- Exclusão de pesquisas

### `PesquisasSatisfacaoDashboard`
Dashboard de resultados:
- **Métricas Principais**:
  - Total de pesquisas enviadas
  - Taxa de resposta
  - Nota média
  - NPS Score (com classificação de promotores/neutros/detratores)
- **Filtros**:
  - Por pesquisa específica ou todas
  - Por período (7, 30, 90 dias)
- **Tabs**:
  - Respostas: Tabela com todas as respostas
  - Comentários: Lista de comentários dos clientes

### `PesquisasSatisfacaoPage`
Página principal que integra CRUD e Dashboard em tabs.

## Fluxo de Funcionamento

### 1. Configuração da Pesquisa
1. Admin/gestor acessa a tela de pesquisas
2. Cria nova pesquisa definindo:
   - Nome e tipo
   - Quando será enviada (trigger)
   - Pergunta e escala
   - Canais onde será aplicada
   - Filtros opcionais (filas/atendentes)

### 2. Envio Automático
1. Ao encerrar um atendimento (ou após tempo configurado):
   - Sistema verifica se há pesquisas ativas
   - Aplica filtros configurados
   - Envia pesquisa ao cliente no canal usado

### 3. Resposta do Cliente
1. Cliente recebe mensagem com a pesquisa
2. Responde com uma nota
3. Opcionalmente, deixa comentário
4. Sistema processa e armazena resposta
5. Cliente recebe agradecimento contextual

### 4. Análise de Resultados
1. Gestor acessa dashboard
2. Visualiza métricas consolidadas
3. Analisa respostas individuais
4. Lê comentários dos clientes
5. Exporta dados para análise externa

## Métricas e KPIs

### Taxa de Resposta
Percentual de pesquisas respondidas em relação às enviadas.
- **Cálculo**: (Total Respondidas / Total Enviadas) × 100
- **Meta recomendada**: > 50%

### Nota Média (CSAT)
Média das notas atribuídas pelos clientes.
- **Cálculo**: Soma das notas / Total de respostas
- **Interpretação** (escala 1-10):
  - 8-10: Satisfeito
  - 5-7: Neutro
  - 1-4: Insatisfeito

### NPS Score
Mede a probabilidade de recomendação.
- **Cálculo**: ((% Promotores - % Detratores))
- **Interpretação**:
  - 75-100: Excelente
  - 50-74: Muito bom
  - 0-49: Razoável
  - -100 a -1: Crítico

### Tempo de Resposta
Tempo médio entre envio e resposta da pesquisa.
- Indica engajamento do cliente
- Respostas rápidas podem indicar experiência mais marcante

## Integração com Atendimento

### Trigger: Após Encerramento
- Pesquisa enviada imediatamente após o atendente encerrar o chat
- Momento ideal para capturar feedback recente

### Trigger: Após Tempo
- Pesquisa enviada X minutos após encerramento
- Útil para dar tempo ao cliente testar solução

### Trigger: Manual
- Pesquisa enviada manualmente pelo gestor
- Para situações específicas ou follow-ups

## Boas Práticas

### Configuração de Pesquisas
1. **Pergunta Clara**: Use linguagem simples e direta
2. **Escala Adequada**: 
   - CSAT: 1-5 ou 1-10
   - NPS: Sempre 0-10
   - CES: 1-7 (muito difícil a muito fácil)
3. **Labels Descritivas**: Explique o que cada extremo significa
4. **Comentário Opcional**: Sempre permita feedback aberto

### Análise de Resultados
1. **Monitore Tendências**: Acompanhe evolução ao longo do tempo
2. **Segmente Dados**: Analise por fila, atendente, canal
3. **Leia Comentários**: Insights qualitativos são valiosos
4. **Aja sobre Feedback**: Use dados para melhorar processos

### Frequência de Envio
- Evite saturar clientes com pesquisas
- Limite 1 pesquisa por atendimento
- Considere intervalo mínimo entre pesquisas

## Próximas Melhorias

1. **Análise Automática de Sentimento**: Classificar comentários automaticamente
2. **Alertas de Baixa Satisfação**: Notificar gestores sobre notas ruins
3. **Integração com CRM**: Vincular satisfação ao histórico do cliente
4. **Pesquisas Multicanal**: Enviar por e-mail, SMS além do canal de atendimento
5. **Dashboards Avançados**: Gráficos de tendência, correlações, previsões
6. **Exportação de Dados**: CSV, PDF, integração com BI

## Suporte e Dúvidas

Para suporte sobre o Sistema de Pesquisas de Satisfação, consulte:
- Documentação técnica das Edge Functions
- Políticas de RLS no banco de dados
- Logs das Edge Functions para debug
