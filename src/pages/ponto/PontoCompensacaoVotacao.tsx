import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Vote, CheckCircle2, XCircle, Clock, Play, Square, RefreshCw, FileText } from "lucide-react";
import { usePontoEmpresa } from "./usePontoEmpresa";
import { format, parseISO } from "date-fns";

export default function PontoCompensacaoVotacao() {
  const { empresaId } = usePontoEmpresa();
  const [acordos, setAcordos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [openAbrir, setOpenAbrir] = useState<any>(null);
  const [fechaEm, setFechaEm] = useState("");
  const [quorum, setQuorum] = useState(70);
  const [openVotar, setOpenVotar] = useState<any>(null);
  const [meuFuncId, setMeuFuncId] = useState<string>("");
  const [justificativa, setJustificativa] = useState("");

  const load = async () => {
    if (!empresaId) return;
    setLoading(true);
    const { data } = await supabase.from("ponto_compensacao_acordos")
      .select("*").eq("empresa_id", empresaId)
      .order("created_at", { ascending: false });
    setAcordos(data || []);
    // descobre funcionário ligado ao usuário logado (e-mail)
    const { data: u } = await supabase.auth.getUser();
    if (u?.user?.email) {
      const { data: f } = await supabase.from("ponto_funcionarios")
        .select("id").eq("empresa_id", empresaId).eq("email", u.user.email).maybeSingle();
      if (f) setMeuFuncId(f.id);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [empresaId]);

  const abrirVotacao = async () => {
    if (!openAbrir || !fechaEm) return;
    const r = await supabase.functions.invoke("ponto-compensacao-votacao", {
      body: { action: "abrir", acordo_id: openAbrir.id, fecha_em: new Date(fechaEm).toISOString(), quorum_percentual: quorum },
    });
    if (r.error) return toast.error(r.error.message);
    toast.success(`Votação aberta — ${(r.data as any)?.elegiveis} elegíveis`);
    setOpenAbrir(null); load();
  };

  const apurar = async (a: any, fechar = false) => {
    const r = await supabase.functions.invoke("ponto-compensacao-votacao", {
      body: { action: fechar ? "fechar" : "apurar", acordo_id: a.id },
    });
    if (r.error) return toast.error(r.error.message);
    const d = r.data as any;
    toast.success(`${fechar ? "Encerrado" : "Apuração"}: ${d.sim} SIM / ${d.nao} NÃO (${d.pct_sim?.toFixed(0)}% sim, ${d.pct_participacao?.toFixed(0)}% participação) — ${d.resultado}`);
    load();
  };

  const votar = async (voto: "sim"|"nao"|"abster") => {
    if (!openVotar || !meuFuncId) return toast.error("Funcionário não identificado");
    const r = await supabase.functions.invoke("ponto-compensacao-votacao", {
      body: { action: "votar", acordo_id: openVotar.id, funcionario_id: meuFuncId, voto, justificativa },
    });
    if (r.error) return toast.error(r.error.message);
    toast.success("Voto registrado");
    setOpenVotar(null); setJustificativa("");
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Vote className="h-6 w-6" /> Votação de Compensação</h1>
        <p className="text-sm text-muted-foreground">Submeta propostas (ex: liberar p/ jogo do Brasil) à votação. Se atingir o quórum, o sistema gera termo de ciência, registra a decisão e lança automaticamente a compensação no banco de horas.</p>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {!loading && acordos.length === 0 && (
        <Card><CardContent className="text-sm text-muted-foreground p-6">
          Nenhuma proposta. Crie em <a className="underline" href="/ponto/compensacao">Compensação</a> e volte aqui para abrir a votação.
        </CardContent></Card>
      )}

      {acordos.map((a) => {
        const total = (a.total_votos_sim || 0) + (a.total_votos_nao || 0);
        const pctSim = total > 0 ? (a.total_votos_sim / total) * 100 : 0;
        const pctPart = a.total_elegiveis > 0 ? (total / a.total_elegiveis) * 100 : 0;
        const aberta = a.votacao_ativa;
        const prazoExp = a.votacao_fecha_em && new Date(a.votacao_fecha_em) < new Date();
        return (
          <Card key={a.id}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex flex-wrap items-center gap-2">
                    {a.titulo}
                    {aberta && <Badge variant="default" className="gap-1"><Clock className="h-3 w-3" />Em votação</Badge>}
                    {a.votacao_resultado === "aprovado" && <Badge className="bg-green-600 gap-1"><CheckCircle2 className="h-3 w-3" />Aprovado</Badge>}
                    {a.votacao_resultado === "rejeitado" && <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejeitado</Badge>}
                    {prazoExp && aberta && <Badge variant="outline">Prazo expirado</Badge>}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Compensação {a.minutos_por_dia} min/dia • {format(parseISO(a.data_inicio_compensacao),"dd/MM/yy")} → {format(parseISO(a.data_fim_compensacao),"dd/MM/yy")}
                    {a.votacao_fecha_em && <> • Fecha: {format(parseISO(a.votacao_fecha_em),"dd/MM/yy HH:mm")}</>}
                    {" • Quórum: "}{a.quorum_percentual || 70}%
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!aberta && !a.votacao_resultado && (
                    <Button size="sm" onClick={() => { setOpenAbrir(a); setQuorum(a.quorum_percentual || 70); }}>
                      <Play className="h-4 w-4 mr-1" />Abrir votação
                    </Button>
                  )}
                  {aberta && meuFuncId && (
                    <Button size="sm" variant="outline" onClick={() => setOpenVotar(a)}>
                      <Vote className="h-4 w-4 mr-1" />Votar
                    </Button>
                  )}
                  {aberta && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => apurar(a, false)}>
                        <RefreshCw className="h-4 w-4 mr-1" />Apurar
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => apurar(a, true)}>
                        <Square className="h-4 w-4 mr-1" />Encerrar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>SIM: {a.total_votos_sim || 0}</span>
                <span>NÃO: {a.total_votos_nao || 0}</span>
                <span>Total: {total} / {a.total_elegiveis || 0} elegíveis ({pctPart.toFixed(0)}%)</span>
              </div>
              <Progress value={pctSim} />
              <div className="text-xs text-muted-foreground">{pctSim.toFixed(1)}% favoráveis (mín. {a.quorum_percentual || 70}%)</div>
              {a.observacoes?.includes("TERMO DE CIÊNCIA") && (
                <details className="text-xs mt-2">
                  <summary className="cursor-pointer flex items-center gap-1"><FileText className="h-3 w-3" />Termo de ciência</summary>
                  <pre className="whitespace-pre-wrap mt-2 p-2 bg-muted rounded text-[11px]">{a.observacoes}</pre>
                </details>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Abrir */}
      <Dialog open={!!openAbrir} onOpenChange={(v) => !v && setOpenAbrir(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Abrir votação — {openAbrir?.titulo}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Fecha em</Label>
              <Input type="datetime-local" value={fechaEm} onChange={(e) => setFechaEm(e.target.value)} />
            </div>
            <div>
              <Label>Quórum mínimo de SIM (%)</Label>
              <Input type="number" min={1} max={100} value={quorum} onChange={(e) => setQuorum(Number(e.target.value))} />
            </div>
            <p className="text-xs text-muted-foreground">
              Todos os funcionários ativos da empresa serão considerados elegíveis e poderão votar uma única vez.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAbrir(null)}>Cancelar</Button>
            <Button onClick={abrirVotacao}>Abrir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Votar */}
      <Dialog open={!!openVotar} onOpenChange={(v) => !v && setOpenVotar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seu voto — {openVotar?.titulo}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">{openVotar?.observacoes?.split("\n")[0]}</p>
            <Textarea placeholder="Justificativa (opcional)" value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => votar("abster")}>Abster</Button>
            <Button variant="destructive" onClick={() => votar("nao")}>NÃO</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => votar("sim")}>SIM</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
