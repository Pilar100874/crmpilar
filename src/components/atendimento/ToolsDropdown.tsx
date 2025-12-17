import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Wrench } from 'lucide-react';
import { type FerramentaConfig, type TabType } from '@/hooks/useFerramentasAtendimento';

interface ToolsDropdownProps {
  ferramentas: FerramentaConfig[];
  onSelectTool: (ferramentaId: string) => void;
  tabType: TabType;
  insideDialog?: boolean;
}

export function ToolsDropdown({ ferramentas, onSelectTool, tabType, insideDialog = false }: ToolsDropdownProps) {
  const [open, setOpen] = useState(false);

  // Filtrar ferramentas por tipo
  const toolsFerramentas = ferramentas.filter(f => f.tipo === 'ferramenta');
  const iaFerramentas = ferramentas.filter(f => f.tipo === 'ia');

  if (ferramentas.length === 0) {
    return null;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
          data-macro-id="tools-dropdown-trigger"
        >
          <Wrench className="h-4 w-4" />
          <span>Ferramentas</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-56 bg-popover"
        style={{ zIndex: 9999 }}
        sideOffset={5}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {toolsFerramentas.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Ferramentas
            </div>
            {toolsFerramentas.map(ferramenta => {
              const Icon = ferramenta.IconComponent;
              return (
                <DropdownMenuItem
                  key={ferramenta.id}
                  onClick={() => {
                    onSelectTool(ferramenta.ferramenta_id);
                    setOpen(false);
                  }}
                  className="gap-2 cursor-pointer"
                  data-macro-id={`tool-${ferramenta.ferramenta_id}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{ferramenta.nome}</span>
                </DropdownMenuItem>
              );
            })}
          </>
        )}
        
        {toolsFerramentas.length > 0 && iaFerramentas.length > 0 && (
          <DropdownMenuSeparator />
        )}
        
        {iaFerramentas.length > 0 && (
          <>
            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
              Inteligência Artificial
            </div>
            {iaFerramentas.map(ferramenta => {
              const Icon = ferramenta.IconComponent;
              return (
                <DropdownMenuItem
                  key={ferramenta.id}
                  onClick={() => {
                    onSelectTool(ferramenta.ferramenta_id);
                    setOpen(false);
                  }}
                  className="gap-2 cursor-pointer"
                  data-macro-id={`tool-${ferramenta.ferramenta_id}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{ferramenta.nome}</span>
                </DropdownMenuItem>
              );
            })}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
