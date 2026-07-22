import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Plus, Trash2, Webhook, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

export default function PontoWebhookCatracas() {
  const { empresaId } = usePontoEmpresa();
  const [tokens, setTokens] = useState<any[]>([]);
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [novo, setNovo] = useState({ descricao: "", equipamento_id: "" });
  const [delTarget, setDelTarget] = useState<any | null>(null);

  const webhookUrl = `https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/ponto-webhook-catraca`;

  const load = async () => {
    if (!empresaId) return;
    const [t, e] = await Promise.all([
      supabase.from("ponto_webhook_tokens").select("*").eq("empresa_id", empresaId).order("created_at", { ascending: false }),
      supabase.from("ponto_equipamentos").select("id, nome").eq("empresa_id", empresaId),
    ]);
    setTokens(t.data || []);
    setEquipamentos(e.data || []);
  };
  useEffect(() => { load(); }, [empresaId]);

  const gerar = async () => {
    if (!empresaId) return;
    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const { error } = await supabase.from("ponto_webhook_tokens").insert({
      empresa_id: empresaId,
      equipamento_id: novo.equipamento_id || null,
      descricao: novo.descricao || "Catraca",
      token,
    });
    if (error) return toast.error(error.message);
    toast.success("Token gerado");
    setNovo({ descricao: "", equipamento_id: "" });
    load();
  };

  const toggle = async (t: any) => {
    await supabase.from("ponto_webhook_tokens").update({ ativo: !t.ativo }).eq("id", t.id);
    load();
  };

  const excluir = async (t: any) => {
    await supabase.from("ponto_webhook_tokens").delete().eq("id", t.id);
    toast.success("Token removido");
    setDelTarget(null);
    load();
  };

  const copiar = (txt: string) => { navigator.clipboard.writeText(txt); toast.success("Copiado"); };

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-xl font-semibold sm:text-2xl flex items-center gap-2"><Webhook className="h-5 w-5" /> Webhooks de Catracas/Relógios</h2>
        <p className="text-sm text-muted-foreground">
          Tokens para que catracas e relógios enviem batidas em tempo real (complementa o AFD em lote).
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div>
            <Label>Endpoint</Label>
            <div className="flex gap-2">
              <Input readOnly value={webhookUrl} className="font-mono text-xs" />
              <Button variant="outline" onClick={() => copiar(webhookUrl)}><Copy className="h-4 w-4" /></Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Envie POST com header <code>Authorization: Bearer &lt;token&gt;</code> e corpo JSON:
              <code className="ml-1">{`{ batidas: [{ cpf, data_hora, tipo }] }`}</code>
            </p>
          </div>

          <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
            <div>
              <Label>Descrição</Label>
              <Input value={novo.descricao} onChange={(e) => setNovo({ ...novo, descricao: e.target.value })} placeholder="Catraca Recepção" />
            </div>
            <div>
              <Label>Equipamento (opcional)</Label>
              <Select value={novo.equipamento_id} onValueChange={(v) => setNovo({ ...novo, equipamento_id: v })}>
                <SelectTrigger><SelectValue placeholder="Vincular equipamento" /></SelectTrigger>
                <SelectContent>
                  {equipamentos.map(eq => <SelectItem key={eq.id} value={eq.id}>{eq.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={gerar} className="w-full"><Plus className="mr-2 h-4 w-4" /> Gerar token</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border resp-table-wrap">
        <table className="w-full table-fixed text-sm resp-table">
          <thead className="bg-muted/50"><tr className="text-left">
            <th className="p-3">Descrição</th><th className="p-3">Token</th>
            <th className="p-3">Última chamada</th><th className="p-3">Chamadas</th>
            <th className="p-3">Ativo</th><th className="p-3"></th>
          </tr></thead>
          <tbody>
            {tokens.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum token cadastrado.</td></tr>
            ) : tokens.map(t => (
              <tr key={t.id} className="border-t">
                <td className="p-3">{t.descricao}</td>
                <td className="p-3 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span>{t.token.slice(0,12)}...{t.token.slice(-6)}</span>
                    <Button size="sm" variant="ghost" onClick={() => copiar(t.token)}><Copy className="h-3 w-3" /></Button>
                  </div>
                </td>
                <td className="p-3">{t.ultima_chamada ? new Date(t.ultima_chamada).toLocaleString("pt-BR") : "—"}</td>
                <td className="p-3"><Badge variant="outline"><Zap className="mr-1 h-3 w-3" />{t.total_chamadas}</Badge></td>
                <td className="p-3"><Switch checked={t.ativo} onCheckedChange={() => toggle(t)} /></td>
                <td className="p-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setDelTarget(t)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DeleteConfirmDialog
        open={!!delTarget}
        onOpenChange={(o) => !o && setDelTarget(null)}
        onConfirm={() => delTarget && excluir(delTarget)}
        title="Excluir token de webhook?"
        description="A catraca vinculada deixará de enviar batidas até receber novo token."
      />
    </div>
  );
}
