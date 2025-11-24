# Sistema de Quality Assurance (QA)

## Visão Geral
Sistema completo de avaliação de qualidade de atendimentos com formulários customizáveis, critérios configuráveis e metas por atendente.

## Arquitetura do Sistema

### Tabelas do Banco de Dados

#### 1. `qa_formularios`
Armazena os formulários de avaliação configuráveis.

**Campos:**
- `id`: UUID do formulário
- `estabelecimento_id`: Estabelecimento proprietário
- `nome`: Nome do formulário
- `descricao`: Descrição opcional
- `ativo`: Se o formulário está ativo
- `created_at`, `updated_at`: Timestamps

#### 2. `qa_criterios`
Define os critérios de avaliação de cada formulário.

**Campos:**
- `id`: UUID do critério
- `formulario_id`: Formulário ao qual pertence
- `nome`: Nome do critério
- `descricao`: Descrição opcional
- `peso`: Peso do critério (1-10)
- `tipo`: Tipo de resposta (`boolean`, `escala`, `texto`)
- `opcoes`: Configurações do tipo (ex: min/max para escala)
- `obrigatorio`: Se o critério é obrigatório
- `ordem`: Ordem de exibição
- `created_at`: Timestamp

**Tipos de Critério:**
- **boolean**: Resposta sim/não (1 ou 0 pontos)
- **escala**: Escala numérica (ex: 1-5, 1-10)
- **texto**: Texto livre (sem pontuação)

**Exemplo de `opcoes` para escala:**
```json
{
  "min": 1,
  "max": 5,
  "labels": {
    "1": "Péssimo",
    "5": "Excelente"
  }
}
```

#### 3. `qa_avaliacoes`
Armazena as avaliações realizadas.

**Campos:**
- `id`: UUID da avaliação
- `estabelecimento_id`: Estabelecimento
- `formulario_id`: Formulário utilizado
- `chat_id`: Chat avaliado
- `atendente_id`: Atendente avaliado
- `avaliador_id`: Usuário que fez a avaliação
- `pontuacao_total`: Pontos obtidos
- `pontuacao_maxima`: Pontos máximos possíveis
- `percentual`: Percentual de acerto (0-100)
- `observacoes`: Observações gerais
- `status`: Status da avaliação (`em_andamento`, `concluida`, `revisao`)
- `data_avaliacao`: Data/hora da avaliação
- `created_at`, `updated_at`: Timestamps

#### 4. `qa_respostas`
Armazena as respostas individuais de cada critério.

**Campos:**
- `id`: UUID da resposta
- `avaliacao_id`: Avaliação à qual pertence
- `criterio_id`: Critério respondido
- `valor`: Valor da resposta (JSONB flexível)
- `pontuacao`: Pontos obtidos neste critério
- `comentario`: Comentário opcional
- `created_at`: Timestamp

**Formato do campo `valor`:**
- Boolean: `{"value": true}` ou `{"value": false}`
- Escala: `{"value": 4}`
- Texto: `{"value": "texto livre"}`

#### 5. `qa_metas_atendente`
Define metas de qualidade por atendente.

**Campos:**
- `id`: UUID da meta
- `estabelecimento_id`: Estabelecimento
- `atendente_id`: Atendente
- `meta_percentual`: Meta de percentual (ex: 80.00%)
- `avaliacoes_minimas_mes`: Quantidade mínima de avaliações/mês
- `periodo_inicio`: Data de início da meta
- `periodo_fim`: Data de fim (null = sem fim)
- `ativo`: Se a meta está ativa
- `created_at`, `updated_at`: Timestamps

---

## Funcionalidades Principais

### 1. Gerenciamento de Formulários

**Criar Formulário:**
- Nome e descrição
- Definir critérios com:
  - Tipo (boolean, escala, texto)
  - Peso (importância)
  - Obrigatoriedade
  - Configurações específicas do tipo

**Exemplo de Formulário:**
```
Formulário: "Avaliação Padrão de Atendimento"

Critérios:
1. Saudação adequada (Boolean, Peso: 1)
2. Clareza na comunicação (Escala 1-5, Peso: 2)
3. Resolveu o problema (Boolean, Peso: 3)
4. Tempo de resposta adequado (Boolean, Peso: 2)
5. Cortesia e profissionalismo (Escala 1-5, Peso: 2)
6. Observações gerais (Texto, Peso: 0)
```

### 2. Realização de Avaliações

**Processo:**
1. Supervisor seleciona um chat encerrado
2. Escolhe o formulário de avaliação
3. Responde cada critério
4. Sistema calcula pontuação automaticamente
5. Adiciona observações gerais
6. Finaliza ou salva como rascunho

**Cálculo de Pontuação:**
- Cada critério contribui com: `(valor / valor_máximo) * peso`
- Pontuação total = soma de todos os critérios
- Percentual = (pontuação_total / pontuação_maxima) * 100

**Exemplo:**
```
Critério 1 (Boolean, Peso 1): SIM (1/1) * 1 = 1 ponto
Critério 2 (Escala 1-5, Peso 2): 4 (4/5) * 2 = 1.6 pontos
Critério 3 (Boolean, Peso 3): SIM (1/1) * 3 = 3 pontos
Critério 4 (Boolean, Peso 2): NÃO (0/1) * 2 = 0 pontos
Critério 5 (Escala 1-5, Peso 2): 5 (5/5) * 2 = 2 pontos

Pontuação Total: 7.6 pontos
Pontuação Máxima: 10 pontos
Percentual: 76%
```

### 3. Metas e Acompanhamento

**Definir Metas:**
- Meta de percentual de qualidade (ex: 80%)
- Quantidade mínima de avaliações/mês
- Período de vigência

**Acompanhamento:**
- Dashboard com métricas por atendente
- Comparativo com metas estabelecidas
- Evolução temporal
- Identificação de pontos de melhoria

### 4. Métricas e Relatórios

**Métricas Disponíveis:**
- **Por Atendente:**
  - Média de qualidade (%)
  - Quantidade de avaliações
  - Percentual atingido da meta
  - Evolução mensal
  - Pontos fortes e fracos

- **Por Equipe:**
  - Média geral de qualidade
  - Distribuição de pontuações
  - Critérios com melhor/pior desempenho
  - Tendências

- **Por Critério:**
  - Média por critério específico
  - Critérios mais críticos
  - Análise de conformidade

---

## Componentes React

### 1. `QualityAssuranceCRUD` (Principal)
Gerencia formulários, critérios e avaliações.

**Funcionalidades:**
- CRUD de formulários
- Configuração de critérios
- Realização de avaliações
- Visualização de histórico

### 2. `QADashboard`
Dashboard com métricas e gráficos.

**Visualizações:**
- Cards com KPIs principais
- Gráficos de evolução
- Ranking de atendentes
- Análise por critério

---

## Fluxo de Trabalho

### 1. Configuração Inicial
```
1. Supervisor acessa "Quality Assurance"
2. Cria novo formulário
3. Define critérios de avaliação
4. Ativa o formulário
5. Define metas para atendentes
```

### 2. Avaliação de Atendimento
```
1. Supervisor identifica chat para avaliar
2. Abre formulário de avaliação
3. Preenche critérios observando o histórico do chat
4. Adiciona comentários específicos em cada critério
5. Adiciona observações gerais
6. Finaliza avaliação
7. Sistema calcula pontuação e notifica atendente
```

### 3. Acompanhamento
```
1. Atendente visualiza suas avaliações
2. Identifica pontos de melhoria
3. Supervisor monitora evolução
4. Realiza coaching baseado nos resultados
5. Ajusta metas conforme necessário
```

---

## Políticas de RLS

### Permissões:
- **Visualização:** Todos os usuários autenticados do estabelecimento
- **Criação/Edição:** Apenas supervisores (`gestor`) e admins (`admin`)
- **Exclusão:** Apenas supervisores e admins

### Segurança:
- Formulários isolados por `estabelecimento_id`
- Avaliações vinculadas ao estabelecimento
- Atendentes só visualizam suas próprias avaliações
- Supervisores visualizam todas as avaliações do estabelecimento

---

## Boas Práticas

### 1. Criação de Formulários
- **Não exagere nos critérios:** 5-10 critérios é o ideal
- **Use pesos apropriados:** Critérios mais importantes devem ter peso maior
- **Seja objetivo:** Critérios claros e mensuráveis
- **Exemplifique:** Adicione descrições explicando cada critério

### 2. Realização de Avaliações
- **Seja consistente:** Use os mesmos critérios para todos
- **Seja justo:** Base-se em fatos, não em impressões
- **Seja construtivo:** Comentários devem ajudar a melhorar
- **Seja regular:** Avalie com frequência para identificar padrões

### 3. Definição de Metas
- **Metas realistas:** Comece com 70-75% e ajuste conforme necessário
- **Quantidade mínima:** Pelo menos 5-10 avaliações/mês por atendente
- **Revisão periódica:** Ajuste metas trimestralmente
- **Calibração:** Realize avaliações em conjunto para alinhar critérios

### 4. Uso dos Resultados
- **Feedback individual:** Compartilhe resultados em reuniões 1:1
- **Planos de ação:** Defina melhorias específicas baseadas nas avaliações
- **Reconhecimento:** Celebre atendentes com alta qualidade
- **Treinamento:** Use resultados para identificar necessidades de capacitação

---

## Integrações

### Com outros módulos do sistema:
- **Conversations:** Avaliações vinculadas a chats específicos
- **Atendentes:** Métricas vinculadas ao perfil do atendente
- **Notificações:** Alertas quando avaliação é concluída
- **Dashboard Supervisor:** Métricas agregadas de QA

---

## Benchmarks da Indústria

### Scores de Qualidade:
- **Excelente:** 90-100%
- **Bom:** 80-89%
- **Regular:** 70-79%
- **Precisa melhorar:** Abaixo de 70%

### Frequência de Avaliações:
- **Ideal:** 10-15% dos atendimentos avaliados
- **Mínimo:** 5-10 avaliações/atendente/mês

---

## Melhorias Futuras

1. **Calibração automática:** IA para sugerir ajustes em critérios
2. **Análise de sentimento:** Correlação entre QA e CSAT
3. **Gravação de tela:** Replay do atendimento durante avaliação
4. **Gamificação:** Badges e conquistas por qualidade
5. **Auto-avaliação:** Atendentes avaliam próprio desempenho
6. **Peer review:** Avaliação entre pares
7. **Alertas proativos:** Notificar supervisor sobre padrões negativos
8. **Exportação:** Relatórios em PDF/Excel
9. **Comparativo:** Benchmark com outros estabelecimentos (anônimo)
10. **Integração LMS:** Recomendar cursos baseados em gaps de qualidade
