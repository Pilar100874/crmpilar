# Guia de Integração - Rotinas Automáticas com Calendário

## Como usar a flag `isAutomatic` ao criar tarefas automaticamente

Quando você criar rotinas automáticas na tela de atendimento ou em qualquer outro lugar que crie tarefas de forma programática (não manual pelo usuário), você DEVE passar a flag `isAutomatic: true` para que as regras de calendário funcionem corretamente.

## Comportamento das Regras do Calendário

### 1. Regra "Bloqueio Finais de Semana"

Quando esta regra está **ATIVA**:

#### Inserção Manual (pelo calendário)
- `isAutomatic` não é passado ou é `false`
- Sistema **pergunta** ao usuário se realmente quer agendar para fim de semana
- Usuário pode confirmar ou cancelar

#### Inserção Automática (por rotinas)
- `isAutomatic: true` é passado
- Sistema **realoca automaticamente** para o próximo dia útil
- Usuário é notificado da realocação

### 2. Regra "Horário Comercial"

Quando esta regra está **ATIVA**:

#### Inserção Manual (pelo calendário)
- `isAutomatic` não é passado ou é `false`
- Sistema **valida** o horário contra o horário de trabalho do usuário
- Se fora do horário comercial, **pergunta** se realmente deseja marcar
- Sistema sugere um horário dentro do expediente
- Usuário pode escolher entre:
  - Manter horário original
  - Usar horário sugerido
  - Cancelar

#### Inserção Automática (por rotinas)
- `isAutomatic: true` é passado
- Sistema **ajusta automaticamente** para dentro do horário comercial:
  - Se antes do início: ajusta para hora_inicial
  - Se depois do fim: agenda para hora_inicial do próximo dia útil
- Usuário é notificado do ajuste

## Exemplo de Uso Correto

```typescript
// ❌ ERRADO - Rotina automática SEM a flag
const criarTarefaAutomatica = async () => {
  await handleSaveTask({
    contactId: "123",
    contactName: "Cliente Teste",
    date: new Date("2024-11-16"), // Sábado
    time: "09:00",
    type: "call",
    observation: "Ligação automática agendada",
    // Faltando: isAutomatic: true
  });
  // Problema: Se cair em fim de semana, vai PERGUNTAR ao usuário (comportamento errado para rotina automática)
};

// ✅ CORRETO - Rotina automática COM a flag
const criarTarefaAutomaticaCorreta = async () => {
  await handleSaveTask({
    contactId: "123",
    contactName: "Cliente Teste",
    date: new Date("2024-11-16"), // Sábado
    time: "09:00",
    type: "call",
    observation: "Ligação automática agendada",
    isAutomatic: true, // ✓ Flag que indica inserção automática
  });
  // Correto: Se cair em fim de semana, vai REALOCAR automaticamente para próxima segunda-feira
};

// ✅ CORRETO - Rotina automática com horário fora do expediente
const criarTarefaForaHorario = async () => {
  await handleSaveTask({
    contactId: "123",
    contactName: "Cliente Teste",
    date: new Date("2024-11-18"), // Segunda-feira
    time: "20:00", // Fora do horário comercial (supondo 08:00-18:00)
    type: "call",
    observation: "Ligação automática agendada",
    isAutomatic: true, // ✓ Flag que indica inserção automática
  });
  // Correto: Horário será ajustado automaticamente para 08:00 da terça-feira
};
```

## Casos de Uso

### Quando usar `isAutomatic: true`:
- ✅ Rotinas de follow-up automático
- ✅ Agendamentos em massa por importação
- ✅ Tarefas criadas por webhooks
- ✅ Tarefas criadas por bots de atendimento
- ✅ Tarefas recorrentes geradas automaticamente

### Quando NÃO usar (deixar false ou undefined):
- ❌ Usuário criando tarefa manualmente no calendário
- ❌ Usuário editando uma tarefa existente
- ❌ Usuário arrastando tarefa para outro dia

## Lógica de Realocação

### Fim de Semana
Quando `isAutomatic: true` e a data cai em fim de semana:

```typescript
// A função getNextBusinessDay() é chamada automaticamente
// Ela avança dias até encontrar um dia útil (Seg-Sex)

Exemplo:
- Data original: Sábado 16/11/2024
- Data realocada: Segunda 18/11/2024

- Data original: Domingo 17/11/2024
- Data realocada: Segunda 18/11/2024
```

### Horário Comercial
Quando `isAutomatic: true` e o horário está fora do expediente:

```typescript
// Horário de trabalho do usuário: 08:00 - 18:00

Exemplo 1 (antes do expediente):
- Horário original: 06:00
- Horário ajustado: 08:00 (mesmo dia)

Exemplo 2 (depois do expediente):
- Data/Horário original: Segunda 16/11/2024 às 20:00
- Data/Horário ajustado: Terça 17/11/2024 às 08:00

Exemplo 3 (sexta depois do expediente):
- Data/Horário original: Sexta 15/11/2024 às 19:00
- Data/Horário ajustado: Segunda 18/11/2024 às 08:00
```

## Notificações

O sistema sempre notifica o usuário quando há realocação:

```
// Fim de semana
"Data realocada de 16/11/2024 para 18/11/2024 (próximo dia útil)"

// Horário comercial
"Horário ajustado de 06:00 para 08:00 (início do expediente)"
"Horário 20:00 está fora do expediente. Reagendado para 18/11/2024 às 08:00"
```

## Importante

⚠️ **SEMPRE** use `isAutomatic: true` em rotinas automáticas para garantir que:
1. O sistema não interrompa o fluxo automático pedindo confirmação
2. As tarefas sejam realocadas/ajustadas automaticamente
3. A experiência do usuário seja fluida e sem interrupções
4. As regras de horário comercial e fim de semana sejam respeitadas

