import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AlertOctagon, Lock, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DenunciasConfig {
  titulo: string; intro: string; email_destino?: string;
  aceita_anonimo: boolean; categorias: string[]; aviso_sigilo: string;
}

export default function EcommerceDenuncias() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [cfg, setCfg] = useState<DenunciasConfig | null>(null);
  const [estId, setEstId] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);

  const [anonimo, setAnonimo] = useState(true);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [categoria, setCategoria] = useState("");
  const [local, setLocal] = useState("");
  const [dataOc, setDataOc] = useState("");
  const [descricao, setDescricao] = useState("");

  useEffect(() => {
    (async () => {
      const id = localStorage.getItem("estabelecimentoId");
      setEstId(id);
      if (!id) { setLoading(false); return; }
      const { data } = await supabase.from("ecommerce_config" as any)
        .select("denuncias_enabled, denuncias_config").eq("estabelecimento_id", id).maybeSingle();
      if (data) {
        setEnabled(!!(data as any).denuncias_enabled);
        setCfg((data as any).denuncias_config as DenunciasConfig);
        if (!(data as any).denuncias_config?.aceita_anonimo) setAnonimo(false);
      }
      setLoading(false);
    })();
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao.trim()) return toast.error("Descreva a ocorrência");
    if (!anonimo && !nome.trim()) return toast.error("Informe seu nome ou marque como anônimo");
    setSaving(true);
    const { error } = await supabase.from("ecommerce_denuncias" as any).insert({
      estabelecimento_id: estId,
      categoria: categoria || null,
      descricao,
      local_ocorrencia: local || null,
      data_ocorrencia: dataOc || null,
      anonimo,
      nome: anonimo ? null : nome || null,
      email: anonimo ? null : email || null,
      telefone: anonimo ? null : telefone || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setSent(true);
  }

  if (loading) return <div className="p-12 text-center text-muted-foreground">Carregando...</div>;
  if (!enabled || !cfg) return <Navigate to="/ecommerce" replace />;

  if (sent) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <CheckCircle2 className="h-14 w-14 mx-auto text-emerald-500" />
            <h2 className="text-2xl font-bold">Denúncia registrada</h2>
            <p className="text-muted-foreground">Recebemos sua denúncia e ela será tratada com sigilo pela equipe responsável. Obrigado por contribuir com um ambiente mais seguro.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="text-center py-6 border-b">
        <AlertOctagon className="h-10 w-10 mx-auto text-primary mb-3" />
        <h1 className="text-3xl font-bold">{cfg.titulo}</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl mx-auto whitespace-pre-line">{cfg.intro}</p>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex gap-3 text-sm">
          <Lock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-muted-foreground">{cfg.aviso_sigilo}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={enviar} className="space-y-4">
            {cfg.aceita_anonimo && (
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/40">
                <div>
                  <Label className="text-sm font-semibold">Denúncia anônima</Label>
                  <p className="text-xs text-muted-foreground">Nenhum dado de contato será solicitado</p>
                </div>
                <Switch checked={anonimo} onCheckedChange={setAnonimo} />
              </div>
            )}

            {!anonimo && (
              <div className="grid md:grid-cols-2 gap-3">
                <div><Label>Nome</Label><Input value={nome} onChange={e => setNome(e.target.value)} /></div>
                <div><Label>E-mail</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
                <div className="md:col-span-2"><Label>Telefone</Label><Input value={telefone} onChange={e => setTelefone(e.target.value)} /></div>
              </div>
            )}

            <div>
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                <SelectContent>
                  {cfg.categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div><Label>Local da ocorrência</Label><Input value={local} onChange={e => setLocal(e.target.value)} placeholder="Ex.: setor, filial, sala..." /></div>
              <div><Label>Data da ocorrência</Label><Input type="date" value={dataOc} onChange={e => setDataOc(e.target.value)} /></div>
            </div>

            <div>
              <Label>Descrição da ocorrência *</Label>
              <Textarea rows={6} value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descreva com o máximo de detalhes possível (o que aconteceu, quem estava envolvido, quando, testemunhas, etc.)" required />
            </div>

            <Button type="submit" disabled={saving} className="w-full" size="lg">
              {saving ? "Enviando..." : "Enviar denúncia"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
