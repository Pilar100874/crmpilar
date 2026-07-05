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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Bell, Save, MessageSquare, Mail, Smartphone, TestTube2, Clock, Repeat,
  Gauge, BarChart3, ArrowUpRight, Send,
} from "lucide-react";
import { toast } from "sonner";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Link } from "react-router-dom";

type Canal = "push" | "email" | "sms" | "whatsapp";

const EVENTOS = [
  { key: "atraso",            label: "Atrasos" },
  { key: "falta",             label: "Faltas" },
  { key: "he_pendente",       label: "Hora extra pendente" },
  { key: "atestado_pendente", label: "Atestado pendente" },
  { key: "bh_expirar",        label: "Banco de horas expirando" },
  { key: "fraude",            label: "Alertas de fraude" },
] as const;

const CANAIS: { key: Canal; label: string; icon: any }[] = [
  { key: "push", label: "Push", icon: Bell },
  { key: "email", label: "E-mail", icon: Mail },
  { key: "sms", label: "SMS", icon: Smartphone },
  { key: "whatsapp", label: "WhatsApp", icon: MessageSquare },
];

const DEFAULTS: any = {
  push_ativo: true, email_ativo: true, sms_ativo: false, whatsapp_ativo: false,
  notif_atraso: true, notif_falta: true, notif_he_pendente: true,
  notif_atestado_pendente: true, notif_banco_horas_expirar: true, notif_fraude: true,
  notificar_funcionario: true,
  dias_aviso_expiracao: 15,
  destinatarios_emails: [], destinatarios_telefones: [],
  escalonamento_ativo: false, escalonamento_horas: 24,
  escalonamento_telefones: [], escalonamento_emails: [],
  quiet_hours_inicio: "22:00", quiet_hours_fim: "07:00",
  enviar_fins_de_semana: true, bypass_quiet_hours_tipos: ["fraude"],
  dedupe_janela_horas: 6, rate_limit_por_hora: 200,
  resumo_diario_ativo: false, resumo_diario_hora: "08:00", resumo_canal: "whatsapp",
  whatsapp_permite_confirmacao: true,
  webhook_url: "",
  canais_por_evento: {
    atraso: ["push"], falta: ["push","email"], he_pendente: ["push","email"],
    atestado_pendente: ["push"], bh_expirar: ["push","email"], fraude: ["push","email","whatsapp"],
  },
  mensagens_template: {
    atraso: "⏰ Atraso registrado em {data}.",
    falta: "🚨 Falta registrada em {data}.",
    he_pendente: "⌛ Você tem {quantidade} hora(s) extra pendente(s).",
    atestado_pendente: "📄 Atestado(s) pendente(s): {quantidade}.",
    bh_expirar: "🕐 Banco de horas vence em {data_expiracao}.",
    fraude: "🛑 Alerta de fraude: {detalhe}.",
  },
  mensagens_template_lider: {
    atraso: "⏰ {funcionario} atrasou em {data}.",
    falta: "🚨 {funcionario} faltou em {data}. {link_aprovacao}",
    he_pendente: "⌛ {funcionario} tem {quantidade} HE pendente(s). {link_aprovacao}",
    atestado_pendente: "📄 {quantidade} atestado(s) para validar. {link_aprovacao}",
    bh_expirar: "🕐 BH de {funcionario} vence em {data_expiracao}.",
    fraude: "🛑 Fraude: {detalhe} — {funcionario}. {link_aprovacao}",
  },
};

export default function PontoNotificacoes() {
  const [cfg, setCfg] = useState<any>({ ...DEFAULTS });
  const [estId, setEstId] = useState<string | null>(null);
  const [emails, setEmails] = useState("");
  const [telefones, setTelefones] = useState("");
  const [escTelefones, setEscTelefones] = useState("");
  const [escEmails, setEscEmails] = useState("");
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
            mensagens_template_lider: { ...DEFAULTS.mensagens_template_lider, ...(data.mensagens_template_lider || {}) },
          });
          setEmails((data.destinatarios_emails || []).join(", "));
          setTelefones((data.destinatarios_telefones || []).join(", "));
          setEscTelefones((data.escalonamento_telefones || []).join(", "));
          setEscEmails((data.escalonamento_emails || []).join(", "));
        }
      }
    })();
  }, []);

  const toggleCanalEvento = (evento: string, canal: string) => {
    const atual: string[] = cfg.canais_por_evento?.[evento] ?? [];
    const novo = atual.includes(canal) ? atual.filter(c => c !== canal) : [...atual, canal];
    setCfg({ ...cfg, canais_por_evento: { ...cfg.canais_por_evento, [evento]: novo } });
  };

  const salvar = async () => {
    if (!estId) return;
    const parse = (s: string) => s.split(",").map(x => x.trim()).filter(Boolean);
    const payload: any = {
      ...cfg, estabelecimento_id: estId,
      destinatarios_emails: parse(emails),
      destinatarios_telefones: parse(telefones),
      escalonamento_telefones: parse(escTelefones),
      escalonamento_emails: parse(escEmails),
    };
    delete payload.id; delete payload.created_at; delete payload.updated_at;
    const { error } = await supabase.from("ponto_notificacoes_config")
      .upsert(payload, { onConflict: "estabelecimento_id" });
    if (error) return toast.error(error.message);
    toast.success("Configuração salva");
  };

  const testar = async (canal: Canal) => {
    if (!estId) return;
    try {
      const { data, error } = await supabase.functions.invoke("ponto-notificar-canal", {
        body: {
          estabelecimento_id: estId, tipo: "fraude", canais: [canal],
          titulo: "Teste do Ponto",
          mensagem: `Teste do canal ${canal.toUpperCase()}.`,
          forcar: true,
          dados: { funcionario: "Teste", data: new Date().toLocaleDateString("pt-BR"), detalhe: "Envio manual" },
        },
      });
      if (error) throw error;
      const ok = (data?.resultados || []).some((r: any) => r.canal === canal && r.ok);
      ok ? toast.success(`Teste ${canal.toUpperCase()} enviado`) : toast.error(`Falha em ${canal}: ${JSON.stringify(data)}`);
    } catch (e: any) { toast.error(e.message || String(e)); }
  };

  const dispararResumo = async () => {
    if (!estId) return;
    const { data, error } = await supabase.functions.invoke("ponto-notificar-resumo", {
      body: { estabelecimento_id: estId },
    });
    if (error) return toast.error(error.message);
    toast.success(`Resumo enviado para ${data?.enviados ?? 0} destinatários`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Bell className="w-6 h-6" /> Notificações do Ponto</h1>
          <p className="text-muted-foreground text-sm">
            Push, E-mail, SMS e WhatsApp com escalonamento, quiet hours, dedupe e confirmação.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/ponto/notificacoes/entregabilidade"><BarChart3 className="w-4 h-4 mr-2" />Dashboard</Link></Button>
          <Button onClick={salvar}><Save className="w-4 h-4 mr-2" />Salvar</Button>
        </div>
      </div>

      <Tabs defaultValue="canais">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="canais">Canais & Destinatários</TabsTrigger>
          <TabsTrigger value="matriz">Eventos × Canais</TabsTrigger>
          <TabsTrigger value="regras">Regras & Limites</TabsTrigger>
          <TabsTrigger value="escalonamento">Escalonamento</TabsTrigger>
          <TabsTrigger value="resumo">Resumo & Confirmação</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="testar">Testar</TabsTrigger>
        </TabsList>

        <TabsContent value="canais" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Canais habilitados</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {CANAIS.map(({ key, label, icon: Icon }) => (
                <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2"><Icon className="w-4 h-4" /><Label>{label}</Label></div>
                  <Switch checked={!!cfg[`${key}_ativo`]}
                    onCheckedChange={(c) => setCfg({ ...cfg, [`${key}_ativo`]: c })} />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Destinatários</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Notificar o próprio funcionário</Label>
                  <p className="text-xs text-muted-foreground">Usa telefone/e-mail do cadastro do funcionário.</p>
                </div>
                <Switch checked={!!cfg.notificar_funcionario}
                  onCheckedChange={(c) => setCfg({ ...cfg, notificar_funcionario: c })} />
              </div>
              <div><Label>E-mails de líderes</Label><Input value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="rh@empresa.com, gestor@empresa.com" /></div>
              <div><Label>Telefones de líderes (com DDD)</Label><Input value={telefones} onChange={(e) => setTelefones(e.target.value)} placeholder="11999998888, 11977776666" /></div>
              <div><Label>Webhook</Label><Input value={cfg.webhook_url || ""} onChange={(e) => setCfg({ ...cfg, webhook_url: e.target.value })} placeholder="https://..." /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matriz">
          <Card>
            <CardHeader>
              <CardTitle>Eventos × Canais</CardTitle>
              <p className="text-xs text-muted-foreground">Marque quais canais disparam para cada tipo.</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b">
                    <th className="text-left p-2">Ativo</th><th className="text-left p-2">Evento</th>
                    {CANAIS.map(c => <th key={c.key} className="text-center p-2">{c.label}</th>)}
                  </tr></thead>
                  <tbody>
                    {EVENTOS.map(ev => {
                      const flagKey = ev.key === "atestado_pendente" ? "notif_atestado_pendente"
                        : ev.key === "bh_expirar" ? "notif_banco_horas_expirar" : `notif_${ev.key}`;
                      return (
                        <tr key={ev.key} className="border-b">
                          <td className="p-2"><Switch checked={!!cfg[flagKey]}
                            onCheckedChange={(c) => setCfg({ ...cfg, [flagKey]: c })} /></td>
                          <td className="p-2">{ev.label}</td>
                          {CANAIS.map(c => {
                            const on = (cfg.canais_por_evento?.[ev.key] ?? []).includes(c.key);
                            return <td key={c.key} className="text-center p-2">
                              <Checkbox checked={on} onCheckedChange={() => toggleCanalEvento(ev.key, c.key)} /></td>;
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 max-w-[240px]">
                <Label>Dias de aviso — vencimento BH</Label>
                <Input type="number" value={cfg.dias_aviso_expiracao ?? 15}
                  onChange={(e) => setCfg({ ...cfg, dias_aviso_expiracao: parseInt(e.target.value || "15") })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regras">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5" />Horário permitido (quiet hours)</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Início do silêncio</Label><Input type="time" value={cfg.quiet_hours_inicio || ""}
                onChange={(e) => setCfg({ ...cfg, quiet_hours_inicio: e.target.value })} /></div>
              <div><Label>Fim do silêncio</Label><Input type="time" value={cfg.quiet_hours_fim || ""}
                onChange={(e) => setCfg({ ...cfg, quiet_hours_fim: e.target.value })} /></div>
              <div className="flex items-center justify-between md:col-span-2">
                <Label>Enviar aos fins de semana</Label>
                <Switch checked={!!cfg.enviar_fins_de_semana}
                  onCheckedChange={(c) => setCfg({ ...cfg, enviar_fins_de_semana: c })} />
              </div>
              <div className="md:col-span-2">
                <Label>Tipos que ignoram quiet hours / fim de semana</Label>
                <div className="flex flex-wrap gap-3 mt-2">
                  {EVENTOS.map(ev => {
                    const on = (cfg.bypass_quiet_hours_tipos ?? []).includes(ev.key);
                    return (
                      <label key={ev.key} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={on} onCheckedChange={() => {
                          const arr = cfg.bypass_quiet_hours_tipos ?? [];
                          setCfg({ ...cfg, bypass_quiet_hours_tipos: on ? arr.filter((x: string) => x !== ev.key) : [...arr, ev.key] });
                        }} /> {ev.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader><CardTitle className="flex items-center gap-2"><Gauge className="w-5 h-5" />Anti-spam & Rate limit</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Deduplicação — janela em horas</Label>
                <Input type="number" value={cfg.dedupe_janela_horas ?? 6}
                  onChange={(e) => setCfg({ ...cfg, dedupe_janela_horas: parseInt(e.target.value || "0") })} />
                <p className="text-xs text-muted-foreground mt-1">
                  Não repete a mesma notificação (tipo+funcionário+dia) dentro dessa janela.
                </p>
              </div>
              <div>
                <Label>Rate limit — envios/hora por estabelecimento</Label>
                <Input type="number" value={cfg.rate_limit_por_hora ?? 200}
                  onChange={(e) => setCfg({ ...cfg, rate_limit_por_hora: parseInt(e.target.value || "0") })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="escalonamento">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ArrowUpRight className="w-5 h-5" />Escalonamento automático</CardTitle>
              <p className="text-xs text-muted-foreground">
                Se HE/atestado/fraude não for confirmado no prazo, dispara pro gestor de escalonamento.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Ativar escalonamento</Label>
                <Switch checked={!!cfg.escalonamento_ativo}
                  onCheckedChange={(c) => setCfg({ ...cfg, escalonamento_ativo: c })} />
              </div>
              <div className="max-w-[240px]">
                <Label>Horas até escalar</Label>
                <Input type="number" value={cfg.escalonamento_horas ?? 24}
                  onChange={(e) => setCfg({ ...cfg, escalonamento_horas: parseInt(e.target.value || "24") })} />
              </div>
              <div><Label>Telefones de escalonamento (WhatsApp/SMS)</Label>
                <Input value={escTelefones} onChange={(e) => setEscTelefones(e.target.value)} placeholder="11999998888, 11977776666" /></div>
              <div><Label>E-mails de escalonamento</Label>
                <Input value={escEmails} onChange={(e) => setEscEmails(e.target.value)} placeholder="diretor@empresa.com" /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resumo">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Repeat className="w-5 h-5" />Resumo diário</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enviar resumo diário</Label>
                  <p className="text-xs text-muted-foreground">1 mensagem/dia com totais (faltas, HE, atestados, fraudes).</p>
                </div>
                <Switch checked={!!cfg.resumo_diario_ativo}
                  onCheckedChange={(c) => setCfg({ ...cfg, resumo_diario_ativo: c })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Horário</Label><Input type="time" value={cfg.resumo_diario_hora || "08:00"}
                  onChange={(e) => setCfg({ ...cfg, resumo_diario_hora: e.target.value })} /></div>
                <div>
                  <Label>Canal</Label>
                  <select className="w-full border rounded-md h-10 px-2 bg-background"
                    value={cfg.resumo_canal || "whatsapp"}
                    onChange={(e) => setCfg({ ...cfg, resumo_canal: e.target.value })}>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">E-mail</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={dispararResumo}>
                <Send className="w-4 h-4 mr-2" />Enviar resumo agora
              </Button>
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader><CardTitle>Confirmação por WhatsApp</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <Label>Aceitar confirmação por resposta (OK, CIENTE, APROVAR)</Label>
                <p className="text-xs text-muted-foreground">Marca a notificação como confirmada quando o destinatário responde.</p>
              </div>
              <Switch checked={!!cfg.whatsapp_permite_confirmacao}
                onCheckedChange={(c) => setCfg({ ...cfg, whatsapp_permite_confirmacao: c })} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Mensagens</CardTitle>
              <p className="text-xs text-muted-foreground">
                Variáveis: <code>{"{funcionario}"}</code> <code>{"{data}"}</code> <code>{"{quantidade}"}</code>{" "}
                <code>{"{data_expiracao}"}</code> <code>{"{detalhe}"}</code> <code>{"{link_aprovacao}"}</code>{" "}
                <code>{"{saldo_bh}"}</code> <code>{"{gestor}"}</code>
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {EVENTOS.map(ev => (
                <div key={ev.key} className="grid md:grid-cols-2 gap-3 border-b pb-3">
                  <div>
                    <Label className="text-xs">{ev.label} — para funcionário</Label>
                    <Textarea rows={2} value={cfg.mensagens_template?.[ev.key] ?? ""}
                      onChange={(e) => setCfg({ ...cfg,
                        mensagens_template: { ...cfg.mensagens_template, [ev.key]: e.target.value } })} />
                  </div>
                  <div>
                    <Label className="text-xs">{ev.label} — para líder/gestor</Label>
                    <Textarea rows={2} value={cfg.mensagens_template_lider?.[ev.key] ?? ""}
                      onChange={(e) => setCfg({ ...cfg,
                        mensagens_template_lider: { ...cfg.mensagens_template_lider, [ev.key]: e.target.value } })} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testar">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><TestTube2 className="w-5 h-5" />Testar envios</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Telefone para teste (opcional)</Label>
                <Input value={testTel} onChange={(e) => setTestTel(e.target.value)} placeholder="11999998888" /></div>
              <div className="flex flex-wrap gap-2">
                {CANAIS.map(({ key, label, icon: Icon }) => (
                  <Button key={key} variant="outline" size="sm" onClick={() => testar(key)}>
                    <Icon className="w-4 h-4 mr-2" />Testar {label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Testes usam o template do evento "fraude" e ignoram quiet hours/rate limit.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={salvar} size="lg"><Save className="w-4 h-4 mr-2" />Salvar configuração</Button>
      </div>
    </div>
  );
}
