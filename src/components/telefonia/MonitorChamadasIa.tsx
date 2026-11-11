import { useEffect, useState } from "react";
import { Ear, Headset, Radio } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { abrirPilarSip } from "@/components/portaria/PilarFoneWeb";
import { chamadaAoVivo, numeroEscuta } from "@/lib/voz/monitorAoVivo";
import { meusRamaisIa, podeLigarComIa, podeEscutarRamais, type RamaisUsuario } from "@/lib/voz/ramaisUsuario";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const db = supabase as any;

type Fala = { papel: string; texto: string };
type ChamadaViva = { id: string; ramal_monitorado?: string | null; agente_id: string | null; numero: string | null; modo: string; status: string; iniciada_em: string; finalizada_em?: string | null; transcricao: Fala[] | null; assumir_pedido_em?: string | null };
type AgenteBasico = { id?: string; nome: string; ramal_ia: string; codigo_escuta?: string };

export function MonitorChamadasIa({ chamadas, agentes }: { chamadas: ChamadaViva[]; agentes: AgenteBasico[] }) {
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setAgora(Date.now()), 1000); return () => clearInterval(t); }, []);
  const vivas = chamadas.filter(chamadaAoVivo);
  const [codigoPabx, setCodigoPabx] = useState<string | null>(null);
  useEffect(() => { db.from("ucm_config").select("codigo_escuta").limit(1).maybeSingle().then((r: any) => setCodigoPabx(r.data?.codigo_escuta ?? null)); }, []);

  const [meus, setMeus] = useState<RamaisUsuario | null>(null);
  const [usuarios, setUsuarios] = useState<{ id: string; nome: string; ramal: string }[]>([]);
  const [alvo, setAlvo] = useState("");
  useEffect(() => { void meusRamaisIa().then(setMeus); }, []);
  const temRamal = podeLigarComIa(meus);
  const escutaGeral = podeEscutarRamais(meus);
  useEffect(() => {
    if (!escutaGeral) return;
    // Somente o ramal pessoal do cadastro do usuário (não os ramais usados pelos agentes de voz).
    db.from("usuarios").select("id, nome, ramal").eq("ativo", true).not("ramal", "is", null).order("nome")
      .then((r: any) => setUsuarios((r.data ?? []).filter((u: any) => String(u.ramal ?? "").trim())));
  }, [escutaGeral]);

  const discarEscuta = (ramal?: string | null) => {
    if (!temRamal) return toast.error("Cadastre e ative o \"Ramal para fazer ligações\" no seu usuário para escutar.");
    const n = numeroEscuta(codigoPabx, ramal);
    if (!n) return toast.error("Informe o \"Código de escuta silenciosa\" na Configuração do PABX (ex.: *54)");
    abrirPilarSip(n, { aba: "ramais" });
    toast.success("Ligando para a escuta. Você ouve a conversa sem ninguém perceber.");
  };

  const ouvir = (a?: AgenteBasico, c?: ChamadaViva) => {
    if (!temRamal) return toast.error("Cadastre e ative o \"Ramal para fazer ligações\" no seu usuário para escutar.");
    const n = numeroEscuta(a?.codigo_escuta?.trim() || codigoPabx, c?.ramal_monitorado || a?.ramal_ia);
    if (!n) return toast.error("Informe o \"Código de escuta silenciosa\" na Configuração do PABX (ex.: *54)");
    abrirPilarSip(n, { aba: "ramais" });
    toast.success("Ligando para a escuta. Você ouve a conversa sem o cliente perceber.");
  };

  const assumir = async (c: ChamadaViva) => {
    const { data: u } = await supabase.auth.getUser();
    const r = await db.from("voz_chamadas").update({ assumir_pedido_em: new Date().toISOString(), assumir_por: u.user?.id ?? null }).eq("id", c.id);
    if (r.error) return toast.error(r.error.message);
    toast.success("Pedido enviado: na próxima fala a IA se despede e passa a ligação para o atendente.");
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><Radio className="h-4 w-4 text-primary" /> Ao vivo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {escutaGeral && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border p-3">
            <span className="text-sm font-medium">Escutar ramal de usuário</span>
            <Select value={alvo} onValueChange={setAlvo}>
              <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Escolha o usuário" /></SelectTrigger>
              <SelectContent>{usuarios.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome} — ramal {u.ramal}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="gap-1.5" disabled={!alvo}
              onClick={() => discarEscuta(usuarios.find((u) => u.id === alvo)?.ramal)}><Ear className="h-4 w-4" /> Escutar</Button>
          </div>
        )}
        {vivas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma ligação da IA acontecendo agora.</p>}
        {vivas.map((c) => {
          const a = agentes.find((x) => x.id === c.agente_id);
          const seg = Math.max(0, Math.round((agora - new Date(c.iniciada_em).getTime()) / 1000));
          const falas = (c.transcricao ?? []).slice(-4);
          return (
            <div key={c.id} className="space-y-2 rounded-md border p-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold">{a?.nome ?? "Agente"}</span>
                <span className="text-muted-foreground">{c.numero}</span>
                <Badge>{Math.floor(seg / 60)}:{String(seg % 60).padStart(2, "0")}</Badge>
                {c.assumir_pedido_em && <Badge variant="secondary">Passando para o atendente…</Badge>}
              </div>
              <div className="space-y-1 text-sm">
                {falas.length === 0 && <p className="text-muted-foreground">Aguardando as primeiras falas…</p>}
                {falas.map((f, i) => <p key={i}><span className="font-semibold">{f.papel === "agente" ? "IA" : "Cliente"}:</span> {f.texto}</p>)}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="gap-1.5" disabled={!temRamal} title={temRamal ? undefined : "Cadastre o ramal no seu usuário"} onClick={() => ouvir(a, c)}><Ear className="h-4 w-4" /> Ouvir em silêncio</Button>
                <Button size="sm" className="gap-1.5" disabled={!!c.assumir_pedido_em} onClick={() => void assumir(c)}><Headset className="h-4 w-4" /> Assumir ligação</Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
