import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Workflow } from "lucide-react";
import { WaitingMessageField } from "./WaitingMessageField";

interface TriggerWorkflowConfigProps {
  data: any;
  onChange: (config: any) => void;
}

export interface WorkflowModule {
  key: string;
  label: string;
  table: string;
  nameCol: string;
  idCol?: string;
  filter?: Record<string, any>;
}

export const WORKFLOW_MODULES: WorkflowModule[] = [
  { key: "bot", label: "Bot Builder", table: "bot_flows", nameCol: "name" },
  { key: "omnichannel", label: "Omnichannel", table: "omnichannel_flows", nameCol: "nome" },
  { key: "ecommerce_rules", label: "Regras E-commerce", table: "ecommerce_rules", nameCol: "nome" },
  { key: "automacoes_vendas", label: "Automações de Vendas", table: "automacoes_vendas", nameCol: "nome" },
  { key: "logistica", label: "Logística", table: "logistica_automacoes", nameCol: "nome" },
  { key: "ads", label: "Ads", table: "ads_automacoes", nameCol: "nome" },
  { key: "ai_studio", label: "AI Studio", table: "ai_studio_workflows", nameCol: "nome" },
  { key: "marketing_automation", label: "Automação de Marketing", table: "marketing_automations", nameCol: "name" },
];

export function TriggerWorkflowConfig({ data, onChange }: TriggerWorkflowConfigProps) {
  const config = data?.config || {};
  const [workflows, setWorkflows] = useState<Array<{ id: string; nome: string }>>([]);
  const [loading, setLoading] = useState(false);

  const update = (patch: Record<string, any>) => onChange({ ...config, ...patch });

  const moduleKey = config.module || "bot";
  const mod = WORKFLOW_MODULES.find((m) => m.key === moduleKey) || WORKFLOW_MODULES[0];

  useEffect(() => {
    let cancelled = false;
    const fetchList = async () => {
      setLoading(true);
      try {
        const { data: rows, error } = await (supabase as any)
          .from(mod.table)
          .select(`id, ${mod.nameCol}`)
          .order(mod.nameCol, { ascending: true })
          .limit(200);
        if (error) throw error;
        if (!cancelled) {
          setWorkflows(
            (rows || []).map((r: any) => ({ id: r.id, nome: r[mod.nameCol] || "(sem nome)" }))
          );
        }
      } catch (err) {
        console.error("[TriggerWorkflowConfig] load error", err);
        if (!cancelled) setWorkflows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchList();
    return () => {
      cancelled = true;
    };
  }, [mod.table, mod.nameCol]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Workflow className="h-4 w-4" />
        Dispara um workflow de qualquer módulo do sistema.
      </div>

      <div className="space-y-2">
        <Label>Módulo de destino</Label>
        <Select
          value={moduleKey}
          onValueChange={(v) => update({ module: v, workflowId: "", workflowName: "" })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WORKFLOW_MODULES.map((m) => (
              <SelectItem key={m.key} value={m.key}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Workflow a disparar</Label>
        <Select
          value={config.workflowId || ""}
          onValueChange={(v) => {
            const wf = workflows.find((w) => w.id === v);
            update({ workflowId: v, workflowName: wf?.nome || "" });
          }}
          disabled={loading || workflows.length === 0}
        >
          <SelectTrigger>
            {loading ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
              </span>
            ) : workflows.length === 0 ? (
              <span className="text-muted-foreground text-sm">
                Nenhum workflow encontrado em {mod.label}
              </span>
            ) : (
              <SelectValue placeholder="Selecione um workflow" />
            )}
          </SelectTrigger>
          <SelectContent>
            {workflows.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Modo de execução</Label>
        <Select
          value={config.executionMode || "async"}
          onValueChange={(v) => update({ executionMode: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="async">Disparar e continuar (assíncrono)</SelectItem>
            <SelectItem value="await">Aguardar resultado (síncrono)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between rounded-md border border-border p-3">
        <div>
          <Label className="text-sm">Passar variáveis do fluxo atual</Label>
          <p className="text-xs text-muted-foreground">
            Envia todas as variáveis disponíveis como payload.
          </p>
        </div>
        <Switch
          checked={config.passVariables !== false}
          onCheckedChange={(v) => update({ passVariables: v })}
        />
      </div>

      <div className="space-y-2">
        <Label>Payload extra (JSON, opcional)</Label>
        <Textarea
          rows={4}
          placeholder='{"foo": "bar", "cliente_id": "{{contato_id}}"}'
          value={config.payloadJson || ""}
          onChange={(e) => update({ payloadJson: e.target.value })}
          className="font-mono text-xs"
        />
        <p className="text-[11px] text-muted-foreground">
          Suporta variáveis no formato <code>{"{{nome_variavel}}"}</code>.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Variável de saída</Label>
        <Input
          value={config.outputVariable || "workflow_disparado"}
          onChange={(e) => update({ outputVariable: e.target.value })}
          placeholder="workflow_disparado"
        />
        <p className="text-[11px] text-muted-foreground">
          Recebe <code>{`{ ok, workflowId, module, result? }`}</code>.
        </p>
      </div>
    </div>
  );
}
