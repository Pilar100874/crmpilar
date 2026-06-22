import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";
import { toast } from "sonner";
import { Calculator, Loader2, TrendingDown, TrendingUp } from "lucide-react";

export default function PontoSimulador() {
  const { empresaId } = usePontoEmpresa();
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [cenario, setCenario] = useState({
    nova_carga_diaria_min: 480,
    novo_intervalo_min: 60,
    adicional_noturno_pct: 20,
    he_pct: 50,
    dias_uteis_mes: 22,
    aumento_quadro: 0,
  });

  const simular = async () => {
    if (!empresaId) return toast.error("Selecione uma empresa");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ponto-simulador", {
        body: { empresa_id: empresaId, cenario },
      });
      if (error) throw error;
      setResultado(data);
      toast.success("Simulação concluída");
    } catch (e: any) {
      toast.error(e.message || "Falha ao simular");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (v: number) =>
    "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  const economiaPositiva = (resultado?.economia ?? 0) > 0;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Simulador de Cenários</h1>
        <p className="text-muted-foreground text-sm">
          Projete o impacto financeiro de mudanças de jornada, intervalos, adicionais e quadro.
        </p>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold mb-4">Parâmetros do cenário</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Nova carga diária (min)</Label>
            <Input type="number" value={cenario.nova_carga_diaria_min}
              onChange={(e) => setCenario({ ...cenario, nova_carga_diaria_min: +e.target.value })} />
          </div>
          <div>
            <Label>Intervalo (min)</Label>
            <Input type="number" value={cenario.novo_intervalo_min}
              onChange={(e) => setCenario({ ...cenario, novo_intervalo_min: +e.target.value })} />
          </div>
          <div>
            <Label>Adicional noturno (%)</Label>
            <Input type="number" value={cenario.adicional_noturno_pct}
              onChange={(e) => setCenario({ ...cenario, adicional_noturno_pct: +e.target.value })} />
          </div>
          <div>
            <Label>% sobre HE</Label>
            <Input type="number" value={cenario.he_pct}
              onChange={(e) => setCenario({ ...cenario, he_pct: +e.target.value })} />
          </div>
          <div>
            <Label>Dias úteis no mês</Label>
            <Input type="number" value={cenario.dias_uteis_mes}
              onChange={(e) => setCenario({ ...cenario, dias_uteis_mes: +e.target.value })} />
          </div>
          <div>
            <Label>Aumento de quadro (%)</Label>
            <Input type="number" value={cenario.aumento_quadro}
              onChange={(e) => setCenario({ ...cenario, aumento_quadro: +e.target.value })} />
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={simular} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Calculator className="h-4 w-4 mr-2" />}
            Simular
          </Button>
        </div>
      </Card>

      {resultado && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-2">Cenário atual</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Funcionários</span><span className="font-medium">{resultado.base.funcionarios}</span></div>
                <div className="flex justify-between"><span>Folha mensal</span><span className="font-medium">{fmt(resultado.base.folha_mensal)}</span></div>
                <div className="flex justify-between"><span>Custo HE</span><span className="font-medium">{fmt(resultado.base.custo_he_mes)}</span></div>
                <div className="flex justify-between"><span>Custo noturno</span><span className="font-medium">{fmt(resultado.base.custo_noturno_mes)}</span></div>
                <div className="flex justify-between pt-2 border-t mt-2"><span>Total estimado</span><span className="font-bold">{fmt(resultado.base.custo_total_estimado)}</span></div>
              </div>
            </Card>
            <Card className="p-4 border-primary/40">
              <div className="text-sm text-muted-foreground mb-2">Cenário simulado</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Folha mensal</span><span className="font-medium">{fmt(resultado.simulado.folha_mensal)}</span></div>
                <div className="flex justify-between"><span>Custo HE</span><span className="font-medium">{fmt(resultado.simulado.custo_he_mes)}</span></div>
                <div className="flex justify-between"><span>HE projetada</span><span className="font-medium">{Math.round(resultado.simulado.he_min_projetada / 60)}h</span></div>
                <div className="flex justify-between pt-2 border-t mt-2"><span>Total estimado</span><span className="font-bold">{fmt(resultado.simulado.custo_total_estimado)}</span></div>
              </div>
            </Card>
          </div>

          <Card className={`p-6 ${economiaPositiva ? "bg-emerald-500/10 border-emerald-500/30" : "bg-destructive/10 border-destructive/30"}`}>
            <div className="flex items-center gap-3">
              {economiaPositiva ? (
                <TrendingDown className="h-8 w-8 text-emerald-600" />
              ) : (
                <TrendingUp className="h-8 w-8 text-destructive" />
              )}
              <div>
                <div className="text-sm text-muted-foreground">
                  {economiaPositiva ? "Economia mensal estimada" : "Custo adicional mensal"}
                </div>
                <div className="text-3xl font-bold">{fmt(Math.abs(resultado.economia))}</div>
                <div className="text-sm text-muted-foreground">
                  Projeção anual: {fmt(Math.abs(resultado.economia_anual))}
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
