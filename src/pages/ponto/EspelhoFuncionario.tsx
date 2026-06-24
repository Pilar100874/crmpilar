// Página pública (token) — funcionário visualiza e assina seu espelho de ponto
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Loader2, FileSignature } from "lucide-react";
import { toast } from "sonner";

export default function EspelhoFuncionario() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [motivo, setMotivo] = useState("");
  const [done, setDone] = useState<"assinado" | "rejeitado" | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: r, error } = await supabase.functions.invoke("ponto-assinar-espelho", {
          body: { action: "visualizar", token },
        });
        if (error) throw error;
        if (r?.error) throw new Error(r.error);
        setData(r);
        if (r.envio?.status === "assinado") setDone("assinado");
        if (r.envio?.status === "rejeitado") setDone("rejeitado");
      } catch (e: any) {
        toast.error(e.message || "Token inválido");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const responder = async (aceite: boolean) => {
    if (!aceite && !motivo.trim()) return toast.error("Informe o motivo da rejeição");
    setActing(true);
    try {
      let geo: { lat?: number; lon?: number } = {};
      try {
        const p = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 }));
        geo = { lat: p.coords.latitude, lon: p.coords.longitude };
      } catch {}
      const { error } = await supabase.functions.invoke("ponto-assinar-espelho", {
        body: { action: "responder", token, aceite, motivo_rejeicao: motivo, geo_lat: geo.lat, geo_lon: geo.lon },
      });
      if (error) throw error;
      setDone(aceite ? "assinado" : "rejeitado");
      toast.success(aceite ? "Espelho assinado com sucesso!" : "Rejeição registrada");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setActing(false);
    }
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!data) return <div className="p-10 text-center text-muted-foreground">Espelho não encontrado.</div>;

  const mes = new Date(data.envio.mes_referencia).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-8 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileSignature className="w-6 h-6" /> Espelho de Ponto</h1>
          <p className="text-sm text-muted-foreground">{data.funcionario?.nome} · CPF {data.funcionario?.cpf}</p>
        </div>
        <Badge variant="outline" className="text-sm capitalize">{mes}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Resumo do mês</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="w-full text-xs resp-table">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-left">Data</th>
                  <th className="p-2">Entrada</th>
                  <th className="p-2">Saída Int.</th>
                  <th className="p-2">Retorno</th>
                  <th className="p-2">Saída</th>
                  <th className="p-2">Trab.</th>
                  <th className="p-2">HE</th>
                  <th className="p-2">Falta</th>
                </tr>
              </thead>
              <tbody>
                {(data.dias || []).map((d: any) => (
                  <tr key={d.data} className="border-t">
                    <td className="p-2">{new Date(d.data).toLocaleDateString("pt-BR")}</td>
                    <td className="p-2 text-center">{d.entrada || "—"}</td>
                    <td className="p-2 text-center">{d.saida_intervalo || "—"}</td>
                    <td className="p-2 text-center">{d.retorno_intervalo || "—"}</td>
                    <td className="p-2 text-center">{d.saida || "—"}</td>
                    <td className="p-2 text-center">{Math.floor((d.minutos_trabalhados||0)/60)}h{(d.minutos_trabalhados||0)%60}m</td>
                    <td className="p-2 text-center">{d.extra_min || 0}m</td>
                    <td className="p-2 text-center">{d.falta ? "✓" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] font-mono break-all text-muted-foreground mt-3">
            Hash SHA-256: {data.envio.hash_espelho}
          </p>
        </CardContent>
      </Card>

      {done ? (
        <Card>
          <CardContent className="py-8 text-center space-y-2">
            {done === "assinado" ? (
              <><CheckCircle2 className="w-12 h-12 mx-auto text-green-600" />
              <p className="font-medium">Espelho assinado eletronicamente.</p></>
            ) : (
              <><XCircle className="w-12 h-12 mx-auto text-amber-600" />
              <p className="font-medium">Rejeição registrada. O RH foi notificado.</p></>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-base">Confirme o espelho</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea placeholder="Motivo (apenas se rejeitar)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={() => responder(true)} disabled={acting} className="flex-1">
                {acting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Aceitar e assinar
              </Button>
              <Button onClick={() => responder(false)} disabled={acting} variant="destructive" className="flex-1">
                <XCircle className="w-4 h-4 mr-2" /> Rejeitar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
