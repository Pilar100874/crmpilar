import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Inbox, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function PontoAjustes() {
  const { empresaId } = usePontoEmpresa();
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    if (!empresaId) return;
    const { data: funcs } = await supabase
      .from("ponto_funcionarios")
      .select("id, nome")
      .eq("empresa_id", empresaId);
    const ids = (funcs || []).map((f) => f.id);
    if (!ids.length) return setItems([]);
    const { data } = await supabase
      .from("ponto_ajustes")
      .select("*")
      .in("funcionario_id", ids)
      .order("created_at", { ascending: false });
    const map = Object.fromEntries((funcs || []).map((f) => [f.id, f.nome]));
    setItems((data || []).map((r: any) => ({ ...r, nome: map[r.funcionario_id] })));
  };
  useEffect(() => { load(); }, [empresaId]);

  const decide = async (id: string, status: "aprovado" | "reprovado") => {
    const { error } = await supabase
      .from("ponto_ajustes")
      .update({ status, aprovado_em: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Ajuste ${status}`);
    load();
  };

  const tone = (s: string) =>
    s === "aprovado" ? "bg-success/20 text-success" :
    s === "reprovado" ? "bg-destructive/20 text-destructive" :
    "bg-warning/20 text-warning-foreground";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold sm:text-2xl">Ajustes de Ponto</h2>
        <p className="text-sm text-muted-foreground">Solicitações enviadas pelos funcionários</p>
      </div>
      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhuma solicitação de ajuste.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <Card key={a.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{a.nome}</h3>
                    <p className="text-xs text-muted-foreground">{a.data}</p>
                  </div>
                  <Badge className={tone(a.status)}>{a.status}</Badge>
                </div>
                <p className="text-sm">{a.motivo}</p>
                {a.anexo_url && (
                  <a href={a.anexo_url} target="_blank" className="text-xs text-primary underline">
                    Ver anexo
                  </a>
                )}
                {a.status === "pendente" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => decide(a.id, "aprovado")}>
                      <Check className="mr-1 h-4 w-4" /> Aprovar
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => decide(a.id, "reprovado")}>
                      <X className="mr-1 h-4 w-4" /> Reprovar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
