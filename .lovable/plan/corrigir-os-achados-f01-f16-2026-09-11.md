# Corrigir os achados F01–F16

## Objetivo
Corrigir os 16 achados do relatório por etapas, validando primeiro o código e a configuração efetivamente instalada. Preservar dados existentes e não executar disparos reais nem alterações destrutivas sem ambiente e destinatários de teste.

## Etapa 1 — Segurança (F01–F05)

- **F01 — privilégio mínimo no Pilar Ferramentas**
  - Remover do navegador a criação automática de perfil aprovado e papel administrador.
  - Criar provisionamento no banco que atribui somente `usuario`, com promoção reservada a administradores autorizados.
  - Substituir a política de primeiro papel e revisar políticas amplas do módulo por escopo de empresa.
  - Não rebaixar automaticamente contas existentes: produzir consulta de revisão dos administradores já criados.

- **F02 — isolamento por estabelecimento/empresa**
  - Vincular regras de automação ao estabelecimento por meio do ambiente e aplicar políticas por papel.
  - Corrigir as políticas `ferr_*` para impedir leitura e gravação entre empresas.
  - Aplicar tudo em uma nova migração, sem editar migrações antigas.

- **F03 — push com destinatário obrigatório**
  - Exigir sessão, estabelecimento e destinatário explícito.
  - Reservar envios coletivos a administradores/gestores, limitar o lote e registrar solicitante e chave de idempotência.
  - Rejeitar payload vazio antes de consultar assinaturas.

- **F04 — SMS autorizado e auditável**
  - Derivar o estabelecimento da sessão, sem confiar no corpo da requisição.
  - Separar simulação sem envio de teste real; ambos ficam auditáveis.
  - Adicionar idempotência e autorização por papel.

- **F05 — consultas SQL restritas**
  - Revogar execução direta de SQL livre para usuários autenticados.
  - Restringir as funções ao serviço e exigir autorização no servidor para conexões/endpoints do estabelecimento.
  - Remover chamada direta do navegador e manter apenas caminhos parametrizados/configurados.

### Validação da etapa 1
- Testes automatizados de payload sem destinatário, sessão ausente, papel insuficiente, repetição e acesso cruzado.
- Conferência de políticas e `has_function_privilege` após a migração.
- Matriz real com usuário comum/admin em dois estabelecimentos somente quando houver contas de teste identificadas; sem isso, deixar esse teste como bloqueado e não usar contas reais por suposição.

## Etapa 2 — Instalação e testes (F06 e F15)

- Alinhar todos os pacotes Capacitor na mesma versão principal e regenerar o lockfile oficial.
- Definir scripts de tipos, testes e verificação completa; adicionar CI com instalação congelada, tipos, lint, testes e build.
- Corrigir erros legítimos encontrados, sem desativar regras para forçar sucesso.

## Etapa 3 — Funcionamento comercial (F07–F12)

- Trocar indicadores fixos do painel por consultas reais, com período, carregamento, vazio e erro.
- Persistir etapa, responsável, segmento, cluster e empresa no lead usando IDs válidos.
- Aguardar sucesso antes de fechar/limpar o formulário e bloquear submissão duplicada.
- Persistir criação, edição, ordem e realocação de etapas no banco de forma atômica.
- Calcular dias parados por data do último evento e combinar todos os filtros com `AND` nas duas visualizações.
- Validar recarga e nova sessão com dados controlados de teste.

## Etapa 4 — Escala e usabilidade (F13, F14 e F16)

- Adicionar paginação, busca e ordenação no servidor em Contatos, Empresas e Orçamentos; carregar detalhes sob demanda.
- Dividir páginas por rota/módulo com fallback e recuperação de erro de carregamento.
- Corrigir botões sem semântica, descrições de diálogos, rótulos de status e estados distintos de carregamento, vazio, busca vazia e erro.
- Medir bundles e executar testes de teclado, acessibilidade e volume.

## Entrega e rastreabilidade

Manter `roadmap.md` com F01–F16 e produzir uma tabela por etapa contendo: achado, alteração, arquivos/migrações, teste e pendências. Cada item será marcado como **verificado**, **implementado**, **testado** ou **bloqueado**; nenhuma mudança será chamada de implantada sem confirmação no banco/função ativa.

## Evidência inicial já confirmada

- F01: o código atual ainda cria `is_approved: true` e papel `admin`; a política ativa aceita o primeiro papel sem limitar a `usuario`.
- F02: `automacao_regras` ainda possui política ativa `USING (true)`, e tabelas Ferramentas mantêm políticas amplas.
- F03: `push-send` ainda aceita payload sem destinatário e inicia a consulta por todas as assinaturas ativas.
- F04: `send-sms` ainda confia no `estabelecimento_id` do corpo e `test` ainda pode enviar sem registrar.
- F05: `execute_sql` e `exec_readonly_select` são `SECURITY DEFINER` e ainda executáveis por `authenticated` no banco ativo.
- O build atual está saudável, mas isso não satisfaz F06/F15; a instalação limpa e a suíte completa ainda precisam ser estabelecidas.
