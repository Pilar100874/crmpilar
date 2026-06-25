import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Lock, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";

export default function PontoFechamento() {
  const { empresaId } = usePontoEmpresa();
  const now = new Date();
  const [mes, setMes] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [loading, setLoading] = useState(false);
  const [fechamentos, setFechamentos] = useState<any[]>([]);

  const load = async () => {
    if (!empresaId) return;
    const { data } = await (supabase.from as any)("ponto_periodos_fechamento")
      .select("*").eq("empresa_id", empresaId).order("mes_referencia", { ascending: false });
    setFechamentos(data || []);
  };
  useEffect(() => { load(); }, [empresaId]);

  const fechar = async () => {
    if (!empresaId) return toast.error("Selecione empresa");
    if (!confirm(`Fechar folha de ${mes}? O período ficará travado para edições.`)) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ponto-fechar-folha", {
        body: { empresa_id: empresaId, mes_referencia: mes },
      });
      if (error) throw error;
      toast.success(`Fechado: ${data.processados} funcionários, ${(data.total_he_min/60).toFixed(1)}h HE`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><Lock className="h-5 w-5 md:h-6 md:w-6" /> Fechamento de folha</h1>
        <p className="text-muted-foreground text-sm">Calcula tudo do período e trava ajustes do mês.</p>
      </div>

      <Card className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 sm:max-w-xs">
            <Label>Mês de referência</Label>
            <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
          </div>
          <Button onClick={fechar} disabled={loading} className="w-full sm:w-auto">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Fechar folha (1 clique)
          </Button>
        </div>
      </Card>

      <Card className="p-0">
        <div className="px-4 py-3 border-b bg-muted/30 font-semibold">Períodos fechados</div>
        <div className="divide-y">
          {fechamentos.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">Nenhum período fechado ainda.</p>}
          {fechamentos.map((f) => (
            <div key={f.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
              <div>
                <div className="font-medium">{(f.mes_referencia || "").slice(0, 7)}</div>
                <div className="text-xs text-muted-foreground">
                  Fechado em {new Date(f.fechado_em).toLocaleString("pt-BR")}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <Badge variant="secondary">{f.total_funcionarios} func.</Badge>
                <Badge variant="secondary">{((f.total_he_min || 0) / 60).toFixed(1)}h HE</Badge>
                <Badge variant="secondary">{f.total_faltas || 0} faltas</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
