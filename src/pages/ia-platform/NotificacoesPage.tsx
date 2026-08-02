import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Bell } from "lucide-react";
import { toast } from "sonner";
import { db, useEstabelecimento } from "@/lib/aip/db";
import { useAipNotificacoes } from "@/hooks/useAipNotificacoes";

interface Config {
  ui_ativo: boolean;
  webhook_url: string;
  emails: string;
  notificar_inicio: boolean;
  notificar_fim: boolean;
  notificar_aprovacao: boolean;
}

const PADRAO: Config = {
  ui_ativo: true,
  webhook_url: "",
  emails: "",
  notificar_inicio: true,
  notificar_fim: true,
  notificar_aprovacao: true,
};

export default function NotificacoesPage() {
  const estabelecimentoId = useEstabelecimento();
  const [config, setConfig] = useState<Config>(PADRAO);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const { notificacoes, naoLidas, marcarTodasLidas } = useAipNotificacoes({ toasts: false });

  useEffect(() => {
    if (!estabelecimentoId) return;
    (async () => {
      const { data } = await db
        .from("aip_notification_settings")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .maybeSingle();
      if (data) {
        setConfig({
          ui_ativo: data.ui_ativo,
          webhook_url: data.webhook_url ?? "",
          emails: (data.emails ?? []).join("\n"),
          notificar_inicio: data.notificar_inicio,
          notificar_fim: data.notificar_fim,
          notificar_aprovacao: data.notificar_aprovacao,
        });
      }
      setCarregando(false);
    })();
  }, [estabelecimentoId]);

  const salvar = async () => {
    if (!estabelecimentoId) return;
    setSalvando(true);
    const emails = config.emails
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const invalido = emails.find((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (invalido) {
      toast.error(`E-mail inválido: ${invalido}`);
      setSalvando(false);
      return;
    }
    const { error } = await db.from("aip_notification_settings").upsert(
      {
        estabelecimento_id: estabelecimentoId,
        ui_ativo: config.ui_ativo,
        webhook_url: config.webhook_url.trim() || null,
        emails,
        notificar_inicio: config.notificar_inicio,
        notificar_fim: config.notificar_fim,
        notificar_aprovacao: config.notificar_aprovacao,
      },
      { onConflict: "estabelecimento_id" },
    );
    setSalvando(false);
    if (error) toast.error("Erro ao salvar: " + error.message);
    else toast.success("Configuração de notificações salva");
  };

  if (carregando) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-semibold">Notificações</h1>
        <p className="text-sm text-muted-foreground">
          Avisos em tempo real, e-mail e webhook para execuções e aprovações humanas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Eventos</CardTitle>
          <CardDescription>Escolha o que deve gerar notificação.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { k: "notificar_inicio" as const, l: "Início de execução" },
            { k: "notificar_fim" as const, l: "Fim de execução (concluída, erro ou cancelada)" },
            { k: "notificar_aprovacao" as const, l: "Human Approval pendente" },
            { k: "ui_ativo" as const, l: "Mostrar avisos na tela (tempo real)" },
          ].map((item) => (
            <div key={item.k} className="flex items-center justify-between gap-4">
              <Label htmlFor={item.k}>{item.l}</Label>
              <Switch
                id={item.k}
                checked={config[item.k]}
                onCheckedChange={(v) => setConfig((c) => ({ ...c, [item.k]: v }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entrega externa</CardTitle>
          <CardDescription>Webhook e destinatários de e-mail.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webhook">URL do webhook</Label>
            <Input
              id="webhook"
              placeholder="https://exemplo.com/hooks/agentes-ia"
              value={config.webhook_url}
              onChange={(e) => setConfig((c) => ({ ...c, webhook_url: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Enviamos um POST em JSON com evento, título, mensagem e IDs de execução/aprovação.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="emails">E-mails (um por linha)</Label>
            <Textarea
              id="emails"
              rows={3}
              placeholder="operacoes@empresa.com"
              value={config.emails}
              onChange={(e) => setConfig((c) => ({ ...c, emails: e.target.value }))}
            />
          </div>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" /> Últimas notificações
              {naoLidas > 0 && <Badge variant="secondary">{naoLidas} não lidas</Badge>}
            </CardTitle>
            <CardDescription>Atualiza automaticamente em tempo real.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={marcarTodasLidas} disabled={naoLidas === 0}>
            Marcar todas lidas
          </Button>
        </CardHeader>
        <CardContent>
          {notificacoes.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma notificação ainda.</p>
          ) : (
            <ul className="divide-y divide-border">
              {notificacoes.map((n) => (
                <li key={n.id} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{n.titulo}</p>
                    {n.mensagem && <p className="text-xs text-muted-foreground">{n.mensagem}</p>}
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("pt-BR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
