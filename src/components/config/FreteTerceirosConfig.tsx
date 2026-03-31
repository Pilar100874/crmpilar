import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Truck, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface FreteConfig {
  id: string;
  provider: string;
  nome_display: string;
  api_url: string;
  api_key: string;
  token: string;
  ativo: boolean;
  configuracao_extra: Record<string, any>;
}

const PROVIDERS = [
  { value: "melhor_envio", label: "Melhor Envio" },
  { value: "correios", label: "Correios (API)" },
  { value: "jadlog", label: "JadLog" },
  { value: "braspress", label: "Braspress" },
  { value: "tnt", label: "TNT / FedEx" },
  { value: "kangu", label: "Kangu" },
  { value: "frenet", label: "Frenet" },
  { value: "intelipost", label: "Intelipost" },
  { value: "custom", label: "Outro (personalizado)" },
];

export default function FreteTerceirosConfig({ estabelecimentoId }: { estabelecimentoId: string }) {
  const [configs, setConfigs] = useState<FreteConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKeys, setShowKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadConfigs();
  }, [estabelecimentoId]);

  const loadConfigs = async () => {
    const { data, error } = await supabase
      .from("frete_terceiros_config" as any)
      .select("*")
      .eq("estabelecimento_id", estabelecimentoId)
      .order("created_at");

    if (!error && data) {
      setConfigs(data as any[]);
    }
    setLoading(false);
  };

  const addConfig = async () => {
    const { data, error } = await supabase
      .from("frete_terceiros_config" as any)
      .insert({
        estabelecimento_id: estabelecimentoId,
        provider: "melhor_envio",
        nome_display: "Melhor Envio",
        api_url: "",
        api_key: "",
        token: "",
        ativo: false,
        configuracao_extra: {},
      } as any)
      .select()
      .single();

    if (error) {
      toast.error("Erro ao adicionar configuração");
      return;
    }
    setConfigs([...configs, data as any]);
    toast.success("Configuração adicionada");
  };

  const updateConfig = async (id: string, field: string, value: any) => {
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));

    const { error } = await supabase
      .from("frete_terceiros_config" as any)
      .update({ [field]: value } as any)
      .eq("id", id);

    if (error) toast.error("Erro ao salvar");
  };

  const deleteConfig = async (id: string) => {
    const { error } = await supabase
      .from("frete_terceiros_config" as any)
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao remover");
      return;
    }
    setConfigs(prev => prev.filter(c => c.id !== id));
    toast.success("Configuração removida");
  };

  const toggleShowKey = (id: string) => {
    setShowKeys(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (loading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">APIs de Frete de Terceiros</h3>
          <p className="text-xs text-muted-foreground">Configure integrações com transportadoras e gateways de frete</p>
        </div>
        <Button size="sm" onClick={addConfig} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </Button>
      </div>

      {configs.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg border-dashed">
          <Truck className="h-8 w-8 mx-auto mb-2 opacity-40" />
          Nenhuma API de frete configurada.<br />
          Clique em "Adicionar" para integrar uma transportadora.
        </div>
      )}

      {configs.map((config) => (
        <Card key={config.id} className="border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Switch
                  checked={config.ativo}
                  onCheckedChange={v => updateConfig(config.id, "ativo", v)}
                />
                <span className="text-sm font-medium">{config.nome_display || config.provider}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteConfig(config.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Provedor</Label>
                <Select
                  value={config.provider}
                  onValueChange={v => {
                    const prov = PROVIDERS.find(p => p.value === v);
                    updateConfig(config.id, "provider", v);
                    if (prov) updateConfig(config.id, "nome_display", prov.label);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Nome de exibição</Label>
                <Input
                  className="h-8 text-xs"
                  value={config.nome_display}
                  onChange={e => updateConfig(config.id, "nome_display", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">URL da API</Label>
              <Input
                className="h-8 text-xs"
                value={config.api_url}
                onChange={e => updateConfig(config.id, "api_url", e.target.value)}
                placeholder="https://api.provider.com/v1"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">API Key</Label>
                <div className="relative">
                  <Input
                    className="h-8 text-xs pr-8"
                    type={showKeys.has(config.id + "_key") ? "text" : "password"}
                    value={config.api_key}
                    onChange={e => updateConfig(config.id, "api_key", e.target.value)}
                    placeholder="Sua chave de API"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey(config.id + "_key")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showKeys.has(config.id + "_key") ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Token (opcional)</Label>
                <div className="relative">
                  <Input
                    className="h-8 text-xs pr-8"
                    type={showKeys.has(config.id + "_token") ? "text" : "password"}
                    value={config.token}
                    onChange={e => updateConfig(config.id, "token", e.target.value)}
                    placeholder="Token de autenticação"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey(config.id + "_token")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showKeys.has(config.id + "_token") ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
