import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lightbulb, BookOpen } from "lucide-react";
import * as Icons from "lucide-react";

export interface BlockHelpContent {
  label: string;
  description: string;
  icon?: string;
  color?: string;
  comoUsar?: string;
  exemplos: string[];
  dicas?: string[];
}

interface BlockHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: BlockHelpContent;
}

export function BlockHelpDialog({ open, onOpenChange, content }: BlockHelpDialogProps) {
  const IconComponent = content.icon
    ? ((Icons as any)[content.icon] as any)
    : null;
  const color = content.color || "hsl(var(--primary))";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: color + "20" }}
            >
              {IconComponent ? (
                <IconComponent className="w-5 h-5" style={{ color }} />
              ) : (
                <BookOpen className="w-5 h-5" style={{ color }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base">
                Ajuda · {content.label}
              </DialogTitle>
              <DialogDescription className="text-xs mt-1">
                {content.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="space-y-4">
            {content.comoUsar && (
              <section>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  Como usar
                </h4>
                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {content.comoUsar}
                </p>
              </section>
            )}

            <section>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                Exemplos de uso
              </h4>
              <ol className="space-y-2">
                {content.exemplos.map((ex, i) => (
                  <li
                    key={i}
                    className="text-sm bg-accent/40 border border-border rounded-md p-3 flex gap-2"
                  >
                    <span className="font-semibold text-primary flex-shrink-0">
                      {i + 1}.
                    </span>
                    <span className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {ex}
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            {content.dicas && content.dicas.length > 0 && (
              <section>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  Dicas
                </h4>
                <ul className="space-y-1 list-disc list-inside text-sm text-foreground/80">
                  {content.dicas.map((d, i) => (
                    <li key={i} className="leading-relaxed">
                      {d}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
