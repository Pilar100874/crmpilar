import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Database } from "lucide-react";
import { DefaultableTextField } from "./DefaultableTextField";
import { ConfigSection, ConfigSwitch } from "./ConfigField";

const DEFAULT_HANDOFF_MESSAGE = "Você foi transferido para um atendente. Aguarde, por favor.";

const HandoffMessageSection = ({ config, handleConfigChange }: { config: any; handleConfigChange: (k: string, v: any) => void }) => (
  <ConfigSection title="Mensagem enviada ao cliente">
    <div className="space-y-3">
      <ConfigSwitch
        label="Enviar mensagem ao transferir"
        checked={config.sendHandoffMessage !== false}
        onChange={(checked) => handleConfigChange('sendHandoffMessage', checked)}
        info="Quando desativado, o cliente não recebe nenhuma mensagem na transferência."
      />
      {config.sendHandoffMessage !== false && (
        <DefaultableTextField
          label="Texto da mensagem"
          defaultValue={DEFAULT_HANDOFF_MESSAGE}
          value={config.handoffMessage}
          onChange={(v) => handleConfigChange('handoffMessage', v)}
          multiline
          rows={3}
        />
      )}
    </div>
  </ConfigSection>
);

interface RoutingConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}


export const TransferirOmnichannelConfig = ({ config, handleConfigChange }: RoutingConfigProps) => {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(config.workflowId || '');

  useEffect(() => {
    console.log("🔄 [TransferirOmnichannelConfig] Montado com config:", config);
    loadWorkflows();
  }, []);

  useEffect(() => {
    console.log("📝 [TransferirOmnichannelConfig] Config atualizado:", config);
    setSelectedWorkflowId(config.workflowId || '');
  }, [config.workflowId]);

  const loadWorkflows = async () => {
    try {
      const estabId = await getEstabelecimentoId();
      const { data } = await supabase
        .from("omnichannel_flows")
        .select("*")
        .eq("estabelecimento_id", estabId)
        .eq("ativo", true)
        .order("nome");
      
      console.log("✅ [TransferirOmnichannelConfig] Workflows carregados:", data?.length);
      setWorkflows(data || []);
    } catch (error) {
      console.error("❌ [TransferirOmnichannelConfig] Erro ao carregar workflows:", error);
    }
  };

  const handleWorkflowChange = (value: string) => {
    console.log("🎯 [TransferirOmnichannelConfig] Selecionando workflow:", value);
    
    // Atualizar estado local imediatamente
    setSelectedWorkflowId(value);
    
    // Salvar no config do bloco
    handleConfigChange('workflowId', value);
    
    console.log("✅ [TransferirOmnichannelConfig] workflowId salvo:", value);
  };

  return (
    <>
      <div className="space-y-2">
        <Label>Workflow Omnichannel *</Label>
        <Select
          value={selectedWorkflowId}
          onValueChange={handleWorkflowChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o workflow" />
          </SelectTrigger>
          <SelectContent>
            {workflows.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground text-center">
                Nenhum workflow ativo encontrado
              </div>
            ) : (
              workflows.map((workflow) => (
                <SelectItem key={workflow.id} value={workflow.id}>
                  <div className="flex items-center gap-2">
                    <Database className="h-3 w-3" />
                    {workflow.nome}
                    {workflow.is_default && (
                      <span className="text-xs text-primary">(Padrão)</span>
                    )}
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {selectedWorkflowId && (
          <p className="text-xs text-muted-foreground">
            Selecionado: <strong>{workflows.find(w => w.id === selectedWorkflowId)?.nome || 'Workflow'}</strong>
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Escolha o workflow omnichannel que será acionado
        </p>
      </div>

      <div className="flex items-center justify-between">
        <Label>Passar Contexto do Chat</Label>
        <Switch
          checked={config.contextoChat !== false}
          onCheckedChange={(checked) => {
            console.log("🔄 [TransferirOmnichannelConfig] Alterando contextoChat:", checked);
            handleConfigChange('contextoChat', checked);
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Enviar histórico e dados do cliente para o workflow
      </p>
      <HandoffMessageSection config={config} handleConfigChange={handleConfigChange} />
    </>
  );
};


export const EnviarFilaConfig = ({ config, handleConfigChange }: RoutingConfigProps) => {
  const [filas, setFilas] = useState<any[]>([]);

  useEffect(() => {
    loadFilas();
  }, []);

  const loadFilas = async () => {
    try {
      const estabId = await getEstabelecimentoId();
      const { data } = await supabase
        .from("filas_atendimento")
        .select("*")
        .eq("estabelecimento_id", estabId)
        .eq("ativa", true);
      setFilas(data || []);
    } catch (error) {
      console.error("Erro ao carregar filas:", error);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <Label>Fila de Atendimento *</Label>
        <Select
          value={config.filaId || ''}
          onValueChange={(value) => {
            const fila = filas.find(f => f.id === value);
            handleConfigChange('filaId', value);
            if (fila) {
              handleConfigChange('filaNome', fila.nome);
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a fila" />
          </SelectTrigger>
          <SelectContent>
            {filas.map((fila) => (
              <SelectItem key={fila.id} value={fila.id}>
                <div className="flex items-center gap-2">
                  <Database className="h-3 w-3" />
                  {fila.nome}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Fila para onde o chat será direcionado
        </p>
      </div>

      <div className="space-y-2">
        <Label>Prioridade</Label>
        <Input
          type="number"
          value={config.prioridade || 0}
          onChange={(e) => handleConfigChange('prioridade', parseInt(e.target.value) || 0)}
          min={0}
          max={10}
        />
        <p className="text-xs text-muted-foreground">
          0 = normal, 10 = máxima prioridade
        </p>
      </div>
    </>
  );
};

export const AtribuirAtendenteConfig = ({ config, handleConfigChange }: RoutingConfigProps) => {
  const [atendentes, setAtendentes] = useState<any[]>([]);

  useEffect(() => {
    loadAtendentes();
  }, []);

  const loadAtendentes = async () => {
    try {
      const estabId = await getEstabelecimentoId();
      const { data } = await supabase
        .from("atendentes")
        .select("id, usuario_id, usuarios(nome)")
        .eq("estabelecimento_id", estabId);
      setAtendentes(data || []);
    } catch (error) {
      console.error("Erro ao carregar atendentes:", error);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <Label>Atendente *</Label>
        <Select
          value={config.atendenteId || ''}
          onValueChange={(value) => {
            const atendente = atendentes.find(a => a.id === value);
            handleConfigChange('atendenteId', value);
            if (atendente) {
              handleConfigChange('atendenteNome', atendente.usuarios?.nome || '');
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o atendente" />
          </SelectTrigger>
          <SelectContent>
            {atendentes.map((atendente) => (
              <SelectItem key={atendente.id} value={atendente.id}>
                <div className="flex items-center gap-2">
                  <Database className="h-3 w-3" />
                  {atendente.usuarios?.nome || atendente.usuario_id}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Atendente que receberá o chat
        </p>
      </div>

      <div className="flex items-center justify-between">
        <Label>Forçar Atribuição</Label>
        <Switch
          checked={config.forcarAtribuicao === true}
          onCheckedChange={(checked) => handleConfigChange('forcarAtribuicao', checked)}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Atribuir mesmo se atendente estiver ocupado
      </p>
    </>
  );
};

export const DefinirPrioridadeConfig = ({ config, handleConfigChange }: RoutingConfigProps) => {
  return (
    <>
      <div className="space-y-2">
        <Label>Nível de Prioridade *</Label>
        <Select
          value={config.prioridade || 'normal'}
          onValueChange={(value) => handleConfigChange('prioridade', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="baixa">🟢 Baixa</SelectItem>
            <SelectItem value="normal">🟡 Normal</SelectItem>
            <SelectItem value="alta">🟠 Alta</SelectItem>
            <SelectItem value="urgente">🔴 Urgente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Motivo (opcional)</Label>
        <Textarea
          value={config.motivo || ''}
          onChange={(e) => handleConfigChange('motivo', e.target.value)}
          placeholder="Explique por que definiu esta prioridade..."
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Ajuda a equipe a entender a urgência
        </p>
      </div>
    </>
  );
};
