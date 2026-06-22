import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function PontoAlertas() {
  const { empresaId } = usePontoEmpresa();
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    if (!empresaId) return;
    const { data } = await supabase
      .from("ponto_alertas")
      .select("*, ponto_funcionarios(nome)")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false });
    setItems(data || []);
  };
  useEffect(() => { load(); }, [empresaId]);

  const resolver = async (id: string) => {
    const { error } = await supabase
      .from("ponto_alertas")
      .update({ resolvido: true, resolvido_em: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Alerta resolvido"); load();
  };

  const tone = (n: string) => n === "alto" ? "destructive" : n === "medio" ? "default" : "secondary";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold sm:text-2xl">Alertas Antifraude</h2>
        <p className="text-sm text-muted-foreground">Detecções automáticas de padrões suspeitos</p>
      </div>
      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Shield className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Sem alertas no momento.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <Card key={a.id} className={a.resolvido ? "opacity-60" : ""}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <Badge variant={tone(a.nivel) as any}>{a.nivel}</Badge>
                  <div>
                    <p className="font-medium">{a.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.ponto_funcionarios?.nome} · {a.categoria} · {new Date(a.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
                {!a.resolvido && (
                  <Button size="sm" variant="outline" onClick={() => resolver(a.id)}>
                    <CheckCircle2 className="mr-1 h-4 w-4" /> Resolver
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
