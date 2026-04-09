import { ChatAgent } from '@/hooks/useChatAgents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Network, Bot, ChevronRight } from 'lucide-react';

interface Props {
  agents: ChatAgent[];
}

function AgentNode({ agent, allAgents, depth = 0 }: { agent: ChatAgent; allAgents: ChatAgent[]; depth?: number }) {
  const subIds = agent.sub_agent_ids || [];
  const subAgents = allAgents.filter(a => subIds.includes(a.id));
  const isOrch = agent.tipo_agente === 'orquestrador';

  return (
    <div className="space-y-3">
      <Card className={`transition-all hover:shadow-md ${
        isOrch 
          ? 'border-2 border-primary shadow-lg bg-primary/5' 
          : 'border-border'
      }`} style={{ marginLeft: depth > 0 ? `${depth * 24}px` : undefined }}>
        <CardContent className="p-4 flex items-center gap-3">
          {depth > 0 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className="text-2xl">{agent.icone}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{agent.nome}</p>
            <p className="text-xs text-muted-foreground truncate">{agent.descricao}</p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {isOrch && (
              <Badge className="bg-primary text-primary-foreground text-xs">
                <Network className="h-3 w-3 mr-1" />
                {subAgents.length} agentes
              </Badge>
            )}
            <Badge variant={agent.ativo ? 'default' : 'secondary'} className="text-xs">
              {agent.ativo ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Sub-agents recursivos */}
      {subAgents.length > 0 && (
        <div className="space-y-2 relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-primary/20" style={{ marginLeft: depth * 24 }} />
          {subAgents.map(sub => (
            <AgentNode key={sub.id} agent={sub} allAgents={allAgents} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function AgentOrchestratorView({ agents }: Props) {
  const orchestrators = agents.filter(a => a.tipo_agente === 'orquestrador');
  // Root orchestrators = not referenced as sub_agent of any other orchestrator
  const allSubIds = orchestrators.flatMap(o => o.sub_agent_ids || []);
  const rootOrchestrators = orchestrators.filter(o => !allSubIds.includes(o.id));
  
  // Agents not linked to any orchestrator
  const allLinkedIds = new Set(agents.filter(a => a.tipo_agente === 'orquestrador').flatMap(a => a.sub_agent_ids || []));
  const unlinked = agents.filter(a => a.tipo_agente !== 'orquestrador' && !allLinkedIds.has(a.id));

  if (rootOrchestrators.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg border-dashed">
        <Network className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">Nenhum orquestrador configurado</p>
        <p className="text-xs text-muted-foreground mt-1">Crie um agente do tipo "Orquestrador" para coordenar os especialistas</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">
        Hierarquia de agentes: orquestradores podem conter especialistas e/ou outros orquestradores em cascata.
      </p>

      {rootOrchestrators.map(orch => (
        <AgentNode key={orch.id} agent={orch} allAgents={agents} depth={0} />
      ))}

      {unlinked.length > 0 && (
        <div className="mt-6">
          <p className="text-xs text-muted-foreground mb-2">Agentes disponíveis (não vinculados a nenhum orquestrador):</p>
          <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-5">
            {unlinked.map(agent => (
              <div key={agent.id} className="flex items-center gap-2 p-2 rounded-lg border border-dashed opacity-50">
                <span className="text-lg">{agent.icone}</span>
                <span className="text-xs truncate">{agent.nome}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
