# Guia Completo do Sistema Omnichannel
## Manual de Configuração e Uso

---

## 📋 Índice

1. [SLA - Service Level Agreement](#1-sla---service-level-agreement)
2. [Advanced Analytics](#2-advanced-analytics)
3. [CSAT/NPS - Pesquisas de Satisfação](#3-csatnps---pesquisas-de-satisfação)
4. [Knowledge Base - Base de Conhecimento](#4-knowledge-base---base-de-conhecimento)
5. [Quality Assurance - Controle de Qualidade](#5-quality-assurance---controle-de-qualidade)
6. [Sentiment Analysis - Análise de Sentimento](#6-sentiment-analysis---análise-de-sentimento)
7. [Self-Service Portal - Portal de Autoatendimento](#7-self-service-portal---portal-de-autoatendimento)
8. [Omnichannel Continuity - Continuidade entre Canais](#8-omnichannel-continuity---continuidade-entre-canais)

---

## 1. SLA - Service Level Agreement

### 📍 Onde Acessar
**Menu Principal → Estabelecimentos Cadastrados → Atendimento → Configurações de SLA**

### 🎯 O que é?
Sistema de monitoramento de tempos de resposta e resolução de atendimentos, com alertas automáticos quando os tempos definidos são ultrapassados.

### ⚙️ Como Configurar

#### Passo 1: Criar Configuração de SLA
1. Acesse a tela de Configurações de SLA
2. Clique em "Adicionar SLA"
3. Preencha os campos:
   - **Nome**: Nome identificador do SLA
   - **Fila**: Selecione a fila de atendimento (cada fila pode ter seu próprio SLA)
   - **Tempo Primeira Resposta**: Tempo máximo em minutos para primeira resposta (ex: 5)
   - **Tempo Resposta Subsequente**: Tempo máximo em minutos entre respostas (ex: 10)
   - **Tempo Total Resolução**: Tempo máximo em minutos para resolução completa (ex: 60)

#### Passo 2: Configurar Ações Automáticas
4. **Notificar Supervisor**: Ative para receber alertas
5. **Prioridade Automática**: Escolha se chats com SLA violado devem aumentar prioridade
6. **Escalar Automaticamente**: Ative para transferência automática ao violar SLA
7. **Fila de Escalação**: Selecione para onde escalar (se ativado)

#### Passo 3: Ativar
8. Marque como **Ativo**
9. Clique em **Salvar**

### 📊 Como Funciona

#### Monitoramento Automático
- **Primeira Resposta**: Timer inicia quando o chat entra na fila
- **Respostas Subsequentes**: Timer reinicia a cada mensagem do cliente
- **Resolução Total**: Timer total desde entrada até encerramento

#### Alertas e Violações
- Sistema gera alertas antes e após violação
- Violações são registradas na tabela `sla_violations`
- Notificações em tempo real para supervisores

#### Dashboard de SLA
Acesse: **Menu Principal → Dashboards → SLA Dashboard**
- Taxa de cumprimento de SLA
- Violações por período
- Tempo médio de resposta
- Comparativo por fila/atendente

### 🔄 Edge Functions Relacionadas
- `monitorar-sla`: Monitora SLAs em tempo real (cron a cada 1 minuto)
- `processar-fila-atendimento`: Verifica SLA ao rotear chats

---

## 2. Advanced Analytics

### 📍 Onde Acessar
**Menu Principal → Dashboards → Advanced Analytics**

### 🎯 O que é?
Sistema de relatórios e análises avançadas com métricas pré-calculadas e dashboards personalizáveis.

### ⚙️ Como Configurar

#### Criar Relatório Customizado
1. Acesse **Advanced Analytics**
2. Clique em "Novo Relatório"
3. Configure:
   - **Nome**: Nome do relatório
   - **Tipo**: Escolha entre os tipos disponíveis
   - **Período**: Diário, semanal, mensal
   - **Filtros**: Fila, atendente, canal, etc.
   - **Métricas**: Selecione quais métricas incluir

### 📊 Métricas Disponíveis

#### FCR (First Contact Resolution)
- **O que é**: Taxa de resolução no primeiro contato
- **Como calcular**: (Chats resolvidos na primeira interação / Total de chats) × 100
- **Uso**: Medir eficiência do atendimento

#### AHT (Average Handle Time)
- **O que é**: Tempo médio de atendimento
- **Como calcular**: Soma total de tempo de atendimento / Número de atendimentos
- **Uso**: Otimizar alocação de recursos

#### CSAT (Customer Satisfaction)
- **O que é**: Satisfação do cliente
- **Como calcular**: Média das avaliações recebidas
- **Uso**: Medir qualidade do atendimento

#### NPS (Net Promoter Score)
- **O que é**: Probabilidade de recomendação
- **Como calcular**: % Promotores - % Detratores
- **Uso**: Medir lealdade do cliente

### 📈 Dashboards Disponíveis

#### Dashboard Principal
- Visão geral de todas as métricas
- Gráficos de tendência
- Comparativos período anterior

#### Dashboard por Atendente
- Performance individual
- Ranking de atendentes
- Metas vs. Realizado

#### Dashboard por Canal
- Distribuição de volume
- Métricas por canal (WhatsApp, WebChat, etc.)
- Comparativo de satisfação

### 🔄 Agregação Automática
- Edge Function: `agregar-metricas`
- Executa: Diariamente às 00:00
- Calcula: Métricas do dia anterior
- Armazena: Tabela `metricas_agregadas`

---

## 3. CSAT/NPS - Pesquisas de Satisfação

### 📍 Onde Acessar
**Menu Principal → Estabelecimentos Cadastrados → Atendimento → Pesquisas de Satisfação**

### 🎯 O que é?
Sistema de pesquisas automáticas de satisfação enviadas após encerramento de atendimentos.

### ⚙️ Como Configurar

#### Passo 1: Criar Pesquisa
1. Acesse **Pesquisas de Satisfação**
2. Clique em "Nova Pesquisa"
3. Configure:
   - **Nome**: Nome interno da pesquisa
   - **Tipo**: CSAT, NPS ou CES
   - **Pergunta**: Texto da pergunta (ex: "Como avalia nosso atendimento?")
   - **Escala**: 0-10 (NPS), 1-5 (CSAT), 1-7 (CES)

#### Passo 2: Configurar Disparo
4. **Disparo Automático**:
   - ✅ Ativo: Envia automaticamente
   - ❌ Inativo: Apenas disparo manual
5. **Delay de Envio**: Tempo em minutos após encerramento (ex: 5)
6. **Canais**: WhatsApp, WebChat, Email, etc.

#### Passo 3: Filtros (Opcional)
7. **Filas**: Selecione filas específicas (vazio = todas)
8. **Atendentes**: Selecione atendentes específicos (vazio = todos)
9. **Horário**: Configure horário de envio permitido

#### Passo 4: Ativar
10. Marque como **Ativa**
11. Clique em **Salvar**

### 📊 Como Funciona

#### Disparo Automático
- Edge Function: `enviar-pesquisa-satisfacao`
- Cron: A cada 5 minutos
- Busca: Conversas finalizadas sem pesquisa enviada
- Respeita: Delay configurado e horários

#### Recebimento de Respostas
- Edge Function: `processar-resposta-pesquisa`
- Integrado com: WhatsApp webhook
- Classifica: Automaticamente (NPS: Promotor/Neutro/Detrator)
- Armazena: Tabela `pesquisas_respostas`

#### Classificação Automática NPS
- **0-6**: Detrator (cliente insatisfeito)
- **7-8**: Neutro (cliente satisfeito mas não entusiasmado)
- **9-10**: Promotor (cliente entusiasmado)

### 📈 Dashboard de Pesquisas
Acesse: **Menu Principal → Dashboards → Pesquisas de Satisfação**
- Score médio por período
- Distribuição de respostas
- Comentários dos clientes
- Filtros por fila, atendente, canal

### 💡 Dicas de Uso
- **CSAT**: Use para medir satisfação com atendimento específico
- **NPS**: Use para medir lealdade geral do cliente
- **Delay**: 5-10 minutos é ideal (não muito rápido, não muito tarde)
- **Canais**: WhatsApp tem melhor taxa de resposta

---

## 4. Knowledge Base - Base de Conhecimento

### 📍 Onde Acessar
**Menu Principal → Estabelecimentos Cadastrados → Atendimento → Base de Conhecimento**

### 🎯 O que é?
Biblioteca centralizada de artigos e documentos para consulta de atendentes e autoatendimento de clientes.

### ⚙️ Como Configurar

#### Passo 1: Criar Categorias
1. Acesse **Base de Conhecimento**
2. Vá para aba "Categorias"
3. Clique em "Nova Categoria"
4. Preencha:
   - **Nome**: Nome da categoria (ex: "Produtos")
   - **Descrição**: Breve descrição
   - **Ícone**: Escolha um ícone
   - **Cor**: Cor de destaque
5. Clique em **Salvar**

#### Passo 2: Criar Tags
6. Clique em "Nova Tag"
7. Preencha nome da tag (ex: "urgente", "tutorial")
8. Tags facilitam busca e organização

#### Passo 3: Criar Artigo
9. Vá para aba "Artigos"
10. Clique em "Novo Artigo"
11. Configure:
    - **Título**: Título do artigo
    - **Conteúdo**: Texto completo (suporta Markdown)
    - **Categoria**: Selecione categoria criada
    - **Tags**: Adicione tags relevantes
    - **Palavras-chave**: Para busca (separadas por vírgula)

#### Passo 4: Configurar Visibilidade
12. **Status**: Rascunho, Publicado, Arquivado
13. **Acesso Público**: 
    - ✅ Sim: Disponível no portal público
    - ❌ Não: Apenas para atendentes

#### Passo 5: Adicionar Recursos
14. **Anexos**: PDFs, imagens, vídeos
15. **Artigos Relacionados**: Vincule artigos similares

### 📊 Como Funciona

#### Busca Inteligente
- Pesquisa por título, conteúdo, tags, palavras-chave
- Ranking por relevância
- Filtros por categoria, autor, data

#### Sistema de Feedback
- Usuários podem marcar "útil" ou "não útil"
- Comentários opcionais
- Métricas de utilidade por artigo

#### Versionamento
- Histórico de alterações
- Restauração de versões anteriores
- Registro de quem editou e quando

### 💡 Melhores Práticas
- **Títulos**: Claros e descritivos
- **Conteúdo**: Use listas, negrito, imagens
- **Categorização**: Organize logicamente
- **Atualização**: Revise periodicamente
- **Feedback**: Analise comentários negativos

---

## 5. Quality Assurance - Controle de Qualidade

### 📍 Onde Acessar
**Menu Principal → Estabelecimentos Cadastrados → Atendimento → Quality Assurance**

### 🎯 O que é?
Sistema de avaliação de qualidade de atendimentos com formulários personalizáveis e critérios ponderados.

### ⚙️ Como Configurar

#### Passo 1: Criar Formulário de Avaliação
1. Acesse **Quality Assurance**
2. Clique em "Novo Formulário"
3. Configure:
   - **Nome**: Nome do formulário (ex: "Avaliação Padrão")
   - **Descrição**: Objetivo da avaliação
   - **Ativo**: Marque para usar

#### Passo 2: Adicionar Critérios
4. Clique em "Adicionar Critério"
5. Para cada critério:
   - **Nome**: Nome do critério (ex: "Cordialidade")
   - **Descrição**: O que avaliar
   - **Tipo**: Boolean (sim/não), Escala (1-5), ou Texto
   - **Peso**: Importância do critério (1-10)
   - **Obrigatório**: Marque se for obrigatório

#### Exemplos de Critérios
- **Cordialidade** (Escala 1-5, Peso 8)
- **Tempo de Resposta** (Escala 1-5, Peso 7)
- **Resolução do Problema** (Boolean, Peso 10)
- **Uso de Linguagem Adequada** (Boolean, Peso 6)
- **Observações Gerais** (Texto, Peso 0)

#### Passo 3: Definir Metas por Atendente
6. Clique em "Metas"
7. Para cada atendente:
   - **Meta de Pontuação**: Score mínimo (ex: 80%)
   - **Avaliações Mínimas**: Por período (ex: 10/mês)

### 📊 Como Funciona

#### Processo de Avaliação
1. **Seleção**: Supervisor/QA seleciona chat para avaliar
2. **Formulário**: Preenche critérios do formulário
3. **Cálculo**: Sistema calcula score ponderado automaticamente
4. **Registro**: Avaliação fica disponível para consulta

#### Cálculo de Pontuação
```
Score = (Σ(nota_critério × peso_critério)) / (Σ(peso_total)) × 100
```

#### Dashboard de Qualidade
- Score médio por atendente
- Evolução temporal
- Critérios com pior desempenho
- Atendentes abaixo da meta

### 📈 Relatórios Disponíveis
- **Individual**: Performance de cada atendente
- **Comparativo**: Ranking de equipe
- **Critérios**: Análise por critério específico
- **Tendências**: Evolução ao longo do tempo

### 💡 Dicas de Uso
- **Amostragem**: Avalie 5-10% dos atendimentos aleatoriamente
- **Feedback**: Compartilhe resultados com atendentes
- **Calibração**: Mantenha consistência entre avaliadores
- **Ação**: Use insights para treinamento

---

## 6. Sentiment Analysis - Análise de Sentimento

### 📍 Onde Acessar
Funcionalidade automática integrada ao chat

### 🎯 O que é?
Sistema de análise automática de sentimento de mensagens usando IA, com alertas proativos para sentimento negativo.

### ⚙️ Como Configurar

#### Configuração Inicial
Tabela: `sentiment_config`
```sql
INSERT INTO sentiment_config (
  estabelecimento_id,
  ativo,
  threshold_negativo,
  threshold_positivo,
  canais_monitorados,
  alertar_apos_mensagens_negativas,
  escalar_automaticamente
) VALUES (
  'seu-estabelecimento-id',
  true,
  0.30,  -- Abaixo de 0.30 = negativo
  0.70,  -- Acima de 0.70 = positivo
  ARRAY['whatsapp', 'webchat'],
  2,     -- Alertar após 2 mensagens negativas
  false  -- Não escalar automaticamente
);
```

### 📊 Como Funciona

#### Análise em Tempo Real
- Edge Function: `analisar-sentimento`
- Trigger: Cada nova mensagem do cliente
- IA Usado: Lovable AI (gemini-2.5-flash ou gemini-2.5-pro)
- Analisa: Sentimento (positivo/neutro/negativo) + Emoção específica

#### Emoções Detectadas
- **happy**: Cliente satisfeito
- **sad**: Cliente triste/decepcionado
- **irritated**: Cliente irritado
- **frustrated**: Cliente frustrado
- **satisfied**: Cliente satisfeito com resolução
- **neutral**: Sem emoção clara

#### Geração de Alertas
Edge Function: `verificar-alertas-sentimento`
Gera alerta quando:
1. **Sentimento negativo persistente**: 2+ mensagens negativas seguidas
2. **Score muito baixo**: Score < threshold_negativo
3. **Mudança brusca**: De positivo para muito negativo
4. **Palavras de escalação**: "gerente", "reclamação", "advogado"

#### Ações Automáticas
Quando alerta é gerado:
1. **Notificação**: Supervisor recebe notificação em tempo real
2. **Destaque**: Chat é destacado no painel
3. **Prioridade**: Aumenta prioridade automaticamente (opcional)
4. **Escalação**: Transfere para supervisor (opcional)

### 📈 Dashboard de Sentimento
Métricas disponíveis:
- **Score médio**: Por atendente/fila
- **Distribuição**: % Positivo/Neutro/Negativo
- **Alertas**: Número e tipos
- **Tendências**: Evolução temporal
- **Correlação**: Sentimento × CSAT/NPS

### 💡 Integração com IA

#### Prompt para Análise
```json
{
  "model": "google/gemini-2.5-flash",
  "messages": [{
    "role": "user",
    "content": "Analise o sentimento desta mensagem: '{mensagem}'. Retorne JSON com: sentimento (positivo/neutro/negativo), score (0-1), emocao (happy/sad/irritated/frustrated/satisfied/neutral), confianca (0-1), keywords (array)."
  }]
}
```

#### Resposta Esperada
```json
{
  "sentimento": "negativo",
  "score": 0.25,
  "emocao": "frustrated",
  "confianca": 0.89,
  "keywords": ["problema", "não funciona", "frustrado"]
}
```

### 🚨 Alertas em Tempo Real
Interface do Atendente:
- 🔴 Indicador visual de sentimento negativo
- 🟡 Alerta de mudança brusca
- 🟢 Sentimento positivo (feedback positivo)

Interface do Supervisor:
- Lista de alertas ativos
- Histórico de alertas
- Ação rápida: Visualizar chat/Transferir/Intervir

---

## 7. Self-Service Portal - Portal de Autoatendimento

### 📍 Onde Acessar
**Portal Público**: `/portal` (URL pública do seu estabelecimento)
**Admin**: Menu Principal → Estabelecimentos Cadastrados → Atendimento → Portal

### 🎯 O que é?
Portal público onde clientes podem buscar respostas na base de conhecimento e abrir tickets de suporte sem atendimento humano imediato.

### ⚙️ Como Configurar

#### Passo 1: Publicar Artigos no Portal
1. Acesse **Base de Conhecimento**
2. Edite ou crie artigo
3. Marque **Acesso Público = Sim**
4. Status = **Publicado**
5. O artigo aparecerá automaticamente no portal

#### Passo 2: Configurar Categorias Públicas
- Categorias são automaticamente públicas
- Configure ícones e cores para melhor UX
- Organize artigos por relevância

#### Passo 3: Sistema de Tickets
Configuração automática, mas pode personalizar:
- **Categorias de tickets**: Criadas dinamicamente
- **Prioridades**: Baixa, Normal, Alta, Urgente
- **Atribuição**: Manual ou automática

### 📊 Como Funciona

#### Fluxo do Cliente
1. **Acessa Portal**: Cliente entra via URL pública
2. **Busca Artigo**: Pesquisa por palavra-chave ou navega categorias
3. **Lê Artigo**: Tenta resolver sozinho
4. **Feedback**: Marca "Ajudou" ou "Não Ajudou"
5. **Abre Ticket** (se não resolveu): Preenche formulário

#### Sistema de Tickets
Tabelas envolvidas:
- `portal_tickets`: Dados do ticket
- `portal_ticket_respostas`: Conversação assíncrona

Estados do Ticket:
- **Aberto**: Aguardando primeira resposta
- **Em Andamento**: Atendente respondeu
- **Aguardando Cliente**: Cliente não respondeu
- **Resolvido**: Problema resolvido
- **Fechado**: Ticket encerrado

#### Conversão Ticket → Chat
Quando necessário:
1. Atendente identifica necessidade de tempo real
2. Clica em "Converter para Chat"
3. Sistema cria conversa ao vivo
4. Contexto do ticket é transferido
5. Cliente recebe link/notificação

### 📈 Métricas de Deflexão
**Taxa de Deflexão** = (Problemas resolvidos sem humano / Total de acessos) × 100

Dashboard mostra:
- Artigos mais acessados
- Taxa de "Ajudou" por artigo
- Tickets evitados (estimativa)
- ROI do portal

### 💡 Dicas de Otimização
- **SEO**: Otimize títulos e palavras-chave
- **Conteúdo**: Use linguagem simples
- **Multimídia**: Adicione imagens e vídeos
- **FAQ**: Crie artigos para perguntas frequentes
- **Atualização**: Monitore feedback negativo

---

## 8. Omnichannel Continuity - Continuidade entre Canais

### 📍 Onde Acessar
Funcionalidade automática integrada ao sistema

### 🎯 O que é?
Sistema que permite clientes mudarem de canal (WhatsApp → WebChat → Email) sem perder contexto da conversa.

### ⚙️ Como Configurar

#### Geração de Sessão Unificada
Automático quando:
1. Cliente inicia conversa em qualquer canal
2. Sistema gera `session_token` único
3. Token vincula todas interações do cliente

#### Tabelas Envolvidas
- `omnichannel_sessions`: Sessão única por cliente
- `canal_transitions`: Registro de mudanças de canal
- `customer_canal_preferences`: Preferências aprendidas

### 📊 Como Funciona

#### Exemplo de Fluxo: WhatsApp → WebChat

**Situação**: Cliente iniciou no WhatsApp mas precisa compartilhar tela

1. **WhatsApp**: Cliente descreve problema técnico
2. **Bot/Atendente**: Identifica necessidade visual
3. **Sistema**: Gera link WebChat com session_token
4. **Envio**: "Clique aqui para continuar no chat web: [link]"
5. **Cliente**: Clica no link
6. **WebChat**: Abre com contexto completo
7. **Atendente**: Vê todo histórico do WhatsApp
8. **Compartilhamento**: Cliente compartilha tela
9. **Resolução**: Problema resolvido
10. **Continuidade**: Conversa pode voltar ao WhatsApp

#### Contexto Compartilhado
Dados mantidos entre canais:
```json
{
  "historico_mensagens": [...],
  "variaveis_bot": {...},
  "dados_coletados": {...},
  "estado_atendimento": "em_andamento",
  "anexos": [...]
}
```

#### Transição Automática
Edge Function: `transicionar-canal`
```typescript
async function transitionChannel(
  sessionToken: string,
  canalDestino: string,
  conversaOrigemId: string
) {
  // 1. Busca sessão
  // 2. Carrega contexto
  // 3. Cria nova conversa no canal destino
  // 4. Transfere contexto
  // 5. Notifica atendente
  // 6. Atualiza preferências do cliente
}
```

### 📈 Casos de Uso

#### 1. WhatsApp → WebChat
**Quando**: Necessário compartilhar tela/arquivos grandes
**Como**: Sistema envia link com token

#### 2. Email → WhatsApp
**Quando**: Resposta rápida necessária
**Como**: Sistema detecta urgência e envia WhatsApp

#### 3. Chat → Telefone
**Quando**: Situação complexa requer voz
**Como**: Atendente agenda callback com contexto

#### 4. Telegram → Email
**Quando**: Documentação formal necessária
**Como**: Sistema converte conversa em thread email

### 🎯 Preferências de Canal
Sistema aprende automaticamente:
- **Canal preferido**: Mais usado pelo cliente
- **Horário preferido**: Quando cliente é mais ativo
- **Tipo de problema**: Qual canal para cada situação

Sugestão Inteligente:
```
"Notamos que você prefere WhatsApp para dúvidas rápidas. 
Deseja continuar aqui ou prefere uma ligação?"
```

### 💡 Benefícios
- **Experiência fluida**: Cliente não repete informações
- **Flexibilidade**: Cliente escolhe canal mais conveniente
- **Eficiência**: Atendente tem contexto completo
- **Satisfação**: Jornada sem fricção
- **Insights**: Análise de padrões de comportamento

---

## 🔧 Configurações Gerais do Sistema

### Variáveis de Ambiente
Arquivo: `.env`
```bash
VITE_SUPABASE_URL=sua-url
VITE_SUPABASE_ANON_KEY=sua-key
WAHA_URL=url-waha
WAHA_API_KEY=key-waha
```

### Edge Functions Principais

#### Cron Jobs Automáticos
- `agregar-metricas`: Diariamente às 00:00
- `enviar-pesquisa-satisfacao`: A cada 5 minutos
- `monitorar-sla`: A cada 1 minuto
- `mover-tarefas-pendentes`: Diariamente às 06:00

#### Webhooks
- `whatsapp-webhook`: Recebe mensagens WhatsApp
- `webhook-entrada`: Recebe webhooks genéricos
- `processar-resposta-pesquisa`: Processa respostas de pesquisas

#### Processamento
- `rotear-chat-automatico`: Roteamento inteligente
- `realocar-chats-atendente`: Realoca chats ao sair
- `transferir-chat`: Transferência manual
- `analisar-sentimento`: Análise de sentimento IA
- `verificar-alertas-sentimento`: Gera alertas

### Políticas de Segurança (RLS)
Todas as tabelas implementam RLS com isolamento por `estabelecimento_id`:
- Usuários veem apenas dados de seu estabelecimento
- Administradores têm acesso total
- Sistema pode inserir sem autenticação (webhooks)

---

## 📊 Dashboards Principais

### 1. Dashboard do Atendente
**Rota**: `/dashboard-atendente`
- Chats ativos e em espera
- Status e métricas pessoais
- Notificações em tempo real

### 2. Dashboard do Supervisor
**Rota**: `/dashboard-supervisor`
- Visão geral da equipe
- Alertas e violações
- Intervenção em chats

### 3. Dashboard SLA
**Rota**: `/sla-dashboard`
- Cumprimento de SLA
- Violações por período
- Análise por fila

### 4. Dashboard Analytics
**Rota**: `/advanced-analytics`
- Todas as métricas
- Relatórios customizados
- Exportação de dados

### 5. Dashboard Pesquisas
**Rota**: `/pesquisas-satisfacao`
- CSAT/NPS/CES scores
- Comentários
- Tendências

---

## 🚀 Primeiros Passos Recomendados

### 1. Configuração Inicial (1 dia)
- [ ] Configure estabelecimento
- [ ] Crie usuários e atendentes
- [ ] Configure filas de atendimento
- [ ] Defina skills necessárias

### 2. SLA e Qualidade (1 dia)
- [ ] Configure SLAs por fila
- [ ] Crie formulário de QA
- [ ] Defina metas de qualidade
- [ ] Ative monitoramento

### 3. Base de Conhecimento (2-3 dias)
- [ ] Crie categorias
- [ ] Escreva primeiros artigos (top 20 dúvidas)
- [ ] Publique no portal
- [ ] Treine equipe para usar

### 4. Pesquisas de Satisfação (1 dia)
- [ ] Configure pesquisa NPS
- [ ] Configure pesquisa CSAT
- [ ] Ative disparo automático
- [ ] Teste recebimento

### 5. Sentiment Analysis (Automático)
- [ ] Ative monitoramento
- [ ] Configure thresholds
- [ ] Defina ações de alerta

### 6. Workflows Omnichannel (2-3 dias)
- [ ] Crie workflow padrão
- [ ] Configure roteamento por skill
- [ ] Teste transições de canal
- [ ] Ajuste regras

---

## 📞 Suporte e Manutenção

### Logs e Debugging
- **Supabase Logs**: Cloud → Database → Logs
- **Edge Function Logs**: Cloud → Edge Functions → [nome-function] → Logs
- **Frontend Console**: F12 → Console

### Backup e Restauração
- **Database**: Cloud → Database → Backup (automático diário)
- **Flows**: Exportar JSON via interface
- **Configurações**: Documentar em arquivo

### Monitoramento Recomendado
- **Uptime**: Edge functions e database
- **Performance**: Tempos de resposta
- **Erros**: Taxa de erro por função
- **Custos**: Uso de Cloud e IA

---

## 📚 Documentação Técnica Completa

Arquivos de referência:
- `SISTEMA-SLA.md`
- `SISTEMA-ANALYTICS.md`
- `SISTEMA-CSAT-NPS.md`
- `SISTEMA-KNOWLEDGE-BASE.md`
- `SISTEMA-QUALITY-ASSURANCE.md`
- `SISTEMA-SENTIMENT-ANALYSIS.md`
- `SISTEMA-SELF-SERVICE-PORTAL.md`
- `SISTEMA-OMNICHANNEL-CONTINUITY.md`
- `OMNICHANNEL-SISTEMA-COMPLETO.md`

---

**Versão**: 1.0  
**Data**: Novembro 2024  
**Status**: Sistema 100% Implementado

Para dúvidas ou suporte, consulte a documentação técnica ou entre em contato com o time de desenvolvimento.