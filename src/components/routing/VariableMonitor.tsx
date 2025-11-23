import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Variable, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface VariableMonitorProps {
  variables: Record<string, any>;
  title?: string;
}

export default function VariableMonitor({ variables, title = "Variáveis" }: VariableMonitorProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const entries = Object.entries(variables);

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'object') {
      // Para objetos, mostrar de forma mais simples
      if (Array.isArray(value)) {
        return `[${value.length} items]`;
      }
      const keys = Object.keys(value);
      return `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}}`;
    }
    return String(value);
  };

  return (
    <Card className={cn(
      "h-full flex flex-col transition-all duration-300 relative",
      isCollapsed ? "w-12" : "w-80"
    )}>
      {/* Botão de expandir/recolher */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-background border shadow-md hover:bg-muted"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? (
          <ChevronLeft className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </Button>

      {!isCollapsed && (
        <>
          <div className="p-4 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Variable className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">{title}</h3>
              <Badge variant="secondary" className="ml-auto">
                {entries.length}
              </Badge>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {entries.length === 0 ? (
                <div className="text-center py-8">
                  <Variable className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                  <p className="text-xs text-muted-foreground">Nenhuma variável definida</p>
                </div>
              ) : (
                entries.map(([key, value]) => {
                  const valueType = typeof value;
                  const isBoolean = valueType === 'boolean';
                  const displayValue = formatValue(value);

                  return (
                    <div
                      key={key}
                      className="p-3 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-xs font-semibold text-primary truncate">
                          {key}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {isBoolean && (
                          value ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                          )
                        )}
                        <span className="text-sm font-medium text-foreground">
                          {displayValue}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </>
      )}
    </Card>
  );
}
