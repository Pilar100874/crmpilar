import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Calculator, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";

export default function PontoTratamento() {
  const { empresaId } = usePontoEmpresa();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);



  useEffect(() => {
    if (!empresaId) return;
    (async () => {
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
    })();
  }, [empresaId]);

  const fmt = (m: number | null) => {
    if (!m) return "—";
    const h = Math.floor(Math.abs(m) / 60);
    const mm = Math.abs(m) % 60;
    return `${m < 0 ? "-" : ""}${h}h${String(mm).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold sm:text-2xl">Tratamento Diário</h2>
        <p className="text-sm text-muted-foreground">Cálculo de atraso, falta, hora extra, noturno e banco de horas</p>
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
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
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
          </table>
        </div>
      )}
    </div>
  );
}
