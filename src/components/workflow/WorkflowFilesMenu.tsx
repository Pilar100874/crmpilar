import { ReactNode } from "react";
import { Node, Edge } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileBox, Upload, Download, ChevronDown } from "lucide-react";
import { FlowTemplateManager } from "@/components/flow/FlowTemplateManager";
import { FlowExportImportGeneric } from "@/components/flow/FlowExportImportGeneric";

interface WorkflowFilesMenuProps {
  nodes: Node[];
  edges: Edge[];
  selectedNodes?: Node[];
  flowName?: string;
  /** Import callback used by default file-based importer */
  onImport?: (nodes: Node[], edges: Edge[], name?: string) => void;
  onLoadTemplate: (nodes: Node[], edges: Edge[]) => void;
  /** Optional custom import handler (overrides file-based one) */
  customImport?: { label?: string; onClick: () => void };
  /** Optional custom export handler (overrides file-based one) */
  customExport?: { label?: string; onClick: () => void };
  /** Optional extra menu items rendered before the separator */
  extraItems?: ReactNode;
}

/**
 * Menu unificado de Arquivos do workflow.
 * Agrupa Importar / Exportar / Salvar Modelo / Modelos em um único dropdown
 * para manter a barra superior limpa em qualquer tamanho de tela.
 */
export function WorkflowFilesMenu({
  nodes,
  edges,
  selectedNodes = [],
  flowName,
  onImport,
  onLoadTemplate,
  customImport,
  customExport,
  extraItems,
}: WorkflowFilesMenuProps) {
  const useCustom = !!(customImport || customExport);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2"
          title="Arquivos do fluxo"
        >
          <FileBox className="h-4 w-4 xl:mr-1.5" />
          <span className="hidden xl:inline">Arquivos</span>
          <ChevronDown className="h-3 w-3 ml-1 hidden xl:inline" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 z-[60]">
        <DropdownMenuLabel>Arquivos do fluxo</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {useCustom ? (
          <>
            {customImport && (
              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); customImport.onClick(); }}>
                <Upload className="h-4 w-4 mr-2" />
                {customImport.label ?? "Importar"}
              </DropdownMenuItem>
            )}
            {customExport && (
              <DropdownMenuItem
                disabled={nodes.length === 0}
                onSelect={(e) => { e.preventDefault(); customExport.onClick(); }}
              >
                <Download className="h-4 w-4 mr-2" />
                {customExport.label ?? "Exportar"}
              </DropdownMenuItem>
            )}
          </>
        ) : (
          onImport && (
            <FlowExportImportGeneric
              nodes={nodes}
              edges={edges}
              flowName={flowName}
              onImport={onImport}
              asMenuItems
            />
          )
        )}

        {extraItems}

        <DropdownMenuSeparator />
        <FlowTemplateManager
          nodes={nodes}
          edges={edges}
          selectedNodes={selectedNodes}
          onLoadTemplate={onLoadTemplate}
          asMenuItems
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
