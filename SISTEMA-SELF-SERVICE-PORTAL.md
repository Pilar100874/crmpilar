# Sistema de Self-Service Portal

## Visão Geral
Portal de autoatendimento que permite clientes encontrarem respostas, consultarem a base de conhecimento e abrirem tickets de suporte sem necessidade de contato humano imediato.

## Tabelas do Banco de Dados

### 1. `portal_artigos`
Artigos públicos do portal de autoatendimento.

**Campos:**
- `id`, `estabelecimento_id`, `kb_artigo_id` (opcional, vincula ao KB interno)
- `titulo`, `conteudo`, `slug` (URL amigável)
- `categoria`, `tags[]`
- `visualizacoes`, `ajudou`, `nao_ajudou` (métricas de utilidade)
- `publicado`, `ordem`

### 2. `portal_tickets`
Tickets de suporte abertos por clientes.

**Campos:**
- `id`, `estabelecimento_id`, `customer_id`
- `assunto`, `descricao`, `categoria`
- `prioridade` (`baixa`, `normal`, `alta`, `urgente`)
- `status` (`aberto`, `em_andamento`, `aguardando_cliente`, `resolvido`, `fechado`)
- `atribuido_a` (atendente), `conversa_id` (se gerar chat)

### 3. `portal_ticket_respostas`
Respostas e comunicações do ticket.

**Campos:**
- `id`, `ticket_id`
- `usuario_id` (se for atendente), `customer_id` (se for cliente)
- `mensagem`, `is_cliente`

## Funcionalidades

### 1. Base de Conhecimento Pública
- Artigos acessíveis sem login
- Busca por palavras-chave
- Categorização
- Feedback (ajudou/não ajudou)
- Métricas de visualização

### 2. Sistema de Tickets
- Cliente cria ticket com assunto e descrição
- Categorização automática (opcional com IA)
- Priorização inteligente
- Atribuição manual ou automática a atendentes
- Conversação assíncrona cliente-atendente
- Conversão de ticket em chat se necessário

### 3. Métricas e Analytics
- Taxa de resolução por artigo
- Tempo médio de resolução de tickets
- Tickets por categoria
- Artigos mais acessados
- % de deflexão (problemas resolvidos sem atendimento humano)

## Fluxo de Trabalho

### Cliente Acessa Portal:
```
1. Cliente acessa portal público
2. Busca por palavra-chave ou navega por categorias
3. Encontra artigo relevante
4. Se resolveu: marca "Isso me ajudou"
5. Se não resolveu: opção "Abrir ticket de suporte"
```

### Abertura de Ticket:
```
1. Cliente preenche formulário (assunto, descrição, categoria)
2. Sistema cria ticket
3. Opcionalmente: IA sugere artigos relacionados antes de criar
4. Ticket entra na fila de atribuição
5. Atendente é notificado
6. Atendente responde assincronamente
7. Cliente recebe notificação (email/WhatsApp)
8. Conversa continua até resolução
```

### Conversão Ticket → Chat:
```
1. Se ticket requer interação em tempo real
2. Atendente pode converter em chat ao vivo
3. Contexto do ticket é transferido
4. Conversação continua no chat
```

## Benefícios

- **Redução de custos:** Menos atendimentos humanos
- **Disponibilidade 24/7:** Autoatendimento sempre disponível
- **Satisfação:** Cliente resolve problemas rapidamente
- **Escalabilidade:** Atende múltiplos clientes simultaneamente
- **Conhecimento centralizado:** Base de conhecimento única

## Integrações

- **Knowledge Base interno:** Reutiliza artigos da KB
- **Sistema de Chats:** Conversão de tickets em chats
- **Notificações:** Alertas por email/WhatsApp
- **Analytics:** Métricas de uso e efetividade

## Políticas RLS

- Artigos públicos: acessíveis por todos quando `publicado = true`
- Tickets: clientes veem apenas seus próprios
- Gestão: apenas admins e gestores podem gerenciar artigos e atribuir tickets
