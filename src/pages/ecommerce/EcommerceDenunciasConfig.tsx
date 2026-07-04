import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, AlertOctagon, Plus, Trash2, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DenunciasConfig {
  titulo: string;
  intro: string;
  email_destino: string;
  aceita_anonimo: boolean;
  categorias: string[];
  aviso_sigilo: string;
}

const DEFAULT_CFG: DenunciasConfig = {
  titulo: "Canal de Denúncias - NR-1",
  intro: "Este canal segue a Norma Regulamentadora nº 1 (NR-1) e o Programa de Gerenciamento de Riscos (PGR), incluindo riscos psicossociais. As denúncias podem ser feitas de forma anônima e serão tratadas com sigilo.",
  email_destino: "",
  aceita_anonimo: true,
  categorias: ["Assédio moral","Assédio sexual","Riscos psicossociais","Condições inseguras de trabalho","Acidente ou quase-acidente","Discriminação","Outro"],
  aviso_sigilo: "As informações fornecidas serão tratadas com sigilo e utilizadas apenas para investigação interna, respeitando a LGPD (Lei 13.709/2018).",
};

const STATUS_COLORS: Record<string, string> = {
  nova: "bg-blue-500/10 text-blue-600",
  em_analise: "bg-amber-500/10 text-amber-600",
  resolvida: "bg-emerald-500/10 text-emerald-600",
  arquivada: "bg-muted text-muted-foreground",
};

export default function EcommerceDenunciasConfig() {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(false);
  const [cfg, setCfg] = useState<DenunciasConfig>(DEFAULT_CFG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [novaCat, setNovaCat] = useState("");
  const [denuncias, setDenuncias] = useState<any[]>([]);
  const [selecionada, setSelecionada] = useState<any | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const estId = localStorage.getItem("estabelecimentoId");
    if (!estId) { setLoading(false); return; }
    const [{ data: c }, { data: d }] = await Promise.all([
      supabase.from("ecommerce_config" as any).select("denuncias_enabled, denuncias_config").eq("estabelecimento_id", estId).maybeSingle(),
      supabase.from("ecommerce_denuncias" as any).select("*").eq("estabelecimento_id", estId).order("created_at", { ascending: false }),
    ]);
    if (c) {
      setEnabled(!!(c as any).denuncias_enabled);
      const cc = (c as any).denuncias_config;
      if (cc) setCfg({ ...DEFAULT_CFG, ...cc });
    }
    setDenuncias((d as any[]) || []);
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    const estId = localStorage.getItem("estabelecimentoId");
    if (!estId) { setSaving(false); return; }
    const { error } = await supabase.from("ecommerce_config" as any)
      .update({ denuncias_enabled: enabled, denuncias_config: cfg as any })
      .eq("estabelecimento_id", estId);
    if (error) toast.error(error.message); else toast.success("Canal de denúncias atualizado");
    setSaving(false);
  }

  async function updateDenuncia(id: string, patch: any) {
    const { error } = await supabase.from("ecommerce_denuncias" as any).update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    setDenuncias(prev => prev.map(x => x.id === id ? { ...x, ...patch } : x));
    if (selecionada?.id === id) setSelecionada({ ...selecionada, ...patch });
    toast.success("Atualizado");
  }

  async function deleteDenuncia(id: string) {
    if (!confirm("Excluir esta denúncia?")) return;
    const { error } = await supabase.from("ecommerce_denuncias" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    setDenuncias(prev => prev.filter(x => x.id !== id));
    if (selecionada?.id === id) setSelecionada(null);
  }

  if (loading) return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/ecommerce-config")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><AlertOctagon className="h-6 w-6" /> Canal de Denúncias (NR-1)</h1>
            <p className="text-muted-foreground text-sm">Configure o canal e gerencie as denúncias recebidas</p>
          </div>
        </div>
        <Button onClick={save} disabled={saving} className="gap-2"><Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}</Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Habilitar canal de denúncias no e-commerce</span>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </CardTitle>
          <CardDescription>Quando ativado, a página fica acessível em <code className="text-xs">/ecommerce/denuncias</code></CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Textos exibidos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Título</Label><Input value={cfg.titulo} onChange={e => setCfg({ ...cfg, titulo: e.target.value })} /></div>
          <div><Label>Introdução</Label><Textarea rows={3} value={cfg.intro} onChange={e => setCfg({ ...cfg, intro: e.target.value })} /></div>
          <div><Label>Aviso de sigilo</Label><Textarea rows={2} value={cfg.aviso_sigilo} onChange={e => setCfg({ ...cfg, aviso_sigilo: e.target.value })} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recebimento</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>E-mail para notificação (opcional)</Label>
            <Input type="email" placeholder="compliance@suaempresa.com" value={cfg.email_destino} onChange={e => setCfg({ ...cfg, email_destino: e.target.value })} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-semibold">Aceitar denúncias anônimas</Label>
              <p className="text-xs text-muted-foreground">Permitir envio sem identificação (recomendado pela NR-1)</p>
            </div>
            <Switch checked={cfg.aceita_anonimo} onCheckedChange={v => setCfg({ ...cfg, aceita_anonimo: v })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Categorias de denúncia</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {cfg.categorias.map((c, i) => (
              <Badge key={i} variant="secondary" className="gap-1">
                {c}
                <button onClick={() => setCfg({ ...cfg, categorias: cfg.categorias.filter((_, idx) => idx !== i) })}>
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Nova categoria" value={novaCat} onChange={e => setNovaCat(e.target.value)} />
            <Button variant="outline" onClick={() => { if (novaCat.trim()) { setCfg({ ...cfg, categorias: [...cfg.categorias, novaCat.trim()] }); setNovaCat(""); } }}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Inbox className="h-5 w-5" /> Denúncias recebidas ({denuncias.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!denuncias.length && <p className="text-sm text-muted-foreground">Nenhuma denúncia recebida.</p>}
          {denuncias.map(d => (
            <div key={d.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={STATUS_COLORS[d.status] || ""}>{d.status}</Badge>
                    {d.categoria && <Badge variant="outline">{d.categoria}</Badge>}
                    {d.anonimo && <Badge variant="outline">Anônima</Badge>}
                    <span className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString("pt-BR")}</span>
                  </div>
                  <p className="text-sm mt-2 line-clamp-2">{d.descricao}</p>
                  {!d.anonimo && (d.nome || d.email) && (
                    <p className="text-xs text-muted-foreground mt-1">{d.nome} {d.email && `· ${d.email}`}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Select value={d.status} onValueChange={v => updateDenuncia(d.id, { status: v })}>
                    <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nova">Nova</SelectItem>
                      <SelectItem value="em_analise">Em análise</SelectItem>
                      <SelectItem value="resolvida">Resolvida</SelectItem>
                      <SelectItem value="arquivada">Arquivada</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" onClick={() => deleteDenuncia(d.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
