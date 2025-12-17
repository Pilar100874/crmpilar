import { useState, useRef, useEffect } from 'react';
import { useMacro } from '@/contexts/MacroContext';
import { Button } from '@/components/ui/button';
import { Play, Zap, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

const POSITION_KEY = 'macro_quick_access_position';

export function FloatingMacroQuickAccess() {
  const { 
    macros, 
    showQuickAccessMenu, 
    quickAccessMacroIds, 
    executeMacro, 
    executionStatus 
  } = useMacro();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    const stored = localStorage.getItem(POSITION_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return { x: 16, y: window.innerHeight - 200 };
      }
    }
    return { x: 16, y: window.innerHeight - 200 };
  });
  
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Save position to localStorage
  useEffect(() => {
    if (!isDragging) {
      localStorage.setItem(POSITION_KEY, JSON.stringify(position));
    }
  }, [position, isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragRef.current) return;
      
      const deltaX = e.clientX - dragRef.current.startX;
      const deltaY = e.clientY - dragRef.current.startY;
      
      const newX = Math.max(0, Math.min(window.innerWidth - 200, dragRef.current.startPosX + deltaX));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, dragRef.current.startPosY + deltaY));
      
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

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
    <div 
      ref={containerRef}
      className={cn(
        "fixed z-[9999] flex flex-col gap-2",
        isDragging && "cursor-grabbing select-none"
      )}
      style={{ left: position.x, top: position.y }}
    >
      <div className="bg-background border rounded-lg shadow-xl overflow-hidden">
        {/* Header com drag e collapse */}
        <div 
          className={cn(
            "flex items-center justify-between gap-2 px-2 py-1.5 border-b bg-muted/50",
            "cursor-grab active:cursor-grabbing"
          )}
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-1">
            <GripVertical className="h-3 w-3 text-muted-foreground" />
            <Zap className="h-3 w-3 text-primary" />
            <span className="text-xs font-medium text-muted-foreground select-none">Atalhos</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
          >
            {isCollapsed ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronUp className="h-3 w-3" />
            )}
          </Button>
        </div>

        {/* Lista de macros */}
        {!isCollapsed && (
          <div className="flex flex-col gap-1 p-2 max-h-[300px] overflow-y-auto">
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
        )}
      </div>
    </div>
  );
}
