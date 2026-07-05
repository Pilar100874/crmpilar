import { useEffect, useState } from "react";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
const supabase = supabaseTyped as any;
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, Save, MessageSquare, Mail, Smartphone, Send, TestTube2 } from "lucide-react";
import { toast } from "sonner";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

type Canal = "push" | "email" | "sms" | "whatsapp";

const EVENTOS: { key: string; label: string }[] = [
  { key: "atraso",            label: "Atrasos" },
  { key: "falta",             label: "Faltas" },
  { key: "he_pendente",       label: "Hora extra pendente de aprovação" },
  { key: "atestado_pendente", label: "Atestado pendente de validação" },
  { key: "bh_expirar",        label: "Banco de horas próximo do vencimento" },
  { key: "fraude",            label: "Alertas de fraude (batidas suspeitas, geo fora, etc.)" },
];

const CANAIS: { key: Canal; label: string; icon: any }[] = [
  { key: "push",     label: "Push",     icon: Bell },
  { key: "email",    label: "E-mail",   icon: Mail },
  { key: "sms",      label: "SMS",      icon: Smartphone },
  { key: "whatsapp", label: "WhatsApp", icon: MessageSquare },
];

const DEFAULTS = {
  push_ativo: true, email_ativo: true, sms_ativo: false, whatsapp_ativo: false,
  notif_atraso: true, notif_falta: true, notif_he_pendente: true,
  notif_atestado_pendente: true, notif_banco_horas_expirar: true, notif_fraude: true,
  notificar_funcionario: true,
  dias_aviso_expiracao: 15,
  destinatarios_emails: [] as string[],
  destinatarios_telefones: [] as string[],
  webhook_url: "",
  canais_por_evento: {
    atraso: ["push"], falta: ["push","email"], he_pendente: ["push","email"],
    atestado_pendente: ["push"], bh_expirar: ["push","email"], fraude: ["push","email","whatsapp"],
  } as Record<string, string[]>,
  mensagens_template: {
    atraso: "⏰ Atraso registrado em {data} para {funcionario}.",
    falta: "🚨 Falta registrada em {data} para {funcionario}.",
    he_pendente: "⌛ Você tem {quantidade} hora(s) extra pendente(s) de aprovação.",
    atestado_pendente: "📄 Existem {quantidade} atestado(s) pendente(s) de validação.",
    bh_expirar: "🕐 Banco de horas próximo do vencimento em {data_expiracao}.",
    fraude: "🛑 Alerta de possível fraude: {detalhe} ({funcionario} em {data}).",
  } as Record<string, string>,
};

export default function PontoNotificacoes() {
  const [cfg, setCfg] = useState<any>({ ...DEFAULTS });
  const [estId, setEstId] = useState<string | null>(null);
  const [emails, setEmails] = useState("");
  const [telefones, setTelefones] = useState("");
  const [testTel, setTestTel] = useState("");

  useEffect(() => {
    (async () => {
      const id = await getEstabelecimentoId();
      setEstId(id);
      if (id) {
        const { data } = await supabase.from("ponto_notificacoes_config")
          .select("*").eq("estabelecimento_id", id).maybeSingle();
        if (data) {
          setCfg({ ...DEFAULTS, ...data,
            canais_por_evento: { ...DEFAULTS.canais_por_evento, ...(data.canais_por_evento || {}) },
            mensagens_template: { ...DEFAULTS.mensagens_template, ...(data.mensagens_template || {}) },
          });
          setEmails(Array.isArray(data.destinatarios_emails) ? data.destinatarios_emails.join(", ") : "");
          setTelefones(Array.isArray(data.destinatarios_telefones) ? data.destinatarios_telefones.join(", ") : "");
        }
      }
    })();
  }, []);

  const toggleCanalEvento = (evento: string, canal: string) => {
    const atual: string[] = cfg.canais_por_evento?.[evento] ?? [];
    const novo = atual.includes(canal) ? atual.filter(c => c !== canal) : [...atual, canal];
    setCfg({ ...cfg, canais_por_evento: { ...cfg.canais_por_evento, [evento]: novo } });
  };

  const setTemplate = (evento: string, texto: string) => {
    setCfg({ ...cfg, mensagens_template: { ...cfg.mensagens_template, [evento]: texto } });
  };

  const salvar = async () => {
    if (!estId) return;
    const dest_em = emails.split(",").map(s => s.trim()).filter(Boolean);
    const dest_tel = telefones.split(",").map(s => s.trim()).filter(Boolean);
    const payload: any = { ...cfg, estabelecimento_id: estId,
      destinatarios_emails: dest_em, destinatarios_telefones: dest_tel };
    delete payload.id; delete payload.created_at; delete payload.updated_at;
    const { error } = await supabase.from("ponto_notificacoes_config")
      .upsert(payload, { onConflict: "estabelecimento_id" });
    if (error) return toast.error(error.message);
    toast.success("Configuração salva");
  };

  const testar = async (canal: Canal) => {
    if (!estId) return;
    if ((canal === "sms" || canal === "whatsapp") && !testTel) {
      return toast.error("Informe um telefone para testar");
    }
    try {
      const { data, error } = await supabase.functions.invoke("ponto-notificar-canal", {
        body: {
          estabelecimento_id: estId, tipo: "fraude", canais: [canal],
          titulo: "Teste de notificação do Ponto",
          mensagem: `Este é um teste do canal ${canal.toUpperCase()} enviado pelo sistema de Ponto.`,
          dados: { funcionario: "Teste", data: new Date().toLocaleDateString("pt-BR"), detalhe: "Envio manual" },
        },
      });
      if (error) throw error;
      const okResults = (data?.resultados || []).filter((r: any) => r.canal === canal);
      const anyOk = okResults.some((r: any) => r.ok);
      anyOk
        ? toast.success(`Teste ${canal.toUpperCase()} enviado`)
        : toast.error(`Falha ao testar ${canal.toUpperCase()}: ${JSON.stringify(okResults)}`);
    } catch (e: any) {
      toast.error(e.message || String(e));
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="w-6 h-6" /> Notificações do Ponto
        </h1>
        <p className="text-muted-foreground text-sm">
          Configure alertas multi-canal (Push, E-mail, SMS, WhatsApp) para funcionários e líderes.
        </p>
      </div>

      {/* Canais globais */}
      <Card>
        <CardHeader><CardTitle>Canais habilitados</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CANAIS.map(({ key, label, icon: Icon }) => (
            <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <Label>{label}</Label>
              </div>
              <Switch
                checked={!!cfg[`${key}_ativo`]}
                onCheckedChange={(c) => setCfg({ ...cfg, [`${key}_ativo`]: c })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Destinatários */}
      <Card>
        <CardHeader><CardTitle>Destinatários</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Notificar o próprio funcionário</Label>
              <p className="text-xs text-muted-foreground">
                Usa telefone/e-mail cadastrados no funcionário para SMS, WhatsApp e Push.
              </p>
            </div>
            <Switch checked={!!cfg.notificar_funcionario}
              onCheckedChange={(c) => setCfg({ ...cfg, notificar_funcionario: c })} />
          </div>
          <div>
            <Label>E-mails de líderes/gestores (separados por vírgula)</Label>
            <Input value={emails} onChange={(e) => setEmails(e.target.value)}
              placeholder="rh@empresa.com, gestor@empresa.com" />
          </div>
          <div>
            <Label>Telefones de líderes/gestores para SMS e WhatsApp (com DDD, separados por vírgula)</Label>
            <Input value={telefones} onChange={(e) => setTelefones(e.target.value)}
              placeholder="11999998888, 11977776666" />
          </div>
          <div>
            <Label>Webhook (opcional)</Label>
            <Input value={cfg.webhook_url || ""}
              onChange={(e) => setCfg({ ...cfg, webhook_url: e.target.value })}
              placeholder="https://..." />
          </div>
        </CardContent>
      </Card>

      {/* Matriz Evento x Canal */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos e canais</CardTitle>
          <p className="text-xs text-muted-foreground">
            Marque quais canais devem disparar em cada tipo de evento.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Ativo</th>
                  <th className="text-left p-2">Evento</th>
                  {CANAIS.map(c => <th key={c.key} className="text-center p-2">{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {EVENTOS.map(ev => {
                  const flagKey =
                    ev.key === "atestado_pendente" ? "notif_atestado_pendente" :
                    ev.key === "bh_expirar" ? "notif_banco_horas_expirar" :
                    `notif_${ev.key}`;
                  return (
                    <tr key={ev.key} className="border-b">
                      <td className="p-2">
                        <Switch checked={!!cfg[flagKey]}
                          onCheckedChange={(c) => setCfg({ ...cfg, [flagKey]: c })} />
                      </td>
                      <td className="p-2">{ev.label}</td>
                      {CANAIS.map(c => {
                        const on = (cfg.canais_por_evento?.[ev.key] ?? []).includes(c.key);
                        return (
                          <td key={c.key} className="text-center p-2">
                            <Checkbox checked={on}
                              onCheckedChange={() => toggleCanalEvento(ev.key, c.key)} />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Label>Dias de aviso antes do vencimento do banco de horas</Label>
            <Input type="number" className="max-w-[200px]"
              value={cfg.dias_aviso_expiracao ?? 15}
              onChange={(e) => setCfg({ ...cfg, dias_aviso_expiracao: parseInt(e.target.value || "15") })} />
          </div>
        </CardContent>
      </Card>

      {/* Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Mensagens (templates)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Variáveis disponíveis: <code>{"{funcionario}"}</code>, <code>{"{data}"}</code>,{" "}
            <code>{"{quantidade}"}</code>, <code>{"{data_expiracao}"}</code>, <code>{"{detalhe}"}</code>.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {EVENTOS.map(ev => (
            <div key={ev.key}>
              <Label className="text-xs">{ev.label}</Label>
              <Textarea rows={2}
                value={cfg.mensagens_template?.[ev.key] ?? ""}
                onChange={(e) => setTemplate(ev.key, e.target.value)} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Testes */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><TestTube2 className="w-5 h-5" />Testar envios</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Telefone para teste (SMS/WhatsApp)</Label>
            <Input value={testTel} onChange={(e) => setTestTel(e.target.value)} placeholder="11999998888" />
          </div>
          <div className="flex flex-wrap gap-2">
            {CANAIS.map(({ key, label, icon: Icon }) => (
              <Button key={key} variant="outline" size="sm" onClick={() => testar(key)}>
                <Icon className="w-4 h-4 mr-2" />Testar {label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            O teste usa o template do evento "fraude" e envia apenas pelo canal escolhido.
            Salve a configuração antes de testar SMS/WhatsApp (precisa dos telefones cadastrados
            ou informe um telefone de teste acima; SMS/WhatsApp de teste serão enviados para os
            telefones cadastrados em "Destinatários").
          </p>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={salvar} size="lg"><Save className="w-4 h-4 mr-2" />Salvar configuração</Button>
      </div>
    </div>
  );
}
