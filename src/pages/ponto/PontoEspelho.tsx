import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileSignature, Send, Copy, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";
import { toast } from "sonner";

export default function PontoEspelho() {
  const { empresaId } = usePontoEmpresa();
  const [funcs, setFuncs] = useState<any[]>([]);
  const [envios, setEnvios] = useState<any[]>([]);
  const [assinados, setAssinados] = useState<any[]>([]);
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [enviando, setEnviando] = useState<string | null>(null);

  const load = async () => {
    if (!empresaId) return;
    const { data: f } = await supabase.from("ponto_funcionarios")
      .select("id, nome, cpf").eq("empresa_id", empresaId).eq("ativo", true).order("nome");
    setFuncs(f || []);
    const ids = (f || []).map((x) => x.id);
    if (!ids.length) return;
    const ref = `${mes}-01`;
    const [{ data: e }, { data: a }] = await Promise.all([
      (supabase as any).from("ponto_espelho_envios").select("*").in("funcionario_id", ids).eq("mes_referencia", ref),
      supabase.from("ponto_assinaturas_espelho").select("*").in("funcionario_id", ids).eq("mes_referencia", ref),
    ]);
    setEnvios(e || []);
    setAssinados(a || []);
  };
  useEffect(() => { load(); }, [empresaId, mes]);

  const enviar = async (funcId: string) => {
    setEnviando(funcId);
    try {
      const { error } = await supabase.functions.invoke("ponto-assinar-espelho", {
        body: { action: "enviar", funcionario_id: funcId, mes_referencia: `${mes}-01` },
      });
      if (error) throw error;
      toast.success("Espelho enviado para assinatura");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setEnviando(null);
    }
  };

  const copiarLink = (token: string) => {
    const url = `${window.location.origin}/espelho-funcionario/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl flex items-center gap-2">
            <FileSignature className="w-5 h-5" /> Espelho de Ponto
          </h2>
          <p className="text-sm text-muted-foreground">Envio e assinatura eletrônica mensal</p>
        </div>
        <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-40" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Funcionários · {mes}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {funcs.length === 0 && <p className="text-sm text-muted-foreground">Nenhum funcionário ativo.</p>}
          {funcs.map((f) => {
            const env = envios.find((e) => e.funcionario_id === f.id);
            const ass = assinados.find((a) => a.funcionario_id === f.id);
            const status = ass ? "assinado" : env?.status || "pendente";
            return (
              <div key={f.id} className="flex flex-wrap items-center justify-between gap-3 border rounded-md p-3">
                <div>
                  <div className="font-medium text-sm">{f.nome}</div>
                  <div className="text-xs text-muted-foreground">CPF {f.cpf}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={
                    status === "assinado" ? "default" :
                    status === "rejeitado" ? "destructive" :
                    status === "visualizado" ? "secondary" : "outline"
                  }>{status}</Badge>
                  {env?.token && (
                    <Button size="sm" variant="ghost" onClick={() => copiarLink(env.token)} title="Copiar link">
                      <Copy className="w-3 h-3" />
                    </Button>
                  )}
                  <Button size="sm" onClick={() => enviar(f.id)} disabled={enviando === f.id}>
                    {enviando === f.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                    {env ? "Reenviar" : "Enviar"}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
