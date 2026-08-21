import { useEffect, useState } from "react";
import { AppLayout } from "@/components/operacional-hub/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Settings as SettingsIcon, 
  Webhook, 
  Calendar,
  AlertTriangle,
  Loader2,
  Play,
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [autoGenerateTasks, setAutoGenerateTasks] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [checking, setChecking] = useState(false);
  const { toast } = useToast();

  const handleGenerateTasks = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-daily-tasks");
      
      if (error) throw error;
      
      toast({
        title: "Tarefas geradas!",
        description: data.message,
      });
    } catch (error) {
      console.error("Error generating tasks:", error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar as tarefas",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleCheckDelayed = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-delayed-tasks");
      
      if (error) throw error;
      
      toast({
        title: "Verificação concluída!",
        description: data.message,
      });
    } catch (error) {
      console.error("Error checking delayed tasks:", error);
      toast({
        title: "Erro",
        description: "Não foi possível verificar tarefas atrasadas",
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl) {
      toast({
        title: "URL obrigatória",
        description: "Insira a URL do webhook",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-alert-webhook", {
        body: {
          type: "test",
          message: "Teste de integração do Centro de Controle Operacional",
          severity: "info",
          webhookUrl,
          data: { test: true, timestamp: new Date().toISOString() },
        },
      });
      
      if (error) throw error;
      
      toast({
        title: "Webhook enviado!",
        description: "Verifique se recebeu a notificação no n8n",
      });
    } catch (error) {
      console.error("Error testing webhook:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o webhook",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-[26px] font-semibold tracking-tight">Configurações</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Configure automações e integrações
          </p>
        </div>

        {/* Automação de Tarefas */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Geração Automática de Tarefas</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Gera automaticamente as tarefas do dia com base na frequência configurada nos templates (diária, semanal, mensal).
          </p>
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted mb-4">
            <div>
              <p className="font-medium">Geração automática</p>
              <p className="text-sm text-muted-foreground">
                Ativar geração de tarefas no início do dia
              </p>
            </div>
            <Switch
              checked={autoGenerateTasks}
              onCheckedChange={setAutoGenerateTasks}
            />
          </div>
          <Button onClick={handleGenerateTasks} disabled={generating} className="w-full gap-2">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Gerar Tarefas de Hoje Agora
              </>
            )}
          </Button>
        </div>

        {/* Verificação de Atrasos */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <h3 className="text-lg font-semibold">Verificação de Atrasos</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Verifica tarefas pendentes e materiais críticos, marcando como atrasado e criando alertas.
          </p>
          <Button onClick={handleCheckDelayed} disabled={checking} variant="outline" className="w-full gap-2">
            {checking ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Verificar Atrasos Agora
              </>
            )}
          </Button>
        </div>

        {/* Webhook n8n */}
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Webhook className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Integração n8n / WhatsApp</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Configure uma URL de webhook do n8n para receber alertas e enviar notificações via WhatsApp, email ou outras plataformas.
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>URL do Webhook (n8n)</Label>
              <Input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://seu-n8n.com/webhook/..."
              />
              <p className="text-xs text-muted-foreground">
                Crie um workflow no n8n com trigger "Webhook" e cole a URL aqui
              </p>
            </div>
            <Button onClick={handleTestWebhook} disabled={saving} variant="outline" className="w-full gap-2">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Webhook className="h-4 w-4" />
                  Testar Webhook
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm">
            <strong>Dica:</strong> Para automação completa, configure um cron job no n8n para chamar as funções{" "}
            <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">generate-daily-tasks</code> às 6h e{" "}
            <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">check-delayed-tasks</code> às 18h.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
