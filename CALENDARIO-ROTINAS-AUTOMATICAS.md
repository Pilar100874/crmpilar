# Guia de Integração - Rotinas Automáticas com Calendário

## Como usar a flag `isAutomatic` ao criar tarefas automaticamente

Quando você criar rotinas automáticas na tela de atendimento ou em qualquer outro lugar que crie tarefas de forma programática (não manual pelo usuário), você DEVE passar a flag `isAutomatic: true` para que a regra de "Bloqueio Finais de Semana" funcione corretamente.

## Comportamento da Regra "Bloqueio Finais de Semana"

Quando esta regra está **ATIVA**:

### 1. Inserção Manual (pelo calendário)
- `isAutomatic` não é passado ou é `false`
- Sistema **pergunta** ao usuário se realmente quer agendar para fim de semana
- Usuário pode confirmar ou cancelar

### 2. Inserção Automática (por rotinas)
- `isAutomatic: true` é passado
- Sistema **realoca automaticamente** para o próximo dia útil
- Usuário é notificado da realocação

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

## Notificações

O sistema sempre notifica o usuário quando há realocação:

```
"Data realocada de 16/11/2024 para 18/11/2024 (próximo dia útil)"
```

## Importante

⚠️ **SEMPRE** use `isAutomatic: true` em rotinas automáticas para garantir que:
1. O sistema não interrompa o fluxo automático pedindo confirmação
2. As tarefas sejam realocadas automaticamente para dias úteis
3. A experiência do usuário seja fluida e sem interrupções
