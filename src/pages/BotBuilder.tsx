import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Settings } from "lucide-react";
import { toast } from "sonner";

export default function BotBuilder() {
  const [flowBuilderUrl, setFlowBuilderUrl] = useState(() => {
    return localStorage.getItem("botonic-flow-builder-url") || "https://app.botonic.io";
  });
  const [inputUrl, setInputUrl] = useState(flowBuilderUrl);

  const handleUpdateUrl = () => {
    setFlowBuilderUrl(inputUrl);
    localStorage.setItem("botonic-flow-builder-url", inputUrl);
    toast.success("URL do Botonic Flow Builder atualizada!");
  };

  const handleOpenExternal = () => {
    window.open(flowBuilderUrl, "_blank");
    toast.info("Abrindo Botonic Flow Builder em nova aba");
  };

  return (
    <Layout>
      <div className="h-full flex flex-col p-6 gap-6">
        <div>
          <h2 className="text-2xl font-bold">Botonic Flow Builder</h2>
          <p className="text-muted-foreground">
            Configure e acesse o editor visual de chatbots do Botonic
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configuração
            </CardTitle>
            <CardDescription>
              Configure a URL do seu Botonic Flow Builder
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="flow-builder-url">URL do Flow Builder</Label>
              <div className="flex gap-2">
                <Input
                  id="flow-builder-url"
                  type="url"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://app.botonic.io"
                  className="flex-1"
                />
                <Button onClick={handleUpdateUrl}>
                  Atualizar
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Use https://app.botonic.io para a versão cloud ou configure sua própria instância
              </p>
            </div>

            <Button onClick={handleOpenExternal} className="w-full" size="lg">
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir Flow Builder em Nova Aba
            </Button>
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardContent className="p-0 h-full">
            <iframe
              src={flowBuilderUrl}
              className="w-full h-full min-h-[600px] border-0 rounded-lg"
              title="Botonic Flow Builder"
              allow="clipboard-read; clipboard-write"
            />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
