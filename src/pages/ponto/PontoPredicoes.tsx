import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";
import { toast } from "sonner";
import { TrendingUp, AlertTriangle, DollarSign, Activity, Loader2, Lightbulb, Scale } from "lucide-react";

type Previsao = {
  funcionario_id: string;
  nome: string;
  risco_absenteismo: number;
  previsao_faltas_30d: number;
  previsao_he_30d_h: number;
  custo_he_estimado: number;
  saldo_banco_min: number;
};

export default function PontoPredicoes() {
  const { empresaId } = usePontoEmpresa();
  const [loading, setLoading] = useState(false);
  const [totais, setTotais] = useState<any>(null);
  const [previsoes, setPrevisoes] = useState<Previsao[]>([]);
  const [recomendacao, setRecomendacao] = useState<any>(null);
  const [riscos, setRiscos] = useState<any[]>([]);
  const [loadingRec, setLoadingRec] = useState(false);
  const [loadingRisco, setLoadingRisco] = useState(false);

  const rodarRecomendacao = async () => {
    if (!empresaId) return;
    setLoadingRec(true);
    try {
      const { data, error } = await supabase.functions.invoke("ponto-recomendacao-contratacao", {
        body: { empresa_id: empresaId },
      });
      if (error) throw error;
      setRecomendacao(data.recomendacao);
      toast.success("Recomendação gerada");
    } catch (e: any) { toast.error(e.message); }
    finally { setLoadingRec(false); }
  };

  const rodarRisco = async () => {
    if (!empresaId) return;
    setLoadingRisco(true);
    try {
      const { data, error } = await supabase.functions.invoke("ponto-risco-trabalhista", {
        body: { empresa_id: empresaId },
      });
      if (error) throw error;
      setRiscos(data.riscos || []);
      toast.success("Riscos calculados");
    } catch (e: any) { toast.error(e.message); }
    finally { setLoadingRisco(false); }
  };


  const rodar = async () => {
    if (!empresaId) return toast.error("Selecione uma empresa");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ponto-predicoes", {
        body: { empresa_id: empresaId },
      });
      if (error) throw error;
      setTotais(data.totais);
      setPrevisoes(data.previsoes || []);
      toast.success("Previsões atualizadas");
    } catch (e: any) {
      toast.error(e.message || "Falha ao gerar previsões");
    } finally {
      setLoading(false);
    }
  };

  const riscoCor = (r: number) =>
    r >= 60 ? "destructive" : r >= 30 ? "default" : "secondary";

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inteligência Preditiva</h1>
          <p className="text-muted-foreground text-sm">
            Previsão de absenteísmo, horas extras e custos para os próximos 30 dias.
          </p>
        </div>
        <Button onClick={rodar} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <TrendingUp className="h-4 w-4 mr-2" />}
          Rodar previsão
        </Button>
      </div>

      {totais && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Activity className="h-4 w-4" /> Funcionários
            </div>
            <div className="text-2xl font-bold">{totais.funcionarios}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <AlertTriangle className="h-4 w-4" /> Alto risco
            </div>
            <div className="text-2xl font-bold text-destructive">{totais.em_alto_risco}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <TrendingUp className="h-4 w-4" /> HE prevista 30d
            </div>
            <div className="text-2xl font-bold">{totais.he_total_30d_h}h</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <DollarSign className="h-4 w-4" /> Custo HE estimado
            </div>
            <div className="text-2xl font-bold">
              R$ {totais.custo_he_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </Card>
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h2 className="font-semibold">Previsão por funcionário</h2>
        </div>
        <div className="divide-y">
          {previsoes.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Rode a previsão para ver os resultados.
            </div>
          )}
          {previsoes.map((p) => (
            <div key={p.funcionario_id} className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
              <div className="font-medium">{p.nome}</div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">
                  Risco: <Badge variant={riscoCor(p.risco_absenteismo)}>{p.risco_absenteismo}%</Badge>
                </div>
                <Progress value={p.risco_absenteismo} className="h-2" />
              </div>
              <div className="text-sm">
                <div className="text-muted-foreground text-xs">Faltas previstas</div>
                <div className="font-semibold">{p.previsao_faltas_30d}</div>
              </div>
              <div className="text-sm">
                <div className="text-muted-foreground text-xs">HE 30d</div>
                <div className="font-semibold">{p.previsao_he_30d_h}h</div>
              </div>
              <div className="text-sm">
                <div className="text-muted-foreground text-xs">Custo HE</div>
                <div className="font-semibold">
                  R$ {p.custo_he_estimado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2"><Lightbulb className="h-4 w-4" /> Recomendação de contratação (IA)</h3>
            <Button size="sm" variant="outline" onClick={rodarRecomendacao} disabled={loadingRec}>
              {loadingRec ? <Loader2 className="h-3 w-3 animate-spin" /> : "Gerar"}
            </Button>
          </div>
          {!recomendacao && <p className="text-sm text-muted-foreground">Clique em "Gerar" para a IA analisar HE e absenteísmo e indicar quantas contratações compensam.</p>}
          {recomendacao && (
            <div className="space-y-2 text-sm">
              {recomendacao.contratar_n !== undefined && (
                <div><Badge>Contratar {recomendacao.contratar_n}</Badge></div>
              )}
              {recomendacao.economia_mensal_estimada !== undefined && (
                <div className="text-emerald-600 font-medium">
                  Economia estimada: R$ {Number(recomendacao.economia_mensal_estimada).toLocaleString("pt-BR")}/mês
                </div>
              )}
              {recomendacao.justificativa && <p className="text-muted-foreground">{recomendacao.justificativa}</p>}
              {recomendacao.risco && <p className="text-xs"><strong>Risco:</strong> {recomendacao.risco}</p>}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2"><Scale className="h-4 w-4" /> Risco trabalhista por funcionário</h3>
            <Button size="sm" variant="outline" onClick={rodarRisco} disabled={loadingRisco}>
              {loadingRisco ? <Loader2 className="h-3 w-3 animate-spin" /> : "Calcular"}
            </Button>
          </div>
          {riscos.length === 0 && <p className="text-sm text-muted-foreground">Clique em "Calcular" para gerar score e justificativa IA.</p>}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {riscos.slice(0, 10).map((r) => (
              <div key={r.funcionario_id} className="border-b pb-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{r.nome}</span>
                  <Badge variant={r.score_risco >= 60 ? "destructive" : "secondary"}>{r.score_risco}%</Badge>
                </div>
                {r.ia?.justificativa && <p className="text-xs text-muted-foreground mt-1">{r.ia.justificativa}</p>}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
