# Servidor de execução — Claude Agent SDK (Railway)

Este é o **motor remoto** da Plataforma de Agentes IA do CRM Pilar. O Lovable
continua sendo a interface (agentes, skills, tools, MCPs, workflows, rotinas);
este servidor apenas **executa** e devolve o resultado.

```
Lovable (front)  →  Edge Function aip-run-proxy  →  este servidor (Railway)
                                    ↑                        │
                                    └──── SSE / Supabase ─────┘
```

## Deploy no Railway

1. Crie um projeto no Railway → **Deploy from GitHub repo** apontando para a
   pasta `agent-sdk-server/` (ou faça upload dessa pasta).
2. Configure as variáveis (aba *Variables*):

| Variável | Para que serve |
| --- | --- |
| `RUNNER_KEY` | Chave compartilhada com o Lovable (obrigatória em produção) |
| `ANTHROPIC_API_KEY` | Chave da Anthropic usada pelo Claude Agent SDK |
| `SUPABASE_URL` | URL do backend do CRM (para gravar resultado/tokens/custo) |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço do backend |
| `PORT` | Preenchida automaticamente pelo Railway |

3. Copie a URL pública gerada (ex.: `https://meu-runner.up.railway.app`).

## Ligar no Lovable

No app, vá em **Agentes IA → Motor de execução**, escolha *Servidor Claude
Agent SDK* e cadastre os dois secrets do backend:

- `AIP_RUNNER_URL` → a URL do Railway
- `AIP_RUNNER_KEY` → o mesmo valor de `RUNNER_KEY`

Depois clique em **Testar conexão**.

## Contrato HTTP

Todas as rotas são `POST` e exigem o header `X-Runner-Key`.

| Rota | Corpo | Resposta |
| --- | --- | --- |
| `/health` | `{}` | `{ ok, versao, anthropic, supabase }` |
| `/start` | `{ execution_id, agent, skills[], tools[], mcps[], modelo, prompt, input }` | `{ ok, status }` |
| `/stream` | `{ execution_id }` | SSE `data: {"text": "..."}` até `data: [DONE]` |
| `/resume` | `{ execution_id, approval_id, resultado }` | `{ ok }` |
| `/cancel` | `{ execution_id }` | `{ ok }` |
| `/status` | `{ execution_id }` | estado da execução |
| `/mcp/probe` | `{ endpoint, cabecalhos?, timeout_ms? }` | handshake JSON-RPC com um servidor MCP; devolve status, ferramentas e latência (usado pela tela **Agentes IA → MCP**) |
| `/runs` | `{ limite? }` | painel de monitoramento: uptime, memória, versão/commit e execuções em memória (tela **Agentes IA → Monitor do servidor**) |
| `/runs/limpar` | `{}` | remove da memória as execuções já finalizadas |
| `/update` | `{ forcar? }` | dispara o Deploy Hook do Railway para atualizar o servidor (requer `RAILWAY_DEPLOY_HOOK_URL`) |

> Para o botão **Atualizar servidor** funcionar, crie um *Deploy Hook* no Railway
> (Settings → Deploys) e salve a URL na variável `RAILWAY_DEPLOY_HOOK_URL`.


### Exemplo de payload enviado pelo Lovable

```json
{
  "execution_id": "uuid-da-execucao",
  "modelo": "claude-sonnet-4-5",
  "prompt": "Gere um vídeo institucional de 30s",
  "agent": { "nome": "Produtor", "prompt_principal": "Você é ..." },
  "skills": [{ "nome": "roteiro", "conteudo_md": "# Como escrever ..." }],
  "tools": [{ "nome": "remotion.render", "tipo": "http" }],
  "mcps": [{ "nome": "Pilar CRM", "endpoint": "https://.../functions/v1/mcp" }],
  "input": { "produto": "Linha X" }
}
```

O servidor transforma **skills** em system prompt, **MCPs** em `mcpServers` do
Claude Agent SDK e envia o texto gerado em streaming. Ao terminar, grava
`resposta`, `tokens_input`, `tokens_output` e `custo` na tabela
`aip_executions`.

## Rodar local

```bash
cp .env.example .env   # preencha as chaves
npm install
npm run dev
```
