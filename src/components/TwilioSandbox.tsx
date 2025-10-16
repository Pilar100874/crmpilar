import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Smartphone, Copy, CheckCircle, AlertCircle, Info, ExternalLink } from "lucide-react";

export const TwilioSandbox = () => {
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [sandboxNumber, setSandboxNumber] = useState("");
  const [copied, setCopied] = useState<string>("");

  const webhookUrl = "https://kiuztueouxtyqiecgdxk.supabase.co/functions/v1/whatsapp-webhook";

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    toast.success("Copiado!");
    setTimeout(() => setCopied(""), 2000);
  };

  const handleSaveConfig = () => {
    if (!accountSid || !authToken) {
      toast.error("Preencha Account SID e Auth Token");
      return;
    }
    toast.success("Configuração salva! Configure o webhook no Twilio agora.");
  };

  return (
    <div className="space-y-3 pb-4">
      {/* Instructions */}
      <Alert className="bg-blue-950/30 border-blue-800/50">
        <Info className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-blue-200 text-xs">
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

      {/* Create Account Card */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <ExternalLink className="w-4 h-4 text-green-400" />
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
          <p className="text-xs text-slate-400">
            💡 Acesse: <strong>Messaging → Try it out → Send WhatsApp</strong>
          </p>
        </CardContent>
      </Card>

      {/* Activation Card */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <Smartphone className="w-4 h-4 text-green-400" />
            2. Ativar Sandbox no WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-green-950/30 border-green-800/50">
            <CheckCircle className="h-3 h-3 text-green-400" />
            <AlertDescription className="text-green-200 text-xs">
              Escaneie o QR code no Twilio e envie a mensagem. Você receberá confirmação!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Credentials Card */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <Info className="w-4 h-4 text-blue-400" />
            3. Credenciais (Opcional)
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Para automação avançada - não obrigatório
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Account SID</Label>
            <Input
              type="text"
              placeholder="ACxxxxxxxx..."
              value={accountSid}
              onChange={(e) => setAccountSid(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white font-mono text-xs h-8"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Auth Token</Label>
            <Input
              type="password"
              placeholder="••••••••••"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white font-mono text-xs h-8"
            />
          </div>

          <Button
            onClick={handleSaveConfig}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm h-8"
          >
            Salvar
          </Button>
        </CardContent>
      </Card>

      {/* Webhook Configuration Card */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <AlertCircle className="w-4 h-4 text-orange-400" />
            4. Configurar Webhook
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">URL do Webhook</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={webhookUrl}
                className="bg-slate-900 border-slate-700 text-slate-300 font-mono text-xs h-8"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(webhookUrl, "webhook")}
                className="flex-shrink-0 h-8 w-8 bg-slate-700 border-slate-600 hover:bg-slate-600"
              >
                {copied === "webhook" ? (
                  <CheckCircle className="w-3 h-3 text-green-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            </div>
          </div>

          <Alert className="bg-orange-950/30 border-orange-800/50">
            <AlertCircle className="h-3 w-3 text-orange-400" />
            <AlertDescription className="text-orange-200 text-xs">
              Cole em: <strong>Messaging → Sandbox settings → "When a message comes in"</strong>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Testing Card */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-white text-sm">
            <CheckCircle className="w-4 h-4 text-green-400" />
            5. Testar o Bot!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Alert className="bg-green-950/30 border-green-800/50">
            <CheckCircle className="h-3 w-3 text-green-400" />
            <AlertDescription className="text-green-200 text-xs">
              <strong className="block mb-1">✅ Pronto!</strong>
              Envie mensagens para o sandbox e veja o bot respondendo!
            </AlertDescription>
          </Alert>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Número Sandbox (lembrete)</Label>
            <Input
              type="text"
              placeholder="+1 415 523 8886"
              value={sandboxNumber}
              onChange={(e) => setSandboxNumber(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white text-xs h-8"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};