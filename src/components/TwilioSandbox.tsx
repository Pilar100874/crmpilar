import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Smartphone, Copy, CheckCircle, AlertCircle, Info, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const TwilioSandbox = () => {
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [sandboxNumber, setSandboxNumber] = useState("");
  const [copied, setCopied] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const webhookUrl = "https://kiuztueouxtyqiecgdxk.supabase.co/functions/v1/whatsapp-webhook";

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("twilio_config")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAccountSid(data.account_sid || "");
        setAuthToken(data.auth_token || "");
        setSandboxNumber(data.sandbox_number || "");
      }
    } catch (error) {
      console.error("Error loading config:", error);
    }
  };

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    toast.success("Copiado!");
    setTimeout(() => setCopied(""), 2000);
  };

  const handleSaveConfig = async () => {
    if (!accountSid || !authToken) {
      toast.error("Preencha Account SID e Auth Token");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("twilio_config")
        .upsert({
          id: 1,
          account_sid: accountSid,
          auth_token: authToken,
          sandbox_number: sandboxNumber,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success("Credenciais salvas com sucesso!");
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Erro ao salvar credenciais");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 pb-4">
      {/* Instructions */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900 text-xs">
          <strong className="block mb-1.5">🚀 Passos para usar (100% Gratuito):</strong>
          <ol className="list-decimal list-inside space-y-0.5 text-xs">
            <li>Crie conta no Twilio (sem cartão)</li>
            <li>Acesse WhatsApp Sandbox no painel</li>
            <li>Envie mensagem de ativação</li>
            <li>Configure webhook abaixo</li>
            <li>Teste enviando mensagens!</li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* Daily Limit Warning */}
      <Alert className="bg-yellow-50 border-yellow-200">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-900 text-xs">
          <strong className="block mb-1.5">⚠️ Limite Diário do Sandbox:</strong>
          <p className="text-xs">
            A conta atingiu o limite de 9 mensagens diárias. O sandbox gratuito possui essa restrição.
            Para enviar mais mensagens, aguarde 24 horas ou faça upgrade para uma conta Twilio paga.
          </p>
        </AlertDescription>
      </Alert>

      {/* Create Account Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ExternalLink className="w-4 h-4 text-green-600" />
            1. Criar Conta Gratuita no Twilio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <a
            href="https://www.twilio.com/try-twilio"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white text-sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              Criar Conta no Twilio
            </Button>
          </a>
          <p className="text-xs text-muted-foreground">
            💡 Acesse: <strong>Messaging → Try it out → Send WhatsApp</strong>
          </p>
        </CardContent>
      </Card>

      {/* Activation Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Smartphone className="w-4 h-4 text-green-600" />
            2. Ativar Sandbox no WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-3 h-3 text-green-600" />
            <AlertDescription className="text-green-900 text-xs">
              Escaneie o QR code no Twilio e envie a mensagem. Você receberá confirmação!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Credentials Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Info className="w-4 h-4 text-blue-600" />
            3. Credenciais (Opcional)
          </CardTitle>
          <CardDescription className="text-xs">
            Para automação avançada - não obrigatório
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Account SID</Label>
            <Input
              type="text"
              placeholder="ACxxxxxxxx..."
              value={accountSid}
              onChange={(e) => setAccountSid(e.target.value)}
              className="font-mono text-xs h-8"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Auth Token</Label>
            <Input
              type="password"
              placeholder="••••••••••"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              className="font-mono text-xs h-8"
            />
          </div>

          <Button
            onClick={handleSaveConfig}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm h-8"
          >
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </CardContent>
      </Card>

      {/* Webhook Configuration Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-orange-600" />
            4. Configurar Webhook
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-1.5">
            <Label className="text-xs">URL do Webhook</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={webhookUrl}
                className="font-mono text-xs h-8"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(webhookUrl, "webhook")}
                className="flex-shrink-0 h-8 w-8"
              >
                {copied === "webhook" ? (
                  <CheckCircle className="w-3 h-3 text-green-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            </div>
          </div>

          <Alert className="bg-orange-50 border-orange-200">
            <AlertCircle className="h-3 w-3 text-orange-600" />
            <AlertDescription className="text-orange-900 text-xs">
              Cole em: <strong>Messaging → Sandbox settings → "When a message comes in"</strong>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Testing Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-600" />
            5. Testar o Bot!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-3 w-3 text-green-600" />
            <AlertDescription className="text-green-900 text-xs">
              <strong className="block mb-1">✅ Pronto!</strong>
              Envie mensagens para o sandbox e veja o bot respondendo!
            </AlertDescription>
          </Alert>

          <div className="space-y-1.5">
            <Label className="text-xs">Número Sandbox (lembrete)</Label>
            <Input
              type="text"
              placeholder="+1 415 523 8886"
              value={sandboxNumber}
              onChange={(e) => setSandboxNumber(e.target.value)}
              className="text-xs h-8"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};