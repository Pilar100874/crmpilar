# Workflow Builder Omnichannel - Guia Completo

## O que é o Workflow Builder?

O Workflow Builder Omnichannel é um sistema visual para criar e gerenciar fluxos de roteamento de chat, permitindo que você defina regras complexas através de blocos conectados.

## Como Acessar

1. Menu Principal → **Estabelecimentos Cadastrados**
2. Selecione seu estabelecimento
3. Vá para o submenu **Atendimento**
4. Clique em **Workflow Builder Omnichannel**

## Tipos de Blocos

### 1. Início
- **Obrigatório**: Todo fluxo deve começar com este bloco
- **Função**: Ponto de entrada do fluxo de roteamento

### 2. Fila de Atendimento
- **Função**: Cria uma fila de distribuição de chats
- **Configurações**:
  - Tipo de Roteamento: Round Robin, Por Skill, Por Disponibilidade, Por Prioridade, Por Carteira
  - Max Chats por Atendente
  - Prioridade (0-10)
  - Tempo de Resposta Esperado

### 3. Atendente
- **Função**: Define um atendente específico no fluxo
- **Configurações**:
  - ID do Atendente
  - Max Chats Simultâneos
  - Aceita Novos Chats
  - Atendente Fixo (Carteira)

### 4. Skill Requerida
- **Função**: Adiciona requisito de habilidade
- **Configurações**:
  - Nome da Skill
  - Nível Mínimo (1-5)
  - Obrigatório

### 5. Regra de Roteamento
- **Função**: Define condições de distribuição
- **Configurações**:
  - Tipo de Regra: Condicional, Por Prioridade, Por Disponibilidade, Por Carga
  - Condições (campo, operador, valor)
  - Pular se não atender

### 6. Horário de Funcionamento
- **Função**: Define horários de atendimento
- **Configurações**:
  - Dias da Semana
  - Horário de Início e Fim
  - Ação Fora do Horário (Bloquear/Fila/Mensagem)

### 7. Webhook
- **Função**: Integra com sistemas externos
- **Configurações**:
  - URL do Webhook
  - Método HTTP (GET/POST/PUT/PATCH)
  - Headers e Body (JSON)
  - Aguardar Resposta
  - Timeout

### 8. Aguardar
- **Função**: Adiciona delay no fluxo
- **Configurações**:
  - Tempo de Espera (segundos)
  - Tipo de Espera (Fixo/Dinâmico)
  - Notificar Cliente

### 9. Simulador de Teste
- **Função**: Testa o fluxo com dados simulados
- **Configurações**:
  - Dados de Teste (JSON)
  - Log Detalhado

### 10. Analytics
- **Função**: Visualiza métricas do fluxo
- **Configurações**:
  - Métricas a Monitorar
  - Período de Análise
  - Alertas Ativos

## Funcionalidades

### Templates Pré-configurados
Clique em **Templates** no header para escolher entre:
- **Suporte por Horário**: Roteamento básico com verificação de horário
- **Roteamento por Skill**: Distribui por habilidades dos atendentes
- **Priorização VIP**: Atendimento prioritário para clientes VIP
- **Integração com Webhook**: Consulta sistema externo antes de rotear

### Validação de Fluxo
Clique em **Validar** para verificar:
- Blocos obrigatórios configurados
- Blocos desconectados
- Configurações faltantes
- Possíveis loops infinitos

### Histórico de Versões
- Cada vez que você salva, uma nova versão é criada
- Clique em **Versões** para ver o histórico
- Restaure versões anteriores quando necessário

### Duplicação de Blocos
- Clique com botão direito em um bloco
- Selecione **Duplicar Bloco**
- Útil para criar múltiplas filas/regras similares

### Notas e Comentários
- Adicione notas diretamente no painel de propriedades
- Ou clique com botão direito → **Adicionar Nota**
- Útil para documentar decisões e contexto

### Busca de Blocos
- Use a barra de busca no header
- Encontre blocos por nome, tipo ou descrição
- Clique no resultado para selecionar o bloco

### Exportar/Importar
- **Exportar**: Baixe o fluxo como JSON
- **Importar**: Carregue fluxos de outros estabelecimentos
- Útil para backup e compartilhamento

### Integração com Bot Builder
- Clique em **Trigger Bot** (apenas em fluxos salvos)
- Selecione um bot que acionará este fluxo
- Quando o bot executar "Transferir para Omnichannel", este fluxo será usado

## Exemplos Práticos

### Exemplo 1: Suporte Técnico
```
Início → Horário (Seg-Sex 9-18h) → Skill (Técnico Nv3) → Fila (Por Skill)
```

### Exemplo 2: Vendas vs Suporte
```
Início → Regra (Se keyword contém "venda") 
  ├─> Sim: Fila Vendas
  └─> Não: Fila Suporte
```

### Exemplo 3: Consulta CRM
```
Início → Webhook (Consultar CRM) → Regra (Se cliente VIP)
  ├─> Sim: Atendente Fixo
  └─> Não: Fila Normal
```

## Dicas de Uso

1. **Comece com um Template**: Mais rápido que começar do zero
2. **Use Notas**: Documente suas decisões para a equipe
3. **Valide Sempre**: Antes de salvar, clique em Validar
4. **Versione Regularmente**: Cada salvamento cria uma versão
5. **Teste com Simulador**: Use dados de teste antes de ir para produção

## Atalhos

- **Botão Direito**: Menu de contexto (Duplicar/Nota/Deletar)
- **Buscar**: Encontre blocos rapidamente
- **Validar**: Verifique erros antes de salvar
- **Templates**: Comece rápido com modelos prontos

## Próximos Passos

Após criar seu fluxo:
1. Salve o fluxo
2. Ative-o na lista de fluxos
3. Configure um bot para acioná-lo (opcional)
4. Monitore as métricas em tempo real

## Suporte

Para dúvidas ou problemas, consulte a documentação completa do sistema omnichannel.
