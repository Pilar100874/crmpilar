import { useEffect, useState } from "react";
import { PhoneCall, PhoneOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { meuRamal } from "@/components/telefonia/IaAjudaAtendente";
import {
  carregarRoteirosSalvos, lerConduta, lerDepartamento, montarObjetivoRoteiro, regrasConduta, regrasConversa,
  roteiroPorId, roteirosDoDepartamento, type RoteiroId,
} from "@/lib/voz/roteirosLigacao";

const db = supabase as any;
type AgenteSim = { id?: string; nome: string; modos: string[]; ativo: boolean; config?: Record<string, unknown> | null };
type Fala = { papel: string; texto: string };

const ROTULO: Record<string, string> = {
  pendente: "Aguardando aparelho de voz…", executando: "Discando…", concluido: "Ligação atendida",
  sem_resposta: "Não atendeu", erro: "Erro", cancelado: "Cancelada",
};

/** Liga para um número escolhido usando o agente e o roteiro reais, para validar a conversa. */
export function SimuladorLigacaoVoz({ estabelecimentoId, agentes }: { estabelecimentoId: string | null; agentes: AgenteSim[] }) {
  const ligadores = agentes.filter((a) => a.id && a.ativo && a.modos?.includes("ligar"));
  const [agenteId, setAgenteId] = useState("");
  const [numero, setNumero] = useState("");
  const [roteiro, setRoteiro] = useState<RoteiroId | "">("");
  const [produto, setProduto] = useState("");
  const [aviso, setAviso] = useState("");
  const [obs, setObs] = useState("");
  const [, setVersao] = useState(0);
  const [cmd, setCmd] = useState<{ id: string; inicio: string; numero: string } | null>(null);
  const [status, setStatus] = useState("");
  const [falas, setFalas] = useState<Fala[]>([]);
  const [transferido, setTransferido] = useState<string | null>(null);

  useEffect(() => { void carregarRoteirosSalvos(db, estabelecimentoId).then(() => setVersao((v) => v + 1)); }, [estabelecimentoId]);
  useEffect(() => { if (!agenteId && ligadores[0]?.id) setAgenteId(ligadores[0].id); }, [ligadores, agenteId]);

  const agente = ligadores.find((a) => a.id === agenteId);
  const roteiros = agente ? roteirosDoDepartamento(lerDepartamento(agente.config)) : [];
  useEffect(() => { if (roteiros.length && !roteiros.some((r) => r.id === roteiro)) setRoteiro(roteiros[0].id); }, [roteiros, roteiro]);
  const campos = roteiro ? roteiroPorId(roteiro).campos : [];

  // Acompanha o comando e a transcrição da chamada ao vivo.
  useEffect(() => {
    if (!cmd) return;
    let vivo = true;
    const t = setInterval(async () => {
      const s = (await db.from("voz_comandos").select("status").eq("id", cmd.id).maybeSingle()).data?.status;
      if (!vivo) return;
      if (s) setStatus(s);
      const ch = (await db.from("voz_chamadas").select("transcricao, transferido_para, status").eq("estabelecimento_id", estabelecimentoId)
        .eq("numero", cmd.numero).gte("iniciada_em", cmd.inicio).order("iniciada_em", { ascending: false }).limit(1).maybeSingle()).data;
      if (!vivo || !ch) return;
      setFalas(Array.isArray(ch.transcricao) ? ch.transcricao : []);
      setTransferido(ch.transferido_para ?? null);
      if (ch.status === "finalizada" || ch.status === "erro") { setStatus(ch.status === "erro" ? "erro" : "finalizada"); clearInterval(t); }
    }, 2500);
    return () => { vivo = false; clearInterval(t); };
  }, [cmd, estabelecimentoId]);

  const ligar = async () => {
    if (!estabelecimentoId || !agente || !roteiro) return toast.error("Escolha o agente e o roteiro");
    const num = numero.replace(/\D/g, "");
    if (num.length < 8) return toast.error("Informe um número válido");
    if (campos.includes("produto") && !produto.trim()) return toast.error("Informe o produto do roteiro");
    if (campos.includes("aviso") && !aviso.trim()) return toast.error("Informe o aviso do roteiro");
    const ramal = await meuRamal();
    if (!ramal) return toast.error("Seu usuário não tem ramal configurado; a transferência precisa dele");
    const objetivo = [
      regrasConversa(ramal),
      regrasConduta(lerConduta(agente.config)),
      montarObjetivoRoteiro(roteiro, { produtoNome: produto || undefined, aviso: aviso || undefined, observacoes: obs }),
      "LIGAÇÃO DE TESTE do simulador: siga o roteiro normalmente.",
    ].join("\n");
    const { data: u } = await supabase.auth.getUser();
    const inicio = new Date(Date.now() - 5000).toISOString();
    const r = await db.from("voz_comandos").insert({
      estabelecimento_id: estabelecimentoId, agente_id: agente.id, tipo: "ligar", numero: num, ramal, objetivo, criado_por: u.user?.id ?? null,
    }).select("id").single();
    if (r.error) return toast.error(r.error.message);
    setFalas([]); setTransferido(null); setStatus("pendente");
    setCmd({ id: r.data.id, inicio, numero: num });
    toast.success("Ligação de teste enviada ao aparelho de voz");
  };

  const cancelar = async () => {
    if (!cmd) return;
    await db.from("voz_comandos").update({ status: "cancelado" }).eq("id", cmd.id).eq("status", "pendente");
    setStatus("cancelado");
  };

  const emCurso = !!cmd && ["pendente", "executando", "concluido"].includes(status);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><PhoneCall className="h-4 w-4 text-primary" /> Simulador de ligação</CardTitle>
        <CardDescription>Liga para um número seu com o agente e o roteiro reais, para validar a conversa antes de usar com clientes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!ligadores.length ? (
          <p className="text-sm text-muted-foreground">Cadastre e ative um agente "Fazer ligações" para usar o simulador.</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>Agente</Label>
                <Select value={agenteId} onValueChange={setAgenteId}>
                  <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
                  <SelectContent>{ligadores.map((a) => <SelectItem key={a.id} value={a.id!}>{a.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Roteiro</Label>
                <Select value={roteiro} onValueChange={(v) => setRoteiro(v as RoteiroId)}>
                  <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
                  <SelectContent>{roteiros.map((r) => <SelectItem key={r.id} value={r.id}>{r.rotulo}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Número para ligar</Label>
                <Input inputMode="tel" placeholder="Ex.: 15999998888" value={numero} onChange={(e) => setNumero(e.target.value)} />
              </div>
            </div>
            {(campos.includes("produto") || campos.includes("aviso")) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {campos.includes("produto") && <div className="space-y-1"><Label>Produto</Label><Input value={produto} onChange={(e) => setProduto(e.target.value)} /></div>}
                {campos.includes("aviso") && <div className="space-y-1"><Label>O que avisar</Label><Input value={aviso} onChange={(e) => setAviso(e.target.value)} /></div>}
              </div>
            )}
            <div className="space-y-1">
              <Label>Observações para a IA (opcional)</Label>
              <Textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => void ligar()} disabled={emCurso}>
                {emCurso ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <PhoneCall className="mr-1 h-4 w-4" />} Ligar agora
              </Button>
              {status === "pendente" && <Button variant="outline" onClick={() => void cancelar()}><PhoneOff className="mr-1 h-4 w-4" /> Cancelar</Button>}
              {status && <Badge variant="secondary">{ROTULO[status] ?? "Finalizada"}</Badge>}
              {transferido && <Badge>Transferida para o ramal {transferido}</Badge>}
            </div>
            {cmd && (
              <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
                <p className="text-xs font-medium text-muted-foreground">Conversa ao vivo</p>
                {!falas.length ? <p className="text-sm text-muted-foreground">Aguardando falas…</p> : falas.map((f, i) => (
                  <p key={i} className="text-sm"><span className="font-semibold text-foreground">{f.papel === "agente" ? "IA" : "Cliente"}:</span> <span className="text-foreground">{f.texto}</span></p>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
