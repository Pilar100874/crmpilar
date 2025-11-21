import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Copy, Trash2, MessageSquare } from "lucide-react";
import type { OmnichannelNode } from "@/types/omnichannelFlow";

interface BlockContextMenuProps {
  node: OmnichannelNode;
  children: React.ReactNode;
  onDuplicate: (node: OmnichannelNode) => void;
  onDelete: (nodeId: string) => void;
  onAddNote: (nodeId: string) => void;
}

export const BlockContextMenu = ({ node, children, onDuplicate, onDelete, onAddNote }: BlockContextMenuProps) => {
  if (node.data.type === "inicio") {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onDuplicate(node)}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicar Bloco
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onAddNote(node.id)}>
          <MessageSquare className="h-4 w-4 mr-2" />
          {node.data.config.nota ? "Editar Nota" : "Adicionar Nota"}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onDelete(node.id)} className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Deletar Bloco
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
