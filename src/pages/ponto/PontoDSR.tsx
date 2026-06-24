import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePontoEmpresa } from "./usePontoEmpresa";

const fmtH = (min: number) => `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}`;

export default function PontoDSR() {
  const { empresaId } = usePontoEmpresa();
  const [mes, setMes] = useState(new Date().toISOString().substring(0, 7));
  const [dados, setDados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!empresaId) return;
      setLoading(true);
      const inicio = `${mes}-01`;
      const { data } = await supabase
        .from("ponto_dsr_detalhado" as any)
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("mes", inicio)
        .order("nome");
      setDados((data as any) || []);
      setLoading(false);
    })();
  }, [empresaId, mes]);

  const exportCSV = () => {
    const head = "Funcionário;Dias úteis;Domingos;HE total;Noturno real;Noturno reduzido;DSR (min);DSR (h)";
    const rows = dados.map(d =>
      `${d.nome};${d.dias_uteis};${d.domingos};${fmtH(d.he_total_min)};${fmtH(d.noturno_total_min)};${fmtH(d.noturno_reduzido_min)};${d.dsr_calculado_min};${fmtH(d.dsr_calculado_min)}`
    );
    const blob = new Blob([head + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `DSR_${mes}.csv`; a.click();
  };

  const totalDSR = dados.reduce((s, d) => s + (d.dsr_calculado_min || 0), 0);
  const totalNoturno = dados.reduce((s, d) => s + (d.noturno_reduzido_min || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">DSR e Adicional Noturno — Relatório Detalhado</h1>
            <p className="text-muted-foreground">Descanso semanal remunerado calculado por funcionário/mês (Lei 605/49)</p>
          </div>
        </div>
        <div className="flex gap-2 items-end">
          <div><Label>Mês</Label><Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} /></div>
          <Button onClick={exportCSV} variant="outline"><Download className="h-4 w-4 mr-2" />CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Funcionários</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{dados.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">DSR total</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-primary">{fmtH(totalDSR)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Noturno reduzido total</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{fmtH(totalNoturno)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Detalhamento por funcionário</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p>Carregando...</p> : dados.length === 0 ? <p className="text-muted-foreground">Sem dados no mês</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="p-2">Funcionário</th><th className="p-2">Dias úteis</th><th className="p-2">Domingos</th>
                    <th className="p-2">HE</th><th className="p-2">Noturno real</th><th className="p-2">Noturno reduzido (52'30")</th>
                    <th className="p-2">DSR (HE/dias úteis × dom)</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.map((d, i) => (
                    <tr key={i} className="border-b hover:bg-muted/30">
                      <td className="p-2 font-medium">{d.nome}</td>
                      <td className="p-2">{d.dias_uteis}</td>
                      <td className="p-2">{d.domingos}</td>
                      <td className="p-2">{fmtH(d.he_total_min)}</td>
                      <td className="p-2">{fmtH(d.noturno_total_min)}</td>
                      <td className="p-2"><Badge variant="secondary">{fmtH(d.noturno_reduzido_min)}</Badge></td>
                      <td className="p-2"><Badge variant="default">{fmtH(d.dsr_calculado_min)}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="pt-6 text-sm space-y-1">
          <p><strong>Fórmula DSR:</strong> (HE total / dias úteis trabalhados) × (domingos + feriados)</p>
          <p><strong>Hora ficta noturna:</strong> 52'30" = 1h normal (Súmula 60 TST)</p>
          <p><strong>Adicional noturno:</strong> mínimo 20% (art. 73 CLT) — configurável em <em>/ponto/clt-config</em></p>
        </CardContent>
      </Card>
    </div>
  );
}
