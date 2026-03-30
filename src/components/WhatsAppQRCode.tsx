import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "@/lib/toast-config";
import { Smartphone, RefreshCw, Copy, CheckCircle, AlertCircle, Info } from "lucide-react";

export const WhatsAppQRCode = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("Olá! Gostaria de testar o bot");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [hasActiveBot, setHasActiveBot] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      
      if (!estabelecimentoId) {
        toast.error("Não foi possível identificar o estabelecimento");
        setIsLoading(false);
        return;
      }

      // Check for active bot
      const { data: botData } = await supabase
        .from("bot_flows")
        .select("id, name, active")
        .eq("active", true)
        .eq("estabelecimento_id", estabelecimentoId)
        .maybeSingle();

      setHasActiveBot(!!botData);

      // Load WhatsApp config
      const { data: whatsappData } = await supabase
        .from("whatsapp_config")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (whatsappData?.phone_number_id) {
        // Set a placeholder - user needs to input their actual number
        setPhoneNumber("");
      }
    } catch (error) {
      console.error("Error loading config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateWhatsAppUrl = (phone: string, msg: string) => {
    if (!phone) {
      setWhatsappUrl("");
      return;
    }
    
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Validate phone number format
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      toast.error("Número inválido. Use formato internacional: 5511999999999");
      return;
    }
    
    const encodedMessage = encodeURIComponent(msg);
    const url = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    setWhatsappUrl(url);
  };

  const handleGenerateQR = () => {
    if (!phoneNumber) {
      toast.error("Digite um número de telefone");
      return;
    }

    if (!hasActiveBot) {
      toast.error("Ative um bot primeiro na página Criar Bot");
      return;
    }
    
    generateWhatsAppUrl(phoneNumber, message);
    toast.success("QR Code gerado!");
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText("https://kiuztueouxtyqiecgdxk.supabase.co/functions/v1/whatsapp-webhook");
    setCopied(true);
    toast.success("URL copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText("conversa_botique_verify");
    toast.success("Token copiado!");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-muted-foreground">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      {/* Status Alert */}
      {!hasActiveBot && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <strong>Atenção:</strong> Nenhum bot ativo encontrado. Ative um bot na página "Criar Bot" primeiro.
          </AlertDescription>
        </Alert>
      )}

      {hasActiveBot && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            Bot ativo detectado! Você pode testar no WhatsApp.
          </AlertDescription>
        </Alert>
      )}

      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="w-5 h-5 text-blue-600" />
            1. Configure o Webhook no Facebook
          </CardTitle>
          <CardDescription>
            Primeiro, configure estas informações no Facebook Developer Console
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">URL do Webhook</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value="https://kiuztueouxtyqiecgdxk.supabase.co/functions/v1/whatsapp-webhook"
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyWebhook}
                className="flex-shrink-0"
              >
                {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Token de Verificação</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value="conversa_botique_verify"
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyToken}
                className="flex-shrink-0"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            💡 Após configurar, ative a inscrição para "messages" no painel do Facebook
          </p>
        </CardContent>
      </Card>

      {/* QR Code Generator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="w-5 h-5 text-green-600" />
            2. Gere o QR Code para Teste
          </CardTitle>
          <CardDescription>
            Use seu número do WhatsApp Business para testar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm">
              Número do WhatsApp Business
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="5511999999999"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Formato: código do país + DDD + número (sem espaços ou caracteres especiais)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm">
              Mensagem inicial
            </Label>
            <Input
              id="message"
              type="text"
              placeholder="Olá! Gostaria de testar o bot"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <Button
            onClick={handleGenerateQR}
            disabled={!hasActiveBot}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Gerar QR Code
          </Button>

          {whatsappUrl && (
            <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-lg border-2 border-green-500">
              <QRCodeSVG
                value={whatsappUrl}
                size={220}
                level="H"
                includeMargin={true}
              />
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Escaneie com a câmera do seu celular
                </p>
                <p className="text-xs text-foreground/70">
                  Ou clique no QR code se estiver no celular
                </p>
              </div>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-600 hover:text-green-700 underline"
              >
                Abrir diretamente no WhatsApp
              </a>
            </div>
          )}

          {!whatsappUrl && phoneNumber && (
            <div className="text-center text-muted-foreground text-sm py-4 bg-muted/50 rounded-lg">
              Clique em "Gerar QR Code" para criar o código
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900 text-sm">
          <strong className="block mb-2">Como testar:</strong>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Configure o webhook no Facebook Developer (Passo 1)</li>
            <li>Certifique-se de que há um bot ativo</li>
            <li>Digite seu número do WhatsApp Business</li>
            <li>Gere e escaneie o QR code</li>
            <li>Envie uma mensagem - o bot responderá automaticamente!</li>
          </ol>
        </AlertDescription>
      </Alert>
    </div>
  );
};
