import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { useState, useEffect } from "react";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

interface OmnichannelFlow {
  id: string;
  nome: string;
  descricao?: string;
}

export const BotJumpConfig = ({ config, handleConfigChange }: ConfigProps) => {
  const [omnichannelFlows, setOmnichannelFlows] = useState<OmnichannelFlow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOmnichannelFlows();
  }, []);

  const loadOmnichannelFlows = async () => {
    setLoading(true);
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      const { data, error } = await supabase
        .from("omnichannel_flows")
        .select("id, nome, descricao")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("ativo", true)
        .order("nome");

      if (error) throw error;
      setOmnichannelFlows(data || []);
    } catch (error) {
      console.error("Erro ao carregar fluxos omnichannel:", error);
      toast.error("Erro ao carregar fluxos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Transfira o chat para um fluxo omnichannel de roteamento automático.
      </p>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Fluxo Omnichannel</Label>
          <Select
            value={config.omnichannelFlowId || ""}
            onValueChange={(value) => handleConfigChange("omnichannelFlowId", value)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder={loading ? "Carregando..." : "Selecione um fluxo"} />
            </SelectTrigger>
            <SelectContent>
              {omnichannelFlows.map((flow) => (
                <SelectItem key={flow.id} value={flow.id}>
                  {flow.nome}
                  {flow.descricao && (
                    <span className="text-xs text-muted-foreground ml-2">
                      - {flow.descricao}
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm bg-muted p-3 rounded-lg space-y-2">
          <p className="font-medium">Como funciona:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>O chat será transferido do bot para o sistema omnichannel</li>
            <li>O fluxo selecionado decidirá a fila e o atendente</li>
            <li>O cliente será notificado sobre a transferência</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
