import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Smartphone, RefreshCw } from "lucide-react";

export const WhatsAppQRCode = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("Olá! Gostaria de testar o bot");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWhatsAppConfig();
  }, []);

  const loadWhatsAppConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("whatsapp_config")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;

      if (data && data.phone_number_id) {
        // Extract phone number from phone_number_id if it's in format +5511999999999
        const phone = data.phone_number_id.replace(/\D/g, '');
        setPhoneNumber(phone);
        generateWhatsAppUrl(phone, message);
      }
    } catch (error) {
      console.error("Error loading WhatsApp config:", error);
      toast.error("Configure o WhatsApp primeiro");
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
    const encodedMessage = encodeURIComponent(msg);
    const url = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    setWhatsappUrl(url);
  };

  const handleGenerateQR = () => {
    if (!phoneNumber) {
      toast.error("Digite um número de telefone");
      return;
    }
    generateWhatsAppUrl(phoneNumber, message);
    toast.success("QR Code gerado!");
  };

  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value);
    if (value) {
      generateWhatsAppUrl(value, message);
    }
  };

  const handleMessageChange = (value: string) => {
    setMessage(value);
    if (phoneNumber) {
      generateWhatsAppUrl(phoneNumber, value);
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-slate-400">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Smartphone className="w-5 h-5" />
          Testar no WhatsApp
        </CardTitle>
        <CardDescription className="text-slate-400">
          Escaneie o QR code com seu celular para iniciar uma conversa de teste
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-slate-200">
            Número do WhatsApp (com DDI)
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="5511999999999"
            value={phoneNumber}
            onChange={(e) => handlePhoneChange(e.target.value)}
            className="bg-slate-900 border-slate-700 text-white"
          />
          <p className="text-xs text-slate-500">
            Exemplo: 5511999999999 (Brasil com DDD)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message" className="text-slate-200">
            Mensagem inicial
          </Label>
          <Input
            id="message"
            type="text"
            placeholder="Olá! Gostaria de testar o bot"
            value={message}
            onChange={(e) => handleMessageChange(e.target.value)}
            className="bg-slate-900 border-slate-700 text-white"
          />
        </div>

        <Button
          onClick={handleGenerateQR}
          className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Gerar QR Code
        </Button>

        {whatsappUrl && (
          <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-lg">
            <QRCodeSVG
              value={whatsappUrl}
              size={256}
              level="H"
              includeMargin={true}
            />
            <p className="text-sm text-slate-600 text-center">
              Escaneie com a câmera do seu celular
            </p>
          </div>
        )}

        {!whatsappUrl && phoneNumber && (
          <div className="text-center text-slate-400 text-sm py-4">
            Clique em "Gerar QR Code" para criar o código
          </div>
        )}

        {!phoneNumber && (
          <div className="text-center text-amber-400 text-sm py-4 bg-amber-950/20 rounded-lg p-4">
            ⚠️ Configure um número de WhatsApp acima
          </div>
        )}
      </CardContent>
    </Card>
  );
};
