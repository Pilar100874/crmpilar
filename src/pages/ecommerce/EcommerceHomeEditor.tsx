import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Plus, Trash2, Eye, EyeOff, Upload, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Beneficio {
  icone: string;
  titulo: string;
  subtitulo: string;
}

interface Depoimento {
  name: string;
  company: string;
  text: string;
  rating: number;
  avatar: string;
}

interface SecoesVisiveis {
  hero: boolean;
  beneficios: boolean;
  categorias: boolean;
  produtos: boolean;
  b2b: boolean;
  depoimentos: boolean;
  newsletter: boolean;
}

interface TopbarItem {
  icone: string;
  texto: string;
  posicao: "esquerda" | "direita";
}

interface HomeConfig {
  hero_badge: string;
  hero_titulo: string;
  hero_subtitulo: string;
  hero_btn_primario: string;
  hero_btn_secundario: string;
  hero_stat_satisfacao: string;
  beneficios: Beneficio[];
  b2b_badge: string;
  b2b_titulo: string;
  b2b_descricao: string;
  b2b_vantagens: string[];
  depoimentos: Depoimento[];
  newsletter_titulo: string;
  newsletter_subtitulo: string;
  secoes_visiveis: SecoesVisiveis;
  topbar_ativo: boolean;
  topbar_items: TopbarItem[];
  topbar_telefone: string;
  topbar_link_b2b: boolean;
}

const defaultTopbarItems: TopbarItem[] = [
  { icone: "truck", texto: "Frete grátis acima de R$ 500", posicao: "esquerda" },
  { icone: "shield", texto: "Compra 100% segura", posicao: "esquerda" },
  { icone: "rotate-ccw", texto: "Troca facilitada", posicao: "esquerda" },
];

const defaultBeneficios: Beneficio[] = [
  { icone: "truck", titulo: "Frete grátis acima de R$ 500", subtitulo: "Para todo o Brasil" },
  { icone: "shield", titulo: "Compra segura", subtitulo: "Dados protegidos" },
  { icone: "rotate", titulo: "Troca facilitada", subtitulo: "Até 30 dias" },
  { icone: "headphones", titulo: "Suporte dedicado", subtitulo: "Atendimento rápido" },
];

const defaultDepoimentos: Depoimento[] = [
  { name: "Carlos Silva", company: "Gráfica Express", text: "Fornecedor confiável há 3 anos.", rating: 5, avatar: "CS" },
  { name: "Ana Mendes", company: "Restaurante Sabor & Arte", text: "Ótimos preços em descartáveis.", rating: 5, avatar: "AM" },
  { name: "Roberto Alves", company: "Alves Distribuição", text: "O programa B2B é excelente.", rating: 5, avatar: "RA" },
];

const defaults: HomeConfig = {
  hero_badge: "🔥 Ofertas especiais esta semana",
  hero_titulo: "",
  hero_subtitulo: "",
  hero_btn_primario: "Comprar Agora",
  hero_btn_secundario: "Atacado / B2B",
  hero_stat_satisfacao: "98%",
  beneficios: defaultBeneficios,
  b2b_badge: "Para Empresas",
  b2b_titulo: "Compre no atacado com condições exclusivas",
  b2b_descricao: "",
  b2b_vantagens: ["Até 40% de desconto", "Pedido mínimo flexível", "Conta multi-usuário", "Pagamento faturado"],
  depoimentos: defaultDepoimentos,
  newsletter_titulo: "Receba ofertas exclusivas",
  newsletter_subtitulo: "Cadastre-se e ganhe 10% de desconto na primeira compra",
  secoes_visiveis: { hero: true, beneficios: true, categorias: true, produtos: true, b2b: true, depoimentos: true, newsletter: true },
  topbar_ativo: true,
  topbar_items: defaultTopbarItems,
  topbar_telefone: "(11) 4002-8922",
  topbar_link_b2b: true,
};

const iconeOptions = [
  { value: "truck", label: "🚚 Caminhão" },
  { value: "shield", label: "🛡️ Escudo" },
  { value: "rotate", label: "🔄 Troca" },
  { value: "headphones", label: "🎧 Suporte" },
  { value: "star", label: "⭐ Estrela" },
  { value: "clock", label: "⏰ Relógio" },
  { value: "check", label: "✅ Check" },
  { value: "gift", label: "🎁 Presente" },
];

export default function EcommerceHomeEditor() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<HomeConfig>(defaults);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const estId = localStorage.getItem("estabelecimentoId");
      if (!estId) return;
      const { data } = await supabase
        .from("ecommerce_config")
        .select("hero_badge, hero_titulo, hero_subtitulo, hero_btn_primario, hero_btn_secundario, hero_stat_satisfacao, beneficios, b2b_badge, b2b_titulo, b2b_descricao, b2b_vantagens, depoimentos, newsletter_titulo, newsletter_subtitulo, secoes_visiveis, topbar_ativo, topbar_items, topbar_telefone, topbar_link_b2b")
        .eq("estabelecimento_id", estId)
        .maybeSingle();
      if (data) {
        const d = data as any;
        setConfig({
          hero_badge: d.hero_badge || defaults.hero_badge,
          hero_titulo: d.hero_titulo || "",
          hero_subtitulo: d.hero_subtitulo || "",
          hero_btn_primario: d.hero_btn_primario || defaults.hero_btn_primario,
          hero_btn_secundario: d.hero_btn_secundario || defaults.hero_btn_secundario,
          hero_stat_satisfacao: d.hero_stat_satisfacao || defaults.hero_stat_satisfacao,
          beneficios: d.beneficios || defaults.beneficios,
          b2b_badge: d.b2b_badge || defaults.b2b_badge,
          b2b_titulo: d.b2b_titulo || defaults.b2b_titulo,
          b2b_descricao: d.b2b_descricao || "",
          b2b_vantagens: d.b2b_vantagens || defaults.b2b_vantagens,
          depoimentos: d.depoimentos?.length > 0 ? d.depoimentos : defaults.depoimentos,
          newsletter_titulo: d.newsletter_titulo || defaults.newsletter_titulo,
          newsletter_subtitulo: d.newsletter_subtitulo || defaults.newsletter_subtitulo,
          secoes_visiveis: d.secoes_visiveis || defaults.secoes_visiveis,
          topbar_ativo: d.topbar_ativo ?? true,
          topbar_items: d.topbar_items || defaults.topbar_items,
          topbar_telefone: d.topbar_telefone || defaults.topbar_telefone,
          topbar_link_b2b: d.topbar_link_b2b ?? true,
        });
      }
    };
    load();
  }, []);

  const save = async () => {
    const estId = localStorage.getItem("estabelecimentoId");
    if (!estId) return;
    setSaving(true);
    const { error } = await supabase
      .from("ecommerce_config")
      .upsert({ estabelecimento_id: estId, ...config } as any, { onConflict: "estabelecimento_id" });
    setSaving(false);
    if (error) { toast.error("Erro ao salvar"); console.error(error); }
    else toast.success("Página inicial salva com sucesso!");
  };

  const updateBeneficio = (i: number, field: keyof Beneficio, value: string) => {
    setConfig(c => {
      const b = [...c.beneficios];
      b[i] = { ...b[i], [field]: value };
      return { ...c, beneficios: b };
    });
  };

  const addDepoimento = () => {
    setConfig(c => ({ ...c, depoimentos: [...c.depoimentos, { name: "", company: "", text: "", rating: 5, avatar: "" }] }));
  };

  const updateDepoimento = (i: number, field: keyof Depoimento, value: any) => {
    setConfig(c => {
      const d = [...c.depoimentos];
      d[i] = { ...d[i], [field]: value };
      if (field === "name") d[i].avatar = (value as string).split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
      return { ...c, depoimentos: d };
    });
  };

  const removeDepoimento = (i: number) => {
    setConfig(c => ({ ...c, depoimentos: c.depoimentos.filter((_, idx) => idx !== i) }));
  };

  const updateVantagem = (i: number, value: string) => {
    setConfig(c => {
      const v = [...c.b2b_vantagens];
      v[i] = value;
      return { ...c, b2b_vantagens: v };
    });
  };

  const addVantagem = () => setConfig(c => ({ ...c, b2b_vantagens: [...c.b2b_vantagens, ""] }));
  const removeVantagem = (i: number) => setConfig(c => ({ ...c, b2b_vantagens: c.b2b_vantagens.filter((_, idx) => idx !== i) }));

  const toggleSecao = (key: keyof SecoesVisiveis) => {
    setConfig(c => ({ ...c, secoes_visiveis: { ...c.secoes_visiveis, [key]: !c.secoes_visiveis[key] } }));
  };

  const secaoLabels: Record<keyof SecoesVisiveis, string> = {
    hero: "Banner Principal (Hero)",
    beneficios: "Barra de Benefícios",
    categorias: "Categorias",
    produtos: "Produtos em Destaque",
    b2b: "Seção B2B / Atacado",
    depoimentos: "Depoimentos",
    newsletter: "Newsletter",
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Editor da Página Inicial</h1>
            <p className="text-muted-foreground text-sm">Edite textos, seções e conteúdo da home do e-commerce</p>
          </div>
        </div>
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      {/* Visibility toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visibilidade das Seções</CardTitle>
          <CardDescription>Ative ou desative seções da página inicial</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {(Object.keys(secaoLabels) as (keyof SecoesVisiveis)[]).map(key => (
              <div key={key} className="flex items-center justify-between gap-2 p-3 rounded-lg border">
                <span className="text-sm font-medium">{secaoLabels[key]}</span>
                <Switch checked={config.secoes_visiveis[key]} onCheckedChange={() => toggleSecao(key)} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Accordion type="multiple" defaultValue={["hero"]} className="space-y-3">
        {/* Hero Section */}
        <AccordionItem value="hero" className="border rounded-lg px-4">
          <AccordionTrigger className="text-base font-semibold">🎯 Banner Principal (Hero)</AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <div>
              <Label>Badge / Etiqueta</Label>
              <Input value={config.hero_badge} onChange={e => setConfig(c => ({ ...c, hero_badge: e.target.value }))} placeholder="🔥 Ofertas especiais esta semana" />
            </div>
            <div>
              <Label>Título principal (deixe vazio para usar o slogan da identidade visual)</Label>
              <Textarea value={config.hero_titulo} onChange={e => setConfig(c => ({ ...c, hero_titulo: e.target.value }))} placeholder="Tudo para sua empresa em um só lugar" rows={2} />
            </div>
            <div>
              <Label>Subtítulo / descrição</Label>
              <Textarea value={config.hero_subtitulo} onChange={e => setConfig(c => ({ ...c, hero_subtitulo: e.target.value }))} placeholder="Será preenchido automaticamente com a contagem de produtos" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Botão Primário</Label>
                <Input value={config.hero_btn_primario} onChange={e => setConfig(c => ({ ...c, hero_btn_primario: e.target.value }))} />
              </div>
              <div>
                <Label>Botão Secundário</Label>
                <Input value={config.hero_btn_secundario} onChange={e => setConfig(c => ({ ...c, hero_btn_secundario: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Estatística de Satisfação</Label>
              <Input value={config.hero_stat_satisfacao} onChange={e => setConfig(c => ({ ...c, hero_stat_satisfacao: e.target.value }))} placeholder="98%" className="max-w-[120px]" />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Benefits */}
        <AccordionItem value="beneficios" className="border rounded-lg px-4">
          <AccordionTrigger className="text-base font-semibold">✨ Barra de Benefícios</AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            {config.beneficios.map((b, i) => (
              <div key={i} className="grid grid-cols-[auto_1fr_1fr] gap-3 items-end">
                <div>
                  <Label>Ícone</Label>
                  <select
                    value={b.icone}
                    onChange={e => updateBeneficio(i, "icone", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {iconeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Título</Label>
                  <Input value={b.titulo} onChange={e => updateBeneficio(i, "titulo", e.target.value)} />
                </div>
                <div>
                  <Label>Subtítulo</Label>
                  <Input value={b.subtitulo} onChange={e => updateBeneficio(i, "subtitulo", e.target.value)} />
                </div>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        {/* B2B */}
        <AccordionItem value="b2b" className="border rounded-lg px-4">
          <AccordionTrigger className="text-base font-semibold">🏢 Seção B2B / Atacado</AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <div>
              <Label>Badge</Label>
              <Input value={config.b2b_badge} onChange={e => setConfig(c => ({ ...c, b2b_badge: e.target.value }))} />
            </div>
            <div>
              <Label>Título</Label>
              <Input value={config.b2b_titulo} onChange={e => setConfig(c => ({ ...c, b2b_titulo: e.target.value }))} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={config.b2b_descricao} onChange={e => setConfig(c => ({ ...c, b2b_descricao: e.target.value }))} placeholder="Preços especiais por volume..." rows={3} />
            </div>
            <div>
              <Label>Vantagens</Label>
              {config.b2b_vantagens.map((v, i) => (
                <div key={i} className="flex gap-2 mt-2">
                  <Input value={v} onChange={e => updateVantagem(i, e.target.value)} />
                  <Button variant="ghost" size="icon" onClick={() => removeVantagem(i)} className="text-destructive shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addVantagem} className="mt-2">
                <Plus className="h-4 w-4 mr-1" /> Adicionar Vantagem
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Testimonials */}
        <AccordionItem value="depoimentos" className="border rounded-lg px-4">
          <AccordionTrigger className="text-base font-semibold">💬 Depoimentos</AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            {config.depoimentos.map((d, i) => (
              <Card key={i}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Depoimento #{i + 1}</span>
                    <Button variant="ghost" size="icon" onClick={() => removeDepoimento(i)} className="text-destructive h-8 w-8">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Nome</Label>
                      <Input value={d.name} onChange={e => updateDepoimento(i, "name", e.target.value)} />
                    </div>
                    <div>
                      <Label>Empresa</Label>
                      <Input value={d.company} onChange={e => updateDepoimento(i, "company", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label>Texto</Label>
                    <Textarea value={d.text} onChange={e => updateDepoimento(i, "text", e.target.value)} rows={2} />
                  </div>
                  <div>
                    <Label>Nota (1-5)</Label>
                    <Input type="number" min={1} max={5} value={d.rating} onChange={e => updateDepoimento(i, "rating", Number(e.target.value))} className="max-w-[80px]" />
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" onClick={addDepoimento}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar Depoimento
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* Newsletter */}
        <AccordionItem value="newsletter" className="border rounded-lg px-4">
          <AccordionTrigger className="text-base font-semibold">📧 Newsletter</AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">
            <div>
              <Label>Título</Label>
              <Input value={config.newsletter_titulo} onChange={e => setConfig(c => ({ ...c, newsletter_titulo: e.target.value }))} />
            </div>
            <div>
              <Label>Subtítulo</Label>
              <Input value={config.newsletter_subtitulo} onChange={e => setConfig(c => ({ ...c, newsletter_subtitulo: e.target.value }))} />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
