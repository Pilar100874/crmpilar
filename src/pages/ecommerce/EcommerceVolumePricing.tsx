import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Plus, Trash2, Package, ToggleLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VolumeTier {
  id?: string;
  nome_faixa: string;
  valor_minimo: number;
  valor_maximo: number | null;
  percentual_desconto: number;
  ativo: boolean;
  ordem: number;
}

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function EcommerceVolumePricing() {
  const navigate = useNavigate();
  const [tiers, setTiers] = useState<VolumeTier[]>([]);
  const [b2bEnabled, setB2bEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const estId = localStorage.getItem("estabelecimentoId");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!estId) { setLoading(false); return; }

    const [tiersRes, configRes] = await Promise.all([
      supabase
        .from("ecommerce_volume_pricing")
        .select("*")
        .eq("estabelecimento_id", estId)
        .order("ordem"),
      supabase
        .from("ecommerce_config")
        .select("feat_b2b_volume")
        .eq("estabelecimento_id", estId)
        .maybeSingle(),
    ]);

    if (tiersRes.data) {
      setTiers(tiersRes.data.map(t => ({
        id: t.id,
        nome_faixa: t.nome_faixa,
        valor_minimo: Number(t.valor_minimo),
        valor_maximo: t.valor_maximo != null ? Number(t.valor_maximo) : null,
        percentual_desconto: Number(t.percentual_desconto),
        ativo: t.ativo,
        ordem: t.ordem,
      })));
    }

    if (configRes.data) {
      setB2bEnabled((configRes.data as any).feat_b2b_volume ?? true);
    }

    setLoading(false);
  };

  const addTier = () => {
    const lastTier = tiers[tiers.length - 1];
    const nextMin = lastTier ? ((lastTier.valor_maximo || lastTier.valor_minimo) + 0.01) : 0;
    setTiers([...tiers, {
      nome_faixa: `Faixa ${tiers.length + 1}`,
      valor_minimo: Math.round(nextMin * 100) / 100,
      valor_maximo: Math.round((nextMin + 9999.99) * 100) / 100,
      percentual_desconto: (tiers.length + 1) * 5,
      ativo: true,
      ordem: tiers.length,
    }]);
  };

  const removeTier = (index: number) => {
    setTiers(tiers.filter((_, i) => i !== index));
  };

  const updateTier = (index: number, field: keyof VolumeTier, value: any) => {
    setTiers(tiers.map((t, i) => i === index ? { ...t, [field]: value } : t));
  };

  const handleSave = async () => {
    if (!estId) return;
    setSaving(true);

    try {
      await supabase
        .from("ecommerce_config")
        .upsert({ estabelecimento_id: estId, feat_b2b_volume: b2bEnabled } as any, { onConflict: "estabelecimento_id" });

      await supabase
        .from("ecommerce_volume_pricing")
        .delete()
        .eq("estabelecimento_id", estId);

      if (tiers.length > 0) {
        const rows = tiers.map((t, i) => ({
          estabelecimento_id: estId,
          nome_faixa: t.nome_faixa,
          valor_minimo: t.valor_minimo,
          valor_maximo: t.valor_maximo,
          percentual_desconto: t.percentual_desconto,
          ativo: t.ativo,
          ordem: i,
          ...(t.id ? { id: t.id } : {}),
        }));
        const { error } = await supabase.from("ecommerce_volume_pricing").insert(rows);
        if (error) throw error;
      }

      toast.success("Tabela de preços por volume salva com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    }

    setSaving(false);
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/ecommerce-config")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6" />
              Preços por Volume / B2B
            </h1>
            <p className="text-muted-foreground text-sm">
              Configure faixas de desconto baseadas no total do pedido (R$)
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      {/* Toggle B2B */}
      <Card className={`transition-all ${b2bEnabled ? "border-primary/30 bg-primary/5" : "opacity-70"}`}>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${b2bEnabled ? "bg-primary/10" : "bg-muted"}`}>
              <ToggleLeft className={`h-5 w-5 ${b2bEnabled ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div>
              <Label className="text-sm font-semibold">Seção B2B / Volume Ativa</Label>
              <p className="text-xs text-muted-foreground">Exibe a tabela de preços por volume e a seção B2B no e-commerce</p>
            </div>
          </div>
          <Switch checked={b2bEnabled} onCheckedChange={setB2bEnabled} />
        </CardContent>
      </Card>

      {/* Tiers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Faixas de Desconto</CardTitle>
              <CardDescription>Defina os descontos para cada faixa de valor total do pedido</CardDescription>
            </div>
            <Button onClick={addTier} variant="outline" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Adicionar Faixa
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {tiers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma faixa configurada</p>
              <p className="text-xs">Clique em "Adicionar Faixa" para começar</p>
            </div>
          )}

          {/* Header */}
          {tiers.length > 0 && (
            <div className="grid grid-cols-[1fr_130px_130px_100px_60px_40px] gap-2 text-xs font-semibold text-muted-foreground px-1">
              <span>Nome</span>
              <span>Valor Mín (R$)</span>
              <span>Valor Máx (R$)</span>
              <span>Desconto %</span>
              <span>Ativo</span>
              <span></span>
            </div>
          )}

          {tiers.map((tier, i) => (
            <div key={i} className={`grid grid-cols-[1fr_130px_130px_100px_60px_40px] gap-2 items-center p-2 rounded-lg border ${tier.ativo ? "bg-background" : "bg-muted/30 opacity-60"}`}>
              <Input
                value={tier.nome_faixa}
                onChange={e => updateTier(i, "nome_faixa", e.target.value)}
                className="h-9 text-sm"
                placeholder="Ex: Atacado"
              />
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                <Input
                  type="number"
                  value={tier.valor_minimo}
                  onChange={e => updateTier(i, "valor_minimo", parseFloat(e.target.value) || 0)}
                  className="h-9 text-sm pl-8"
                  min={0}
                  step={100}
                />
              </div>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                <Input
                  type="number"
                  value={tier.valor_maximo ?? ""}
                  onChange={e => updateTier(i, "valor_maximo", e.target.value ? parseFloat(e.target.value) : null)}
                  className="h-9 text-sm pl-8"
                  placeholder="Ilimitado"
                  step={100}
                />
              </div>
              <div className="relative">
                <Input
                  type="number"
                  value={tier.percentual_desconto}
                  onChange={e => updateTier(i, "percentual_desconto", parseFloat(e.target.value) || 0)}
                  className="h-9 text-sm pr-6"
                  min={0}
                  max={100}
                  step={0.5}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
              <div className="flex justify-center">
                <Switch checked={tier.ativo} onCheckedChange={v => updateTier(i, "ativo", v)} />
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeTier(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Preview */}
      {tiers.filter(t => t.ativo).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pré-visualização</CardTitle>
            <CardDescription>Como a tabela aparecerá para o cliente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-2 bg-muted/50 p-3 text-xs font-semibold text-muted-foreground border-b">
                <span>Total do Pedido</span>
                <span>Desconto</span>
              </div>
              {tiers.filter(t => t.ativo).map((tier, i) => (
                <div key={i} className="grid grid-cols-2 p-3 text-sm border-b last:border-0 hover:bg-muted/20">
                  <span className="font-medium">
                    {formatCurrency(tier.valor_minimo)}
                    {tier.valor_maximo ? ` a ${formatCurrency(tier.valor_maximo)}` : " +"}
                  </span>
                  <span className="text-primary font-semibold">{tier.percentual_desconto}% OFF</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
