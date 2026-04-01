import { ChatAgent } from '@/hooks/useChatAgents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Network, ArrowRight, Bot } from 'lucide-react';

interface Props {
  agents: ChatAgent[];
}

export default function AgentOrchestratorView({ agents }: Props) {
  const orchestrators = agents.filter(a => a.tipo_agente === 'orquestrador');
  const specialists = agents.filter(a => a.tipo_agente !== 'orquestrador');

  if (orchestrators.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg border-dashed">
        <Network className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-muted-foreground">Nenhum orquestrador configurado</p>
        <p className="text-xs text-muted-foreground mt-1">Crie um agente do tipo "Orquestrador" para coordenar os especialistas</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {orchestrators.map(orch => {
        const subIds = orch.sub_agent_ids || [];
        const subAgents = specialists.filter(a => subIds.includes(a.id));
        const unlinked = specialists.filter(a => !subIds.includes(a.id));

        return (
          <div key={orch.id} className="space-y-4">
            {/* Orquestrador central */}
            <div className="flex justify-center">
              <Card className="w-80 border-2 border-primary shadow-lg bg-primary/5">
                <CardHeader className="pb-2 text-center">
                  <CardTitle className="text-lg flex items-center justify-center gap-2">
                    <span className="text-3xl">{orch.icone}</span>
                    {orch.nome}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{orch.descricao}</p>
                </CardHeader>
                <CardContent className="pt-0 text-center">
                  <Badge className="bg-primary text-primary-foreground">
                    <Network className="h-3 w-3 mr-1" />
                    Orquestrador · {subAgents.length} agentes
                  </Badge>
                </CardContent>
              </Card>
            </div>

            {/* Linhas de conexão visual */}
            {subAgents.length > 0 && (
              <div className="flex justify-center">
                <div className="w-0.5 h-6 bg-primary/30" />
              </div>
            )}

            {/* Agentes vinculados */}
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
              {subAgents.map(agent => (
                <Card key={agent.id} className="border-primary/20 bg-primary/5 transition-all hover:shadow-md">
                  <CardContent className="p-4 flex items-center gap-3">
                    <span className="text-2xl">{agent.icone}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{agent.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">{agent.descricao}</p>
                    </div>
                    <Badge variant={agent.ativo ? 'default' : 'secondary'} className="text-xs shrink-0">
                      {agent.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Agentes não vinculados */}
            {unlinked.length > 0 && (
              <div className="mt-6">
                <p className="text-xs text-muted-foreground mb-2">Agentes disponíveis (não vinculados a este orquestrador):</p>
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
      })}
    </div>
  );
}
