import { Button } from "@/components/ui/button";
import { Bold, Italic, Code, Strikethrough } from "lucide-react";

interface FormattingToolbarProps {
  onFormat: (prefix: string, suffix: string) => void;
  onVariableClick: () => void;
}

export const FormattingToolbar = ({ onFormat, onVariableClick }: FormattingToolbarProps) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between p-2 rounded-lg bg-muted border border-border">
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            type="button"
            className="h-7 w-7 p-0 text-foreground/70 hover:text-foreground hover:bg-white border border-transparent transition-all" 
            title="Negrito (*texto*)"
            onClick={() => onFormat("*", "*")}
          >
            <Bold className="w-3.5 h-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            type="button"
            className="h-7 w-7 p-0 text-foreground/70 hover:text-foreground hover:bg-white border border-transparent transition-all" 
            title="Itálico (_texto_)"
            onClick={() => onFormat("_", "_")}
          >
            <Italic className="w-3.5 h-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            type="button"
            className="h-7 w-7 p-0 text-foreground/70 hover:text-foreground hover:bg-white border border-transparent transition-all" 
            title="Tachado (~texto~)"
            onClick={() => onFormat("~", "~")}
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            type="button"
            className="h-7 w-7 p-0 text-foreground/70 hover:text-foreground hover:bg-white border border-transparent transition-all" 
            title="Código (```texto```)"
            onClick={() => onFormat("```", "```")}
          >
            <Code className="w-3.5 h-3.5" />
          </Button>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          type="button"
          onClick={onVariableClick}
          className="h-7 text-xs bg-white border-border text-foreground/80 hover:bg-muted hover:border-border"
        >
          Usar variável
        </Button>
      </div>
      
      {/* WhatsApp formatting guide */}
      <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
        <div className="flex items-start gap-2">
          <div className="text-primary mt-0.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 text-xs text-foreground/80 space-y-1">
            <p className="font-semibold text-primary">Formatação WhatsApp:</p>
            <div className="space-y-0.5">
              <p>• <span className="font-mono bg-white px-1 rounded">*negrito*</span> = <strong>negrito</strong></p>
              <p>• <span className="font-mono bg-white px-1 rounded">_itálico_</span> = <em>itálico</em></p>
              <p>• <span className="font-mono bg-white px-1 rounded">~tachado~</span> = <span className="line-through">tachado</span></p>
              <p>• <span className="font-mono bg-white px-1 rounded">```código```</span> = <code className="bg-white px-1 rounded">código</code></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
