import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";
import { Badge } from "@/components/ui/badge";

export default function PontoRegistro() {
  const { empresaId } = usePontoEmpresa();
  const [items, setItems] = useState<any[]>([]);

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
        .from("ponto_registros")
        .select("*")
        .in("funcionario_id", ids)
        .order("data_hora", { ascending: false })
        .limit(100);
      const map = Object.fromEntries((funcs || []).map((f) => [f.id, f.nome]));
      setItems((data || []).map((r: any) => ({ ...r, nome: map[r.funcionario_id] })));
    })();
  }, [empresaId]);

  const scoreBadge = (s: number) => {
    if (s >= 70) return <Badge variant="destructive">Alto {s}</Badge>;
    if (s >= 30) return <Badge className="bg-warning text-warning-foreground">Médio {s}</Badge>;
    return <Badge variant="secondary">Baixo {s}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold sm:text-2xl">Registros de Ponto</h2>
        <p className="text-sm text-muted-foreground">Batidas via app/relógio com GPS, foto e score antifraude</p>
      </div>
      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Clock className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum registro recebido ainda.</p>
            <p className="text-xs text-muted-foreground">
              Configure o app dos funcionários ou instale o Coletor Desktop para sincronizar relógios.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">Funcionário</th>
                <th className="p-3">Data/Hora</th>
                <th className="p-3 hidden sm:table-cell">Tipo</th>
                <th className="p-3 hidden md:table-cell">Origem</th>
                <th className="p-3 hidden lg:table-cell">GPS</th>
                <th className="p-3">Score</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-medium">{r.nome}</td>
                  <td className="p-3">{new Date(r.data_hora).toLocaleString("pt-BR")}</td>
                  <td className="p-3 hidden sm:table-cell">{r.tipo}</td>
                  <td className="p-3 hidden md:table-cell">{r.origem}</td>
                  <td className="p-3 hidden lg:table-cell text-xs">
                    {r.gps_lat ? `${r.gps_lat}, ${r.gps_lon}` : "—"}
                  </td>
                  <td className="p-3">{scoreBadge(r.score_fraude || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
