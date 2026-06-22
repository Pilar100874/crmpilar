import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileSignature } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";

export default function PontoEspelho() {
  const { empresaId } = usePontoEmpresa();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!empresaId) return;
    (async () => {
      const { data: funcs } = await supabase
        .from("ponto_funcionarios")
        .select("id, nome, cpf")
        .eq("empresa_id", empresaId);
      const ids = (funcs || []).map((f) => f.id);
      if (!ids.length) return setItems([]);
      const { data } = await supabase
        .from("ponto_assinaturas_espelho")
        .select("*")
        .in("funcionario_id", ids)
        .order("mes_referencia", { ascending: false });
      const map = Object.fromEntries((funcs || []).map((f) => [f.id, f]));
      setItems((data || []).map((r: any) => ({ ...r, func: map[r.funcionario_id] })));
    })();
  }, [empresaId]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold sm:text-2xl">Espelho de Ponto</h2>
        <p className="text-sm text-muted-foreground">Assinaturas digitais mensais</p>
      </div>
      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <FileSignature className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhum espelho assinado. Funcionários assinam pelo app.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <Card key={a.id}>
              <CardContent className="space-y-2 p-4">
                <h3 className="font-semibold">{a.func?.nome}</h3>
                <p className="text-xs text-muted-foreground">
                  Mês: {new Date(a.mes_referencia).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                </p>
                <p className="text-xs">Assinado em: {new Date(a.assinado_em).toLocaleString("pt-BR")}</p>
                <p className="break-all text-[10px] text-muted-foreground">Hash: {a.hash}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
