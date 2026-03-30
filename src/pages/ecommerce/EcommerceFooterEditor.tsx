import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Plus, Trash2, FootprintsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FooterLink {
  label: string;
  url: string;
}

interface FooterConfig {
  footer_descricao: string;
  footer_telefone: string;
  footer_email: string;
  footer_horario: string;
  footer_copyright: string;
  footer_pagamentos: string[];
  footer_links_extras: FooterLink[];
}

const defaults: FooterConfig = {
  footer_descricao: "",
  footer_telefone: "",
  footer_email: "",
  footer_horario: "",
  footer_copyright: "",
  footer_pagamentos: ["Visa", "Master", "Pix", "Boleto"],
  footer_links_extras: [],
};

export default function EcommerceFooterEditor() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<FooterConfig>(defaults);
  const [saving, setSaving] = useState(false);
  const [newPagamento, setNewPagamento] = useState("");

  useEffect(() => {
    const load = async () => {
      const estId = localStorage.getItem("estabelecimentoId");
      if (!estId) return;
      const { data } = await supabase
        .from("ecommerce_config")
        .select("footer_descricao, footer_telefone, footer_email, footer_horario, footer_copyright, footer_pagamentos, footer_links_extras")
        .eq("estabelecimento_id", estId)
        .maybeSingle();
      if (data) {
        setConfig({
          footer_descricao: data.footer_descricao || "",
          footer_telefone: data.footer_telefone || "",
          footer_email: data.footer_email || "",
          footer_horario: data.footer_horario || "",
          footer_copyright: data.footer_copyright || "",
          footer_pagamentos: (data.footer_pagamentos as string[]) || ["Visa", "Master", "Pix", "Boleto"],
          footer_links_extras: (data.footer_links_extras as unknown as FooterLink[]) || [],
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
      .upsert(
        { estabelecimento_id: estId, ...config } as any,
        { onConflict: "estabelecimento_id" }
      );
    setSaving(false);
    if (error) toast.error("Erro ao salvar");
    else toast.success("Rodapé salvo com sucesso!");
  };

  const addLink = () => {
    setConfig(c => ({ ...c, footer_links_extras: [...c.footer_links_extras, { label: "", url: "" }] }));
  };

  const removeLink = (i: number) => {
    setConfig(c => ({ ...c, footer_links_extras: c.footer_links_extras.filter((_, idx) => idx !== i) }));
  };

  const updateLink = (i: number, field: "label" | "url", value: string) => {
    setConfig(c => {
      const links = [...c.footer_links_extras];
      links[i] = { ...links[i], [field]: value };
      return { ...c, footer_links_extras: links };
    });
  };

  const addPagamento = () => {
    if (!newPagamento.trim()) return;
    setConfig(c => ({ ...c, footer_pagamentos: [...c.footer_pagamentos, newPagamento.trim()] }));
    setNewPagamento("");
  };

  const removePagamento = (i: number) => {
    setConfig(c => ({ ...c, footer_pagamentos: c.footer_pagamentos.filter((_, idx) => idx !== i) }));
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Editar Rodapé</h1>
            <p className="text-muted-foreground text-sm">Personalize as informações do rodapé do e-commerce</p>
          </div>
        </div>
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Informações Gerais</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Descrição da loja (rodapé)</Label>
              <Textarea
                value={config.footer_descricao}
                onChange={e => setConfig(c => ({ ...c, footer_descricao: e.target.value }))}
                placeholder="Soluções completas para empresas..."
                rows={3}
              />
            </div>
            <div>
              <Label>Texto de Copyright</Label>
              <Input
                value={config.footer_copyright}
                onChange={e => setConfig(c => ({ ...c, footer_copyright: e.target.value }))}
                placeholder="© 2026 Minha Loja. Todos os direitos reservados."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Contato</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Telefone</Label>
                <Input
                  value={config.footer_telefone}
                  onChange={e => setConfig(c => ({ ...c, footer_telefone: e.target.value }))}
                  placeholder="(11) 4002-8922"
                />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input
                  value={config.footer_email}
                  onChange={e => setConfig(c => ({ ...c, footer_email: e.target.value }))}
                  placeholder="contato@loja.com.br"
                />
              </div>
              <div>
                <Label>Horário de atendimento</Label>
                <Input
                  value={config.footer_horario}
                  onChange={e => setConfig(c => ({ ...c, footer_horario: e.target.value }))}
                  placeholder="Seg-Sex 8h-18h"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Formas de Pagamento</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {config.footer_pagamentos.map((p, i) => (
                <span key={i} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-muted text-sm">
                  {p}
                  <button onClick={() => removePagamento(i)} className="ml-1 text-destructive hover:text-destructive/80">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newPagamento}
                onChange={e => setNewPagamento(e.target.value)}
                placeholder="Adicionar forma de pagamento"
                onKeyDown={e => e.key === "Enter" && addPagamento()}
                className="max-w-xs"
              />
              <Button variant="outline" size="sm" onClick={addPagamento}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Links Extras</CardTitle>
              <Button variant="outline" size="sm" onClick={addLink}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar Link
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {config.footer_links_extras.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum link extra adicionado.</p>
            )}
            {config.footer_links_extras.map((link, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={link.label}
                  onChange={e => updateLink(i, "label", e.target.value)}
                  placeholder="Título do link"
                  className="flex-1"
                />
                <Input
                  value={link.url}
                  onChange={e => updateLink(i, "url", e.target.value)}
                  placeholder="URL"
                  className="flex-1"
                />
                <Button variant="ghost" size="icon" onClick={() => removeLink(i)} className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
