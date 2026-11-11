import { useEffect, useState } from "react";
import { Ear, Headset, Radio } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { abrirPilarSip } from "@/components/portaria/PilarFoneWeb";
import { chamadaAoVivo, numeroEscuta } from "@/lib/voz/monitorAoVivo";

const db = supabase as any;

type Fala = { papel: string; texto: string };
type ChamadaViva = { id: string; agente_id: string | null; numero: string | null; modo: string; status: string; iniciada_em: string; finalizada_em?: string | null; transcricao: Fala[] | null; assumir_pedido_em?: string | null };
type AgenteBasico = { id?: string; nome: string; ramal_ia: string; codigo_escuta?: string };

export function MonitorChamadasIa({ chamadas, agentes }: { chamadas: ChamadaViva[]; agentes: AgenteBasico[] }) {
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setAgora(Date.now()), 1000); return () => clearInterval(t); }, []);
  const vivas = chamadas.filter(chamadaAoVivo);

  const ouvir = (a?: AgenteBasico) => {
    const n = numeroEscuta(a?.codigo_escuta, a?.ramal_ia);
    if (!n) return toast.error("Informe o \"Código de escuta\" do PABX na aba Agente (ex.: *54)");
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
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => ouvir(a)}><Ear className="h-4 w-4" /> Ouvir em silêncio</Button>
                <Button size="sm" className="gap-1.5" disabled={!!c.assumir_pedido_em} onClick={() => void assumir(c)}><Headset className="h-4 w-4" /> Assumir ligação</Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
