import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Wrench } from 'lucide-react';
import { type FerramentaConfig, type TabType } from '@/hooks/useFerramentasAtendimento';

interface ToolsDropdownProps {
  ferramentas: FerramentaConfig[];
  onSelectTool: (ferramentaId: string) => void;
  tabType: TabType;
}

export function ToolsDropdown({ ferramentas, onSelectTool, tabType }: ToolsDropdownProps) {
  const [open, setOpen] = useState(false);

  // Filtrar ferramentas por tipo
  const toolsFerramentas = ferramentas.filter(f => f.tipo === 'ferramenta');
  const iaFerramentas = ferramentas.filter(f => f.tipo === 'ia');

  if (ferramentas.length === 0) {
    return null;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Wrench className="h-4 w-4" />
          <span className="hidden sm:inline">Ferramentas</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
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
