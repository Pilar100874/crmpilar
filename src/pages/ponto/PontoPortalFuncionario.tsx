import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Clock, Wallet, FileEdit, FileSignature, AlertCircle, Smartphone, FileUp, FileText, Palmtree } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function PontoPortalFuncionario() {
  const [func, setFunc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [espelho, setEspelho] = useState<any[]>([]);
  const [ajustes, setAjustes] = useState<any[]>([]);
  const [assinaturas, setAssinaturas] = useState<any[]>([]);
  const [atestados, setAtestados] = useState<any[]>([]);
  const [openAjuste, setOpenAjuste] = useState(false);
  const [openAtestado, setOpenAtestado] = useState(false);
  const [openFerias, setOpenFerias] = useState(false);
  const [novoAjuste, setNovoAjuste] = useState({ data: "", tipo: "entrada", valor_proposto: "", motivo: "" });
  const [novoAtestado, setNovoAtestado] = useState({ data_inicio: "", data_fim: "", cid: "", observacao: "", file: null as File | null });
  const [novaFerias, setNovaFerias] = useState({ tipo: "ferias", data_inicio: "", data_fim: "", motivo: "" });
  const [ferias, setFerias] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: f } = await supabase
      .from("ponto_funcionarios").select("*").eq("auth_user_id", user.id).maybeSingle();
    if (!f) { setLoading(false); return; }
    setFunc(f);

    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const [esp, aj, ass, at, fer] = await Promise.all([
      supabase.from("ponto_espelho_diario").select("*")
        .eq("funcionario_id", f.id).gte("data", inicioMes).order("data", { ascending: false }),
      supabase.from("ponto_ajustes").select("*")
        .eq("funcionario_id", f.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("ponto_assinaturas_espelho").select("*")
        .eq("funcionario_id", f.id).order("mes_referencia", { ascending: false }).limit(12),
      (supabase.from as any)("ponto_atestados").select("*")
        .eq("funcionario_id", f.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("ponto_ferias_afastamentos").select("*")
        .eq("funcionario_id", f.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setEspelho(esp.data || []);
    setAjustes(aj.data || []);
    setAssinaturas(ass.data || []);
    setAtestados(at.data || []);
    setFerias(fer.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmt = (m: number | null) => {
    if (!m) return "0h00";
    const h = Math.floor(Math.abs(m) / 60);
    const mm = Math.abs(m) % 60;
    return `${m < 0 ? "-" : ""}${h}h${String(mm).padStart(2, "0")}`;
  };

  const saldoBH = espelho.reduce((s, r) => s + (r.saldo_banco_min || 0), 0);
  const totalExtras = espelho.reduce((s, r) => s + (r.extra_min || 0), 0);
  const totalFaltas = espelho.filter(r => r.falta).length;
  const totalAtrasos = espelho.reduce((s, r) => s + (r.atraso_min || 0), 0);

  const enviarAjuste = async () => {
    if (!func || !novoAjuste.data || !novoAjuste.motivo) {
      return toast.error("Preencha data e motivo");
    }
    const { error } = await supabase.from("ponto_ajustes").insert({
      funcionario_id: func.id,
      data: novoAjuste.data,
      tipo: novoAjuste.tipo,
      valor_proposto: novoAjuste.valor_proposto || null,
      motivo: novoAjuste.motivo,
      status: "pendente",
      solicitado_por: func.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Ajuste solicitado");
    setOpenAjuste(false);
    setNovoAjuste({ data: "", tipo: "entrada", valor_proposto: "", motivo: "" });
    load();
  };

  const assinarMes = async (mes: string) => {
    if (!func) return;
    const raw = `${func.id}|${mes}|${new Date().toISOString()}|${navigator.userAgent}`;
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
    const { error } = await supabase.from("ponto_assinaturas_espelho").insert({
      funcionario_id: func.id, mes_referencia: `${mes}-01`, hash,
      assinado_em: new Date().toISOString(),
    });
    if (error) return toast.error(error.message);
    toast.success("Espelho assinado");
    load();
  };

  const enviarAtestado = async () => {
    if (!func || !novoAtestado.file || !novoAtestado.data_inicio || !novoAtestado.data_fim) {
      return toast.error("Preencha datas e selecione o arquivo");
    }
    setUploading(true);
    try {
      const ext = novoAtestado.file.name.split(".").pop() || "pdf";
      const path = `${func.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("ponto-atestados")
        .upload(path, novoAtestado.file);
      if (upErr) throw upErr;
      const { error: insErr } = await (supabase.from as any)("ponto_atestados").insert({
        funcionario_id: func.id,
        data_inicio: novoAtestado.data_inicio,
        data_fim: novoAtestado.data_fim,
        cid: novoAtestado.cid || null,
        observacao: novoAtestado.observacao || null,
        arquivo_url: path,
        status: "pendente",
      });
      if (insErr) throw insErr;
      toast.success("Atestado enviado para análise");
      setOpenAtestado(false);
      setNovoAtestado({ data_inicio: "", data_fim: "", cid: "", observacao: "", file: null });
      load();
    } catch (e: any) {
      toast.error(e.message || "Falha ao enviar atestado");
    } finally {
      setUploading(false);
    }
  };

  const enviarFerias = async () => {
    if (!func || !novaFerias.data_inicio || !novaFerias.data_fim) {
      return toast.error("Preencha as datas");
    }
    const ini = new Date(novaFerias.data_inicio);
    const fim = new Date(novaFerias.data_fim);
    const dias = Math.max(1, Math.round((fim.getTime() - ini.getTime()) / 86400000) + 1);
    // Resolver estabelecimento_id via empresa
    const { data: emp } = await supabase.from("ponto_empresas")
      .select("estabelecimento_id").eq("id", func.empresa_id).maybeSingle();
    const { error } = await supabase.from("ponto_ferias_afastamentos").insert({
      funcionario_id: func.id,
      estabelecimento_id: emp?.estabelecimento_id,
      tipo: novaFerias.tipo,
      data_inicio: novaFerias.data_inicio,
      data_fim: novaFerias.data_fim,
      dias,
      motivo: novaFerias.motivo || null,
      status: "pendente",
    });
    if (error) return toast.error(error.message);
    toast.success("Solicitação enviada para o RH");
    setOpenFerias(false);
    setNovaFerias({ tipo: "ferias", data_inicio: "", data_fim: "", motivo: "" });
    load();
  };

  const mesAtual = new Date().toISOString().slice(0, 7);
  const jaAssinou = assinaturas.some(a => (a.mes_referencia || "").startsWith(mesAtual));

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;
  if (!func) return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Seu usuário não está vinculado a um funcionário. Solicite ao RH o vínculo do seu e-mail.
        </p>
      </CardContent>
    </Card>
  );

  const tone = (s: string) => s === "aprovado" ? "default" : s === "rejeitado" ? "destructive" : "secondary";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold sm:text-2xl">Olá, {func.nome.split(" ")[0]}</h2>
        <p className="text-sm text-muted-foreground">{func.cargo || "Funcionário"} · Matrícula {func.matricula || "—"}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Banco de horas (mês)</CardTitle></CardHeader>
          <CardContent><div className={`text-xl font-bold ${saldoBH < 0 ? "text-destructive" : ""}`}>{fmt(saldoBH)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Horas extras</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold">{fmt(totalExtras)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Atrasos</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold">{fmt(totalAtrasos)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Faltas</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold">{totalFaltas}</div></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild><Link to="/ponto/registro"><Smartphone className="mr-2 h-4 w-4" /> Bater ponto</Link></Button>
        <Dialog open={openAjuste} onOpenChange={setOpenAjuste}>
          <DialogTrigger asChild>
            <Button variant="outline"><FileEdit className="mr-2 h-4 w-4" /> Solicitar ajuste</Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Solicitar ajuste de ponto</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Data</Label><Input type="date" value={novoAjuste.data} onChange={e => setNovoAjuste({ ...novoAjuste, data: e.target.value })} /></div>
              <div><Label>Tipo de marcação</Label>
                <Select value={novoAjuste.tipo} onValueChange={v => setNovoAjuste({ ...novoAjuste, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida_intervalo">Saída intervalo</SelectItem>
                    <SelectItem value="retorno_intervalo">Retorno intervalo</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Horário proposto</Label><Input type="time" value={novoAjuste.valor_proposto} onChange={e => setNovoAjuste({ ...novoAjuste, valor_proposto: e.target.value })} /></div>
              <div><Label>Motivo</Label><Textarea value={novoAjuste.motivo} onChange={e => setNovoAjuste({ ...novoAjuste, motivo: e.target.value })} placeholder="Ex: Esqueci de bater na entrada" /></div>
            </div>
            <DialogFooter><Button onClick={enviarAjuste}>Enviar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
        {!jaAssinou && (
          <Button variant="outline" onClick={() => assinarMes(mesAtual)}>
            <FileSignature className="mr-2 h-4 w-4" /> Assinar espelho de {mesAtual}
          </Button>
        )}
        <Dialog open={openAtestado} onOpenChange={setOpenAtestado}>
          <DialogTrigger asChild>
            <Button variant="outline"><FileUp className="mr-2 h-4 w-4" /> Enviar atestado</Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Enviar atestado médico</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Início</Label><Input type="date" value={novoAtestado.data_inicio}
                  onChange={e => setNovoAtestado({ ...novoAtestado, data_inicio: e.target.value })} /></div>
                <div><Label>Fim</Label><Input type="date" value={novoAtestado.data_fim}
                  onChange={e => setNovoAtestado({ ...novoAtestado, data_fim: e.target.value })} /></div>
              </div>
              <div><Label>CID (opcional)</Label><Input value={novoAtestado.cid}
                onChange={e => setNovoAtestado({ ...novoAtestado, cid: e.target.value })} placeholder="Ex: J11" /></div>
              <div><Label>Observação</Label><Textarea value={novoAtestado.observacao}
                onChange={e => setNovoAtestado({ ...novoAtestado, observacao: e.target.value })} /></div>
              <div><Label>Arquivo (PDF/imagem)</Label>
                <Input type="file" accept="application/pdf,image/*"
                  onChange={e => setNovoAtestado({ ...novoAtestado, file: e.target.files?.[0] || null })} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={enviarAtestado} disabled={uploading}>
                {uploading ? "Enviando…" : "Enviar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={openFerias} onOpenChange={setOpenFerias}>
          <DialogTrigger asChild>
            <Button variant="outline"><Palmtree className="mr-2 h-4 w-4" /> Solicitar férias/afastamento</Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Solicitar férias ou afastamento</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Tipo</Label>
                <Select value={novaFerias.tipo} onValueChange={v => setNovaFerias({ ...novaFerias, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ferias">Férias</SelectItem>
                    <SelectItem value="abono">Abono</SelectItem>
                    <SelectItem value="licenca">Licença</SelectItem>
                    <SelectItem value="afastamento">Afastamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Início</Label><Input type="date" value={novaFerias.data_inicio}
                  onChange={e => setNovaFerias({ ...novaFerias, data_inicio: e.target.value })} /></div>
                <div><Label>Fim</Label><Input type="date" value={novaFerias.data_fim}
                  onChange={e => setNovaFerias({ ...novaFerias, data_fim: e.target.value })} /></div>
              </div>
              <div><Label>Motivo</Label><Textarea value={novaFerias.motivo}
                onChange={e => setNovaFerias({ ...novaFerias, motivo: e.target.value })} placeholder="Ex: férias programadas" /></div>
            </div>
            <DialogFooter><Button onClick={enviarFerias}>Enviar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>



      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Espelho do mês</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            {espelho.length === 0 ? <p className="text-sm text-muted-foreground">Sem registros este mês.</p> : (
              <div className="overflow-x-auto -mx-1 sm:mx-0"><table className="w-full table-fixed text-xs resp-table">
                <thead><tr className="text-left text-muted-foreground"><th className="p-1">Data</th><th>Ent</th><th>Sai</th><th>Atraso</th><th>Extra</th></tr></thead>
                <tbody>
                  {espelho.slice(0, 15).map(r => (
                    <tr key={r.id} className="border-t">
                      <td className="p-1">{r.data}</td>
                      <td>{r.entrada?.slice(0, 5) || "—"}</td>
                      <td>{r.saida?.slice(0, 5) || "—"}</td>
                      <td>{fmt(r.atraso_min)}</td>
                      <td>{fmt(r.extra_min)}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4" /> Meus ajustes</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {ajustes.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum ajuste solicitado.</p> :
              ajustes.map(a => (
                <div key={a.id} className="flex items-center justify-between border-b pb-1.5 text-sm">
                  <div>
                    <p className="font-medium">{a.data} · {a.tipo.replace("_", " ")}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{a.motivo}</p>
                  </div>
                  <Badge variant={tone(a.status) as any}>{a.status}</Badge>
                </div>
              ))
            }
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Meus atestados</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {atestados.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum atestado enviado.</p> :
            atestados.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between border-b pb-1.5 text-sm">
                <div>
                  <p className="font-medium">{a.data_inicio} → {a.data_fim} {a.cid && <span className="text-muted-foreground">· CID {a.cid}</span>}</p>
                  {a.observacao && <p className="text-xs text-muted-foreground truncate max-w-[400px]">{a.observacao}</p>}
                </div>
                <Badge variant={tone(a.status) as any}>{a.status}</Badge>
              </div>
            ))
          }
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Palmtree className="h-4 w-4" /> Minhas férias e afastamentos</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {ferias.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma solicitação.</p> :
            ferias.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between border-b pb-1.5 text-sm">
                <div>
                  <p className="font-medium">{a.tipo} · {a.data_inicio} → {a.data_fim} <span className="text-muted-foreground">({a.dias}d)</span></p>
                  {a.motivo && <p className="text-xs text-muted-foreground truncate max-w-[400px]">{a.motivo}</p>}
                </div>
                <Badge variant={tone(a.status) as any}>
                  {a.status}{a.nivel_aprovacao_max > 1 ? ` ${a.nivel_aprovacao_atual}/${a.nivel_aprovacao_max}` : ""}
                </Badge>
              </div>
            ))
          }
        </CardContent>
      </Card>
    </div>
  );
}
