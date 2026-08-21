import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ImageUploadCrop } from "@/components/ImageUploadCrop";
import { Tool, Warehouse, Kit, ToolType } from "@/lib/supabase";
import {
  Wrench,
  Package,
  Calendar,
  DollarSign,
  Hash,
  Building2,
  FileText,
  Camera,
  Settings,
  Loader2,
} from "lucide-react";

const toolTypeLabels: Record<ToolType, string> = {
  manual: "Manual",
  eletrica: "Elétrica",
  pneumatica: "Pneumática",
};

const toolTypeColors: Record<ToolType, string> = {
  manual: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  eletrica: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  pneumatica: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

interface ToolFormData {
  name: string;
  type: ToolType;
  purchase_date: string;
  purchase_value: string;
  description: string;
  serial_number: string;
  warehouse_id: string;
  kit_id: string;
  photo_url: string | null;
  requires_return_photo: boolean;
  is_maintenance: boolean;
  requires_kit: boolean;
  allow_relend: boolean;
}

interface ToolFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTool: Tool | null;
  warehouses: Warehouse[];
  kits: Kit[];
  onSubmit: (data: ToolFormData) => Promise<void>;
}

export function ToolFormDialog({
  open,
  onOpenChange,
  editingTool,
  warehouses,
  kits,
  onSubmit,
}: ToolFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ToolFormData>({
    name: "",
    type: "manual",
    purchase_date: "",
    purchase_value: "",
    description: "",
    serial_number: "",
    warehouse_id: "",
    kit_id: "",
    photo_url: null,
    requires_return_photo: false,
    is_maintenance: false,
    requires_kit: false,
    allow_relend: true,
  });

  useEffect(() => {
    if (editingTool) {
      setFormData({
        name: editingTool.name,
        type: editingTool.type,
        purchase_date: editingTool.purchase_date || "",
        purchase_value: editingTool.purchase_value?.toString() || "",
        description: editingTool.description || "",
        serial_number: editingTool.serial_number || "",
        warehouse_id: editingTool.warehouse_id || "",
        kit_id: editingTool.kit_id || "",
        photo_url: editingTool.photo_url || null,
        requires_return_photo: editingTool.requires_return_photo,
        is_maintenance: editingTool.is_maintenance,
        requires_kit: editingTool.requires_kit,
        allow_relend: (editingTool as any).allow_relend !== false,
      });
    } else {
      setFormData({
        name: "",
        type: "manual",
        purchase_date: "",
        purchase_value: "",
        description: "",
        serial_number: "",
        warehouse_id: "",
        kit_id: "",
        photo_url: null,
        requires_return_photo: false,
        is_maintenance: false,
        requires_kit: false,
        allow_relend: true,
      });
    }
  }, [editingTool, open]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[95vh] p-0 gap-0 overflow-hidden">
        {/* Header com gradiente */}
        <DialogHeader className="px-6 py-5 bg-gradient-to-r from-primary/5 via-primary/10 to-accent/5 border-b">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Wrench className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">
                {editingTool ? "Editar Ferramenta" : "Nova Ferramenta"}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {editingTool ? "Atualize os dados da ferramenta" : "Preencha os dados para cadastrar"}
              </p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(95vh-180px)]">
          <div className="p-6 space-y-6">
            {/* Seção: Foto e Identificação */}
            <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
              {/* Foto - destaque visual */}
              <div className="flex flex-col items-center lg:items-start">
                <Label className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Foto da Ferramenta
                </Label>
                <div className="p-4 rounded-xl bg-muted/50 border-2 border-dashed border-muted-foreground/20 hover:border-primary/30 transition-colors">
                  <ImageUploadCrop
                    value={formData.photo_url}
                    onChange={(url) => setFormData({ ...formData, photo_url: url })}
                    bucket="tool-photos"
                    folder="tools"
                  />
                </div>
              </div>

              {/* Identificação básica */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    Nome da Ferramenta *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Furadeira de Impacto Bosch GSB 13 RE"
                    className="h-11 text-base"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      Tipo *
                    </Label>
                    <div className="flex gap-2 flex-wrap">
                      {(["manual", "eletrica", "pneumatica"] as ToolType[]).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormData({ ...formData, type })}
                          className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                            formData.type === type
                              ? `${toolTypeColors[type]} border-current ring-2 ring-current/20`
                              : "border-muted bg-muted/50 text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {toolTypeLabels[type]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="serial_number" className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      Número de Série
                    </Label>
                    <Input
                      id="serial_number"
                      value={formData.serial_number}
                      onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                      placeholder="ABC123456789"
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Seção: Informações de Compra */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Informações de Compra
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchase_date" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Data da Compra
                  </Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase_value" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    Valor (R$)
                  </Label>
                  <Input
                    id="purchase_value"
                    type="number"
                    step="0.01"
                    value={formData.purchase_value}
                    onChange={(e) => setFormData({ ...formData, purchase_value: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warehouse" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Almoxarifado
                  </Label>
                  <Select
                    value={formData.warehouse_id || "none"}
                    onValueChange={(v) => setFormData({ ...formData, warehouse_id: v === "none" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Seção: Descrição e Kit */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Detalhes Adicionais
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição Técnica</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Especificações técnicas, observações importantes, instruções de uso..."
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Esta descrição será exibida na conferência de devolução
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="kit" className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    Pertence ao Kit
                  </Label>
                  <Select
                    value={formData.kit_id || "none"}
                    onValueChange={(v) => setFormData({ ...formData, kit_id: v === "none" ? "" : v })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-muted-foreground">Ferramenta avulsa</span>
                      </SelectItem>
                      {kits.map((k) => (
                        <SelectItem key={k.id} value={k.id}>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            {k.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Ferramentas de um kit são emprestadas juntas
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Seção: Configurações */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configurações de Empréstimo
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Card de configuração */}
                <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                  formData.requires_return_photo 
                    ? "border-primary/30 bg-primary/5" 
                    : "border-muted bg-muted/30"
                }`}>
                  <div className="space-y-0.5">
                    <Label htmlFor="requires_return_photo" className="cursor-pointer font-medium">
                      Exige foto na devolução
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Solicita foto ao devolver
                    </p>
                  </div>
                  <Switch
                    id="requires_return_photo"
                    checked={formData.requires_return_photo}
                    onCheckedChange={(v) => setFormData({ ...formData, requires_return_photo: v })}
                  />
                </div>

                <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                  formData.is_maintenance 
                    ? "border-destructive/30 bg-destructive/5" 
                    : "border-muted bg-muted/30"
                }`}>
                  <div className="space-y-0.5">
                    <Label htmlFor="is_maintenance" className="cursor-pointer font-medium">
                      Em manutenção
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {editingTool?.is_maintenance 
                        ? "Resolva a ocorrência para liberar" 
                        : "Indisponível para empréstimo"}
                    </p>
                  </div>
                  <Switch
                    id="is_maintenance"
                    checked={formData.is_maintenance}
                    onCheckedChange={(v) => setFormData({ ...formData, is_maintenance: v })}
                    disabled={editingTool?.is_maintenance === true}
                  />
                </div>

                <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                  formData.requires_kit 
                    ? "border-amber-500/30 bg-amber-500/5" 
                    : "border-muted bg-muted/30"
                }`}>
                  <div className="space-y-0.5">
                    <Label htmlFor="requires_kit" className="cursor-pointer font-medium">
                      Não faz parte de kit
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Requer kit completo
                    </p>
                  </div>
                  <Switch
                    id="requires_kit"
                    checked={formData.requires_kit}
                    onCheckedChange={(v) => setFormData({ ...formData, requires_kit: v })}
                  />
                </div>

                <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                  formData.allow_relend 
                    ? "border-green-500/30 bg-green-500/5" 
                    : "border-muted bg-muted/30"
                }`}>
                  <div className="space-y-0.5">
                    <Label htmlFor="allow_relend" className="cursor-pointer font-medium">
                      Permite reempréstimo
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Outros podem emprestar
                    </p>
                  </div>
                  <Switch
                    id="allow_relend"
                    checked={formData.allow_relend}
                    onCheckedChange={(v) => setFormData({ ...formData, allow_relend: v })}
                  />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer fixo */}
        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <div className="flex w-full gap-3 sm:justify-end">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.name.trim()}
              className="flex-1 sm:flex-none min-w-[140px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                editingTool ? "Salvar Alterações" : "Cadastrar Ferramenta"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
