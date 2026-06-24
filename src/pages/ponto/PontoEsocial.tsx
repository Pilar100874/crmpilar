import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function PontoEsocial() {
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const carregar = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ponto_esocial_eventos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    setEventos(data || []);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const transmitir = async (modo: "homologacao" | "producao", evento_id?: string) => {
    setEnviando(true);
    try {
      const { data, error } = await supabase.functions.invoke("ponto-esocial-transmitir", {
        body: { modo, evento_id },
      });
      if (error) throw error;
      toast.success(`${data.total} evento(s) transmitido(s) em ${modo}`);
      await carregar();
    } catch (e: any) { toast.error(e.message); } finally { setEnviando(false); }
  };

  const pendentes = eventos.filter(e => e.status === "pendente").length;
  const transmitidos = eventos.filter(e => e.status === "transmitido").length;

  const statusBadge = (s: string) => {
    if (s === "transmitido") return <Badge variant="default" className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Transmitido</Badge>;
    if (s === "pendente") return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />Pendente</Badge>;
    if (s === "pendente_envio_real") return <Badge variant="outline">Aguardando ICP-Brasil</Badge>;
    if (s === "erro") return <Badge variant="destructive">Erro</Badge>;
    return <Badge>{s}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Send className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">eSocial — Transmissão</h1>
            <p className="text-muted-foreground">Eventos S-2230 (afastamentos) e S-2299 (desligamentos)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => transmitir("homologacao")} disabled={enviando || pendentes === 0}>
            Transmitir em Homologação
          </Button>
          <Button onClick={() => transmitir("producao")} disabled={enviando || pendentes === 0}>
            Marcar para Produção
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pendentes</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-orange-500">{pendentes}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Transmitidos</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-green-600">{transmitidos}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{eventos.length}</div></CardContent></Card>
      </div>

      <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
        <CardContent className="pt-6 text-sm">
          <strong>⚠️ Importante:</strong> Transmissão real para gov.br exige certificado digital <strong>ICP-Brasil A1/A3</strong> e
          assinatura XML-DSig. O modo "Homologação" gera o XML e marca como transmitido para validação interna.
          Para produção, integre seu certificado com o webservice oficial do eSocial.
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Eventos ({eventos.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">Carregando...</p> : eventos.length === 0 ? (
            <p className="text-muted-foreground">Nenhum evento enfileirado</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="p-2">Evento</th>
                    <th className="p-2">Funcionário</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Recibo</th>
                    <th className="p-2">Criado</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {eventos.map((e) => (
                    <tr key={e.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-mono">{e.evento}</td>
                      <td className="p-2 font-mono text-xs">{e.funcionario_id?.substring(0,8)}</td>
                      <td className="p-2">{statusBadge(e.status)}</td>
                      <td className="p-2 font-mono text-xs">{e.recibo_protocolo || "-"}</td>
                      <td className="p-2">{new Date(e.created_at).toLocaleString("pt-BR")}</td>
                      <td className="p-2">
                        {e.status === "pendente" && (
                          <Button size="sm" variant="ghost" onClick={() => transmitir("homologacao", e.id)} disabled={enviando}>Enviar</Button>
                        )}
                      </td>
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
