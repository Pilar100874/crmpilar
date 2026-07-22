import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calculator, RefreshCw, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";

export default function PontoTratamento() {
  const { empresaId } = usePontoEmpresa();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);



  const load = useCallback(async () => {
    if (!empresaId) return;
    const { data: funcs } = await supabase
      .from("ponto_funcionarios")
      .select("id, nome")
      .eq("empresa_id", empresaId);
    const ids = (funcs || []).map((f) => f.id);
    if (!ids.length) return setItems([]);
    const { data } = await supabase
      .from("ponto_espelho_diario")
      .select("*")
      .in("funcionario_id", ids)
      .order("data", { ascending: false })
      .limit(100);
    const map = Object.fromEntries((funcs || []).map((f) => [f.id, f.nome]));
    setItems((data || []).map((r: any) => ({ ...r, nome: map[r.funcionario_id] })));
  }, [empresaId]);

  useEffect(() => { load(); }, [load]);

  const recalcularHoje = async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const { data: funcs } = await supabase
        .from("ponto_funcionarios").select("id").eq("empresa_id", empresaId).eq("status", "ativo");
      const hoje = new Date().toISOString().slice(0, 10);
      let ok = 0;
      for (const f of funcs || []) {
        const { error } = await supabase.functions.invoke("ponto-calcular-jornada", {
          body: { funcionario_id: f.id, data: hoje, empresa_id: empresaId },
        });
        if (!error) ok++;
      }
      toast.success(`${ok} funcionário(s) recalculado(s)`);
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const aprovarHELote = async () => {
    if (!empresaId) return;
    const inicio = new Date(); inicio.setDate(inicio.getDate() - 7);
    if (!confirm("Aprovar TODOS os ajustes de hora extra pendentes dos últimos 7 dias?")) return;
    try {
      const { data, error } = await supabase.functions.invoke("ponto-aprovar-he-lote", {
        body: {
          empresa_id: empresaId,
          inicio: inicio.toISOString().slice(0, 10),
          fim: new Date().toISOString().slice(0, 10),
          decisao: "aprovar",
        },
      });
      if (error) throw error;
      toast.success(`${data.total} ajuste(s) de HE aprovado(s)`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };



  const fmt = (m: number | null) => {
    if (!m) return "—";
    const h = Math.floor(Math.abs(m) / 60);
    const mm = Math.abs(m) % 60;
    return `${m < 0 ? "-" : ""}${h}h${String(mm).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Tratamento Diário</h2>
          <p className="text-sm text-muted-foreground">Cálculo de atraso, falta, hora extra, noturno e banco de horas</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={aprovarHELote} disabled={loading} size="sm" variant="outline">
            <CheckSquare className="mr-2 h-4 w-4" /> Aprovar HE em lote (7d)
          </Button>
          <Button onClick={recalcularHoje} disabled={loading} size="sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Recalcular hoje
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Calculator className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhum espelho calculado. Os cálculos são gerados após registros.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border resp-table-wrap">
          <div className="overflow-x-auto -mx-1 sm:mx-0"><table className="w-full table-fixed text-sm resp-table">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">Funcionário</th>
                <th className="p-3">Data</th>
                <th className="p-3">Atraso</th>
                <th className="p-3 hidden sm:table-cell">Falta</th>
                <th className="p-3 hidden md:table-cell">Saída antec.</th>
                <th className="p-3">Extra</th>
                <th className="p-3 hidden lg:table-cell">Noturno</th>
                <th className="p-3">Banco</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-medium">{r.nome}</td>
                  <td className="p-3">{r.data}</td>
                  <td className="p-3">{fmt(r.atraso_min)}</td>
                  <td className="p-3 hidden sm:table-cell">{r.falta ? "Sim" : "—"}</td>
                  <td className="p-3 hidden md:table-cell">{fmt(r.saida_antec_min)}</td>
                  <td className="p-3">{fmt(r.extra_min)}</td>
                  <td className="p-3 hidden lg:table-cell">{fmt(r.noturno_min)}</td>
                  <td className={`p-3 ${r.saldo_banco_min < 0 ? "text-destructive" : ""}`}>
                    {fmt(r.saldo_banco_min)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}
