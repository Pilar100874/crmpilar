import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCheck, X, Copy, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/lib/toast-config";

interface ConversationSummaryPanelProps {
  summary: string | null;
  isLoading: boolean;
  onClose: () => void;
  generatedAt?: Date;
}

export function ConversationSummaryPanel({ 
  summary, 
  isLoading, 
  onClose,
  generatedAt 
}: ConversationSummaryPanelProps) {
  const handleCopy = () => {
    if (summary) {
      navigator.clipboard.writeText(summary);
      toast.success("Resumo copiado!");
    }
  };

  return (
    <Card className="h-full flex flex-col bg-gradient-to-br from-primary/5 to-primary-glow/5 border-primary/20 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary-glow/10 px-4 py-3 border-b border-primary/20 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
          <span className="text-sm font-semibold">Resumo da Conversa</span>
        </div>
        <div className="flex items-center gap-2">
          {summary && !isLoading && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              className="h-7 w-7 p-0 hover:bg-primary/20 rounded-full"
              title="Copiar resumo"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-7 w-7 p-0 hover:bg-primary/20 rounded-full"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Gerando resumo...</p>
          </div>
        ) : summary ? (
          <>
            {generatedAt && (
              <div className="text-xs text-muted-foreground text-right">
                Gerado em {format(generatedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
            )}
            <div className="prose prose-sm max-w-none">
              <div 
                className="text-sm leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') }}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <FileCheck className="h-12 w-12 opacity-20" />
            <p className="text-sm">Nenhum resumo gerado ainda</p>
            <p className="text-xs text-center">
              Clique no botão de resumo no menu de Agent Assist para gerar
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
