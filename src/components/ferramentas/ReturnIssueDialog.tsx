import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Wrench, Settings, XCircle } from "lucide-react";
import { ReturnIssueType } from "@/lib/supabase";

interface ReturnIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toolName: string;
  onConfirm: (data: {
    issueType: ReturnIssueType;
    description: string;
    requiresDiscount: boolean;
  }) => void;
}

export function ReturnIssueDialog({
  open,
  onOpenChange,
  toolName,
  onConfirm,
}: ReturnIssueDialogProps) {
  const [issueType, setIssueType] = useState<ReturnIssueType>("manutencao");
  const [description, setDescription] = useState("");
  const [requiresDiscount, setRequiresDiscount] = useState(false);

  const handleConfirm = () => {
    if (issueType === "danificada" && !description.trim()) {
      return; // Description required for damaged
    }
    
    onConfirm({
      issueType,
      description: description.trim(),
      requiresDiscount: issueType === "perdida" ? true : requiresDiscount,
    });
    
    // Reset
    setIssueType("manutencao");
    setDescription("");
    setRequiresDiscount(false);
  };

  const isDescriptionRequired = issueType === "danificada" || issueType === "perdida";
  const isDiscountLocked = issueType === "perdida";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Reportar Ocorrência
          </DialogTitle>
          <DialogDescription>
            Informe o problema encontrado na ferramenta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border p-3 bg-muted/50">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" />
              <span className="font-medium">{toolName}</span>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Tipo de Ocorrência</Label>
            <RadioGroup
              value={issueType}
              onValueChange={(v) => {
                setIssueType(v as ReturnIssueType);
                if (v === "perdida") {
                  setRequiresDiscount(true);
                }
              }}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="manutencao" id="manutencao" />
                <Label htmlFor="manutencao" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-warning" />
                    <span>Manutenção</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ferramenta precisa de reparo/manutenção
                  </p>
                </Label>
              </div>

              <div className="flex items-center space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="danificada" id="danificada" />
                <Label htmlFor="danificada" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span>Danificada</span>
                    <Badge variant="destructive" className="text-xs">Requer descrição</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ferramenta foi danificada pelo uso
                  </p>
                </Label>
              </div>

              <div className="flex items-center space-x-3 rounded-lg border border-destructive/50 p-3 cursor-pointer hover:bg-destructive/5">
                <RadioGroupItem value="perdida" id="perdida" />
                <Label htmlFor="perdida" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span>Perdida</span>
                    <Badge variant="destructive" className="text-xs">Desconto obrigatório</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ferramenta foi perdida ou extraviada
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {isDescriptionRequired && (
            <div className="space-y-2">
              <Label>
                Descrição do Ocorrido <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  issueType === "perdida"
                    ? "Descreva as circunstâncias da perda..."
                    : "Descreva os danos encontrados..."
                }
                rows={3}
              />
            </div>
          )}

          {issueType === "manutencao" && (
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o problema encontrado..."
                rows={2}
              />
            </div>
          )}

          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="cursor-pointer">Desconto do Usuário</Label>
                <p className="text-xs text-muted-foreground">
                  {isDiscountLocked 
                    ? "Obrigatório para ferramentas perdidas"
                    : "Encaminhar para desconto em folha"}
                </p>
              </div>
              <Switch
                checked={requiresDiscount}
                onCheckedChange={setRequiresDiscount}
                disabled={isDiscountLocked}
              />
            </div>
            {requiresDiscount && (
              <p className="text-xs text-warning bg-warning/10 p-2 rounded">
                ⚠️ Será enviado ao administrador para providências
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isDescriptionRequired && !description.trim()}
          >
            Confirmar Ocorrência
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
