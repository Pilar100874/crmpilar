/**
 * Editor de Regras usando Blockly em Iframe
 * Solução isolada que evita problemas de compilação TypeScript
 */

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Upload, FileJson } from "lucide-react";
import { toast } from "@/lib/toast-config";

interface BlocklyRule {
  name: string;
  trigger: string;
  xml: string;
  code: string;
  blocks: Array<{ type: string; id: string }>;
  timestamp: string;
}

export function ScratchEditor() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [currentRule, setCurrentRule] = useState<BlocklyRule | null>(null);
  const [jsonPreview, setJsonPreview] = useState("");

  useEffect(() => {
    // Escutar mensagens do iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'BLOCKLY_EXPORT') {
        const rule: BlocklyRule = event.data.data;
        setCurrentRule(rule);
        setJsonPreview(JSON.stringify(rule, null, 2));
        toast.success("Regra recebida do editor!");
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const loadXmlToEditor = (xml: string) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'LOAD_XML',
        xml: xml
      }, '*');
    }
  };

  const downloadJSON = () => {
    if (!currentRule) {
      toast.error("Nenhuma regra para baixar");
      return;
    }

    const blob = new Blob([JSON.stringify(currentRule, null, 2)], { 
      type: "application/json" 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `regra-automacao-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON baixado!");
  };

  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.xml) {
          loadXmlToEditor(data.xml);
          setCurrentRule(data);
          toast.success("Regra importada!");
        }
      } catch (error) {
        toast.error("Erro ao importar JSON");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Editor Blockly em Iframe */}
      <Card className="flex-1 overflow-hidden">
        <iframe
          ref={iframeRef}
          src="/blockly-editor.html"
          className="w-full h-full border-0"
          title="Editor Blockly"
        />
      </Card>

      {/* Controles */}
      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <label className="cursor-pointer">
            <Upload className="w-4 h-4 mr-2" />
            Importar JSON
            <input
              type="file"
              accept=".json"
              onChange={importJSON}
              className="hidden"
            />
          </label>
        </Button>
        <Button onClick={downloadJSON} disabled={!currentRule}>
          <Download className="w-4 h-4 mr-2" />
          Baixar JSON
        </Button>
      </div>

      {/* Preview JSON */}
      {jsonPreview && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">JSON da Regra</h3>
            <FileJson className="w-4 h-4 text-muted-foreground" />
          </div>
          <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-60">
            {jsonPreview}
          </pre>
        </Card>
      )}
    </div>
  );
}
