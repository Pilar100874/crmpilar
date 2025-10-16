import { Button } from "@/components/ui/button";
import { Bold, Italic, Code, Strikethrough } from "lucide-react";

interface FormattingToolbarProps {
  onFormat: (prefix: string, suffix: string) => void;
  onVariableClick: () => void;
}

export const FormattingToolbar = ({ onFormat, onVariableClick }: FormattingToolbarProps) => {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 border border-slate-700/50">
      <div className="flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="sm" 
          type="button"
          className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-cyan-500/20 hover:border-cyan-500/50 border border-transparent transition-all" 
          title="Negrito (*texto*)"
          onClick={() => onFormat("*", "*")}
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          type="button"
          className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-cyan-500/20 hover:border-cyan-500/50 border border-transparent transition-all" 
          title="Itálico (_texto_)"
          onClick={() => onFormat("_", "_")}
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          type="button"
          className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-cyan-500/20 hover:border-cyan-500/50 border border-transparent transition-all" 
          title="Tachado (~texto~)"
          onClick={() => onFormat("~", "~")}
        >
          <Strikethrough className="w-4 h-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          type="button"
          className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-cyan-500/20 hover:border-cyan-500/50 border border-transparent transition-all" 
          title="Código (```texto```)"
          onClick={() => onFormat("```", "```")}
        >
          <Code className="w-4 h-4" />
        </Button>
      </div>
      <Button 
        variant="outline" 
        size="sm"
        type="button"
        onClick={onVariableClick}
        className="h-8 text-xs bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20 hover:text-white hover:border-cyan-500"
      >
        Usar variável
      </Button>
    </div>
  );
};
