import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink } from "lucide-react";

export default function BotBuilder() {
  const [hexabotUrl, setHexabotUrl] = useState("http://localhost:8080");
  const [currentUrl, setCurrentUrl] = useState("http://localhost:8080");

  const handleUpdateUrl = () => {
    setCurrentUrl(hexabotUrl);
  };

  return (
    <Layout>
      <div className="h-full w-full flex flex-col">
        <div className="border-b bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Bot Builder</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Editor visual de fluxos de conversação com Hexabot
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={hexabotUrl}
                onChange={(e) => setHexabotUrl(e.target.value)}
                placeholder="URL do Hexabot"
                className="w-64"
              />
              <Button onClick={handleUpdateUrl} size="sm">
                Atualizar
              </Button>
              <Button
                onClick={() => window.open(currentUrl, "_blank")}
                size="sm"
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 w-full">
          <iframe
            src={currentUrl}
            className="w-full h-full border-0"
            title="Hexabot Builder"
          />
        </div>
      </div>
    </Layout>
  );
}
