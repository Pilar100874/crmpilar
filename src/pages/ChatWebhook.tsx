import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatMessage from "@/components/chat/ChatMessage";
import ChatInput from "@/components/chat/ChatInput";
import WebhookManager from "@/components/chat/WebhookManager";
import WebhookSelector from "@/components/chat/WebhookSelector";
import { Button } from "@/components/ui/button";
import { Settings, Webhook } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo_preto.png";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  contentType: "text" | "audio" | "image" | "file" | "variable";
  timestamp: Date;
  fileUrl?: string;
  fileName?: string;
  variables?: Record<string, string>;
}

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  type: string;
  createdAt: Date;
}

export interface WebhookType {
  id: string;
  name: string;
}

export default function ChatWebhook() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [webhookTypes, setWebhookTypes] = useState<WebhookType[]>([
    { id: "n8n", name: "N8N" },
    { id: "waha", name: "WAHA" },
    { id: "whatsapp", name: "WhatsApp Oficial" },
  ]);
  const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedWebhooks = localStorage.getItem("webhooks");
    const savedTypes = localStorage.getItem("webhookTypes");
    if (savedWebhooks) {
      const parsed = JSON.parse(savedWebhooks);
      setWebhooks(parsed.map((w: any) => ({ ...w, createdAt: new Date(w.createdAt) })));
    }
    if (savedTypes) {
      setWebhookTypes(JSON.parse(savedTypes));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("webhooks", JSON.stringify(webhooks));
  }, [webhooks]);

  useEffect(() => {
    localStorage.setItem("webhookTypes", JSON.stringify(webhookTypes));
  }, [webhookTypes]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const sendMessage = async (
    content: string,
    contentType: Message["contentType"],
    fileUrl?: string,
    fileName?: string,
    variables?: Record<string, string>
  ) => {
    if (!selectedWebhook) {
      toast.error("Selecione um webhook antes de enviar mensagens");
      return;
    }

    const webhook = webhooks.find((w) => w.id === selectedWebhook);
    if (!webhook) {
      toast.error("Webhook não encontrado");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      contentType,
      timestamp: new Date(),
      fileUrl,
      fileName,
      variables,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const payload = {
        timestamp: new Date().toISOString(),
        contentType,
        content,
        fileUrl,
        fileName,
        variables,
      };

      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let responseData: any;
      const responseContentType = response.headers.get("content-type");
      
      if (responseContentType?.includes("application/json")) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        throw new Error(`Webhook retornou status ${response.status}`);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: typeof responseData === "string" ? responseData : JSON.stringify(responseData, null, 2),
        contentType: "text",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      if (!responseData || (typeof responseData === "string" && !responseData.trim())) {
        toast.warning("Webhook retornou resposta vazia");
      }
    } catch (error: any) {
      toast.error(`Erro ao enviar mensagem: ${error.message}`);
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredWebhooks = selectedType
    ? webhooks.filter((w) => w.type === selectedType)
    : [];

  return (
    <Layout>
      <div className="min-h-full bg-gradient-to-br from-background to-secondary/20 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b border-border">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={logo} alt="Logo" className="h-10 w-auto" />
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                    Teste de Webhooks
                  </h1>
                  <p className="text-sm text-muted-foreground">Integração com n8n / WAHA / WhatsApp</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <WebhookSelector
                  webhooks={filteredWebhooks}
                  webhookTypes={webhookTypes}
                  selectedWebhook={selectedWebhook}
                  selectedType={selectedType}
                  onSelectWebhook={setSelectedWebhook}
                  onSelectType={setSelectedType}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsManagerOpen(true)}
                  className="hover:bg-primary/10"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 container mx-auto px-4 py-6 flex flex-col max-w-4xl">
          <Card className="flex-1 flex flex-col bg-card/50 backdrop-blur-sm border-primary/20 shadow-xl">
            <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="bg-gradient-to-br from-primary/20 to-primary-glow/20 p-6 rounded-full mb-4">
                    <Webhook className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Bem-vindo ao Chat de Webhooks</h3>
                  <p className="text-muted-foreground max-w-md">
                    Selecione um webhook e comece a testar suas integrações. Você pode enviar texto, áudio, imagens,
                    arquivos e variáveis customizadas.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 animate-fade-in">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Webhook className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded animate-pulse w-3/4"></div>
                        <div className="h-4 bg-muted rounded animate-pulse w-1/2"></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t border-border bg-card/80 backdrop-blur-sm p-4">
              <ChatInput onSendMessage={sendMessage} disabled={!selectedWebhook || isLoading} />
            </div>
          </Card>
        </div>

        {/* Webhook Manager Modal */}
        <WebhookManager
          open={isManagerOpen}
          onOpenChange={setIsManagerOpen}
          webhooks={webhooks}
          webhookTypes={webhookTypes}
          onWebhooksChange={setWebhooks}
          onWebhookTypesChange={setWebhookTypes}
        />
      </div>
    </Layout>
  );
}
