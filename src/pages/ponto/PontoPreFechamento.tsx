import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardCheck, AlertTriangle, CheckCircle2, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";

export default function PontoPreFechamento() {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [empresa, setEmpresa] = useState("");
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  useEffect(() => {
    supabase.from("ponto_empresas").select("id, razao_social").then(({ data }) => setEmpresas(data || []));
  }, []);

  const analisar = async (fechar = false) => {
    if (!empresa) return toast.error("Selecione a empresa");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ponto-prefechamento", {
        body: { empresa_id: empresa, mes_referencia: `${mes}-01`, fechar },
      });
      if (error) throw error;
      if (data?.error && !data?.checklist) throw new Error(data.error);
      setResultado(data);
      if (fechar && data?.fechado) toast.success("Período fechado com sucesso!");
      else if (fechar) toast.error(data?.error || "Não foi possível fechar");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardCheck className="w-6 h-6" /> Pré-Fechamento Mensal</h1>
        <p className="text-muted-foreground text-sm">Checklist de pendências antes de fechar o período para a folha</p>
      </div>

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><Label>Empresa</Label>
            <Select value={empresa} onValueChange={setEmpresa}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{empresas.map((e) => (<SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div><Label>Mês de referência</Label>
            <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={() => analisar(false)} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ClipboardCheck className="w-4 h-4 mr-2" />}
              Analisar pendências
            </Button>
          </div>
        </CardContent>
      </Card>

      {resultado && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Funcionários</p>
              <p className="text-2xl font-bold">{resultado.total_funcionarios}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">HE total</p>
              <p className="text-2xl font-bold">{Math.floor((resultado.total_he_min||0)/60)}h{(resultado.total_he_min||0)%60}m</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Faltas</p>
              <p className="text-2xl font-bold">{resultado.total_faltas}</p>
            </CardContent></Card>
            <Card><CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant={resultado.pode_fechar ? "default" : "destructive"}>
                {resultado.pode_fechar ? "Pronto para fechar" : "Com bloqueios"}
              </Badge>
            </CardContent></Card>
          </div>

          <div className="space-y-2">
            {resultado.checklist.map((c: any) => (
              <Card key={c.chave} className={c.bloqueante && c.count > 0 ? "border-destructive" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {c.count === 0 ? <CheckCircle2 className="w-4 h-4 text-green-600" /> :
                        c.bloqueante ? <AlertTriangle className="w-4 h-4 text-destructive" /> :
                        <AlertTriangle className="w-4 h-4 text-amber-500" />}
                      {c.titulo}
                    </span>
                    <Badge variant={c.count === 0 ? "secondary" : c.bloqueante ? "destructive" : "outline"}>
                      {c.count} {c.bloqueante && c.count > 0 ? "· bloqueante" : ""}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                {c.count > 0 && (
                  <CardContent className="text-xs max-h-40 overflow-auto space-y-1">
                    {c.items.slice(0, 20).map((it: any, i: number) => (
                      <div key={i} className="border-b py-1">
                        {it.funcionario?.nome || it.nome || "—"}
                        {it.data && ` · ${new Date(it.data).toLocaleDateString("pt-BR")}`}
                        {it.data_inicio && ` · ${new Date(it.data_inicio).toLocaleDateString("pt-BR")}`}
                        {it.tipo && ` · ${it.tipo}`}
                        {it.total && ` · ${it.total} marcações`}
                      </div>
                    ))}
                    {c.items.length > 20 && <p className="text-muted-foreground">+{c.items.length - 20} mais...</p>}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          <Button onClick={() => analisar(true)} disabled={loading || !resultado.pode_fechar}
            variant={resultado.pode_fechar ? "default" : "outline"} size="lg" className="w-full">
            <Lock className="w-4 h-4 mr-2" />
            Fechar período {mes}
          </Button>
        </>
      )}
    </div>
  );
}
