import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Hourglass, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function PontoBancoHorasExpirar() {
  const [dados, setDados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(false);

  const carregar = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ponto_banco_horas_a_expirar" as any)
      .select("*")
      .order("dias_para_expirar", { ascending: true })
      .limit(500);
    setDados((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const processar = async () => {
    setProcessando(true);
    try {
      const { data, error } = await supabase.functions.invoke("ponto-banco-horas-expirar");
      if (error) throw error;
      toast.success(`Processado: ${data.processados} | Expirados: ${data.expirados} | Alertados: ${data.alertados}`);
      await carregar();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setProcessando(false); }
  };

  const sevColor = (dias: number) => dias <= 0 ? "destructive" : dias <= 7 ? "destructive" : dias <= 30 ? "default" : "secondary";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Hourglass className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Banco de Horas a Expirar</h1>
            <p className="text-muted-foreground">Lançamentos próximos do prazo de compensação (Lei 13.467/17)</p>
          </div>
        </div>
        <Button onClick={processar} disabled={processando}>
          <RefreshCw className={`h-4 w-4 mr-2 ${processando ? "animate-spin" : ""}`} />
          Processar expirações
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Lançamentos pendentes ({dados.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Carregando...</p> : dados.length === 0 ? (
            <p className="text-muted-foreground">Nenhum lançamento próximo de expirar ✓</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm resp-table">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="p-2">Funcionário</th>
                    <th className="p-2">Data lançamento</th>
                    <th className="p-2">Minutos</th>
                    <th className="p-2">Expira em</th>
                    <th className="p-2">Dias restantes</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.map((d) => (
                    <tr key={d.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">{d.funcionario_nome}</td>
                      <td className="p-2">{new Date(d.data).toLocaleDateString("pt-BR")}</td>
                      <td className="p-2">{Math.floor(d.minutos/60)}h{String(d.minutos%60).padStart(2,'0')}</td>
                      <td className="p-2">{new Date(d.expira_em).toLocaleDateString("pt-BR")}</td>
                      <td className="p-2"><Badge variant={sevColor(d.dias_para_expirar) as any}>{d.dias_para_expirar} dias</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
