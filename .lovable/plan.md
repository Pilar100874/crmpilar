## Plataforma Visual de Agentes IA

Toda a administração no Lovable (novo módulo `/ia-platform`), execução delegada a um servidor Claude Agent SDK no Railway. O sistema atual já tem tabelas `agent_*`, `skills` e vários workflows — o novo módulo usa um namespace próprio (`aip_*`) para não conflitar com o CRM existente.

### Fases de entrega

**Fase 1 — Fundação (banco + navegação + dashboard)**
- Tabelas: `aip_agents`, `aip_agent_versions`, `aip_skills`, `aip_skill_versions`, `aip_skill_files`, `aip_tools`, `aip_mcps`, `aip_resources` (catálogo), `aip_workflows`, `aip_workflow_versions`, `aip_wizards`, `aip_executions`, `aip_execution_steps`, `aip_approvals`, `aip_assets`, `aip_asset_versions`, `aip_api_keys`, `aip_audit_log`, `aip_permissions`, `aip_usage_limits`.
- Todas com `estabelecimento_id`, RLS por estabelecimento + papel, GRANTs, `created_at/updated_at`.
- Menu lateral novo com as áreas: Dashboard, Agentes, Skills, Tools, MCPs, Recursos, Wizards, Workflows, Aprovações, Execuções, Assets, Playground, Histórico, Segurança.
- Dashboard com os 9 cartões pedidos (agentes, execuções hoje, tokens, custos, recursos, workflows, execuções em andamento, aprovações pendentes, erros recentes).

**Fase 2 — Cadastros (CRUD completo)**
- Agentes: criar/editar/duplicar/versionar/ativar/desativar, com modelo, prompt, skills, tools, MCPs, limites de custo e tempo, tags.
- Skills: SKILL.md com editor markdown, arquivos auxiliares em Storage, versão, status, histórico, importar/exportar (.zip).
- Tools: catálogo por categoria, tipo, endpoint, input/output schema (JSON Schema com editor), permissões, credenciais, timeout, retry.
- MCPs: endpoint, tipo, ambiente, credenciais, listagem das ferramentas expostas, conectar/desconectar (teste de handshake).
- Catálogo de Recursos: seed com todas as categorias e itens listados (comunicação, documentos, imagem, vídeo, áudio, banco, storage, redes sociais, helpers).

**Fase 3 — Workflow Builder + Wizards + Aprovação Humana**
- Builder React Flow com os blocos: Entrada, Agente, Skill, Tool, MCP, Prompt, If, Else, Loop, Delay, Human Approval, Webhook, Output; painel de configuração por bloco; versionamento; import/export JSON.
- Wizards: motor genérico de etapas configuráveis + wizard-exemplo "Criar vídeo" com as 6 etapas descritas (incluindo seleção de recursos e forma de entrega).
- Aprovação humana: execução pausa em `aguardando_aprovacao`, tela de aprovações com preview (texto, galeria de imagens com seleção múltipla, player de vídeo), retomada com apenas os itens aprovados.

**Fase 4 — Execução, Playground, Assets, Histórico**
- Contrato HTTP com o servidor Claude Agent SDK: `POST /runs` (inicia), `GET /runs/:id/stream` (SSE), `POST /runs/:id/resume` (após aprovação), `POST /runs/:id/cancel`, webhook de callback para gravar tokens/custo/assets no Supabase.
- Edge Function `aip-run-proxy` guarda a chave do servidor e faz o repasse autenticado (o front nunca fala direto com o Railway).
- Execuções: lista + detalhe com etapa atual, tempo, status, modelo, tokens, custo, logs, arquivos, botão cancelar.
- Playground com streaming da resposta e seleção de agente/skills/tools/MCP/modelo/arquivos.
- Assets: preview por tipo, download, versões, histórico e workflow de origem.

**Fase 5 — Segurança e governança**
- Perfis e permissões por recurso, API keys (hash + prefixo visível), secrets via Lovable Cloud, limites de uso (custo/dia, execuções/dia) com bloqueio, auditoria de todas as ações administrativas.

### Detalhes técnicos
- Frontend: React + React Flow (já usado no projeto), shadcn, tokens semânticos, textos em português.
- Streaming: SSE consumido no cliente via Edge Function proxy; estado persistido em `aip_executions` para retomada.
- O servidor Claude Agent SDK não é gerado dentro deste projeto Lovable (é um serviço Node separado no Railway); eu entrego neste repositório o contrato de API, os tipos TypeScript compartilhados e um esqueleto do servidor em `agent-sdk-server/` para você subir no Railway.
- Nada do CRM existente é alterado; o módulo é isolado sob `/ia-platform`.

### O que preciso de você
- Confirmar se começo pela Fase 1 (banco + menu + dashboard) e sigo em sequência, ou se prefere priorizar outra fase.
- URL do servidor Railway (se já existir) — senão deixo configurável em Segurança.
