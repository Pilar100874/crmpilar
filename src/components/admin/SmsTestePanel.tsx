import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, RefreshCw, Bug, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface Envio {
  id: string;
  destino: string;
  mensagem: string;
  status: string;
  erro: string | null;
  provider: string;
  provider_message_id: string | null;
  response_raw: any;
  created_at: string;
}

interface QueueItem {
  id: string;
  telefone: string;
  mensagem: string;
  status: string;
  tentativas: number;
  erro_mensagem: string | null;
  enviado_at: string | null;
  entregue_at: string | null;
  created_at: string;
}

export default function SmsTestePanel() {
  const [telefone, setTelefone] = useState("");
  const [mensagem, setMensagem] = useState("Teste do gateway Pilar SMS " + new Date().toLocaleTimeString());
  const [enviando, setEnviando] = useState(false);
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [fila, setFila] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);

  useEffect(() => {
    getEstabelecimentoId().then(setEstabelecimentoId);
  }, []);

  const carregarLogs = async () => {
    if (!estabelecimentoId) return;
    setLoading(true);
    const [{ data: e }, { data: q }] = await Promise.all([
      supabase.from("sms_envios").select("*").eq("estabelecimento_id", estabelecimentoId)
        .order("created_at", { ascending: false }).limit(30),
      supabase.from("sms_queue").select("*").eq("estabelecimento_id", estabelecimentoId)
        .order("created_at", { ascending: false }).limit(30),
    ]);
    setEnvios((e as Envio[]) || []);
    setFila((q as QueueItem[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (estabelecimentoId) carregarLogs();
  }, [estabelecimentoId]);

  const enviar = async () => {
    if (!telefone || !mensagem) {
      toast.error("Informe telefone e mensagem");
      return;
    }
    if (!estabelecimentoId) {
      toast.error("Estabelecimento não identificado");
      return;
    }
    setEnviando(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: { estabelecimento_id: estabelecimentoId, destino: telefone, mensagem },
      });
      if (error) throw error;
      if (data?.success === false) {
        toast.error(`Falhou: ${data?.erro || "erro desconhecido"}`);
      } else {
        toast.success("SMS enfileirado. O celular vai puxá-lo em poucos segundos.");
      }
      setTimeout(carregarLogs, 1500);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao invocar send-sms");
    } finally {
      setEnviando(false);
    }
  };

  const statusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "enviado" || s === "sent" || s === "entregue") {
      return <Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-950/40 dark:text-green-300"><CheckCircle2 className="mr-1 h-3 w-3" />{status}</Badge>;
    }
    if (s === "pendente" || s === "pending") {
      return <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />{status}</Badge>;
    }
    return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />{status || "erro"}</Badge>;
  };

  return (
    <Card className="flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border shadow-sm">
      <CardContent className="flex-1 p-5 sm:p-7 md:p-8 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300">
              <Bug className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Testar & Diagnosticar Gateway SMS</h3>
              <p className="text-xs text-muted-foreground">Enfileira um SMS agora e mostra o motivo real de cada falha.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr,2fr,auto] sm:items-end">
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">Telefone</label>
            <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="11999998888" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">Mensagem</label>
            <Textarea rows={2} value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
          </div>
          <Button onClick={enviar} disabled={enviando} className="bg-blue-600 hover:bg-blue-500">
            <Send className="mr-2 h-4 w-4" />
            {enviando ? "Enviando..." : "Enviar teste"}
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Fila (últimos 30)</h4>
          <Button variant="ghost" size="sm" onClick={carregarLogs} disabled={loading}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Recarregar
          </Button>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2 text-left">Quando</th>
                <th className="p-2 text-left">Telefone</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Tent.</th>
                <th className="p-2 text-left">Enviado</th>
                <th className="p-2 text-left">Entregue</th>
                <th className="p-2 text-left">Erro</th>
              </tr>
            </thead>
            <tbody>
              {fila.length === 0 && (
                <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Nenhum SMS na fila</td></tr>
              )}
              {fila.map((q) => (
                <tr key={q.id} className="border-t">
                  <td className="p-2 whitespace-nowrap">{new Date(q.created_at).toLocaleString()}</td>
                  <td className="p-2 font-mono">{q.telefone}</td>
                  <td className="p-2">{statusBadge(q.status)}</td>
                  <td className="p-2">{q.tentativas}</td>
                  <td className="p-2">{q.enviado_at ? new Date(q.enviado_at).toLocaleTimeString() : "—"}</td>
                  <td className="p-2">{q.entregue_at ? new Date(q.entregue_at).toLocaleTimeString() : "—"}</td>
                  <td className="p-2 text-red-600 dark:text-red-400 max-w-xs truncate" title={q.erro_mensagem || ""}>{q.erro_mensagem || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Envios registrados</h4>
        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2 text-left">Quando</th>
                <th className="p-2 text-left">Provider</th>
                <th className="p-2 text-left">Destino</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Msg ID</th>
                <th className="p-2 text-left">Erro</th>
              </tr>
            </thead>
            <tbody>
              {envios.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Nenhum envio ainda</td></tr>
              )}
              {envios.map((e) => (
                <tr key={e.id} className="border-t align-top">
                  <td className="p-2 whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                  <td className="p-2">{e.provider}</td>
                  <td className="p-2 font-mono">{e.destino}</td>
                  <td className="p-2">{statusBadge(e.status)}</td>
                  <td className="p-2 font-mono text-[10px]">{e.provider_message_id?.slice(0, 12) || "—"}</td>
                  <td className="p-2 text-red-600 dark:text-red-400 max-w-md">
                    {e.erro || "—"}
                    {e.response_raw && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-muted-foreground">resposta bruta</summary>
                        <pre className="mt-1 whitespace-pre-wrap break-all text-[10px]">{JSON.stringify(e.response_raw, null, 2)}</pre>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
          <b className="text-foreground">Dica:</b> no app do celular, toque longo no botão de <b>Configurações</b> para abrir a tela de diagnóstico e enviar SMS de teste direto do aparelho — ela mostra o código exato do Android (RESULT_OK, GENERIC_FAILURE, NO_SERVICE, LIMIT_EXCEEDED, RADIO_OFF...) para cada mensagem.
        </div>
      </CardContent>
    </Card>
  );
}
