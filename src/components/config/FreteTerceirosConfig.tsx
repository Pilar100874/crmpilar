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
  { value: "uber_direct", label: "Uber Direct (entrega expressa)" },
  { value: "lalamove", label: "Lalamove (entrega expressa)" },
  { value: "custom", label: "Outro (personalizado)" },
];

const LALAMOVE_SERVICOS = [
  { value: "MOTORCYCLE", label: "Moto" },
  { value: "SEDAN", label: "Carro (sedan)" },
  { value: "VAN", label: "Van" },
  { value: "TRUCK550", label: "Caminhão 550" },
];


export default function FreteTerceirosConfig({ estabelecimentoId }: { estabelecimentoId: string }) {
  const [configs, setConfigs] = useState<FreteConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showKeys, setShowKeys] = useState<Set<string>>(new Set());
  const [testando, setTestando] = useState<string | null>(null);
  const [enderecoTeste, setEnderecoTeste] = useState({ coleta: "", entrega: "" });


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

  const updateExtra = async (config: FreteConfig, campo: string, value: string) => {
    const extra = { ...(config.configuracao_extra || {}), [campo]: value };
    await updateConfig(config.id, "configuracao_extra", extra);
  };

  const testarCotacao = async (config: FreteConfig) => {
    setTestando(config.id);
    try {
      const { data, error } = await supabase.functions.invoke("frete-entrega-expressa", {
        body: {
          estabelecimento_id: estabelecimentoId,
          provider: config.provider,
          coleta: { endereco: enderecoTeste.coleta },
          entrega: { endereco: enderecoTeste.entrega },
        },
      });
      if (error) throw error;
      const cotacao = (data as any)?.cotacoes?.[0];
      if (!cotacao) {
        toast.error((data as any)?.aviso || "Nenhuma cotação retornada. Ative a integração antes de testar.");
      } else if (cotacao.erro) {
        toast.error(cotacao.erro);
      } else {
        toast.success(
          `${cotacao.nome}: ${cotacao.valor != null
            ? cotacao.valor.toLocaleString("pt-BR", { style: "currency", currency: cotacao.moeda || "BRL" })
            : "valor não informado"}${cotacao.prazo_minutos ? ` • ~${cotacao.prazo_minutos} min` : ""}`
        );
      }
    } catch (e: any) {
      toast.error(e?.message || "Falha ao consultar a cotação");
    } finally {
      setTestando(null);
    }
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
                <Label className="text-xs">
                  {config.provider === "uber_direct" ? "Client Secret" : "API Key"}
                </Label>
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
                <Label className="text-xs">
                  {config.provider === "lalamove"
                    ? "API Secret"
                    : config.provider === "uber_direct"
                      ? "Token (opcional)"
                      : "Token (opcional)"}
                </Label>
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

            {config.provider === "uber_direct" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Client ID</Label>
                  <Input
                    className="h-8 text-xs"
                    value={config.configuracao_extra?.client_id || ""}
                    onChange={e => updateExtra(config, "client_id", e.target.value)}
                    placeholder="Client ID do Uber Direct"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Customer ID</Label>
                  <Input
                    className="h-8 text-xs"
                    value={config.configuracao_extra?.customer_id || ""}
                    onChange={e => updateExtra(config, "customer_id", e.target.value)}
                    placeholder="Customer ID (organização)"
                  />
                </div>
              </div>
            )}

            {config.provider === "lalamove" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Mercado</Label>
                  <Input
                    className="h-8 text-xs"
                    value={config.configuracao_extra?.market || "BR"}
                    onChange={e => updateExtra(config, "market", e.target.value.toUpperCase())}
                    placeholder="BR"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tipo de veículo</Label>
                  <Select
                    value={config.configuracao_extra?.service_type || "MOTORCYCLE"}
                    onValueChange={v => updateExtra(config, "service_type", v)}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LALAMOVE_SERVICOS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {(config.provider === "uber_direct" || config.provider === "lalamove") && (
              <div className="rounded-md border border-dashed p-3 space-y-2">
                <Label className="text-xs font-medium">Testar cotação de entrega</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    className="h-8 text-xs"
                    value={enderecoTeste.coleta}
                    onChange={e => setEnderecoTeste(p => ({ ...p, coleta: e.target.value }))}
                    placeholder="Endereço de coleta"
                  />
                  <Input
                    className="h-8 text-xs"
                    value={enderecoTeste.entrega}
                    onChange={e => setEnderecoTeste(p => ({ ...p, entrega: e.target.value }))}
                    placeholder="Endereço de entrega"
                  />
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1.5"
                  disabled={testando === config.id || !enderecoTeste.coleta || !enderecoTeste.entrega}
                  onClick={() => testarCotacao(config)}
                >
                  <Truck className="h-3.5 w-3.5" />
                  {testando === config.id ? "Consultando..." : "Consultar preço"}
                </Button>
              </div>
            )}

          </CardContent>
        </Card>
      ))}
    </div>
  );
}
