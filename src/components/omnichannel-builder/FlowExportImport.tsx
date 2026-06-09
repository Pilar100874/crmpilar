import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Download, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "@/lib/toast-config";
import type { OmnichannelFlowData } from "@/types/omnichannelFlow";

interface FlowExportImportProps {
  flowData: OmnichannelFlowData;
  flowName: string;
  onImport: (flowData: OmnichannelFlowData, flowName: string) => void;
}

export const FlowExportImport = ({ flowData, flowName, onImport }: FlowExportImportProps) => {
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importJson, setImportJson] = useState("");

  const handleExport = () => {
    const exportData = {
      name: flowName,
      version: "1.0",
      exportedAt: new Date().toISOString(),
      flowData
    };
    
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${flowName.replace(/\s+/g, "-")}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Fluxo exportado com sucesso");
  };

  const handleCopyToClipboard = () => {
    const exportData = {
      name: flowName,
      version: "1.0",
      exportedAt: new Date().toISOString(),
      flowData
    };
    
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    toast.success("JSON copiado para área de transferência");
  };

  const handleImport = () => {
    try {
      const parsed = JSON.parse(importJson);
      
      if (!parsed.flowData || !parsed.flowData.nodes) {
        throw new Error("Formato inválido: faltando flowData.nodes");
      }

      onImport(parsed.flowData, parsed.name || "Fluxo Importado");
      setShowImport(false);
      setImportJson("");
      toast.success("Fluxo importado com sucesso");
    } catch (error) {
      console.error("Erro ao importar:", error);
      toast.error("Erro ao importar: JSON inválido");
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportJson(content);
    };
    reader.readAsText(file);
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="h-8 px-2"
          title="Exportar fluxo"
        >
          <Download className="h-4 w-4 xl:mr-2" />
          <span className="hidden xl:inline">Exportar</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowImport(true)}
          className="h-8 px-2"
          title="Importar fluxo"
        >
          <Upload className="h-4 w-4 xl:mr-2" />
          <span className="hidden xl:inline">Importar</span>
        </Button>
      </div>

      {/* Export Dialog */}
      <Dialog open={showExport} onOpenChange={setShowExport}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Exportar Fluxo</DialogTitle>
            <DialogDescription>
              JSON do fluxo atual - copie ou baixe o arquivo
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={JSON.stringify({ name: flowName, flowData }, null, 2)}
            readOnly
            rows={15}
            className="font-mono text-xs"
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowExport(false)}>
              Fechar
            </Button>
            <Button onClick={handleCopyToClipboard}>
              Copiar JSON
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Importar Fluxo</DialogTitle>
            <DialogDescription>
              Cole o JSON do fluxo ou selecione um arquivo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById("file-upload")?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Selecionar Arquivo
              </Button>
            </div>

            <Textarea
              placeholder="Ou cole o JSON aqui..."
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              rows={15}
              className="font-mono text-xs"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowImport(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={!importJson}>
              Importar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
