import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export type VinculoField = { label: string; value?: any };

interface VinculoViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  fields: VinculoField[];
}

/**
 * Diálogo simples e reutilizável para visualizar (somente leitura)
 * os dados de um item vinculado (contato, empresa, segmento, etc).
 */
export function VinculoViewDialog({ open, onOpenChange, title, subtitle, fields }: VinculoViewDialogProps) {
  const visibleFields = fields.filter(
    (f) => f.value !== undefined && f.value !== null && String(f.value).trim() !== ""
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{title}</DialogTitle>
            <Badge variant="secondary" className="text-[10px]">Somente leitura</Badge>
          </div>
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {visibleFields.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum dado adicional disponível.
            </p>
          )}
          {visibleFields.map((f, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 border-b border-border/40 pb-2 last:border-0">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {f.label}
              </div>
              <div className="col-span-2 text-sm break-words">{String(f.value)}</div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
