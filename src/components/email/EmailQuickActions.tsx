import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Archive,
  Trash2,
  Clock,
  Tag,
  MailOpen,
  Reply,
  Forward,
} from "lucide-react";

interface EmailQuickActionsProps {
  onArchive: () => void;
  onDelete: () => void;
  onSnooze: () => void;
  onLabel: () => void;
  onMarkRead: () => void;
  onReply: () => void;
  onForward: () => void;
}

export function EmailQuickActions({
  onArchive,
  onDelete,
  onSnooze,
  onLabel,
  onMarkRead,
  onReply,
  onForward,
}: EmailQuickActionsProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onReply}>
              <Reply className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Responder</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onForward}>
              <Forward className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Encaminhar</TooltipContent>
        </Tooltip>

        <div className="w-px h-5 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onArchive}>
              <Archive className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Arquivar</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Excluir</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onSnooze}>
              <Clock className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Adiar</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onLabel}>
              <Tag className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Etiqueta</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onMarkRead}>
              <MailOpen className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Marcar como lido</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
