// Sugestão de escala via IA
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";

export default function PontoSugerirEscala() {
  const { empresaId } = usePontoEmpresa();
  const [mes, setMes] = useState<string>(new Date().toISOString().slice(0, 7) + "-01");
  const [cobertura, setCobertura] = useState<number>(1);
  const [abertura, setAbertura] = useState<string>("08:00");
  const [fechamento, setFechamento] = useState<string>("18:00");
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const gerar = async () => {
    if (!empresaId) return;
    setCarregando(true); setResultado(null);
    try {
      const { data, error } = await supabase.functions.invoke("ponto-sugerir-escala", {
        body: {
          empresa_id: empresaId,
          mes,
          cobertura_minima: cobertura,
          hora_abertura: abertura,
          hora_fechamento: fechamento,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResultado(data);
      toast.success("Escala sugerida gerada");
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar");
    } finally { setCarregando(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6" /> Sugestão Automática de Escala
        </h1>
        <p className="text-sm text-muted-foreground">
          A IA gera uma proposta de escala mensal respeitando jornada CLT, férias, feriados e cobertura mínima.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Parâmetros</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Mês de referência</Label>
            <Input type="month" value={mes.slice(0,7)} onChange={(e) => setMes(e.target.value + "-01")} />
          </div>
          <div className="space-y-2">
            <Label>Cobertura mínima (funcionários/dia)</Label>
            <Input type="number" min={1} value={cobertura} onChange={(e) => setCobertura(parseInt(e.target.value) || 1)} />
          </div>
          <div className="space-y-2">
            <Label>Abertura</Label>
            <Input type="time" value={abertura} onChange={(e) => setAbertura(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Fechamento</Label>
            <Input type="time" value={fechamento} onChange={(e) => setFechamento(e.target.value)} />
          </div>
          <div className="md:col-span-4">
            <Button onClick={gerar} disabled={carregando}>
              {carregando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Gerar sugestão com IA
            </Button>
          </div>
        </CardContent>
      </Card>

      {resultado && (
        <>
          {resultado.resumo && (
            <Card>
              <CardHeader><CardTitle className="text-base">Resumo</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Total horas</div>
                  <div className="text-2xl font-bold tabular-nums">{resultado.resumo.total_horas_planejadas ?? "—"}h</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Média por funcionário</div>
                  <div className="text-2xl font-bold tabular-nums">{resultado.resumo.media_horas_por_funcionario ?? "—"}h</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Dias sem cobertura</div>
                  <div className="text-2xl font-bold tabular-nums text-orange-600">
                    {(resultado.resumo.dias_sem_cobertura || []).length}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Alertas</div>
                  <div className="text-2xl font-bold tabular-nums text-red-600">
                    {(resultado.resumo.alertas || []).length}
                  </div>
                </div>
                {(resultado.resumo.alertas || []).length > 0 && (
                  <div className="col-span-2 md:col-span-4 space-y-1">
                    {(resultado.resumo.alertas || []).map((a: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-orange-700 dark:text-orange-400">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{a}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Escala proposta ({(resultado.escala || []).length} entradas)</CardTitle></CardHeader>
            <CardContent>
              <div className="max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Entrada</TableHead>
                      <TableHead>Saída</TableHead>
                      <TableHead>Intervalo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(resultado.escala || []).map((e: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-mono">{e.data}</TableCell>
                        <TableCell className="text-xs font-mono">{(e.funcionario_id || "").slice(0, 8)}…</TableCell>
                        <TableCell><Badge variant="outline">{e.tipo}</Badge></TableCell>
                        <TableCell>{e.entrada || "—"}</TableCell>
                        <TableCell>{e.saida || "—"}</TableCell>
                        <TableCell>{e.intervalo_min ? `${e.intervalo_min}min` : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Esta é apenas uma sugestão. Revise e aplique manualmente nas escalas oficiais.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
