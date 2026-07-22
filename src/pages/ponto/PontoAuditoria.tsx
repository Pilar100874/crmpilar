import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";

export default function PontoAuditoria() {
  const { empresaId } = usePontoEmpresa();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!empresaId) return;
    (async () => {
      const { data } = await supabase
        .from("ponto_auditoria")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("created_at", { ascending: false })
        .limit(200);
      setItems(data || []);
    })();
  }, [empresaId]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold sm:text-2xl">Auditoria</h2>
        <p className="text-sm text-muted-foreground">Histórico completo de alterações</p>
      </div>
      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <History className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Sem eventos auditados.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border resp-table-wrap">
          <div className="overflow-x-auto -mx-1 sm:mx-0"><table className="w-full table-fixed text-sm resp-table">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">Quando</th>
                <th className="p-3 hidden sm:table-cell">Usuário</th>
                <th className="p-3">Ação</th>
                <th className="p-3 hidden md:table-cell">Entidade</th>
                <th className="p-3 hidden lg:table-cell">IP</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="p-3">{new Date(a.created_at).toLocaleString("pt-BR")}</td>
                  <td className="p-3 hidden sm:table-cell">{a.usuario_nome || "—"}</td>
                  <td className="p-3 font-medium">{a.acao}</td>
                  <td className="p-3 hidden md:table-cell">{a.entidade}</td>
                  <td className="p-3 hidden lg:table-cell">{a.ip || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}
