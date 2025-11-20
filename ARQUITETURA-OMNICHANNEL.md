# Arquitetura do Sistema de Atendimento Omnichannel

## Visão Geral

Sistema completo de atendimento omnichannel com suporte a WhatsApp, Webchat e Instagram, incluindo roteamento inteligente, gestão de filas, skills e métricas em tempo real.

## 📊 Estrutura do Banco de Dados

### Tabelas Principais

#### 1. **atendentes**
Gerencia os atendentes do sistema
- `id`: UUID (PK)
- `usuario_id`: UUID (FK → usuarios)
- `estabelecimento_id`: UUID (FK → estabelecimentos)
- `status`: ENUM (disponivel, ocupado, ausente, offline, pausa)
- `max_chats_simultaneos`: INTEGER (padrão: 3)
- `aceita_novos_chats`: BOOLEAN
- `tempo_pausa_inicio`: TIMESTAMP
- `motivo_pausa`: TEXT
- Timestamps: created_at, updated_at

#### 2. **filas_atendimento**
Configuração das filas de atendimento
- `id`: UUID (PK)
- `estabelecimento_id`: UUID (FK → estabelecimentos)
- `nome`: TEXT
- `descricao`: TEXT
- `tipo_roteamento`: ENUM (round_robin, por_skill, por_disponibilidade, por_prioridade, por_carteira)
- `max_chats_por_atendente`: INTEGER (padrão: 5)
- `prioridade`: INTEGER
- `ativa`: BOOLEAN
- `horario_funcionamento`: JSONB
- `tempo_resposta_esperado`: INTEGER (segundos)
- `mensagem_fila`: TEXT
- Timestamps: created_at, updated_at

#### 3. **skills**
Habilidades dos atendentes para roteamento avançado
- `id`: UUID (PK)
- `estabelecimento_id`: UUID (FK → estabelecimentos)
- `nome`: TEXT
- `descricao`: TEXT
- `cor`: TEXT
- Timestamp: created_at

#### 4. **atendente_skills**
Relacionamento atendente-skill (N:N)
- `id`: UUID (PK)
- `atendente_id`: UUID (FK → atendentes)
- `skill_id`: UUID (FK → skills)
- `nivel`: INTEGER (1-5)
- Timestamp: created_at
- Constraint: UNIQUE(atendente_id, skill_id)

#### 5. **fila_skills**
Skills requeridas por fila (N:N)
- `id`: UUID (PK)
- `fila_id`: UUID (FK → filas_atendimento)
- `skill_id`: UUID (FK → skills)
- `nivel_minimo`: INTEGER
- Timestamp: created_at
- Constraint: UNIQUE(fila_id, skill_id)

#### 6. **atendente_filas**
Atendentes vinculados a filas (N:N)
- `id`: UUID (PK)
- `atendente_id`: UUID (FK → atendentes)
- `fila_id`: UUID (FK → filas_atendimento)
- `prioridade`: INTEGER
- Timestamp: created_at

#### 7. **atendente_carteiras**
Carteiras fixas de clientes por atendente
- `id`: UUID (PK)
- `atendente_id`: UUID (FK → atendentes)
- `customer_id`: UUID (FK → customers)
- `estabelecimento_id`: UUID (FK → estabelecimentos)
- `ativa`: BOOLEAN
- Timestamps: created_at, updated_at

#### 8. **conversations** (Modificada)
Chats/conversas - tabela existente expandida
- Novos campos adicionados:
  - `chat_status`: ENUM (novo, em_fila, em_atendimento, transferido, aguardando_cliente, encerrado, reaberto)
  - `fila_id`: UUID (FK → filas_atendimento)
  - `atendente_atual_id`: UUID (FK → atendentes)
  - `prioridade`: ENUM (baixa, normal, alta, urgente)
  - `tempo_espera_inicio`: TIMESTAMP
  - `tempo_atendimento_inicio`: TIMESTAMP
  - `tempo_encerramento`: TIMESTAMP
  - `avaliacao`: INTEGER (1-5)
  - `comentario_avaliacao`: TEXT
  - `motivo_encerramento`: TEXT
  - `reaberto_automaticamente`: BOOLEAN
  - `numero_reaberturas`: INTEGER
  - `origem_abertura`: TEXT

#### 9. **chat_transferencias**
Histórico de transferências entre filas/atendentes
- `id`: UUID (PK)
- `chat_id`: UUID (FK → conversations)
- `atendente_origem_id`: UUID (FK → atendentes)
- `atendente_destino_id`: UUID (FK → atendentes)
- `fila_origem_id`: UUID (FK → filas_atendimento)
- `fila_destino_id`: UUID (FK → filas_atendimento)
- `tipo`: TEXT (fila, atendente, supervisor_forcada)
- `motivo`: TEXT
- `realizada_por`: UUID (FK → usuarios)
- Timestamp: created_at

#### 10. **chat_tags**
Tags para categorizar chats
- `id`: UUID (PK)
- `estabelecimento_id`: UUID (FK → estabelecimentos)
- `nome`: TEXT
- `cor`: TEXT
- `categoria`: TEXT
- Timestamp: created_at

#### 11. **chat_tags_aplicadas**
Tags aplicadas aos chats (N:N)
- `id`: UUID (PK)
- `chat_id`: UUID (FK → conversations)
- `tag_id`: UUID (FK → chat_tags)
- `aplicada_por`: UUID (FK → usuarios)
- Timestamp: created_at
- Constraint: UNIQUE(chat_id, tag_id)

#### 12. **metricas_atendente**
Métricas diárias por atendente
- `id`: UUID (PK)
- `atendente_id`: UUID (FK → atendentes)
- `data`: DATE
- `total_chats`: INTEGER
- `chats_encerrados`: INTEGER
- `chats_transferidos`: INTEGER
- `tempo_online`: INTEGER (segundos)
- `tempo_pausa`: INTEGER (segundos)
- `tempo_medio_atendimento`: INTEGER (segundos)
- `tempo_medio_primeira_resposta`: INTEGER (segundos)
- `avaliacao_media`: DECIMAL(3,2)
- Timestamp: created_at
- Constraint: UNIQUE(atendente_id, data)

## 🔐 Segurança (RLS)

Todas as tabelas têm Row Level Security (RLS) habilitado com políticas baseadas em:
- `estabelecimento_id` para isolamento de dados entre estabelecimentos
- Roles (`admin`, `gestor`) para permissões administrativas
- `auth.uid()` para verificação de usuário autenticado

## 📁 Estrutura de Código

### Types (`src/types/atendimento.ts`)
Interfaces TypeScript para todos os tipos do sistema:
- `Atendente`, `FilaAtendimento`, `Skill`, `Chat`, etc.
- Enums: `AtendenteStatus`, `ChatStatus`, `ChatPrioridade`, `TipoRoteamento`
- Interfaces compostas para dashboards

### Hooks (`src/hooks/useAtendimento.ts`)
Hooks React customizados para gerenciamento de estado:
- `useDashboardAtendente(atendenteId)`: Dashboard do atendente
- `useDashboardSupervisor(estabelecimentoId)`: Dashboard do supervisor
- Realtime via Supabase subscriptions

### Componentes

#### Dashboard do Atendente (`src/components/atendimento/DashboardAtendente.tsx`)
- Status atual e métricas do dia
- Chats ativos e em espera
- Skills e níveis de proficiência
- Indicador de capacidade

#### Dashboard do Supervisor (`src/components/atendimento/DashboardSupervisor.tsx`)
- Métricas gerais em tempo real
- Visualização de todas as filas
- Status de todos os atendentes
- Ações de supervisão (forçar transferência, encerrar chat)

#### Gerenciamento de Filas (`src/components/atendimento/FilasManager.tsx`)
- CRUD de filas
- Configuração de tipo de roteamento
- Ativação/desativação de filas
- Visualização de atendentes por fila

#### Gerenciamento de Skills (`src/components/atendimento/SkillsManager.tsx`)
- CRUD de habilidades
- Associação com cores e categorias
- Configuração de níveis

#### Visualização de Métricas (`src/components/atendimento/MetricasView.tsx`)
- Métricas por período (hoje, semana, mês)
- Status em tempo real
- Gráficos de desempenho (placeholder)
- KPIs principais

## 🔄 Fluxo de Atendimento

### 1. Chegada de Novo Chat
```
Cliente envia mensagem → Chat criado (status: "novo")
  ↓
Sistema verifica carteira fixa
  ↓
  SIM → Atribui ao atendente da carteira
  NÃO  → Envia para fila apropriada (status: "em_fila")
```

### 2. Roteamento Automático
```
Chat em fila → Sistema aplica tipo_roteamento da fila:

Round Robin:
  → Próximo atendente disponível na ordem

Por Skill:
  → Atendente com skill necessária e maior nível

Por Disponibilidade:
  → Atendente com menos chats ativos

Por Prioridade:
  → Atendente com maior prioridade na fila

Por Carteira:
  → Sempre o atendente fixo do cliente
```

### 3. Atendimento
```
Chat atribuído → status: "em_atendimento"
  ↓
Atendente responde
  ↓
Cliente responde → status: "aguardando_cliente"
  ↓
Ciclo continua até resolução
```

### 4. Transferência
```
Atendente inicia transferência
  ↓
Registro em chat_transferencias
  ↓
Chat vai para nova fila/atendente (status: "transferido")
  ↓
Roteamento novamente aplicado
```

### 5. Encerramento
```
Atendente encerra → status: "encerrado"
  ↓
Solicita avaliação
  ↓
Registra métricas em metricas_atendente
```

### 6. Reabertura
```
Cliente envia nova mensagem em chat encerrado
  ↓
status: "reaberto"
  ↓
numero_reaberturas++
  ↓
reaberto_automaticamente: true
  ↓
Segue fluxo de roteamento novamente
```

## 📊 Índices de Performance

Índices criados para otimizar queries:
- `idx_skills_estabelecimento`
- `idx_atendente_skills_*`
- `idx_fila_skills_*`
- `idx_chat_transferencias_*`
- `idx_chat_tags_*`
- `idx_metricas_atendente_*`

## 🚀 Próximos Passos (Implementação)

### Fase 1: Roteamento Básico
1. [ ] Implementar lógica de roteamento round-robin
2. [ ] Sistema de distribuição de chats para atendentes
3. [ ] Respeitar max_chats_simultaneos

### Fase 2: Roteamento Avançado
1. [ ] Implementar roteamento por skill
2. [ ] Implementar carteiras fixas
3. [ ] Sistema de prioridades

### Fase 3: Gestão de Status
1. [ ] Controle de status do atendente
2. [ ] Sistema de pausas com motivos
3. [ ] Timeout automático para chats inativos

### Fase 4: Transferências
1. [ ] Interface para transferência entre atendentes
2. [ ] Interface para transferência entre filas
3. [ ] Supervisor força transferência

### Fase 5: Métricas e Relatórios
1. [ ] Cálculo automático de métricas diárias
2. [ ] Gráficos de desempenho
3. [ ] Exportação de relatórios

### Fase 6: Funcionalidades Avançadas
1. [ ] Reabertura automática de chats
2. [ ] Sistema de tags contextuais
3. [ ] Análise de sentimento
4. [ ] Bot handoff inteligente

## 📝 Notas de Implementação

- Todos os componentes são **estruturas básicas** (skeleton) sem lógica completa
- Hooks incluem estrutura básica de queries e realtime
- RLS policies estão configuradas para segurança
- Índices otimizam performance das queries mais comuns
- Sistema preparado para escalar com múltiplos canais

## 🔧 Tecnologias Utilizadas

- **Frontend**: React + TypeScript
- **Backend**: Supabase (PostgreSQL + Realtime)
- **UI**: shadcn/ui + Tailwind CSS
- **State**: React Hooks + Supabase Queries
- **Real-time**: Supabase Subscriptions

---

**Versão**: 1.0.0  
**Última Atualização**: 2024  
**Status**: Estrutura Inicial Completa
