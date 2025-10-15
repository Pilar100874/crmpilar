import { useState } from 'react';
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function BotBuilder() {
  const [flowiseUrl, setFlowiseUrl] = useState(
    localStorage.getItem('flowise-url') || 'http://localhost:3000'
  );
  const [currentUrl, setCurrentUrl] = useState(flowiseUrl);

  const handleUpdateUrl = () => {
    localStorage.setItem('flowise-url', flowiseUrl);
    setCurrentUrl(flowiseUrl);
    toast.success("URL do Flowise atualizada!");
  };

  return (
    <Layout>
      <div className="h-full w-full flex flex-col">
        <div className="border-b bg-card p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Editor de Fluxos - Flowise</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Editor visual de fluxos LLM com Flowise
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="URL do Flowise"
                value={flowiseUrl}
                onChange={(e) => setFlowiseUrl(e.target.value)}
                className="w-80"
              />
              <Button onClick={handleUpdateUrl} size="sm">
                Atualizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(currentUrl, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir em nova aba
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 w-full relative">
          <iframe
            src={currentUrl}
            className="w-full h-full border-0"
            title="Flowise Editor"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      </div>
    </Layout>
  );
}
