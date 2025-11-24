# Sistema de Pesquisas de Satisfação - Integração Completa

## 📋 Visão Geral

Este documento descreve como o sistema de pesquisas de satisfação (CSAT/NPS/CES) está **completamente integrado** ao fluxo de atendimento, desde o encerramento do chat até o processamento da resposta do cliente.

## 🔄 Fluxo Completo de Funcionamento

### 1️⃣ **Encerramento do Chat**

Quando um atendente encerra um chat na interface:

1. **Interface**: `EncerrarChatDialog.tsx`
   - Atendente seleciona motivo do encerramento
   - Clica em "Encerrar Chat"

2. **Hook**: `useChatStatus.ts` → `encerrarChat()`
   - Atualiza status da conversa para `encerrado`
   - Registra `motivo_encerramento` e `tempo_encerramento`
   - 🔥 **Automaticamente chama** a Edge Function `enviar-pesquisa-satisfacao`

```typescript
// Hook useChatStatus.ts
const encerrarChat = async (chatId: string, motivo: string) => {
  const success = await mudarStatus(chatId, 'encerrado', { motivoEncerramento: motivo });
  
  if (success) {
    // Busca dados da conversa
    const { data: conversation } = await supabase
      .from('conversations')
      .select('customer_id, atendente_atual_id, fila_id, canal')
      .eq('id', chatId)
      .single();
    
    // 🚀 Envia pesquisa automaticamente
    await supabase.functions.invoke('enviar-pesquisa-satisfacao', {
      body: {
        conversation_id: chatId,
        customer_id: conversation.customer_id,
        atendente_id: conversation.atendente_atual_id,
        fila_id: conversation.fila_id,
        canal: conversation.canal
      }
    });
  }
};
```

### 2️⃣ **Seleção e Envio da Pesquisa**

Edge Function: `enviar-pesquisa-satisfacao/index.ts`

**Processo:**

1. **Busca pesquisas ativas** aplicáveis:
   - Filtra por `estabelecimento_id`, `canal`, `ativa = true`
   - Aplica filtros de `fila` e `atendente` (se configurados)

2. **Verifica duplicação**:
   - Checa se já existe pesquisa pendente para esta conversa
   - Evita enviar múltiplas pesquisas

3. **Cria registro pendente**:
   - Insere em `pesquisas_respostas` com `nota = -1` (marcador temporário)
   - Registra `enviada_em` (timestamp do envio)

4. **🔥 Envia mensagem via WhatsApp (WAHA)**:
   ```typescript
   // Busca configuração WAHA do estabelecimento
   const { data: wahaConfig } = await supabase
     .from('whatsapp_config')
     .select('waha_url, waha_api_key')
     .eq('estabelecimento_id', estabelecimento_id)
     .single();

   // Busca sessão ativa
   const { data: session } = await supabase
     .from('whatsapp_sessions')
     .select('session_name')
     .eq('estabelecimento_id', estabelecimento_id)
     .eq('status', 'active')
     .single();

   // Envia via WAHA
   await fetch(`${wahaConfig.waha_url}/api/sendText`, {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'X-Api-Key': wahaConfig.waha_api_key
     },
     body: JSON.stringify({
       session: session.session_name,
       chatId: `${telefone_cliente}@c.us`,
       text: mensagemPesquisa
     })
   });
   ```

**Mensagem enviada ao cliente:**

```
Como você avalia nosso atendimento?

Por favor, responda com um número de 0 a 10:
0 = Muito insatisfeito
10 = Muito satisfeito

Você também pode deixar um comentário opcional sobre sua experiência.
```

### 3️⃣ **Cliente Responde**

Quando o cliente envia uma mensagem no WhatsApp:

1. **Webhook recebe mensagem**: `whatsapp-webhook/index.ts`

2. **🔥 Detecta resposta de pesquisa pendente**:
   ```typescript
   // Busca pesquisa pendente para esta conversa
   const { data: pesquisaPendente } = await supabase
     .from("pesquisas_respostas")
     .select("id, pesquisa_id, pesquisas_satisfacao(...)")
     .eq("conversation_id", conversationId)
     .eq("customer_id", customerId)
     .is("respondida_em", null)
     .maybeSingle();
   
   if (pesquisaPendente) {
     // Extrai nota da mensagem
     const notaMatch = body.match(/\d+/);
     if (notaMatch) {
       const nota = parseInt(notaMatch[0], 10);
       
       // Valida se está dentro da escala configurada
       if (nota >= escala_minima && nota <= escala_maxima) {
         // 🚀 Processa resposta
         await supabase.functions.invoke("processar-resposta-pesquisa", {
           body: {
             resposta_id: pesquisaPendente.id,
             nota: nota,
             comentario: body
           }
         });
         
         // Envia mensagem de agradecimento
         await respond(mensagemAgradecimento);
         return; // Para aqui, não executa bot
       }
     }
     
     // Se nota inválida, pede novamente
     await respond(`Por favor, responda com um número de ${escala_minima} a ${escala_maxima}.`);
     return;
   }
   ```

3. **Prioridade de processamento**:
   - ✅ **Pesquisa pendente** → Processa resposta, NÃO executa bot
   - ❌ **Sem pesquisa pendente** → Executa bot normalmente

### 4️⃣ **Processamento da Resposta**

Edge Function: `processar-resposta-pesquisa/index.ts`

**Processo:**

1. **Valida resposta**:
   - Verifica se nota está dentro da escala da pesquisa
   - Rejeita se inválida

2. **Atualiza registro**:
   ```typescript
   UPDATE pesquisas_respostas SET
     nota = <nota_cliente>,
     comentario = <comentario_opcional>,
     respondida_em = NOW(),
     tempo_resposta_segundos = EXTRACT(EPOCH FROM (NOW() - enviada_em))
   WHERE id = <resposta_id>
   ```

3. **Trigger automático** (`classificar_nps_automatico`):
   - Se tipo = `nps`:
     - 0-6 → `detrator`
     - 7-8 → `neutro`
     - 9-10 → `promotor`

4. **Atualiza conversa**:
   ```typescript
   UPDATE conversations SET
     avaliacao = <nota>,
     comentario_avaliacao = <comentario>
   WHERE id = <conversation_id>
   ```

5. **Gera mensagem de agradecimento personalizada**:
   ```typescript
   // Para NPS Promotor (9-10):
   "Muito obrigado pela nota 10! 🌟 Ficamos muito felizes em saber que você teve uma ótima experiência. Conte sempre conosco!"
   
   // Para NPS Neutro (7-8):
   "Obrigado pelo seu feedback! Nota 8 recebida. Estamos sempre trabalhando para melhorar nosso atendimento."
   
   // Para NPS Detrator (0-6):
   "Obrigado pelo seu feedback. Sentimos muito que sua experiência não foi satisfatória. Vamos trabalhar para melhorar!"
   
   // Para CSAT:
   "Obrigado pela sua avaliação! Sua opinião é muito importante para nós."
   ```

## 📊 Monitoramento e Análise

### Dashboard (`PesquisasSatisfacaoDashboard.tsx`)

Exibe métricas em tempo real:

- **Total Enviadas**: Contagem de pesquisas enviadas
- **Taxa de Resposta**: (Respondidas / Enviadas) × 100
- **Score Médio**: Média das notas (CSAT)
- **NPS Score**: (% Promotores - % Detratores)
- **Tempo Médio de Resposta**: Tempo entre envio e resposta

### Cron Job Automático

Executado a cada **5 minutos**:

```sql
SELECT cron.schedule(
  'enviar-pesquisas-satisfacao-automatico',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/enviar-pesquisa-satisfacao',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer <anon_key>"}'::jsonb,
    body:=concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);
```

**Função:**
- Verifica pesquisas configuradas com `trigger_tipo = 'apos_delay'`
- Envia automaticamente após o delay configurado
- Exemplo: Enviar 5 minutos após encerramento

## 🎯 Triggers de Envio

### 1. **Após Encerramento** (`apos_encerramento`)
- ✅ **Implementado**: Enviado automaticamente quando chat é encerrado
- Trigger: Hook `useChatStatus.encerrarChat()`

### 2. **Com Delay** (`apos_delay`)
- ✅ **Implementado**: Cron job verifica e envia após X minutos
- Configurável por pesquisa (`trigger_delay_minutos`)

### 3. **Manual** (`manual`)
- ⏸️ **Planejado**: Interface para supervisores enviarem manualmente
- Uso: Casos específicos ou testes

## 🔐 Segurança e Validação

### RLS Policies

**`pesquisas_satisfacao`**:
- ✅ Admin/Gestor: CRUD completo
- ✅ Usuários: SELECT (visualização)
- ✅ Filtro por `estabelecimento_id`

**`pesquisas_respostas`**:
- ✅ Admin/Gestor: Full access
- ✅ Sistema: INSERT/UPDATE (via edge functions)
- ✅ Usuários: SELECT (visualização)

### Validações

1. **Nota válida**: Dentro da escala configurada
2. **Sem duplicação**: Uma pesquisa por conversa
3. **Conversação válida**: Chat deve existir e estar encerrado
4. **Cliente válido**: Customer com telefone cadastrado

## 📝 Configuração Necessária

### 1. Cadastrar Pesquisa
Interface: `/pesquisas-satisfacao` → Aba "Pesquisas"

Campos obrigatórios:
- Nome da pesquisa
- Tipo (CSAT, NPS, CES)
- Pergunta principal
- Escala (mínima/máxima)
- Canais (WhatsApp, Telegram, etc.)
- Trigger (quando enviar)
- Aplicável a: Filas e/ou Atendentes específicos (opcional)

### 2. Configurar WAHA
Interface: `Config > Configuração WhatsApp WAHA`

- URL do servidor WAHA
- API Key
- Sessão ativa configurada

### 3. Ativar Pesquisa
Toggle "Ativa" na listagem de pesquisas

## 🎨 Exemplos de Uso

### Exemplo 1: NPS após todo atendimento
```json
{
  "nome": "NPS Geral",
  "tipo": "nps",
  "pergunta_principal": "Em uma escala de 0 a 10, o quanto você recomendaria nossa empresa?",
  "escala_minima": 0,
  "escala_maxima": 10,
  "trigger_tipo": "apos_encerramento",
  "canais": ["whatsapp"],
  "aplica_filas": null,
  "aplica_atendentes": null,
  "ativa": true
}
```

### Exemplo 2: CSAT para fila específica
```json
{
  "nome": "CSAT Suporte Técnico",
  "tipo": "csat",
  "pergunta_principal": "Como você avalia o suporte técnico recebido?",
  "escala_minima": 1,
  "escala_maxima": 5,
  "label_minima": "Muito insatisfeito",
  "label_maxima": "Muito satisfeito",
  "trigger_tipo": "apos_encerramento",
  "canais": ["whatsapp"],
  "aplica_filas": ["<id_fila_suporte>"],
  "ativa": true
}
```

### Exemplo 3: NPS com delay para vendas
```json
{
  "nome": "NPS Vendas - 24h",
  "tipo": "nps",
  "pergunta_principal": "Após sua compra, o quanto você nos recomendaria?",
  "escala_minima": 0,
  "escala_maxima": 10,
  "trigger_tipo": "apos_delay",
  "trigger_delay_minutos": 1440,
  "canais": ["whatsapp"],
  "aplica_filas": ["<id_fila_vendas>"],
  "ativa": true
}
```

## 🐛 Troubleshooting

### Pesquisa não é enviada

1. ✅ Verificar se pesquisa está **ativa**
2. ✅ Verificar se `canal` está incluído em `canais` da pesquisa
3. ✅ Verificar filtros de `fila` e `atendente`
4. ✅ Verificar configuração WAHA (URL, API Key, sessão ativa)
5. ✅ Verificar logs da Edge Function `enviar-pesquisa-satisfacao`

### Cliente não recebe a mensagem

1. ✅ Verificar telefone do cliente cadastrado
2. ✅ Verificar sessão WAHA ativa e conectada
3. ✅ Verificar logs do servidor WAHA
4. ✅ Testar envio manual via WAHA UI

### Resposta não é processada

1. ✅ Verificar se cliente enviou número válido
2. ✅ Verificar logs do webhook WhatsApp
3. ✅ Verificar se há pesquisa pendente para a conversa
4. ✅ Verificar logs da Edge Function `processar-resposta-pesquisa`

## 🚀 Próximas Melhorias

- [ ] Suporte para Telegram
- [ ] Suporte para WebChat
- [ ] Envio manual por supervisores
- [ ] Alertas para baixa satisfação
- [ ] Análise de sentimento em comentários
- [ ] Exportação de relatórios
- [ ] Integração com CRM
- [ ] A/B testing de mensagens

## 📚 Referências

- Documentação CSAT/NPS: `SISTEMA-CSAT-NPS.md`
- Documentação Omnichannel: `ARQUITETURA-OMNICHANNEL.md`
- Configuração WAHA: Interface em `/config`
