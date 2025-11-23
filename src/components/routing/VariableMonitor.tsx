import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Variable, CheckCircle2, XCircle } from "lucide-react";

interface VariableMonitorProps {
  variables: Record<string, any>;
  title?: string;
}

export default function VariableMonitor({ variables, title = "Variáveis" }: VariableMonitorProps) {
  const entries = Object.entries(variables);

  return (
    <Card className="h-full flex flex-col">
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
              const isNull = value === null || value === undefined;
              const displayValue = isNull 
                ? 'null' 
                : isBoolean 
                  ? value.toString() 
                  : valueType === 'object'
                    ? JSON.stringify(value, null, 2)
                    : String(value);

              return (
                <div
                  key={key}
                  className="p-3 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-semibold text-primary truncate">
                      {key}
                    </span>
                    <Badge variant="outline" className="text-[10px] h-5">
                      {valueType}
                    </Badge>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    {isBoolean && (
                      value ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0 mt-0.5" />
                      )
                    )}
                    <code className="text-xs text-muted-foreground break-all whitespace-pre-wrap flex-1">
                      {displayValue}
                    </code>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
