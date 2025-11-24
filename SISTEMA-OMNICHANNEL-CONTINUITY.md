# Sistema de Continuidade Omnichannel

## Visão Geral
Sistema que permite clientes mudarem de canal de atendimento (WhatsApp → WebChat → Email, etc.) sem perder o contexto da conversa, mantendo histórico e preferências.

## Tabelas do Banco de Dados

### 1. `omnichannel_sessions`
Sessões unificadas que mantêm contexto entre canais.

**Campos:**
- `id`, `estabelecimento_id`, `customer_id`
- `session_token`: Token único da sessão
- `canais_ativos[]`: Canais atualmente utilizados
- `contexto_compartilhado`: Variáveis, histórico, estado (JSONB)
- `ultima_interacao`, `expires_at`, `ativa`

### 2. `canal_transitions`
Registro de transições entre canais.

**Campos:**
- `id`, `estabelecimento_id`, `session_id`, `customer_id`
- `canal_origem`, `canal_destino`
- `conversa_origem_id`, `conversa_destino_id`
- `contexto_transferido`: Dados migrados (JSONB)
- `motivo`, `sucesso`

### 3. `customer_canal_preferences`
Preferências de canal por cliente.

**Campos:**
- `id`, `customer_id`, `estabelecimento_id`
- `canal`, `preferencia_ordem`, `ativo`

## Funcionalidades

### 1. Sessões Unificadas
- Token único identifica cliente entre canais
- Contexto compartilhado mantém:
  - Histórico de mensagens
  - Variáveis de bot/fluxo
  - Estado do atendimento
  - Dados coletados
  - Anexos e mídia

### 2. Transição Sem Perda
**Exemplo de fluxo:**
```
1. Cliente inicia no WhatsApp
2. Bot coleta dados (nome, CPF, problema)
3. Cliente precisa de videochamada
4. Sistema gera link de WebChat
5. Cliente clica e abre WebChat
6. Contexto é carregado automaticamente
7. Atendente vê todo histórico do WhatsApp
8. Conversa continua sem repetição
```

### 3. Preferências de Canal
- Sistema aprende canal preferido do cliente
- Sugere canal mais apropriado para cada situação
- Exemplos:
  - WhatsApp: comunicação rápida
  - Email: documentos, histórico formal
  - WebChat: compartilhamento de tela, videochamada
  - Telefone: urgências

### 4. Sincronização em Tempo Real
- Mudanças em um canal refletem em todos
- Atendente vê cliente em múltiplos canais
- Notificações cross-channel

## Casos de Uso

### 1. Transição WhatsApp → WebChat
**Cenário:** Cliente precisa compartilhar tela
```
1. Cliente no WhatsApp descreve problema técnico
2. Atendente identifica necessidade de ver a tela
3. Sistema envia link de WebChat com token de sessão
4. Cliente abre WebChat
5. Compartilha tela
6. Problema é resolvido
7. Conversa pode retornar ao WhatsApp
```

### 2. Email → WhatsApp
**Cenário:** Resposta rápida necessária
```
1. Cliente envia email com dúvida
2. Sistema detecta urgência no texto
3. Envia WhatsApp: "Recebemos seu email sobre [assunto]. Podemos ajudar agora?"
4. Cliente responde no WhatsApp
5. Contexto do email é carregado
6. Atendimento continua em tempo real
```

### 3. Chat → Telefone
**Cenário:** Situação complexa requer voz
```
1. Cliente em chat web com problema financeiro
2. Atendente sugere ligação telefônica
3. Sistema agenda callback automático
4. Ligação conecta com contexto pré-carregado
5. Atendente já conhece toda situação
```

## Implementação Técnica

### Geração de Token de Sessão:
```typescript
async function createOmnichannelSession(customerId: string) {
  const token = generateSecureToken();
  const session = await supabase
    .from('omnichannel_sessions')
    .insert({
      customer_id: customerId,
      session_token: token,
      canais_ativos: ['whatsapp'],
      contexto_compartilhado: {},
      expires_at: addHours(new Date(), 24)
    });
  return token;
}
```

### Transição de Canal:
```typescript
async function transitionChannel(
  sessionToken: string,
  canalDestino: string,
  conversaOrigemId: string
) {
  // 1. Busca sessão
  const session = await getSessionByToken(sessionToken);
  
  // 2. Carrega contexto atual
  const contexto = session.contexto_compartilhado;
  
  // 3. Cria nova conversa no canal destino
  const novaConversa = await createConversation({
    customer_id: session.customer_id,
    canal: canalDestino,
    metadata: { session_token: sessionToken }
  });
  
  // 4. Transfere contexto
  await supabase
    .from('canal_transitions')
    .insert({
      session_id: session.id,
      canal_origem: getCanal(conversaOrigemId),
      canal_destino: canalDestino,
      conversa_origem_id: conversaOrigemId,
      conversa_destino_id: novaConversa.id,
      contexto_transferido: contexto
    });
  
  // 5. Atualiza sessão
  await updateSession(session.id, {
    canais_ativos: [...session.canais_ativos, canalDestino],
    ultima_interacao: new Date()
  });
  
  return novaConversa;
}
```

### Recuperação de Contexto:
```typescript
async function loadContextForConversation(conversationId: string) {
  // Busca sessão pela conversa
  const conversation = await getConversation(conversationId);
  const sessionToken = conversation.metadata.session_token;
  
  if (!sessionToken) return null;
  
  const session = await getSessionByToken(sessionToken);
  return {
    historico: await getHistoricoCompleto(session.id),
    variaveis: session.contexto_compartilhado.variaveis,
    dadosColetados: session.contexto_compartilhado.dados,
    canaisAnteriores: session.canais_ativos
  };
}
```

## Benefícios

- **Experiência sem friction:** Cliente não repete informações
- **Flexibilidade:** Cliente escolhe canal mais conveniente
- **Eficiência:** Atendente tem contexto completo
- **Satisfação:** Jornada fluída entre canais
- **Insights:** Análise de preferências e padrões

## Métricas

- Taxa de transição entre canais
- Tempo médio de sessão multi-canal
- Canal preferido por tipo de problema
- Taxa de sucesso em transições
- Satisfação em atendimentos multi-canal

## Políticas RLS

- Sessões e transições são gerenciadas pelo sistema
- Usuários visualizam apenas dados de seu estabelecimento
- Clientes não têm acesso direto (via API pública)
