import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { gerarPdfVencimentos } from "@/lib/epi/relatorioEpi";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { HardHat, FileDown, Plus, Pencil, Trash2, Printer, Undo2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { usePontoEmpresa } from "@/pages/ponto/usePontoEmpresa";
import {
  CATEGORIAS_EPI, MOTIVOS_ENTREGA, caVencido, estoqueBaixo, situacaoEntrega, trocaPrevista, validarEntrega,
} from "@/lib/epi/regrasEpi";

const sb = supabase as any;
const hojeISO = () => new Date().toISOString().slice(0, 10);
const br = (d?: string | null) => (d ? d.split("-").reverse().join("/") : "—");

type Epi = { id: string; nome: string; categoria: string | null; ca_numero: string | null; ca_validade: string | null; fabricante: string | null; tamanho: string | null; vida_util_dias: number | null; estoque: number; estoque_minimo: number; ativo: boolean };
type Func = { id: string; nome: string; email: string | null; unidade_id: string | null; unidades?: { nome: string } | null };
type Entrega = { id: string; usuario_id: string; epi_id: string; quantidade: number; data_entrega: string; motivo: string; ca_numero: string | null; troca_prevista: string | null; data_devolucao: string | null; motivo_devolucao: string | null; ficha_recebida: boolean; observacoes: string | null };

const epiVazio = { nome: "", categoria: "", ca_numero: "", ca_validade: "", fabricante: "", tamanho: "", vida_util_dias: "", estoque: "0", estoque_minimo: "0" };

export default function ControleEpi() {
  const { empresaId } = usePontoEmpresa();
  const [epis, setEpis] = useState<Epi[]>([]);
  const [funcs, setFuncs] = useState<Func[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [busca, setBusca] = useState("");
  const [epiForm, setEpiForm] = useState<any | null>(null);
  const [excluirEpi, setExcluirEpi] = useState<Epi | null>(null);
  const [excluirEntrega, setExcluirEntrega] = useState<Entrega | null>(null);
  const [nova, setNova] = useState<any | null>(null);
  const [devolver, setDevolver] = useState<{ e: Entrega; motivo: string } | null>(null);
  const [fichaFunc, setFichaFunc] = useState<string>("");
  const hoje = hojeISO();

  const load = async () => {
    if (!empresaId) return;
    const [a, b, c] = await Promise.all([
      sb.from("epi_itens").select("*").eq("empresa_id", empresaId).order("nome"),
      sb.from("usuarios").select("id, nome, email, unidade_id, unidades(nome)").eq("usa_epi", true).eq("ativo", true).order("nome"),
      sb.from("epi_entregas").select("*").eq("empresa_id", empresaId).order("data_entrega", { ascending: false }),
    ]);
    setEpis(a.data || []); setFuncs(b.data || []); setEntregas(c.data || []);
  };
  useEffect(() => { load(); }, [empresaId]);

  const epiMap = useMemo(() => new Map(epis.map((e) => [e.id, e])), [epis]);
  const funcMap = useMemo(() => new Map(funcs.map((f) => [f.id, f])), [funcs]);
  const nomeFunc = (id: string) => { const f = funcMap.get(id); return f ? f.nome : "—"; };

  const alertas = useMemo(() => {
    const trocas = entregas.filter((e) => ["vencida", "vence_em_breve"].includes(situacaoEntrega(e, hoje)));
    return {
      trocas,
      ca: epis.filter((e) => e.ativo && (caVencido(e.ca_validade, hoje) || !e.ca_numero)),
      estoque: epis.filter((e) => e.ativo && estoqueBaixo(e)),
    };
  }, [entregas, epis, hoje]);

  const salvarEpi = async () => {
    if (!epiForm.nome.trim()) return toast.error("Informe o nome do EPI.");
    const payload = {
      empresa_id: empresaId, nome: epiForm.nome.trim(), categoria: epiForm.categoria || null,
      ca_numero: epiForm.ca_numero || null, ca_validade: epiForm.ca_validade || null, fabricante: epiForm.fabricante || null,
      tamanho: epiForm.tamanho || null, vida_util_dias: epiForm.vida_util_dias ? Number(epiForm.vida_util_dias) : null,
      estoque: Number(epiForm.estoque || 0), estoque_minimo: Number(epiForm.estoque_minimo || 0),
    };
    const r = epiForm.id ? await sb.from("epi_itens").update(payload).eq("id", epiForm.id) : await sb.from("epi_itens").insert(payload);
    if (r.error) return toast.error(r.error.message);
    toast.success("EPI salvo."); setEpiForm(null); load();
  };

  const registrarEntrega = async () => {
    const epi = epiMap.get(nova.epi_id);
    if (!nova.funcionario_id || !epi) return toast.error("Escolha o funcionário e o EPI.");
    const qtd = Number(nova.quantidade || 0);
    const erro = validarEntrega(epi, qtd, hoje);
    if (erro) return toast.error(erro);
    if (!nova.ficha_recebida) return toast.error("Confirme que recebeu a ficha de EPI preenchida e assinada.");
    const { data: auth } = await supabase.auth.getUser();
    const { data: u } = await sb.from("usuarios").select("id").eq("auth_user_id", auth.user?.id).maybeSingle();
    const r = await sb.from("epi_entregas").insert({
      empresa_id: empresaId, usuario_id: nova.funcionario_id, epi_id: epi.id, quantidade: qtd,
      data_entrega: nova.data_entrega, motivo: nova.motivo, ca_numero: epi.ca_numero,
      troca_prevista: trocaPrevista(nova.data_entrega, epi.vida_util_dias), ficha_recebida: true,
      observacoes: nova.observacoes || null, entregue_por: u?.id ?? null,
    });
    if (r.error) return toast.error(r.error.message);
    toast.success("Entrega registrada."); setNova(null); load();
  };

  const confirmarDevolucao = async () => {
    const { e, motivo } = devolver!;
    const r = await sb.from("epi_entregas").update({ data_devolucao: hoje, motivo_devolucao: motivo || null }).eq("id", e.id);
    if (r.error) return toast.error(r.error.message);
    toast.success("Devolução registrada."); setDevolver(null); load();
  };

  const situacaoBadge = (e: Entrega) => {
    const s = situacaoEntrega(e, hoje);
    if (s === "devolvido") return <Badge variant="secondary">Devolvido</Badge>;
    if (s === "vencida") return <Badge variant="destructive">Troca vencida</Badge>;
    if (s === "vence_em_breve") return <Badge variant="outline">Troca em breve</Badge>;
    return <Badge>Em uso</Badge>;
  };

  const entregasFiltradas = entregas.filter((e) => {
    const t = busca.toLowerCase();
    return !t || nomeFunc(e.usuario_id).toLowerCase().includes(t) || (epiMap.get(e.epi_id)?.nome ?? "").toLowerCase().includes(t);
  });
  const ficha = entregas.filter((e) => e.usuario_id === fichaFunc).sort((a, b) => a.data_entrega.localeCompare(b.data_entrega));
  const fFicha = funcMap.get(fichaFunc);

  if (!empresaId) return <div className="p-6 text-muted-foreground">Cadastre uma empresa no Controle de Ponto para usar o controle de EPI.</div>;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-full overflow-x-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <HardHat className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">Controle de EPI</h1>
            <p className="text-sm text-muted-foreground">Entrega, devolução e ficha de EPI dos usuários marcados com "Usa EPI" (NR-6)</p>
          </div>
        </div>
        <Button onClick={() => setNova({ funcionario_id: "", epi_id: "", quantidade: "1", data_entrega: hoje, motivo: "primeira_entrega", observacoes: "", ficha_recebida: false })}>
          <Plus className="h-4 w-4 mr-1" /> Nova entrega
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:hidden">
        {[
          ["Entregas em uso", entregas.filter((e) => !e.data_devolucao).length],
          ["Trocas vencidas/próximas", alertas.trocas.length],
          ["CA vencido ou ausente", alertas.ca.length],
          ["Estoque baixo", alertas.estoque.length],
        ].map(([t, v]) => (
          <Card key={t as string}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{t}</p><p className="text-2xl font-semibold">{v}</p></CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="entregas">
        <TabsList className="flex-wrap h-auto print:hidden">
          <TabsTrigger value="entregas">Entregas</TabsTrigger>
          <TabsTrigger value="epis">EPIs cadastrados</TabsTrigger>
          <TabsTrigger value="ficha">Ficha do funcionário</TabsTrigger>
          <TabsTrigger value="alertas">Alertas</TabsTrigger>
        </TabsList>

        <TabsContent value="entregas" className="space-y-3">
          <Input placeholder="Buscar por funcionário ou EPI" value={busca} onChange={(e) => setBusca(e.target.value)} className="max-w-sm" />
          <div className="space-y-2">
            {entregasFiltradas.map((e) => (
              <Card key={e.id}><CardContent className="p-3 flex flex-wrap items-center gap-3 justify-between">
                <div className="min-w-0">
                  <p className="font-medium truncate">{nomeFunc(e.usuario_id)}</p>
                  <p className="text-sm text-muted-foreground">{e.quantidade}× {epiMap.get(e.epi_id)?.nome} · CA {e.ca_numero ?? "—"} · {MOTIVOS_ENTREGA[e.motivo] ?? e.motivo}</p>
                  <p className="text-xs text-muted-foreground">Entregue {br(e.data_entrega)} · Troca {br(e.troca_prevista)}{e.data_devolucao ? ` · Devolvido ${br(e.data_devolucao)}` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  {situacaoBadge(e)}
                  {!e.data_devolucao && <Button size="sm" variant="outline" onClick={() => setDevolver({ e, motivo: "" })}><Undo2 className="h-4 w-4 mr-1" />Devolver</Button>}
                  <Button size="icon" variant="ghost" onClick={() => setExcluirEntrega(e)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent></Card>
            ))}
            {!entregasFiltradas.length && <p className="text-sm text-muted-foreground">Nenhuma entrega registrada.</p>}
          </div>
        </TabsContent>

        <TabsContent value="epis" className="space-y-3">
          <Button variant="outline" onClick={() => setEpiForm({ ...epiVazio })}><Plus className="h-4 w-4 mr-1" />Cadastrar EPI</Button>
          <div className="grid gap-2 md:grid-cols-2">
            {epis.map((i) => (
              <Card key={i.id}><CardContent className="p-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{i.nome} {i.tamanho && <span className="text-muted-foreground">({i.tamanho})</span>}</p>
                  <p className="text-xs text-muted-foreground">{i.categoria ?? "Sem categoria"} · {i.fabricante ?? "—"}</p>
                  <p className="text-xs">CA {i.ca_numero ?? "—"} · validade {br(i.ca_validade)} · vida útil {i.vida_util_dias ? `${i.vida_util_dias} dias` : "—"}</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <Badge variant={estoqueBaixo(i) ? "destructive" : "secondary"}>Estoque {i.estoque}</Badge>
                    {(caVencido(i.ca_validade, hoje) || !i.ca_numero) && <Badge variant="destructive">CA irregular</Badge>}
                  </div>
                </div>
                <div className="flex">
                  <Button size="icon" variant="ghost" onClick={() => setEpiForm({ ...i, vida_util_dias: i.vida_util_dias ?? "", ca_validade: i.ca_validade ?? "", estoque: String(i.estoque), estoque_minimo: String(i.estoque_minimo) })}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setExcluirEpi(i)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent></Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ficha" className="space-y-3">
          <div className="flex flex-wrap gap-2 print:hidden">
            <Select value={fichaFunc} onValueChange={setFichaFunc}>
              <SelectTrigger className="w-72"><SelectValue placeholder="Escolha o funcionário" /></SelectTrigger>
              <SelectContent>{funcs.map((f) => <SelectItem key={f.id} value={f.id}>{nomeFunc(f.id)}</SelectItem>)}</SelectContent>
            </Select>
            {fFicha && <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" />Imprimir ficha</Button>}
          </div>
          {fFicha && (
            <Card><CardHeader><CardTitle className="text-base">Ficha de Controle de Entrega de EPI</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid sm:grid-cols-2 gap-1">
                  <p><b>Funcionário:</b> {nomeFunc(fFicha.id)}</p><p><b>E-mail:</b> {fFicha.email ?? "—"}</p>
                </div>
                <p className="text-xs text-muted-foreground">Registro interno do DP. O comprovante legal é a ficha em papel assinada pelo funcionário (NR-6 e art. 158 da CLT).</p>
                <div className="space-y-2">
                  {ficha.map((e) => (
                    <div key={e.id} className="border rounded-md p-2 grid sm:grid-cols-[1fr_auto] gap-2 items-center">
                      <div>
                        <p>{br(e.data_entrega)} · {e.quantidade}× {epiMap.get(e.epi_id)?.nome} · CA {e.ca_numero ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{MOTIVOS_ENTREGA[e.motivo] ?? e.motivo}{e.data_devolucao ? ` · Devolvido ${br(e.data_devolucao)}${e.motivo_devolucao ? ` (${e.motivo_devolucao})` : ""}` : ""}</p>
                      </div>
                      <Badge variant={e.ficha_recebida ? "secondary" : "destructive"}>{e.ficha_recebida ? "Ficha em papel recebida" : "Sem ficha"}</Badge>
                    </div>
                  ))}
                  {!ficha.length && <p className="text-muted-foreground">Nenhuma entrega para este funcionário.</p>}
                </div>
              </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="alertas" className="space-y-3">
          <Button variant="outline" onClick={() => gerarPdfVencimentos(entregas.filter((e) => !e.data_devolucao && (["vencida", "vence_em_breve"].includes(situacaoEntrega(e, hoje)) || caVencido(epiMap.get(e.epi_id)?.ca_validade, hoje))).map((e) => {
            const caVenc = caVencido(epiMap.get(e.epi_id)?.ca_validade, hoje);
            const f = funcMap.get(e.usuario_id);
            return { unidade: f?.unidades?.nome ?? "Sem unidade", funcionario: nomeFunc(e.usuario_id), epi: epiMap.get(e.epi_id)?.nome ?? "—", ca: e.ca_numero ?? "—", entrega: e.data_entrega, vencimento: e.troca_prevista ?? "", situacao: [situacaoEntrega(e, hoje) === "vencida" ? "Troca vencida" : situacaoEntrega(e, hoje) === "vence_em_breve" ? "Troca vencendo" : "", caVenc ? `CA vencido em ${(epiMap.get(e.epi_id)?.ca_validade ?? "").split("-").reverse().join("/")}` : ""].filter(Boolean).join(" · ") };
          }), "EPIs vencidos, vencendo (15 dias) e com CA vencido, por unidade")}><FileDown className="h-4 w-4 mr-1" />PDF de vencimentos por unidade</Button>
          {[
            ["Trocas vencidas ou nos próximos 15 dias", alertas.trocas.map((e) => `${nomeFunc(e.usuario_id)} — ${epiMap.get(e.epi_id)?.nome} (troca ${br(e.troca_prevista)})`)],
            ["EPIs com CA vencido ou sem CA", alertas.ca.map((i) => `${i.nome} — CA ${i.ca_numero ?? "ausente"} ${i.ca_validade ? `(validade ${br(i.ca_validade)})` : ""}`)],
            ["EPIs com estoque baixo", alertas.estoque.map((i) => `${i.nome} — ${i.estoque} em estoque (mínimo ${i.estoque_minimo})`)],
          ].map(([t, l]) => (
            <Card key={t as string}><CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />{t}</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">{(l as string[]).length ? (l as string[]).map((x) => <p key={x}>{x}</p>) : <p className="text-muted-foreground">Nada pendente.</p>}</CardContent></Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={!!epiForm} onOpenChange={(o) => !o && setEpiForm(null)}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{epiForm?.id ? "Editar EPI" : "Cadastrar EPI"}</DialogTitle></DialogHeader>
          {epiForm && <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label>Nome</Label><Input value={epiForm.nome} onChange={(e) => setEpiForm({ ...epiForm, nome: e.target.value })} placeholder="Ex.: Botina de segurança" /></div>
            <div><Label>Categoria</Label><Select value={epiForm.categoria || ""} onValueChange={(v) => setEpiForm({ ...epiForm, categoria: v })}><SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger><SelectContent>{CATEGORIAS_EPI.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Fabricante</Label><Input value={epiForm.fabricante} onChange={(e) => setEpiForm({ ...epiForm, fabricante: e.target.value })} /></div>
            <div><Label>Nº do CA</Label><Input value={epiForm.ca_numero} onChange={(e) => setEpiForm({ ...epiForm, ca_numero: e.target.value })} /></div>
            <div><Label>Validade do CA</Label><Input type="date" value={epiForm.ca_validade} onChange={(e) => setEpiForm({ ...epiForm, ca_validade: e.target.value })} /></div>
            <div><Label>Tamanho</Label><Input value={epiForm.tamanho} onChange={(e) => setEpiForm({ ...epiForm, tamanho: e.target.value })} /></div>
            <div><Label>Vida útil (dias)</Label><Input type="number" value={epiForm.vida_util_dias} onChange={(e) => setEpiForm({ ...epiForm, vida_util_dias: e.target.value })} /></div>
            <div><Label>Estoque</Label><Input type="number" value={epiForm.estoque} onChange={(e) => setEpiForm({ ...epiForm, estoque: e.target.value })} /></div>
            <div><Label>Estoque mínimo</Label><Input type="number" value={epiForm.estoque_minimo} onChange={(e) => setEpiForm({ ...epiForm, estoque_minimo: e.target.value })} /></div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setEpiForm(null)}>Cancelar</Button><Button onClick={salvarEpi}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!nova} onOpenChange={(o) => !o && setNova(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Nova entrega de EPI</DialogTitle></DialogHeader>
          {nova && <div className="space-y-3">
            <div><Label>Funcionário</Label><Select value={nova.funcionario_id} onValueChange={(v) => setNova({ ...nova, funcionario_id: v })}><SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger><SelectContent>{funcs.map((f) => <SelectItem key={f.id} value={f.id}>{nomeFunc(f.id)}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>EPI</Label><Select value={nova.epi_id} onValueChange={(v) => setNova({ ...nova, epi_id: v })}><SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger><SelectContent>{epis.filter((i) => i.ativo).map((i) => <SelectItem key={i.id} value={i.id}>{i.nome}{i.tamanho ? ` (${i.tamanho})` : ""} — estoque {i.estoque}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Quantidade</Label><Input type="number" value={nova.quantidade} onChange={(e) => setNova({ ...nova, quantidade: e.target.value })} /></div>
              <div><Label>Data</Label><Input type="date" value={nova.data_entrega} onChange={(e) => setNova({ ...nova, data_entrega: e.target.value })} /></div>
            </div>
            <div><Label>Motivo</Label><Select value={nova.motivo} onValueChange={(v) => setNova({ ...nova, motivo: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(MOTIVOS_ENTREGA).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
            {nova.epi_id && <p className="text-xs text-muted-foreground">Troca prevista: {br(trocaPrevista(nova.data_entrega, epiMap.get(nova.epi_id)?.vida_util_dias))}</p>}
            <div><Label>Observações</Label><Textarea value={nova.observacoes} onChange={(e) => setNova({ ...nova, observacoes: e.target.value })} /></div>
            <div className="flex items-start gap-2 rounded-md border p-3">
              <Checkbox id="ficha-recebida" checked={nova.ficha_recebida} onCheckedChange={(v) => setNova({ ...nova, ficha_recebida: v === true })} />
              <Label htmlFor="ficha-recebida" className="leading-snug">Recebi a ficha de EPI em papel, preenchida e assinada pelo funcionário <span className="text-destructive">*</span></Label>
            </div>
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setNova(null)}>Cancelar</Button><Button onClick={registrarEntrega}>Registrar entrega</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!devolver} onOpenChange={(o) => !o && setDevolver(null)}>
        <DialogContent><DialogHeader><DialogTitle>Registrar devolução</DialogTitle></DialogHeader>
          <Label>Motivo / estado do EPI</Label>
          <Input value={devolver?.motivo ?? ""} onChange={(e) => setDevolver((d) => d && { ...d, motivo: e.target.value })} placeholder="Ex.: desgaste, desligamento" />
          <DialogFooter><Button variant="outline" onClick={() => setDevolver(null)}>Cancelar</Button><Button onClick={confirmarDevolucao}>Confirmar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={!!excluirEpi} onOpenChange={(o: boolean) => !o && setExcluirEpi(null)}
        onConfirm={async () => { const r = await sb.from("epi_itens").delete().eq("id", excluirEpi!.id); if (r.error) toast.error("Este EPI já tem entregas registradas e não pode ser excluído."); setExcluirEpi(null); load(); }}
        title="Excluir EPI" description={`Excluir "${excluirEpi?.nome}"?`} />
      <DeleteConfirmDialog open={!!excluirEntrega} onOpenChange={(o: boolean) => !o && setExcluirEntrega(null)}
        onConfirm={async () => { await sb.from("epi_entregas").delete().eq("id", excluirEntrega!.id); setExcluirEntrega(null); load(); }}
        title="Excluir entrega" description="A quantidade volta para o estoque se ainda não foi devolvida." />
    </div>
  );
}
