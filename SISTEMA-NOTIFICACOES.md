# Sistema de Notificações em Tempo Real

## 📋 Visão Geral

Sistema completo de notificações com suporte a:
- ✅ Notificações em tempo real via Supabase Realtime
- ✅ Notificações desktop do navegador
- ✅ Sons personalizáveis
- ✅ Configurações por usuário
- ✅ Histórico de notificações
- ✅ Filtros por tipo de evento

## 🗄️ Estrutura do Banco de Dados

### Tabela: `notificacoes_usuario_config`
Armazena as configurações de notificação de cada usuário:
- `novo_chat_enabled`: Notificar quando novo chat chega
- `cliente_respondeu_enabled`: Notificar quando cliente responde
- `transferencia_recebida_enabled`: Notificar quando recebe transferência
- `sla_alerta_enabled`: Notificar quando SLA está próximo de violar
- `som_enabled`: Ativar/desativar sons
- `volume`: Volume do som (0-100)
- `desktop_notification_enabled`: Ativar notificações desktop

### Tabela: `notificacoes_log`
Log de todas as notificações enviadas:
- `tipo`: Tipo da notificação (novo_chat, cliente_respondeu, etc.)
- `titulo`: Título da notificação
- `mensagem`: Mensagem detalhada
- `chat_id`: ID do chat relacionado (opcional)
- `lida`: Se a notificação foi lida ou não

## 🔔 Tipos de Notificações

### 1. Novo Chat (`novo_chat`)
Disparado quando um novo chat é atribuído ao atendente.

**Exemplo de uso:**
```typescript
await supabase.functions.invoke('enviar-notificacao', {
  body: {
    usuario_id: atendenteId,
    estabelecimento_id: estabelecimentoId,
    tipo: 'novo_chat',
    titulo: 'Novo Chat Atribuído',
    mensagem: `Cliente ${clienteNome} iniciou uma conversa`,
    chat_id: conversationId,
  }
});
```

### 2. Cliente Respondeu (`cliente_respondeu`)
Disparado quando cliente responde após status "aguardando_cliente".

**Exemplo de uso:**
```typescript
await supabase.functions.invoke('enviar-notificacao', {
  body: {
    usuario_id: atendenteId,
    estabelecimento_id: estabelecimentoId,
    tipo: 'cliente_respondeu',
    titulo: 'Cliente Respondeu',
    mensagem: `${clienteNome} enviou uma nova mensagem`,
    chat_id: conversationId,
  }
});
```

### 3. Transferência Recebida (`transferencia_recebida`)
Disparado quando atendente recebe chat transferido.

**Exemplo de uso:**
```typescript
await supabase.functions.invoke('enviar-notificacao', {
  body: {
    usuario_id: atendenteDestinoId,
    estabelecimento_id: estabelecimentoId,
    tipo: 'transferencia_recebida',
    titulo: 'Chat Transferido',
    mensagem: `Você recebeu um chat de ${atendenteOrigemNome}`,
    chat_id: conversationId,
  }
});
```

### 4. Alerta de SLA (`sla_alerta`)
Disparado quando chat está próximo de violar SLA.

**Exemplo de uso:**
```typescript
await supabase.functions.invoke('enviar-notificacao', {
  body: {
    usuario_id: supervisorId,
    estabelecimento_id: estabelecimentoId,
    tipo: 'sla_alerta',
    titulo: 'SLA Crítico',
    mensagem: `Chat com ${clienteNome} está há ${minutos} minutos sem resposta`,
    chat_id: conversationId,
  }
});
```

## 🎨 Componentes

### `NotificationCenter`
Centro de notificações acessível via ícone de sino no header.

**Uso:**
```tsx
<NotificationCenter 
  userId={userId} 
  estabelecimentoId={estabelecimentoId} 
/>
```

**Recursos:**
- Lista de notificações com scroll
- Badge com contador de não lidas
- Marcar como lida individualmente
- Marcar todas como lidas
- Acesso às configurações
- Indicador visual por tipo

### `NotificationSettings`
Painel de configurações de notificações.

**Recursos:**
- Solicitar permissão de notificações desktop
- Ativar/desativar por tipo de evento
- Controlar volume do som
- Ativar/desativar sons
- Ativar/desativar notificações desktop

## 🔨 Hook: `useNotifications`

Hook React para gerenciar notificações.

**Uso:**
```typescript
const {
  config,              // Configurações atuais
  notifications,       // Lista de notificações
  unreadCount,         // Contador de não lidas
  permissionGranted,   // Permissão do navegador
  updateConfig,        // Atualizar configurações
  markAsRead,          // Marcar como lida
  markAllAsRead,       // Marcar todas como lidas
  checkPermission,     // Solicitar permissão
} = useNotifications(userId, estabelecimentoId);
```

## 🚀 Como Integrar

### 1. Adicionar ao Layout/Header
```tsx
import { NotificationCenter } from "@/components/atendimento/NotificationCenter";

// No componente
{userId && estabelecimentoId && (
  <NotificationCenter 
    userId={userId} 
    estabelecimento_id={estabelecimentoId} 
  />
)}
```

### 2. Disparar Notificações
```typescript
// Em qualquer edge function ou código backend
await supabase.functions.invoke('enviar-notificacao', {
  body: {
    usuario_id: atendenteId,
    estabelecimento_id: estabelecimentoId,
    tipo: 'novo_chat',
    titulo: 'Novo Chat',
    mensagem: 'Cliente João iniciou conversa',
    chat_id: conversationId,
  }
});
```

### 3. Escutar Notificações em Tempo Real
O hook `useNotifications` já configura automaticamente a escuta em tempo real. Quando uma nova notificação é inserida no banco, ela aparece instantaneamente para o usuário.

## 🎵 Som de Notificação

O arquivo `/public/notification.mp3` deve conter um som curto e discreto (0.5-1.5s).

**Recomendações:**
- Formato: MP3 ou OGG
- Duração: 0.5-1.5 segundos
- Tipo: "Ding", "Chime" ou "Bell"
- Volume: Normalizado (não muito alto)

**Onde baixar sons gratuitos:**
- [Notification Sounds](https://notificationsounds.com/)
- [Freesound](https://freesound.org/)
- [ZapSplat](https://www.zapsplat.com/)

## 🔐 Segurança

- ✅ RLS habilitado em todas as tabelas
- ✅ Usuários só veem suas próprias notificações
- ✅ Políticas específicas por operação (SELECT, INSERT, UPDATE)
- ✅ Edge function com Service Role Key para criação de notificações

## 📊 Exemplos de Integração

### Notificar quando novo chat é roteado
```typescript
// Em rotear-chat-automatico/index.ts
const { data: atendente } = await supabase
  .from('atendentes')
  .select('usuario_id, usuarios!inner(id, estabelecimento_id)')
  .eq('id', atendenteId)
  .single();

if (atendente) {
  await supabase.functions.invoke('enviar-notificacao', {
    body: {
      usuario_id: atendente.usuario_id,
      estabelecimento_id: atendente.usuarios.estabelecimento_id,
      tipo: 'novo_chat',
      titulo: 'Novo Chat Atribuído',
      mensagem: `Cliente ${customer.nome} iniciou uma conversa`,
      chat_id: conversation.id,
    }
  });
}
```

### Notificar supervisor sobre SLA crítico
```typescript
// Em job de monitoramento de SLA
const chatsEmRisco = await supabase
  .from('conversations')
  .select('*, customers(*), filas_atendimento(*)')
  .eq('chat_status', 'em_atendimento')
  .lt('tempo_espera', new Date(Date.now() - SLA_THRESHOLD));

for (const chat of chatsEmRisco) {
  // Buscar supervisores
  const { data: supervisores } = await supabase
    .from('usuarios')
    .select('id, estabelecimento_id')
    .eq('role', 'supervisor')
    .eq('estabelecimento_id', chat.estabelecimento_id);

  for (const supervisor of supervisores) {
    await supabase.functions.invoke('enviar-notificacao', {
      body: {
        usuario_id: supervisor.id,
        estabelecimento_id: supervisor.estabelecimento_id,
        tipo: 'sla_alerta',
        titulo: 'SLA Crítico',
        mensagem: `Chat ${chat.id} está próximo de violar SLA`,
        chat_id: chat.id,
      }
    });
  }
}
```

## 🐛 Troubleshooting

### Notificações não aparecem
1. Verificar se o usuário tem permissão de notificações desktop
2. Verificar se o tipo de notificação está habilitado nas configurações
3. Verificar console do navegador para erros
4. Verificar se Supabase Realtime está habilitado

### Som não toca
1. Verificar se o arquivo `/public/notification.mp3` existe
2. Verificar se som está habilitado nas configurações
3. Verificar volume nas configurações
4. Alguns navegadores bloqueiam autoplay de áudio até primeira interação do usuário

### Notificações atrasadas
1. Verificar conexão com Supabase Realtime
2. Verificar logs da edge function `enviar-notificacao`
3. Verificar se há erros no console do navegador

## 📝 TODO Futuro

- [ ] Adicionar notificações por email
- [ ] Adicionar notificações por SMS
- [ ] Agrupar notificações similares
- [ ] Adicionar sons diferentes por tipo
- [ ] Adicionar suporte a notificações push mobile
- [ ] Adicionar histórico com paginação
- [ ] Adicionar filtros de busca no histórico
