import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast-config";

export interface FieldMask {
  id: string;
  fieldId: string;
  fieldLabel: string;
  maskType: "custom" | "cpf" | "cnpj" | "date" | "email" | "inscricao_estadual" | "phone";
  customMask?: string;
}

interface FieldMaskConfigProps {
  availableFields: { id: string; label: string }[];
  masks: FieldMask[];
  onMasksChange: (masks: FieldMask[]) => void;
}

export const FieldMaskConfig = ({ availableFields, masks, onMasksChange }: FieldMaskConfigProps) => {
  const [selectedField, setSelectedField] = useState<string>("");
  const [maskType, setMaskType] = useState<FieldMask["maskType"]>("custom");
  const [customMask, setCustomMask] = useState("");

  const handleAddMask = () => {
    if (!selectedField) {
      toast.error("Selecione um campo");
      return;
    }

    if (maskType === "custom" && !customMask.trim()) {
      toast.error("Digite a máscara customizada");
      return;
    }

    const field = availableFields.find(f => f.id === selectedField);
    if (!field) return;

    const existingMaskIndex = masks.findIndex(m => m.fieldId === selectedField);
    
    const newMask: FieldMask = {
      id: `mask_${Date.now()}`,
      fieldId: selectedField,
      fieldLabel: field.label,
      maskType,
      customMask: maskType === "custom" ? customMask : undefined,
    };

    if (existingMaskIndex >= 0) {
      const updatedMasks = [...masks];
      updatedMasks[existingMaskIndex] = newMask;
      onMasksChange(updatedMasks);
      toast.success("Máscara atualizada");
    } else {
      onMasksChange([...masks, newMask]);
      toast.success("Máscara adicionada");
    }

    setSelectedField("");
    setMaskType("custom");
    setCustomMask("");
  };

  const handleRemoveMask = (maskId: string) => {
    onMasksChange(masks.filter(m => m.id !== maskId));
    toast.success("Máscara removida");
  };

  const getMaskDisplay = (mask: FieldMask): string => {
    if (mask.maskType === "custom" && mask.customMask) {
      return mask.customMask;
    }
    
    const maskLabels: Record<FieldMask["maskType"], string> = {
      custom: "Personalizado",
      cpf: "000.000.000-00",
      cnpj: "00.000.000/0000-00",
      date: "00/00/0000",
      email: "Email",
      inscricao_estadual: "Inscrição Estadual",
      phone: "(00) 00000-0000",
    };
    
    return maskLabels[mask.maskType];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Máscaras e Validações de Campos</CardTitle>
        <CardDescription>
          Configure máscaras e validações para os campos customizados. Use N para números e X para caracteres.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Campo</Label>
            <Select value={selectedField} onValueChange={setSelectedField}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o campo" />
              </SelectTrigger>
              <SelectContent>
                {availableFields.map((field) => (
                  <SelectItem key={field.id} value={field.id}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Máscara/Validação</Label>
            <Select value={maskType} onValueChange={(value) => setMaskType(value as FieldMask["maskType"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">Personalizado</SelectItem>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="cnpj">CNPJ</SelectItem>
                <SelectItem value="date">Data</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="inscricao_estadual">Inscrição Estadual</SelectItem>
                <SelectItem value="phone">Telefone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Máscara Customizada (ex: NNNN.NN)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="NNNN.NN ou XXX.XXX.XX"
                value={customMask}
                onChange={(e) => setCustomMask(e.target.value)}
                disabled={maskType !== "custom"}
              />
              <Button onClick={handleAddMask} size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {masks.length > 0 && (
          <div className="space-y-2 mt-6">
            <Label>Máscaras Configuradas</Label>
            <div className="space-y-2">
              {masks.map((mask) => (
                <div
                  key={mask.id}
                  className="flex items-center justify-between p-3 border rounded-md bg-muted/30"
                >
                  <div>
                    <div className="font-medium">{mask.fieldLabel}</div>
                    <div className="text-sm text-muted-foreground">
                      {getMaskDisplay(mask)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveMask(mask.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
