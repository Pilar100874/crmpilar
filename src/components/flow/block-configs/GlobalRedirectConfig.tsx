import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfigSection, ConfigInfo } from "./ConfigField";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Shuffle } from "lucide-react";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const GlobalRedirectConfig = ({ config, handleConfigChange }: ConfigProps) => {
  const [omnichannelFlows, setOmnichannelFlows] = useState<any[]>([]);
  const [atendentes, setAtendentes] = useState<any[]>([]);
  const [bots, setBots] = useState<any[]>([]);

  const destinationType = config.destinationType || "omnichannel";

  useEffect(() => {
    (async () => {
      try {
        const estabId = await getEstabelecimentoId();
        const [{ data: flows }, { data: ats }, { data: bs }] = await Promise.all([
          supabase
            .from("omnichannel_flows")
            .select("id, nome")
            .eq("estabelecimento_id", estabId)
            .eq("ativo", true)
            .order("nome"),
          supabase
            .from("atendentes")
            .select("id, usuario_id, usuarios(nome)")
            .eq("estabelecimento_id", estabId),
          supabase
            .from("bot_flows")
            .select("id, nome")
            .eq("estabelecimento_id", estabId)
            .order("nome"),
        ]);
        setOmnichannelFlows(flows || []);
        setAtendentes(ats || []);
        setBots(bs || []);
      } catch (e) {
        console.error("[GlobalRedirectConfig] erro carregando opções:", e);
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <ConfigSection title="Gatilho">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Palavra-chave / texto disparador *</Label>
            <Input
              value={config.triggerText || ""}
              onChange={(e) => handleConfigChange("triggerText", e.target.value)}
              placeholder="Ex: atendente, humano, falar com pessoa"
            />
            <p className="text-xs text-muted-foreground">
              A qualquer momento, se o cliente enviar essa mensagem, será redirecionado conforme abaixo.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Modo de comparação</Label>
            <Select
              value={config.matchMode || "exact"}
              onValueChange={(v) => handleConfigChange("matchMode", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exact">Exato</SelectItem>
                <SelectItem value="contains">Contém</SelectItem>
                <SelectItem value="startsWith">Começa com</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label>Diferenciar maiúsculas/minúsculas</Label>
            <Switch
              checked={config.caseSensitive === true}
              onCheckedChange={(c) => handleConfigChange("caseSensitive", c)}
            />
          </div>
        </div>
      </ConfigSection>

      <ConfigSection title="Destino">
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Redirecionar para *</Label>
            <Select
              value={destinationType}
              onValueChange={(v) => handleConfigChange("destinationType", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="omnichannel">Workflow Omnichannel</SelectItem>
                <SelectItem value="atendente">Atendente específico</SelectItem>
                <SelectItem value="whatsapp_number">Número de WhatsApp (Evolution)</SelectItem>
                <SelectItem value="bot">Outro Bot</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {destinationType === "omnichannel" && (
            <div className="space-y-2">
              <Label>Workflow Omnichannel *</Label>
              <Select
                value={config.omnichannelFlowId || ""}
                onValueChange={(v) => handleConfigChange("omnichannelFlowId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o workflow" />
                </SelectTrigger>
                <SelectContent>
                  {omnichannelFlows.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {destinationType === "atendente" && (
            <div className="space-y-2">
              <Label>Atendente *</Label>
              <Select
                value={config.atendenteId || ""}
                onValueChange={(v) => {
                  const a = atendentes.find((x) => x.id === v);
                  handleConfigChange("atendenteId", v);
                  if (a) handleConfigChange("atendenteNome", a.usuarios?.nome || "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o atendente" />
                </SelectTrigger>
                <SelectContent>
                  {atendentes.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.usuarios?.nome || a.usuario_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {destinationType === "whatsapp_number" && (
            <div className="space-y-2">
              <Label>Número de WhatsApp *</Label>
              <Input
                value={config.whatsappNumber || ""}
                onChange={(e) => handleConfigChange("whatsappNumber", e.target.value)}
                placeholder="Ex: 5511999999999"
              />
              <p className="text-xs text-muted-foreground">
                Apenas dígitos (DDI + DDD + número). O cliente receberá um link wa.me para falar nesse número.
              </p>
            </div>
          )}

          {destinationType === "bot" && (
            <div className="space-y-2">
              <Label>Outro Bot *</Label>
              <Select
                value={config.botFlowId || ""}
                onValueChange={(v) => handleConfigChange("botFlowId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o bot" />
                </SelectTrigger>
                <SelectContent>
                  {bots.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Mensagem de transferência</Label>
            <Textarea
              value={config.handoffMessage || ""}
              onChange={(e) => handleConfigChange("handoffMessage", e.target.value)}
              placeholder="Mensagem enviada ao cliente antes do redirecionamento"
              rows={2}
            />
          </div>
        </div>
      </ConfigSection>

      <ConfigInfo variant="info">
        <p className="font-semibold mb-1 flex items-center gap-2">
          <Shuffle className="w-4 h-4" /> Como funciona
        </p>
        <p className="text-xs">
          A partir deste bloco, em qualquer ponto da conversa, se o cliente digitar a palavra-chave configurada
          (do jeito que você escolheu comparar), o fluxo atual é interrompido e o atendimento é encaminhado para o destino selecionado.
        </p>
      </ConfigInfo>
    </div>
  );
};
