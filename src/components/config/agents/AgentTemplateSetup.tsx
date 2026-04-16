import { useState } from 'react';
import { AGENT_TEMPLATES, ORCHESTRATOR_TEMPLATE, AgentTemplate } from '@/constants/agentTemplates';
import { useChatAgents } from '@/hooks/useChatAgents';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Wand2, Network, Bot } from 'lucide-react';

interface Props {
  estabelecimentoId: string;
  onComplete: () => void;
}

export default function AgentTemplateSetup({ estabelecimentoId, onComplete }: Props) {
  const { agents, createAgent } = useChatAgents(estabelecimentoId);
  const [selected, setSelected] = useState<number[]>(AGENT_TEMPLATES.map((_, i) => i));
  const [createOrchestrator, setCreateOrchestrator] = useState(true);
  const [creating, setCreating] = useState(false);

  const toggleSelect = (idx: number) => {
    setSelected(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };

  const existingNames = agents.map(a => a.nome);
  const selectedToCreate = selected.filter(idx => !existingNames.includes(AGENT_TEMPLATES[idx].nome));
  const orchestratorWillBeCreated = createOrchestrator && !existingNames.includes(ORCHESTRATOR_TEMPLATE.nome);
  const totalToCreate = selectedToCreate.length + (orchestratorWillBeCreated ? 1 : 0);

  const handleCreateAll = async () => {
    if (selected.length === 0) {
      toast.error('Selecione pelo menos um agente');
      return;
    }
    setCreating(true);
    try {
      const createdIds: string[] = [];
      for (const idx of selected) {
        const t = AGENT_TEMPLATES[idx];
        if (existingNames.includes(t.nome)) continue;
        const result = await createAgent({
          nome: t.nome,
          descricao: t.descricao,
          icone: t.icone,
          cor: t.cor,
          system_prompt: t.system_prompt,
          knowledge_base_type: t.knowledge_base_type,
          usar_estoque_sistema: t.usar_estoque_sistema,
          usar_produtos_importados: t.usar_produtos_importados,
          solicitar_cnpj: t.solicitar_cnpj,
          gerar_pre_orcamento: t.gerar_pre_orcamento,
          resposta_formato_tabela: t.resposta_formato_tabela,
          acumular_filtros: t.acumular_filtros,
          permite_cliente: t.permite_cliente,
          tipo_agente: t.tipo_agente,
          modo_operacao: t.modo_operacao,
          modelo_ia: t.modelo_ia,
          ordem: idx,
        });
        if (result) createdIds.push(result.id);
      }

      if (createOrchestrator && !existingNames.includes(ORCHESTRATOR_TEMPLATE.nome)) {
        await createAgent({
          nome: ORCHESTRATOR_TEMPLATE.nome,
          descricao: ORCHESTRATOR_TEMPLATE.descricao,
          icone: ORCHESTRATOR_TEMPLATE.icone,
          cor: ORCHESTRATOR_TEMPLATE.cor,
          system_prompt: ORCHESTRATOR_TEMPLATE.system_prompt,
          knowledge_base_type: ORCHESTRATOR_TEMPLATE.knowledge_base_type,
          usar_estoque_sistema: ORCHESTRATOR_TEMPLATE.usar_estoque_sistema,
          usar_produtos_importados: ORCHESTRATOR_TEMPLATE.usar_produtos_importados,
          solicitar_cnpj: ORCHESTRATOR_TEMPLATE.solicitar_cnpj,
          gerar_pre_orcamento: ORCHESTRATOR_TEMPLATE.gerar_pre_orcamento,
          resposta_formato_tabela: ORCHESTRATOR_TEMPLATE.resposta_formato_tabela,
          acumular_filtros: ORCHESTRATOR_TEMPLATE.acumular_filtros,
          permite_cliente: ORCHESTRATOR_TEMPLATE.permite_cliente,
          tipo_agente: ORCHESTRATOR_TEMPLATE.tipo_agente,
          modo_operacao: ORCHESTRATOR_TEMPLATE.modo_operacao,
          modelo_ia: ORCHESTRATOR_TEMPLATE.modelo_ia,
          sub_agent_ids: createdIds,
          ordem: 99,
        });
      }

      toast.success(`${createdIds.length} agentes criados com sucesso!`);
      onComplete();
    } catch (err: any) {
      toast.error('Erro ao criar agentes: ' + (err.message || 'erro desconhecido'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Wand2 className="h-6 w-6 text-primary" />
          Configuração Rápida de Agentes
        </h2>
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
          Crie automaticamente os 11 agentes especialistas para vendas B2B com prompts otimizados e configurações prontas para uso.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {AGENT_TEMPLATES.map((t, idx) => {
          const exists = existingNames.includes(t.nome);
          const isSelected = selected.includes(idx);
          return (
            <Card
              key={idx}
              className={`cursor-pointer transition-all ${isSelected && !exists ? 'ring-2 ring-primary' : ''} ${exists ? 'opacity-50' : ''}`}
              onClick={() => !exists && toggleSelect(idx)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Checkbox checked={isSelected} disabled={exists} />
                  <span className="text-xl">{t.icone}</span>
                  <div>
                    <CardTitle className="text-sm">{t.nome}</CardTitle>
                    <CardDescription className="text-xs">{t.descricao}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1">
                  {exists && <Badge variant="secondary" className="text-xs">Já existe</Badge>}
                  <Badge variant="outline" className="text-xs" style={{ borderColor: t.cor, color: t.cor }}>
                    {t.dominio}
                  </Badge>
                  {t.solicitar_cnpj && <Badge variant="outline" className="text-xs">CNPJ</Badge>}
                  {t.usar_estoque_sistema && <Badge variant="outline" className="text-xs">Estoque</Badge>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className={`transition-all ${createOrchestrator ? 'ring-2 ring-primary' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCreateOrchestrator(!createOrchestrator)}>
            <Checkbox checked={createOrchestrator} />
            <Network className="h-6 w-6 text-primary" />
            <div>
              <CardTitle className="text-base">{ORCHESTRATOR_TEMPLATE.icone} Orquestrador de Vendas</CardTitle>
              <CardDescription>{ORCHESTRATOR_TEMPLATE.descricao}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            O orquestrador será criado com todos os agentes selecionados acima como sub-agentes, combinando suas capacidades em um único ponto de atendimento.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onComplete}>Pular</Button>
        <Button onClick={handleCreateAll} disabled={creating || selected.length === 0}>
          {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
          Criar {selected.length} Agente{selected.length !== 1 ? 's' : ''}{createOrchestrator ? ' + Orquestrador' : ''}
        </Button>
      </div>
    </div>
  );
}
