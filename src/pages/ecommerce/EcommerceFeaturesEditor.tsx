import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, ToggleLeft, Star, Heart, Share2, Package, Eye, Mail, Navigation, ZoomIn, ShoppingBag, ShoppingCart, DollarSign, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FeatureToggle {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const features: FeatureToggle[] = [
  { key: "feat_avaliacoes", label: "Avaliações", description: "Exibir aba de avaliações na página do produto", icon: Star, color: "text-yellow-500" },
  { key: "feat_rating_estrelas", label: "Estrelas de Rating", description: "Exibir estrelas de avaliação no resumo do produto", icon: Star, color: "text-orange-500" },
  { key: "feat_favoritos", label: "Favoritos (Coração)", description: "Botão de adicionar aos favoritos", icon: Heart, color: "text-red-500" },
  { key: "feat_compartilhar", label: "Compartilhar", description: "Botão de compartilhar produto", icon: Share2, color: "text-blue-500" },
  { key: "feat_produtos_relacionados", label: "Produtos Relacionados", description: "Exibir seção de produtos relacionados", icon: ShoppingBag, color: "text-purple-500" },
  { key: "feat_b2b_card", label: "Card B2B", description: "Exibir card de compra em volume / B2B", icon: Package, color: "text-green-500" },
  { key: "feat_estoque_visivel", label: "Estoque Visível", description: "Mostrar quantidade em estoque para o cliente", icon: Eye, color: "text-teal-500" },
  { key: "feat_newsletter", label: "Newsletter", description: "Seção de inscrição na newsletter", icon: Mail, color: "text-pink-500" },
  { key: "feat_breadcrumb", label: "Breadcrumb", description: "Navegação de caminho (Home > Catálogo > Produto)", icon: Navigation, color: "text-indigo-500" },
  { key: "feat_zoom_imagem", label: "Zoom na Imagem", description: "Efeito de zoom ao passar o mouse na foto", icon: ZoomIn, color: "text-cyan-500" },
];

const modeFeatures: FeatureToggle[] = [
  { key: "modo_catalogo", label: "Modo Catálogo (Orçamento)", description: "Desativa o carrinho de compras. Visitantes montam lista de produtos e solicitam orçamento. Permite adicionar itens sem estoque.", icon: FileText, color: "text-amber-500" },
  { key: "mostrar_precos_visitante_b2c", label: "Preços visíveis (B2C)", description: "Mostrar preços para visitantes não logados na loja B2C", icon: DollarSign, color: "text-emerald-500" },
  { key: "mostrar_precos_visitante_b2b", label: "Preços visíveis (B2B)", description: "Mostrar preços para visitantes não logados na seção B2B", icon: DollarSign, color: "text-sky-500" },
];

export default function EcommerceFeaturesEditor() {
  const navigate = useNavigate();
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const estId = localStorage.getItem("estabelecimentoId");
    if (!estId) { setLoading(false); return; }
    const { data } = await supabase
      .from("ecommerce_config")
      .select("feat_avaliacoes, feat_favoritos, feat_compartilhar, feat_produtos_relacionados, feat_b2b_card, feat_estoque_visivel, feat_newsletter, feat_rating_estrelas, feat_breadcrumb, feat_zoom_imagem")
      .eq("estabelecimento_id", estId)
      .maybeSingle();
    if (data) {
      const t: Record<string, boolean> = {};
      features.forEach(f => { t[f.key] = (data as any)[f.key] ?? true; });
      setToggles(t);
    } else {
      const t: Record<string, boolean> = {};
      features.forEach(f => { t[f.key] = true; });
      setToggles(t);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const estId = localStorage.getItem("estabelecimentoId");
    if (!estId) { setSaving(false); return; }
    const { error } = await supabase
      .from("ecommerce_config")
      .update(toggles)
      .eq("estabelecimento_id", estId);
    if (error) {
      toast.error("Erro ao salvar configurações");
    } else {
      toast.success("Funcionalidades atualizadas com sucesso!");
    }
    setSaving(false);
  };

  const enabledCount = Object.values(toggles).filter(Boolean).length;

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
              <ToggleLeft className="h-6 w-6" />
              Funcionalidades da Loja
            </h1>
            <p className="text-muted-foreground text-sm">
              Ative ou desative recursos do e-commerce · {enabledCount}/{features.length} ativos
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      <div className="grid gap-3">
        {features.map(feat => (
          <Card key={feat.key} className={`transition-all ${toggles[feat.key] ? "border-primary/30 bg-primary/5" : "opacity-70"}`}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${toggles[feat.key] ? "bg-primary/10" : "bg-muted"}`}>
                  <feat.icon className={`h-5 w-5 ${toggles[feat.key] ? feat.color : "text-muted-foreground"}`} />
                </div>
                <div>
                  <Label className="text-sm font-semibold cursor-pointer">{feat.label}</Label>
                  <p className="text-xs text-muted-foreground">{feat.description}</p>
                </div>
              </div>
              <Switch
                checked={toggles[feat.key] ?? true}
                onCheckedChange={(v) => setToggles(prev => ({ ...prev, [feat.key]: v }))}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}