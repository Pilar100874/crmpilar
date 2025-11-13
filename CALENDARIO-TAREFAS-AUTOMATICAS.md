# Sistema Automático de Movimentação de Tarefas do Calendário

## Visão Geral

O sistema possui uma rotina automática que executa diariamente às **00:00** (meia-noite) para mover todas as tarefas pendentes (não realizadas) para o próximo dia útil, respeitando as regras configuradas do calendário.

## Como Funciona

### 1. Execução Diária
- **Horário**: 00:00 (meia-noite)
- **Frequência**: Todos os dias
- **Tecnologia**: Cron job do PostgreSQL (pg_cron)

### 2. Processo de Movimentação

A rotina executa os seguintes passos:

1. **Identificação**: Busca todas as tarefas com status "pending" e data anterior ao dia atual
2. **Processamento por Usuário**: Para cada tarefa:
   - Busca as configurações do usuário (horário de trabalho)
   - Busca as regras do calendário do estabelecimento
3. **Cálculo da Nova Data**: Define o dia seguinte como nova data base
4. **Aplicação de Regras**:
   - **Bloqueio Finais de Semana**: Se ativa, move para próximo dia útil
   - **Horário Comercial**: Se ativa, ajusta horário para dentro do expediente
5. **Atualização**: Salva a tarefa com nova data/horário

### 3. Regras Aplicadas

#### Bloqueio Finais de Semana (bloqueio_finais_semana)
Quando ativa:
- Se o novo dia cair em sábado ou domingo
- Move automaticamente para a próxima segunda-feira
- Ou próximo dia útil disponível

**Exemplo:**
```
Tarefa original: Sexta-feira 15/11/2024 (não realizada)
Nova data calculada: Sábado 16/11/2024
Regra aplicada: Move para Segunda-feira 18/11/2024
```

#### Horário Comercial (horario_comercial)
Quando ativa:
- Verifica se o horário da tarefa está dentro do expediente do usuário
- Se antes do início: ajusta para `hora_inicial`
- Se depois do fim: move para `hora_inicial` do próximo dia útil

**Exemplo 1 (antes do expediente):**
```
Horário da tarefa: 06:00
Expediente do usuário: 08:00 - 18:00
Novo horário: 08:00 (mesmo dia)
```

**Exemplo 2 (depois do expediente):**
```
Horário da tarefa: 19:00
Expediente do usuário: 08:00 - 18:00
Nova data/horário: Próximo dia útil às 08:00
```

### 4. Tarefas de Dia Todo (is_all_day)

Tarefas marcadas como "dia todo":
- **Não sofrem ajuste de horário** pela regra de Horário Comercial
- São movidas apenas para o próximo dia útil (respeitando fins de semana)

### 5. Logs e Monitoramento

A rotina gera logs detalhados:
- Número total de tarefas processadas
- Tarefas movidas com sucesso
- Erros encontrados
- Timestamp de execução

**Exemplo de log:**
```json
{
  "message": "Rotina de movimentação de tarefas concluída",
  "tarefasProcessadas": 15,
  "tarefasMovidas": 15,
  "erros": 0,
  "timestamp": "2024-11-14T00:00:03.125Z"
}
```

## Banco de Dados

### Tabela: calendario_tarefas

As tarefas são armazenadas na tabela `calendario_tarefas`:

```sql
CREATE TABLE calendario_tarefas (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  estabelecimento_id UUID NOT NULL,
  contact_id UUID,
  contact_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time TIME,
  type TEXT NOT NULL, -- 'accompany', 'call', 'meeting', 'other'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed'
  is_all_day BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

## Edge Function

### Endpoint: mover-tarefas-pendentes

Localização: `supabase/functions/mover-tarefas-pendentes/index.ts`

#### Execução Manual (Teste)

Você pode testar a função manualmente:

```bash
curl -X POST \
  'https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/mover-tarefas-pendentes' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"test": true}'
```

## Gerenciamento do Cron Job

### Ver Cron Jobs Ativos

```sql
SELECT * FROM cron.job;
```

### Desativar a Rotina

```sql
SELECT cron.unschedule('mover-tarefas-pendentes-diario');
```

### Reativar a Rotina

```sql
SELECT cron.schedule(
  'mover-tarefas-pendentes-diario',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url:='https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/mover-tarefas-pendentes',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body:='{"scheduled": true}'::jsonb
  ) as request_id;
  $$
);
```

### Ver Histórico de Execuções

```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'mover-tarefas-pendentes-diario')
ORDER BY start_time DESC 
LIMIT 10;
```

## Segurança

### Row Level Security (RLS)

A tabela `calendario_tarefas` possui políticas RLS que garantem:
- Usuários só veem suas próprias tarefas
- Usuários só podem criar/editar/deletar suas próprias tarefas
- Administradores podem ver todas as tarefas
- Usuários do mesmo estabelecimento podem ver tarefas uns dos outros (para gestores)

### Service Role

A edge function usa `SUPABASE_SERVICE_ROLE_KEY` para:
- Acessar tarefas de todos os usuários
- Executar atualizações em massa
- Bypassa RLS para operações administrativas

## Boas Práticas

### Para Desenvolvedores

1. **Sempre use o campo `is_all_day`** corretamente ao criar tarefas
2. **Configure o horário de trabalho** do usuário na tabela `usuarios`
3. **Ative/desative regras** conforme necessário no estabelecimento
4. **Monitore logs** da edge function para detectar problemas

### Para Administradores

1. **Revise logs diariamente** para garantir execução bem-sucedida
2. **Configure regras** adequadas para cada estabelecimento
3. **Teste a função manualmente** antes de ativar em produção
4. **Defina horários comerciais** realistas para os usuários

## Troubleshooting

### Tarefa não foi movida

Verifique:
1. Status da tarefa está como "pending"?
2. Data da tarefa é anterior a hoje?
3. Regras do calendário estão configuradas?
4. Cron job está ativo?

### Horário não foi ajustado

Verifique:
1. Regra "Horário Comercial" está ativa?
2. Tarefa não é "dia todo"?
3. Usuário tem `hora_inicial` e `hora_final` configurados?

### Erros no Log

Consulte:
```sql
-- Ver logs da edge function
SELECT * FROM edge_logs 
WHERE function_name = 'mover-tarefas-pendentes'
ORDER BY timestamp DESC 
LIMIT 50;
```

## Futuras Melhorias

Possíveis adições ao sistema:
- Notificar usuários por email quando tarefas são movidas
- Permitir configurar horário de execução da rotina
- Adicionar limite de quantas vezes uma tarefa pode ser movida
- Dashboard de estatísticas de tarefas movidas
- Regras personalizadas por usuário (além das do estabelecimento)
