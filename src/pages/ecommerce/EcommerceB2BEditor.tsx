import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Plus, Trash2, Eye, EyeOff, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "sonner";

interface B2BVantagem {
  icone: string;
  title: string;
  desc: string;
}

interface B2BVolumeRow {
  qty: string;
  discount: string;
  savings: string;
}

interface B2BStep {
  step: string;
  title: string;
  desc: string;
}

interface B2BDepoimento {
  name: string;
  segment: string;
  text: string;
  avatar: string;
}

interface B2BSecoes {
  hero: boolean;
  vantagens: boolean;
  volume: boolean;
  como_funciona: boolean;
  formulario: boolean;
  depoimentos: boolean;
  cta: boolean;
}

const defaultVantagens: B2BVantagem[] = [
  { icone: "TrendingUp", title: "Até 40% de desconto", desc: "Preços especiais por volume com tabelas progressivas" },
  { icone: "CreditCard", title: "Pagamento faturado", desc: "Condições 30/60/90 dias para empresas aprovadas" },
  { icone: "Package", title: "Pedido mínimo flexível", desc: "MOQ adaptado ao seu porte e necessidade" },
  { icone: "Users", title: "Conta multi-usuário", desc: "Múltiplos colaboradores com permissões por perfil" },
  { icone: "Truck", title: "Logística dedicada", desc: "Entrega programada e fretes negociados" },
  { icone: "RotateCcw", title: "Recompra rápida", desc: "Repita pedidos anteriores com um clique" },
  { icone: "Upload", title: "Upload de lista", desc: "Envie sua lista de compras em Excel ou CSV" },
  { icone: "FileText", title: "Notas fiscais", desc: "Acesso a todas as NF-e direto no portal" },
];

const defaultVolume: B2BVolumeRow[] = [
  { qty: "1–49 un.", discount: "Preço padrão", savings: "—" },
  { qty: "50–199 un.", discount: "-10%", savings: "Economize 10%" },
  { qty: "200–499 un.", discount: "-20%", savings: "Economize 20%" },
  { qty: "500–999 un.", discount: "-30%", savings: "Economize 30%" },
  { qty: "1.000+ un.", discount: "-40%", savings: "Maior desconto" },
];

const defaultSteps: B2BStep[] = [
  { step: "1", title: "Cadastre-se", desc: "Preencha o formulário com os dados da sua empresa" },
  { step: "2", title: "Aprovação", desc: "Análise em até 24h com confirmação por e-mail" },
  { step: "3", title: "Acesse preços", desc: "Veja preços exclusivos e condições especiais" },
  { step: "4", title: "Compre", desc: "Faça pedidos com pagamento faturado e recompra rápida" },
];

const defaultDepoimentos: B2BDepoimento[] = [
  { name: "Gráfica Express", segment: "Gráfica", text: "Reduziu custos em 35% com descontos por volume.", avatar: "GE" },
  { name: "Restaurante Sabor", segment: "Alimentação", text: "Entrega programada semanal sem preocupação.", avatar: "RS" },
  { name: "Alves Distribuição", segment: "Distribuidor", text: "Recompra em 1 clique e NF-e sempre disponível.", avatar: "AD" },
];

export default function EcommerceB2BEditor() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);

  // Hero
  const [badge, setBadge] = useState("Para Empresas");
  const [titulo, setTitulo] = useState("Programa Atacado & B2B");
  const [subtitulo, setSubtitulo] = useState("Preços exclusivos por volume, pagamento faturado, atendimento dedicado e ferramentas pensadas para operações corporativas de qualquer porte.");
  const [btnPrimario, setBtnPrimario] = useState("Solicitar Cadastro B2B");
  const [btnSecundario, setBtnSecundario] = useState("Falar com Consultor");

  // Vantagens
  const [vantagensTitulo, setVantagensTitulo] = useState("Vantagens exclusivas para empresas");
  const [vantagensSubtitulo, setVantagensSubtitulo] = useState("Tudo que você precisa para otimizar suas compras corporativas");
  const [vantagens, setVantagens] = useState<B2BVantagem[]>(defaultVantagens);

  // Volume
  const [volumeTable, setVolumeTable] = useState<B2BVolumeRow[]>(defaultVolume);

  // Como funciona
  const [comoFunciona, setComoFunciona] = useState<B2BStep[]>(defaultSteps);

  // Depoimentos
  const [depoimentos, setDepoimentos] = useState<B2BDepoimento[]>(defaultDepoimentos);

  // CTA
  const [ctaTitulo, setCtaTitulo] = useState("Pronto para economizar?");
  const [ctaSubtitulo, setCtaSubtitulo] = useState("Junte-se a mais de 500 empresas que já compram conosco com condições especiais.");
  const [ctaBotao, setCtaBotao] = useState("Criar Conta B2B");

  // Form
  const [formTitulo, setFormTitulo] = useState("Solicite seu cadastro B2B");
  const [formSubtitulo, setFormSubtitulo] = useState("Preencha os dados abaixo e retornaremos em até 24h");

  // Sections visibility
  const [secoes, setSecoes] = useState<B2BSecoes>({
    hero: true, vantagens: true, volume: true, como_funciona: true,
    formulario: true, depoimentos: true, cta: true,
  });

  useEffect(() => {
    const load = async () => {
      const estId = await getEstabelecimentoId();
      if (!estId) return;
      const { data } = await supabase.from("ecommerce_config").select("*").eq("estabelecimento_id", estId).maybeSingle();
      if (!data) return;
      const d = data as any;
      setConfigId(d.id);
      if (d.b2b_badge) setBadge(d.b2b_badge);
      if (d.b2b_titulo) setTitulo(d.b2b_titulo);
      if (d.b2b_hero_subtitulo) setSubtitulo(d.b2b_hero_subtitulo);
      if (d.b2b_btn_primario) setBtnPrimario(d.b2b_btn_primario);
      if (d.b2b_btn_secundario) setBtnSecundario(d.b2b_btn_secundario);
      if (d.b2b_secao_vantagens_titulo) setVantagensTitulo(d.b2b_secao_vantagens_titulo);
      if (d.b2b_secao_vantagens_subtitulo) setVantagensSubtitulo(d.b2b_secao_vantagens_subtitulo);
      if (d.b2b_vantagens && Array.isArray(d.b2b_vantagens) && d.b2b_vantagens.length > 0 && typeof d.b2b_vantagens[0] === "object") {
        setVantagens(d.b2b_vantagens);
      }
      if (d.b2b_volume_table) setVolumeTable(d.b2b_volume_table);
      if (d.b2b_como_funciona) setComoFunciona(d.b2b_como_funciona);
      if (d.b2b_depoimentos) setDepoimentos(d.b2b_depoimentos);
      if (d.b2b_cta_titulo) setCtaTitulo(d.b2b_cta_titulo);
      if (d.b2b_cta_subtitulo) setCtaSubtitulo(d.b2b_cta_subtitulo);
      if (d.b2b_cta_botao) setCtaBotao(d.b2b_cta_botao);
      if (d.b2b_form_titulo) setFormTitulo(d.b2b_form_titulo);
      if (d.b2b_form_subtitulo) setFormSubtitulo(d.b2b_form_subtitulo);
      if (d.b2b_secoes_visiveis) setSecoes({ ...secoes, ...d.b2b_secoes_visiveis });
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        b2b_badge: badge,
        b2b_titulo: titulo,
        b2b_hero_subtitulo: subtitulo,
        b2b_btn_primario: btnPrimario,
        b2b_btn_secundario: btnSecundario,
        b2b_secao_vantagens_titulo: vantagensTitulo,
        b2b_secao_vantagens_subtitulo: vantagensSubtitulo,
        b2b_vantagens: vantagens as any,
        b2b_volume_table: volumeTable as any,
        b2b_como_funciona: comoFunciona as any,
        b2b_depoimentos: depoimentos as any,
        b2b_cta_titulo: ctaTitulo,
        b2b_cta_subtitulo: ctaSubtitulo,
        b2b_cta_botao: ctaBotao,
        b2b_form_titulo: formTitulo,
        b2b_form_subtitulo: formSubtitulo,
        b2b_secoes_visiveis: secoes as any,
        updated_at: new Date().toISOString(),
      };
      if (configId) {
        await supabase.from("ecommerce_config").update(payload).eq("id", configId);
      }
      toast.success("Configurações B2B salvas!");
    } catch {
      toast.error("Erro ao salvar");
    }
    setSaving(false);
  };

  const toggleSecao = (key: keyof B2BSecoes) => setSecoes(s => ({ ...s, [key]: !s[key] }));

  const updateVantagem = (i: number, field: keyof B2BVantagem, value: string) => {
    const copy = [...vantagens];
    copy[i] = { ...copy[i], [field]: value };
    setVantagens(copy);
  };

  const updateVolume = (i: number, field: keyof B2BVolumeRow, value: string) => {
    const copy = [...volumeTable];
    copy[i] = { ...copy[i], [field]: value };
    setVolumeTable(copy);
  };

  const updateStep = (i: number, field: keyof B2BStep, value: string) => {
    const copy = [...comoFunciona];
    copy[i] = { ...copy[i], [field]: value };
    setComoFunciona(copy);
  };

  const updateDepoimento = (i: number, field: keyof B2BDepoimento, value: string) => {
    const copy = [...depoimentos];
    copy[i] = { ...copy[i], [field]: value };
    setDepoimentos(copy);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/ecommerce-config")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Editor Página B2B</h1>
            <p className="text-muted-foreground text-sm">Edite todos os textos e seções da página Atacado & B2B</p>
          </div>
        </div>
        <Button onClick={save} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      {/* Visibilidade das seções */}
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Eye className="h-5 w-5" /> Visibilidade das Seções</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {([
            ["hero", "Hero (Topo)"],
            ["vantagens", "Vantagens"],
            ["volume", "Tabela de Preços por Volume"],
            ["como_funciona", "Como Funciona"],
            ["formulario", "Formulário de Cadastro"],
            ["depoimentos", "Depoimentos"],
            ["cta", "CTA Final"],
          ] as [keyof B2BSecoes, string][]).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm font-medium">{label}</span>
              <Switch checked={secoes[key]} onCheckedChange={() => toggleSecao(key)} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Hero */}
      <Card>
        <CardHeader><CardTitle className="text-lg">🏢 Hero (Topo)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Badge</Label><Input value={badge} onChange={e => setBadge(e.target.value)} className="mt-1" /></div>
          <div><Label>Título</Label><Input value={titulo} onChange={e => setTitulo(e.target.value)} className="mt-1" /></div>
          <div><Label>Subtítulo</Label><Textarea value={subtitulo} onChange={e => setSubtitulo(e.target.value)} className="mt-1" rows={3} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Botão Primário</Label><Input value={btnPrimario} onChange={e => setBtnPrimario(e.target.value)} className="mt-1" /></div>
            <div><Label>Botão Secundário</Label><Input value={btnSecundario} onChange={e => setBtnSecundario(e.target.value)} className="mt-1" /></div>
          </div>
        </CardContent>
      </Card>

      {/* Vantagens */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">⭐ Vantagens</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setVantagens([...vantagens, { icone: "Check", title: "Nova vantagem", desc: "Descrição" }])}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Título da seção</Label><Input value={vantagensTitulo} onChange={e => setVantagensTitulo(e.target.value)} className="mt-1" /></div>
          <div><Label>Subtítulo da seção</Label><Input value={vantagensSubtitulo} onChange={e => setVantagensSubtitulo(e.target.value)} className="mt-1" /></div>
          <Separator />
          {vantagens.map((v, i) => (
            <div key={i} className="p-3 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Vantagem {i + 1}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setVantagens(vantagens.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">Ícone</Label><Input value={v.icone} onChange={e => updateVantagem(i, "icone", e.target.value)} className="mt-1 text-sm" placeholder="TrendingUp" /></div>
                <div className="col-span-2"><Label className="text-xs">Título</Label><Input value={v.title} onChange={e => updateVantagem(i, "title", e.target.value)} className="mt-1 text-sm" /></div>
              </div>
              <div><Label className="text-xs">Descrição</Label><Input value={v.desc} onChange={e => updateVantagem(i, "desc", e.target.value)} className="mt-1 text-sm" /></div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tabela de Volume */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">📊 Tabela de Preços por Volume</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setVolumeTable([...volumeTable, { qty: "Nova faixa", discount: "-0%", savings: "Economize" }])}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar Faixa
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {volumeTable.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input value={row.qty} onChange={e => updateVolume(i, "qty", e.target.value)} placeholder="Quantidade" className="text-sm" />
              <Input value={row.discount} onChange={e => updateVolume(i, "discount", e.target.value)} placeholder="Desconto" className="text-sm w-28" />
              <Input value={row.savings} onChange={e => updateVolume(i, "savings", e.target.value)} placeholder="Economia" className="text-sm" />
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => setVolumeTable(volumeTable.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Como Funciona */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">🔄 Como Funciona</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setComoFunciona([...comoFunciona, { step: String(comoFunciona.length + 1), title: "Novo passo", desc: "Descrição" }])}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar Passo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {comoFunciona.map((s, i) => (
            <div key={i} className="flex items-start gap-2">
              <Input value={s.step} onChange={e => updateStep(i, "step", e.target.value)} className="w-14 text-center text-sm" />
              <div className="flex-1 space-y-1">
                <Input value={s.title} onChange={e => updateStep(i, "title", e.target.value)} placeholder="Título" className="text-sm" />
                <Input value={s.desc} onChange={e => updateStep(i, "desc", e.target.value)} placeholder="Descrição" className="text-sm" />
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => setComoFunciona(comoFunciona.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Formulário */}
      <Card>
        <CardHeader><CardTitle className="text-lg">📝 Formulário de Cadastro</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Título</Label><Input value={formTitulo} onChange={e => setFormTitulo(e.target.value)} className="mt-1" /></div>
          <div><Label>Subtítulo</Label><Input value={formSubtitulo} onChange={e => setFormSubtitulo(e.target.value)} className="mt-1" /></div>
        </CardContent>
      </Card>

      {/* Depoimentos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">💬 Depoimentos</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setDepoimentos([...depoimentos, { name: "Empresa", segment: "Segmento", text: "Depoimento", avatar: "XX" }])}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {depoimentos.map((dep, i) => (
            <div key={i} className="p-3 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-muted-foreground">Depoimento {i + 1}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDepoimentos(depoimentos.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><Label className="text-xs">Nome</Label><Input value={dep.name} onChange={e => updateDepoimento(i, "name", e.target.value)} className="mt-1 text-sm" /></div>
                <div><Label className="text-xs">Segmento</Label><Input value={dep.segment} onChange={e => updateDepoimento(i, "segment", e.target.value)} className="mt-1 text-sm" /></div>
                <div><Label className="text-xs">Avatar (iniciais)</Label><Input value={dep.avatar} onChange={e => updateDepoimento(i, "avatar", e.target.value)} className="mt-1 text-sm" /></div>
              </div>
              <div><Label className="text-xs">Texto</Label><Textarea value={dep.text} onChange={e => updateDepoimento(i, "text", e.target.value)} className="mt-1 text-sm" rows={2} /></div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* CTA */}
      <Card>
        <CardHeader><CardTitle className="text-lg">🚀 CTA Final</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Título</Label><Input value={ctaTitulo} onChange={e => setCtaTitulo(e.target.value)} className="mt-1" /></div>
          <div><Label>Subtítulo</Label><Input value={ctaSubtitulo} onChange={e => setCtaSubtitulo(e.target.value)} className="mt-1" /></div>
          <div><Label>Texto do Botão</Label><Input value={ctaBotao} onChange={e => setCtaBotao(e.target.value)} className="mt-1" /></div>
        </CardContent>
      </Card>

      <div className="flex justify-end pb-8">
        <Button onClick={save} disabled={saving} className="gap-2" size="lg">
          <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
}
