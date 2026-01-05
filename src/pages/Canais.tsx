import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Phone, Globe, Send, Radio } from "lucide-react";
import { WhatsAppConfigCRUD } from "@/components/config/WhatsAppConfigCRUD";
import { TelegramConfigCRUD } from "@/components/config/TelegramConfigCRUD";
import { TwilioConfigCRUD } from "@/components/config/TwilioConfigCRUD";
import { WebchatConfigCRUD } from "@/components/config/WebchatConfigCRUD";
import { WhatsAppBusinessConfigCRUD } from "@/components/config/WhatsAppBusinessConfigCRUD";

const channelTabs = [
  {
    id: "whatsapp-waha",
    label: "WhatsApp WAHA",
    icon: MessageCircle,
    description: "Configuração do WhatsApp via WAHA API",
  },
  {
    id: "whatsapp-business",
    label: "WhatsApp Business",
    icon: MessageCircle,
    description: "Configuração do WhatsApp Business API oficial",
  },
  {
    id: "telegram",
    label: "Telegram",
    icon: Send,
    description: "Configuração do bot do Telegram",
  },
  {
    id: "twilio",
    label: "Twilio",
    icon: Phone,
    description: "Configuração do Twilio para SMS e voz",
  },
  {
    id: "webchat",
    label: "Webchat",
    icon: Globe,
    description: "Configuração do chat para website",
  },
];

export default function Canais() {
  const [activeTab, setActiveTab] = useState("whatsapp-waha");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Radio className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Canais</h1>
          <p className="text-muted-foreground">
            Configure as credenciais e integrações dos canais de atendimento
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto gap-2 bg-transparent p-0">
          {channelTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex flex-col items-center gap-2 p-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg border bg-card"
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="whatsapp-waha" className="mt-0">
            <WhatsAppConfigCRUD />
          </TabsContent>

          <TabsContent value="whatsapp-business" className="mt-0">
            <WhatsAppBusinessConfigCRUD />
          </TabsContent>

          <TabsContent value="telegram" className="mt-0">
            <TelegramConfigCRUD />
          </TabsContent>

          <TabsContent value="twilio" className="mt-0">
            <TwilioConfigCRUD />
          </TabsContent>

          <TabsContent value="webchat" className="mt-0">
            <WebchatConfigCRUD />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
