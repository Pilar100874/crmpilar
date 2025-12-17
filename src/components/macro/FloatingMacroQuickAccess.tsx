import { useMacro } from '@/contexts/MacroContext';
import { Button } from '@/components/ui/button';
import { Play, Zap } from 'lucide-react';

export function FloatingMacroQuickAccess() {
  const { 
    macros, 
    showQuickAccessMenu, 
    quickAccessMacroIds, 
    executeMacro, 
    executionStatus 
  } = useMacro();

  if (!showQuickAccessMenu || quickAccessMacroIds.length === 0) {
    return null;
  }

  const quickAccessMacros = macros.filter(m => 
    quickAccessMacroIds.includes(m.id) && m.enabled
  );

  if (quickAccessMacros.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 z-[9999] flex flex-col gap-2">
      <div className="bg-background border rounded-lg p-2 shadow-xl">
        <div className="flex items-center gap-1 px-2 pb-2 border-b mb-2">
          <Zap className="h-3 w-3 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">Atalhos Rápidos</span>
        </div>
        <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto">
          {quickAccessMacros.map(macro => (
            <Button
              key={macro.id}
              size="sm"
              variant="ghost"
              className="justify-start h-8 px-2 text-sm"
              onClick={() => executeMacro(macro.id)}
              disabled={executionStatus?.isRunning}
            >
              <Play className="h-3 w-3 mr-2 text-primary" />
              <span className="truncate max-w-[150px]">{macro.name}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
