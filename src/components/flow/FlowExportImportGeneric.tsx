import { useRef } from "react";
import { Node, Edge } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Download, Upload } from "lucide-react";
import { toast } from "@/lib/toast-config";

interface FlowExportImportGenericProps {
  nodes: Node[];
  edges: Edge[];
  flowName?: string;
  onImport: (nodes: Node[], edges: Edge[], name?: string) => void;
  asMenuItems?: boolean;
}

/**
 * Botões genéricos de Importar/Exportar workflow.
 * Funciona com qualquer fluxo baseado em React Flow (nodes/edges).
 * Exibe ícones em telas pequenas e texto a partir de xl.
 */
export function FlowExportImportGeneric({
  nodes,
  edges,
  flowName = "workflow",
  onImport,
  asMenuItems = false,
}: FlowExportImportGenericProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = {
      name: flowName,
      version: "1.0",
      exportedAt: new Date().toISOString(),
      nodes,
      edges,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(flowName || "workflow").replace(/\s+/g, "-")}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Fluxo exportado");
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        const n: Node[] = parsed.nodes || parsed.flowData?.nodes || [];
        const ed: Edge[] = parsed.edges || parsed.flowData?.edges || [];
        if (!Array.isArray(n) || n.length === 0) {
          toast.error("Arquivo inválido: nenhum bloco encontrado");
          return;
        }
        onImport(n, ed, parsed.name);
        toast.success("Fluxo importado");
      } catch (err) {
        console.error(err);
        toast.error("Erro ao importar: JSON inválido");
      } finally {
        if (fileRef.current) fileRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFile}
        className="hidden"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileRef.current?.click()}
        className="h-8 px-2"
        title="Importar workflow de arquivo JSON"
      >
        <Upload className="h-4 w-4 xl:mr-1.5" />
        <span className="hidden xl:inline">Importar</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={nodes.length === 0}
        className="h-8 px-2"
        title="Exportar workflow para arquivo JSON"
      >
        <Download className="h-4 w-4 xl:mr-1.5" />
        <span className="hidden xl:inline">Exportar</span>
      </Button>
    </>
  );
}
