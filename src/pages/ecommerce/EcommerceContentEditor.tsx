import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Save, Plus, Eye, EyeOff, Building2, Phone, HelpCircle, Shield, ScrollText, Truck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "sonner";

const CONTENT_TYPES = [
  { tipo: "sobre", titulo: "Sobre Nós", icon: Building2, desc: "História, missão, valores da empresa" },
  { tipo: "contato", titulo: "Contato", icon: Phone, desc: "Telefones, e-mail, endereço, formulário" },
  { tipo: "faq", titulo: "FAQ", icon: HelpCircle, desc: "Perguntas frequentes" },
  { tipo: "privacidade", titulo: "Política de Privacidade", icon: Shield, desc: "LGPD e proteção de dados" },
  { tipo: "termos", titulo: "Termos de Uso", icon: ScrollText, desc: "Condições gerais do site" },
  { tipo: "entrega", titulo: "Política de Entrega", icon: Truck, desc: "Prazos, custos, regiões" },
  { tipo: "trocas", titulo: "Trocas e Devoluções", icon: RotateCcw, desc: "Regras de troca e devolução" },
];

interface ContentPage {
  id?: string;
  tipo: string;
  titulo: string;
  conteudo: string;
  dados_json: any;
  ativo: boolean;
}

export default function EcommerceContentEditor() {
  const navigate = useNavigate();
  const [contents, setContents] = useState<Record<string, ContentPage>>({});
  const [activeTab, setActiveTab] = useState("sobre");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadContents(); }, []);

  const loadContents = async () => {
    const estId = await getEstabelecimentoId();
    if (!estId) return;
    const { data } = await supabase
      .from("ecommerce_conteudos")
      .select("*")
      .eq("estabelecimento_id", estId);

    const map: Record<string, ContentPage> = {};
    CONTENT_TYPES.forEach((ct) => {
      const existing = data?.find((d) => d.tipo === ct.tipo);
      map[ct.tipo] = existing
        ? { id: existing.id, tipo: existing.tipo, titulo: existing.titulo, conteudo: existing.conteudo, dados_json: existing.dados_json, ativo: existing.ativo ?? true }
        : { tipo: ct.tipo, titulo: ct.titulo, conteudo: "", dados_json: {}, ativo: true };
    });
    setContents(map);
    setLoading(false);
  };

  const updateContent = (tipo: string, field: string, value: any) => {
    setContents((prev) => ({ ...prev, [tipo]: { ...prev[tipo], [field]: value } }));
  };

  const handleSave = async (tipo: string) => {
    setSaving(true);
    const estId = await getEstabelecimentoId();
    if (!estId) return;

    const content = contents[tipo];
    const payload = {
      estabelecimento_id: estId,
      tipo,
      titulo: content.titulo,
      conteudo: content.conteudo,
      dados_json: content.dados_json,
      ativo: content.ativo,
    };

    if (content.id) {
      await supabase.from("ecommerce_conteudos").update(payload).eq("id", content.id);
    } else {
      const { data } = await supabase.from("ecommerce_conteudos").insert(payload).select().single();
      if (data) updateContent(tipo, "id", data.id);
    }
    toast.success("Conteúdo salvo!");
    setSaving(false);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    const estId = await getEstabelecimentoId();
    if (!estId) return;

    for (const tipo of Object.keys(contents)) {
      const content = contents[tipo];
      const payload = {
        estabelecimento_id: estId,
        tipo,
        titulo: content.titulo,
        conteudo: content.conteudo,
        dados_json: content.dados_json,
        ativo: content.ativo,
      };
      if (content.id) {
        await supabase.from("ecommerce_conteudos").update(payload).eq("id", content.id);
      } else {
        const { data } = await supabase.from("ecommerce_conteudos").insert(payload).select().single();
        if (data) updateContent(tipo, "id", data.id);
      }
    }
    toast.success("Todos os conteúdos salvos!");
    setSaving(false);
  };

  if (loading) return <div className="p-6 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  const current = contents[activeTab];
  const currentType = CONTENT_TYPES.find((ct) => ct.tipo === activeTab)!;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/ecommerce-config")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" />Conteúdos & Páginas</h1>
          <p className="text-sm text-muted-foreground">Edite o conteúdo das páginas institucionais da loja</p>
        </div>
        <Button onClick={handleSaveAll} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />{saving ? "Salvando..." : "Salvar Tudo"}
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-56 space-y-1 flex-shrink-0">
          {CONTENT_TYPES.map((ct) => {
            const Icon = ct.icon;
            const isActive = activeTab === ct.tipo;
            const content = contents[ct.tipo];
            return (
              <button
                key={ct.tipo}
                onClick={() => setActiveTab(ct.tipo)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                  isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 truncate">{ct.titulo}</span>
                {content && !content.ativo && <EyeOff className="h-3 w-3 opacity-50" />}
              </button>
            );
          })}
        </div>

        {/* Editor */}
        <div className="flex-1 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <currentType.icon className="h-5 w-5" />
                  {currentType.titulo}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Visível</Label>
                  <Switch
                    checked={current?.ativo ?? true}
                    onCheckedChange={(v) => updateContent(activeTab, "ativo", v)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{currentType.desc}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Título da Página</Label>
                <Input
                  value={current?.titulo || ""}
                  onChange={(e) => updateContent(activeTab, "titulo", e.target.value)}
                />
              </div>
              <div>
                <Label>Conteúdo (HTML ou texto)</Label>
                <Textarea
                  value={current?.conteudo || ""}
                  onChange={(e) => updateContent(activeTab, "conteudo", e.target.value)}
                  rows={16}
                  placeholder={`Digite o conteúdo da página "${currentType.titulo}"...\n\nVocê pode usar HTML para formatação avançada.`}
                  className="font-mono text-sm"
                />
              </div>

              {activeTab === "contato" && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <Label className="text-sm font-medium">Dados de Contato</Label>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Telefone</Label>
                      <Input
                        value={current?.dados_json?.telefone || ""}
                        onChange={(e) => updateContent(activeTab, "dados_json", { ...current?.dados_json, telefone: e.target.value })}
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">E-mail</Label>
                      <Input
                        value={current?.dados_json?.email || ""}
                        onChange={(e) => updateContent(activeTab, "dados_json", { ...current?.dados_json, email: e.target.value })}
                        placeholder="contato@empresa.com"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">Endereço</Label>
                      <Input
                        value={current?.dados_json?.endereco || ""}
                        onChange={(e) => updateContent(activeTab, "dados_json", { ...current?.dados_json, endereco: e.target.value })}
                        placeholder="Rua, número, bairro, cidade - UF"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Horário de Funcionamento</Label>
                      <Input
                        value={current?.dados_json?.horario || ""}
                        onChange={(e) => updateContent(activeTab, "dados_json", { ...current?.dados_json, horario: e.target.value })}
                        placeholder="Seg a Sex, 8h às 18h"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">WhatsApp</Label>
                      <Input
                        value={current?.dados_json?.whatsapp || ""}
                        onChange={(e) => updateContent(activeTab, "dados_json", { ...current?.dados_json, whatsapp: e.target.value })}
                        placeholder="5511999999999"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "sobre" && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <Label className="text-sm font-medium">Dados da Empresa</Label>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Razão Social</Label>
                      <Input
                        value={current?.dados_json?.razao_social || ""}
                        onChange={(e) => updateContent(activeTab, "dados_json", { ...current?.dados_json, razao_social: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">CNPJ</Label>
                      <Input
                        value={current?.dados_json?.cnpj || ""}
                        onChange={(e) => updateContent(activeTab, "dados_json", { ...current?.dados_json, cnpj: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Ano de Fundação</Label>
                      <Input
                        value={current?.dados_json?.ano_fundacao || ""}
                        onChange={(e) => updateContent(activeTab, "dados_json", { ...current?.dados_json, ano_fundacao: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Nº de Funcionários</Label>
                      <Input
                        value={current?.dados_json?.num_funcionarios || ""}
                        onChange={(e) => updateContent(activeTab, "dados_json", { ...current?.dados_json, num_funcionarios: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => handleSave(activeTab)} disabled={saving} size="sm">
                  <Save className="h-4 w-4 mr-2" />Salvar esta página
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
