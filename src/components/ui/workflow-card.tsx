import { ReactNode } from "react";
import { MoreVertical, Edit, Power, PowerOff, Trash2, Copy, Pencil, Star, Image, Video, Film } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface WorkflowCardProps {
  id: string;
  title: string;
  description?: string | null;
  isActive: boolean;
  isDefault?: boolean;
  blocksCount?: number;
  createdAt?: string;
  expiresAt?: string | null;
  priority?: number;
  className?: string;
  menuOpen?: boolean;
  mediaTypes?: ('image' | 'video')[];
  draggable?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
  onEdit?: () => void;
  onRename?: () => void;
  onDuplicate?: () => void;
  onToggleActive?: () => void;
  onToggleDefault?: () => void;
  onDelete?: () => void;
  onOpenEditor?: () => void;
  onMoveToFolder?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  customContent?: ReactNode;
  showDefaultOption?: boolean;
  deleteDisabled?: boolean;
  variant?: 'default' | 'menu';
}

export const WorkflowCard = ({
  id,
  title,
  description,
  isActive,
  isDefault,
  blocksCount,
  createdAt,
  expiresAt,
  priority,
  className,
  menuOpen,
  mediaTypes,
  draggable,
  onMenuOpenChange,
  onEdit,
  onRename,
  onDuplicate,
  onToggleActive,
  onToggleDefault,
  onDelete,
  onOpenEditor,
  onMoveToFolder,
  onDragStart,
  customContent,
  showDefaultOption = false,
  deleteDisabled = false,
  variant = 'default',
}: WorkflowCardProps) => {
  const hasImage = mediaTypes?.includes('image');
  const hasVideo = mediaTypes?.includes('video');

  const isMenu = variant === 'menu';

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      className={cn(
        "group relative flex flex-col overflow-hidden",
        isMenu
          ? "rounded-2xl shadow-lg border-2 border-white dark:border-white/10 bg-gradient-to-b from-background to-border transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
          : cn(
              "rounded-xl",
              "bg-card [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
              "transform-gpu dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
              "transition-all duration-300 hover:shadow-lg hover:scale-[1.02]"
            ),
        draggable && "cursor-grab active:cursor-grabbing",
        isDefault && "ring-2 ring-primary",
        className
      )}
    >
      {/* Hover overlay */}
      <div className={cn("pointer-events-none absolute inset-0 transform-gpu transition-all duration-300", !isMenu && "group-hover:bg-black/[.02] group-hover:dark:bg-neutral-800/10")} />

      {/* Header */}
      <div className="relative z-10 p-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate flex items-center gap-2">
              <span className="truncate">{title}</span>
              {isDefault && (
                <Star className="h-4 w-4 text-primary fill-primary flex-shrink-0" />
              )}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {description || "Sem descrição"}
            </p>
          </div>
          
          <DropdownMenu open={menuOpen} onOpenChange={onMenuOpenChange}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-50">
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              {onRename && (
                <DropdownMenuItem onClick={onRename}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Renomear
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar
                </DropdownMenuItem>
              )}
              {onMoveToFolder && (
                <DropdownMenuItem onClick={onMoveToFolder}>
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  Mover para Pasta
                </DropdownMenuItem>
              )}
              {(onEdit || onRename || onDuplicate || onMoveToFolder) && <DropdownMenuSeparator />}
              {onToggleActive && (
                <DropdownMenuItem onClick={onToggleActive}>
                  {isActive ? (
                    <>
                      <PowerOff className="h-4 w-4 mr-2" />
                      Desativar
                    </>
                  ) : (
                    <>
                      <Power className="h-4 w-4 mr-2" />
                      Ativar
                    </>
                  )}
                </DropdownMenuItem>
              )}
              {showDefaultOption && isActive && onToggleDefault && (
                <DropdownMenuItem onClick={onToggleDefault}>
                  <Star className="h-4 w-4 mr-2" />
                  {isDefault ? "Remover Padrão" : "Definir como Padrão"}
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onDelete}
                    disabled={deleteDisabled}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 pb-4 space-y-3 flex-1">
        {/* Status, blocks and media type */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? "Ativo" : "Inativo"}
            </Badge>
            {typeof blocksCount === "number" && (
              <span className="text-xs text-muted-foreground">
                {blocksCount} {blocksCount === 1 ? "bloco" : "blocos"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {typeof priority === "number" && (
              <Badge variant="outline">Prioridade: {priority}</Badge>
            )}
            {mediaTypes && mediaTypes.length > 0 && (
              <>
                {hasImage && hasVideo ? (
                  <Badge variant="outline" className="gap-1 px-1.5 py-0.5 text-[10px]">
                    <Film className="h-3 w-3 text-purple-500" />
                    Misto
                  </Badge>
                ) : hasVideo ? (
                  <Badge variant="outline" className="gap-1 px-1.5 py-0.5 text-[10px]">
                    <Video className="h-3 w-3 text-blue-500" />
                    Vídeo
                  </Badge>
                ) : hasImage ? (
                  <Badge variant="outline" className="gap-1 px-1.5 py-0.5 text-[10px]">
                    <Image className="h-3 w-3 text-green-500" />
                    Imagem
                  </Badge>
                ) : null}
              </>
            )}
          </div>
        </div>

        {/* Custom content slot */}
        {customContent}

        {/* Created at */}
        {createdAt && (
          <div className="text-xs text-muted-foreground">
            Criado em {new Date(createdAt).toLocaleDateString()}
          </div>
        )}

        {/* Open Editor Button */}
        {onOpenEditor && (
          <Button
            size="sm"
            variant="outline"
            className="w-full transform-gpu transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground"
            onClick={onOpenEditor}
          >
            <Edit className="h-3 w-3 mr-1" />
            Abrir Editor
          </Button>
        )}
      </div>
    </div>
  );
};

export const WorkflowCardGrid = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4",
        className
      )}
    >
      {children}
    </div>
  );
};