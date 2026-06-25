import { useEffect, useState } from "react";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
const supabase = supabaseTyped as any;
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Save } from "lucide-react";
import { toast } from "sonner";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

export default function PontoNotificacoes() {
  const [cfg, setCfg] = useState<any>({
    notif_atraso: true, notif_falta: true, notif_he_pendente: true,
    notif_atestado_pendente: true, notif_banco_horas_expirar: true,
    dias_aviso_expiracao: 15, destinatarios_emails: [], webhook_url: "",
  });
  const [estId, setEstId] = useState<string | null>(null);
  const [emails, setEmails] = useState("");

  useEffect(() => {
    (async () => {
      const id = await getEstabelecimentoId();
      setEstId(id);
      if (id) {
        const { data } = await supabase.from("ponto_notificacoes_config")
          .select("*").eq("estabelecimento_id", id).maybeSingle();
        if (data) {
          setCfg(data);
          setEmails(Array.isArray(data.destinatarios_emails) ? (data.destinatarios_emails as string[]).join(", ") : "");
        }
      }
    })();
  }, []);

  const salvar = async () => {
    if (!estId) return;
    const dest = emails.split(",").map((s) => s.trim()).filter(Boolean);
    const payload = { ...cfg, estabelecimento_id: estId, destinatarios_emails: dest };
    delete payload.id; delete payload.created_at; delete payload.updated_at;
    const { error } = await supabase.from("ponto_notificacoes_config").upsert(payload, { onConflict: "estabelecimento_id" });
    if (error) return toast.error(error.message);
    toast.success("Configuração salva");
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="w-6 h-6" /> Notificações</h1>
        <p className="text-muted-foreground text-sm">Configure alertas automáticos do sistema de ponto</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Alertas ativos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[
            ["notif_atraso", "Atrasos"],
            ["notif_falta", "Faltas"],
            ["notif_he_pendente", "Horas extras pendentes de aprovação"],
            ["notif_atestado_pendente", "Atestados pendentes de validação"],
            ["notif_banco_horas_expirar", "Banco de horas próximo do vencimento"],
          ].map(([k, label]) => (
            <div key={k} className="flex items-center justify-between">
              <Label>{label}</Label>
              <Switch checked={!!cfg[k]} onCheckedChange={(c) => setCfg({ ...cfg, [k]: c })} />
            </div>
          ))}
          <div>
            <Label>Dias de aviso antes do vencimento do banco de horas</Label>
            <Input type="number" value={cfg.dias_aviso_expiracao} onChange={(e) => setCfg({ ...cfg, dias_aviso_expiracao: parseInt(e.target.value || "15") })} />
          </div>
          <div>
            <Label>Destinatários (e-mails separados por vírgula)</Label>
            <Input value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="rh@empresa.com, gestor@empresa.com" />
          </div>
          <div>
            <Label>Webhook (opcional)</Label>
            <Input value={cfg.webhook_url || ""} onChange={(e) => setCfg({ ...cfg, webhook_url: e.target.value })} placeholder="https://..." />
          </div>
          <Button onClick={salvar}><Save className="w-4 h-4 mr-2" />Salvar</Button>
        </CardContent>
      </Card>
    </div>
  );
}
