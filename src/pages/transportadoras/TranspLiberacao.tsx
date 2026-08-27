import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ClipboardCheck, Truck, User, Clock, Search, PackageCheck, PackageOpen,
  CheckCircle, MessageCircle, Building2,
} from "lucide-react";
import { toast } from "sonner";
import { CVPageHeader } from "@/pages/controle-veiculos/CVPageHeader";
import {
  listarSetores, listarTransportadoras, maskWhatsapp, nomeTransportadora, linkAvisoSetor,
  type TranspEmpresa, type TranspSetor,
} from "@/lib/transportadoras/dados";

export default function TranspLiberacao() {
  const [movs, setMovs] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<TranspEmpresa[]>([]);
  const [setores, setSetores] = useState<TranspSetor[]>([]);
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [alvo, setAlvo] = useState<any | null>(null);
  const [obs, setObs] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const [emp, st, mo, m] = await Promise.all([
      listarTransportadoras(),
      listarSetores(),
      supabase.from("transp_motoristas").select("id, nome, whatsapp"),
      supabase.from("transp_movimentos").select("*").neq("status", "saiu").order("entrada_time", { ascending: false }),
    ]);
    setEmpresas(emp);
    setSetores(st);
    setMotoristas((mo.data ?? []) as any[]);
    setMovs((m.data ?? []) as any[]);
    setLoading(false);
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const lista = useMemo(() => movs.filter((m) =>
    !busca || `${m.placa ?? ""} ${m.motorista_nome ?? ""} ${m.documento ?? ""}`.toLowerCase().includes(busca.toLowerCase())
  ), [movs, busca]);

  const aguardando = lista.filter((m) => m.status === "dentro");
  const liberados = lista.filter((m) => m.status === "liberado");

  const empNome = (id: string | null) => nomeTransportadora(empresas.find((e) => e.id === id));
  const setorDe = (id: string | null) => setores.find((s) => s.id === id) ?? null;
  const whatsMotorista = (m: any) => motoristas.find((x) => x.id === m.motorista_id)?.whatsapp ?? null;

  const liberar = async () => {
    if (!alvo) return;
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("transp_movimentos").update({
      status: "liberado",
      liberado_time: new Date().toISOString(),
      liberado_por: user?.id ?? null,
      liberado_obs: obs || null,
    } as any).eq("id", alvo.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Veículo liberado");
    setAlvo(null); setObs("");
    load();
  };

  const Cartao = ({ m }: { m: any }) => {
    const entrega = (m.tipo_operacao ?? "entrega") === "entrega";
    const setor = setorDe(m.setor_id);
    const fone = whatsMotorista(m);
    const espera = Math.round((Date.now() - new Date(m.entrada_time).getTime()) / 60000);
    return (
      <Card className={m.status === "liberado" ? "border-emerald-500/40" : ""}>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="font-mono">{m.placa || "—"}</Badge>
            <Badge variant={m.status === "liberado" ? "default" : "secondary"} className="gap-1">
              {entrega ? <PackageCheck className="h-3 w-3" /> : <PackageOpen className="h-3 w-3" />}
              {entrega ? "Descarregamento" : "Carregamento"}
            </Badge>
          </div>
          <p className="font-semibold truncate">{empNome(m.transportadora_id)}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" />{m.motorista_nome || "—"}{fone ? ` · ${maskWhatsapp(fone)}` : ""}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />{new Date(m.entrada_time).toLocaleString("pt-BR")} · {espera} min no pátio
          </p>
          {setor && (
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="h-3 w-3" />Setor: {setor.nome}</p>
          )}
          {m.nfe_chave && (
            <p className="text-[10px] font-mono text-muted-foreground break-all">NF-e {String(m.nfe_chave).slice(25, 34).replace(/^0+/, "")}</p>
          )}
          {m.status === "liberado" && m.liberado_time && (
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />Liberado às {new Date(m.liberado_time).toLocaleTimeString("pt-BR")}
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {m.status === "dentro" && (
              <Button size="sm" onClick={() => { setAlvo(m); setObs(""); }}>
                <CheckCircle className="h-4 w-4 mr-1" />Liberar {entrega ? "descarregamento" : "carregamento"}
              </Button>
            )}
            {setor?.whatsapp && (
              <Button size="sm" variant="outline" asChild>
                <a target="_blank" rel="noreferrer"
                  href={linkAvisoSetor(setor, `Veículo ${m.placa ?? ""} (${m.motorista_nome ?? ""}) aguardando ${entrega ? "descarregamento" : "carregamento"}.`)}>
                  <MessageCircle className="h-4 w-4 mr-1" />Avisar setor
                </a>
              </Button>
            )}
            {fone && (
              <Button size="sm" variant="outline" asChild>
                <a target="_blank" rel="noreferrer" href={`https://wa.me/${fone.length <= 11 ? "55" + fone : fone}`}>
                  <MessageCircle className="h-4 w-4 mr-1" />Motorista
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <CVPageHeader icon={ClipboardCheck} title="Liberação" subtitle="Acompanhe a liberação para carregamento / descarregamento" />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar placa, motorista ou documento..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      {loading ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Carregando...</CardContent></Card>
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />Aguardando liberação ({aguardando.length})
            </h3>
            {aguardando.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">
                <Truck className="h-10 w-10 mx-auto mb-2 opacity-40" />Nenhum veículo aguardando.
              </CardContent></Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{aguardando.map((m) => <Cartao key={m.id} m={m} />)}</div>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />Liberados — aguardando saída ({liberados.length})
            </h3>
            {liberados.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">Nenhum veículo liberado no momento.</CardContent></Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{liberados.map((m) => <Cartao key={m.id} m={m} />)}</div>
            )}
          </section>
        </div>
      )}

      <Dialog open={!!alvo} onOpenChange={(o) => !o && setAlvo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Liberar veículo {alvo?.placa}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Confirme a liberação para {(alvo?.tipo_operacao ?? "entrega") === "entrega" ? "descarregamento" : "carregamento"}.
            </p>
            <div><Label>Observações</Label><Textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlvo(null)}>Cancelar</Button>
            <Button onClick={liberar} disabled={busy}>{busy ? "Salvando..." : "Confirmar liberação"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
