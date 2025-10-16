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
    <div className="space-y-4">
      {/* Instructions */}
      <Alert className="bg-blue-950/30 border-blue-800/50">
        <Info className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-blue-200 text-sm">
          <strong className="block mb-2">🚀 Como usar o Twilio Sandbox (100% Gratuito):</strong>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Crie uma conta gratuita no Twilio (não precisa cartão de crédito)</li>
            <li>Acesse o WhatsApp Sandbox no painel do Twilio</li>
            <li>Envie a mensagem de ativação para o número sandbox deles</li>
            <li>Configure as credenciais abaixo</li>
            <li>Cole o webhook URL no Twilio</li>
            <li>Pronto! Teste enviando mensagens para o número sandbox</li>
          </ol>
        </AlertDescription>
      </Alert>

      {/* Create Account Card */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-base">
            <ExternalLink className="w-5 h-5 text-green-400" />
            1. Criar Conta Gratuita no Twilio
          </CardTitle>
          <CardDescription className="text-slate-400">
            Primeiro passo: criar sua conta gratuita
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <a
            href="https://www.twilio.com/try-twilio"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white">
              <ExternalLink className="w-4 h-4 mr-2" />
              Criar Conta Gratuita no Twilio
            </Button>
          </a>
          <p className="text-xs text-slate-400">
            💡 Após criar a conta, acesse: <strong>Messaging → Try it out → Send a WhatsApp message</strong>
          </p>
        </CardContent>
      </Card>

      {/* Activation Card */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-base">
            <Smartphone className="w-5 h-5 text-green-400" />
            2. Ativar Sandbox no seu WhatsApp
          </CardTitle>
          <CardDescription className="text-slate-400">
            Escaneie o QR code no painel do Twilio e envie a mensagem de ativação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert className="bg-green-950/30 border-green-800/50">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-200 text-xs">
              Você receberá uma confirmação assim que o sandbox estiver ativo!
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Credentials Card */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-base">
            <Info className="w-5 h-5 text-blue-400" />
            3. Credenciais do Twilio (Opcional)
          </CardTitle>
          <CardDescription className="text-slate-400">
            Para automação avançada (não obrigatório para testes)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label className="text-slate-300 text-xs">Account SID</Label>
            <Input
              type="text"
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={accountSid}
              onChange={(e) => setAccountSid(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300 text-xs">Auth Token</Label>
            <Input
              type="password"
              placeholder="••••••••••••••••••••••••••••••••"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white font-mono text-xs"
            />
          </div>

          <Button
            onClick={handleSaveConfig}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Salvar Credenciais
          </Button>

          <p className="text-xs text-slate-400">
            💡 Encontre no painel do Twilio: <strong>Account Info → Account SID e Auth Token</strong>
          </p>
        </CardContent>
      </Card>

      {/* Webhook Configuration Card */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-base">
            <AlertCircle className="w-5 h-5 text-orange-400" />
            4. Configurar Webhook no Twilio
          </CardTitle>
          <CardDescription className="text-slate-400">
            Cole esta URL no campo "When a message comes in"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label className="text-slate-300 text-xs">URL do Webhook</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={webhookUrl}
                className="bg-slate-900 border-slate-700 text-slate-300 font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopy(webhookUrl, "webhook")}
                className="flex-shrink-0 bg-slate-700 border-slate-600 hover:bg-slate-600"
              >
                {copied === "webhook" ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <Alert className="bg-orange-950/30 border-orange-800/50">
            <AlertCircle className="h-4 w-4 text-orange-400" />
            <AlertDescription className="text-orange-200 text-xs">
              <strong>Importante:</strong> No Twilio, vá em <strong>Messaging → Try it out → Sandbox settings</strong> e cole a URL acima no campo "When a message comes in".
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Testing Card */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white text-base">
            <CheckCircle className="w-5 h-5 text-green-400" />
            5. Testar o Bot!
          </CardTitle>
          <CardDescription className="text-slate-400">
            Agora é só enviar mensagens e testar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert className="bg-green-950/30 border-green-800/50">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-200 text-xs">
              <strong className="block mb-2">✅ Tudo pronto!</strong>
              Agora envie mensagens para o número sandbox do Twilio e veja seu bot respondendo automaticamente!
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label className="text-slate-300 text-xs">Número Sandbox (opcional - para lembrar)</Label>
            <Input
              type="text"
              placeholder="+1 415 523 8886"
              value={sandboxNumber}
              onChange={(e) => setSandboxNumber(e.target.value)}
              className="bg-slate-900 border-slate-700 text-white"
            />
            <p className="text-xs text-slate-400">
              O número do sandbox está no painel do Twilio
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};