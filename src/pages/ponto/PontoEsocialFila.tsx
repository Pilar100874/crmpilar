import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";

export default function PontoEsocialFila() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function carregar() {
    const { data } = await (supabase as any).from("ponto_esocial_fila")
      .select("*").order("created_at", { ascending: false }).limit(200);
    setItems(data ?? []);
  }
  useEffect(() => { carregar(); }, []);

  async function processarAgora() {
    setLoading(true);
    const { error } = await supabase.functions.invoke("ponto-esocial-fila-worker");
    if (error) toast.error(error.message); else toast.success("Worker disparado");
    await carregar(); setLoading(false);
  }
  async function reprocessar(id: string) {
    await (supabase as any).from("ponto_esocial_fila").update({
      status: "pendente", proxima_tentativa: new Date().toISOString(), tentativas: 0, ultimo_erro: null,
    }).eq("id", id);
    toast.success("Reagendado"); carregar();
  }
  async function descartar(id: string) {
    await (supabase as any).from("ponto_esocial_fila").delete().eq("id", id);
    toast.success("Removido"); carregar();
  }

  const cores: Record<string, string> = {
    pendente: "outline", processando: "secondary", sucesso: "default", falha: "destructive", dlq: "destructive",
  };

  const dlq = items.filter(i => i.status === "dlq");
  const pendentes = items.filter(i => i.status !== "sucesso" && i.status !== "dlq");

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fila eSocial (Retry + DLQ)</h1>
        <Button onClick={processarAgora} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />Processar agora
        </Button>
      </div>

      {dlq.length > 0 && (
        <Card className="border-destructive">
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle>Dead Letter Queue ({dlq.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dlq.map(i => (
              <div key={i.id} className="flex items-center justify-between border rounded p-2">
                <div className="text-sm">
                  <div className="font-mono">{i.tipo_evento}</div>
                  <div className="text-xs text-muted-foreground">{i.ultimo_erro}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => reprocessar(i.id)}>Reprocessar</Button>
                  <Button size="sm" variant="ghost" onClick={() => descartar(i.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Pendentes / em retry ({pendentes.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {pendentes.map(i => (
            <div key={i.id} className="flex items-center justify-between border rounded p-2">
              <div className="text-sm">
                <div className="font-mono">{i.tipo_evento}</div>
                <div className="text-xs text-muted-foreground">
                  tentativa {i.tentativas}/{i.max_tentativas} · próxima {new Date(i.proxima_tentativa).toLocaleString("pt-BR")}
                </div>
              </div>
              <Badge variant={cores[i.status] as any}>{i.status}</Badge>
            </div>
          ))}
          {!pendentes.length && <p className="text-sm text-muted-foreground">Sem eventos pendentes.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
