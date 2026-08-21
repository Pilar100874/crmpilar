import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ImageUploadCrop } from "@/components/ImageUploadCrop";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase, Tool, Warehouse, Kit, ToolType } from "@/lib/supabase";
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
  ArrowLeft,
  Save,
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

export default function ToolFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { isAdmin, isAlmoxarifado, isLoading: authLoading, profile } = useAuth();

  const isEditing = Boolean(id);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLinkedToKit, setIsLinkedToKit] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
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
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [warehousesRes, kitsRes] = await Promise.all([
        supabase.from("warehouses").select("*").order("name"),
        supabase.from("kits").select("*").order("name"),
      ]);

      setWarehouses((warehousesRes.data as Warehouse[]) || []);
      setKits((kitsRes.data as Kit[]) || []);

      // Se estiver editando, buscar dados da ferramenta
      if (id) {
        const [toolRes, kitToolsRes] = await Promise.all([
          supabase.from("tools").select("*").eq("id", id).single(),
          supabase.from("kit_tools").select("id").eq("tool_id", id).limit(1),
        ]);

        if (toolRes.error) throw toolRes.error;

        const tool = toolRes.data;
        if (tool) {
          setFormData({
            name: tool.name,
            type: tool.type,
            purchase_date: tool.purchase_date || "",
            purchase_value: tool.purchase_value?.toString() || "",
            description: tool.description || "",
            serial_number: tool.serial_number || "",
            warehouse_id: tool.warehouse_id || "",
            kit_id: tool.kit_id || "",
            photo_url: tool.photo_url || null,
            requires_return_photo: tool.requires_return_photo ?? false,
            is_maintenance: tool.is_maintenance ?? false,
            requires_kit: tool.requires_kit ?? false,
            allow_relend: (tool as any).allow_relend !== false,
          });
        }

        // Verificar se está vinculada a algum kit
        setIsLinkedToKit((kitToolsRes.data?.length || 0) > 0);
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ variant: "destructive", title: "Nome é obrigatório" });
      return;
    }

    if (!formData.warehouse_id) {
      toast({ variant: "destructive", title: "Almoxarifado é obrigatório" });
      return;
    }

    setIsSubmitting(true);

    const toolData = {
      name: formData.name,
      type: formData.type,
      purchase_date: formData.purchase_date || null,
      purchase_value: formData.purchase_value ? parseFloat(formData.purchase_value) : null,
      description: formData.description || null,
      serial_number: formData.serial_number || null,
      warehouse_id: formData.warehouse_id || null,
      kit_id: formData.kit_id || null,
      photo_url: formData.photo_url || null,
      requires_return_photo: formData.requires_return_photo,
      is_maintenance: formData.is_maintenance,
      requires_kit: formData.requires_kit,
      allow_relend: formData.allow_relend,
      company_id: profile?.company_id || null,
    };

    try {
      if (isEditing && id) {
        const { error } = await supabase
          .from("tools")
          .update(toolData)
          .eq("id", id);
        if (error) throw error;
        toast({ title: "Ferramenta atualizada com sucesso!" });
      } else {
        const { error } = await supabase.from("tools").insert(toolData);
        if (error) throw error;
        toast({ title: "Ferramenta cadastrada com sucesso!" });
      }
      navigate("/tools");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canManage = isAdmin || isAlmoxarifado;

  // Redirect se não tiver permissão
  useEffect(() => {
    if (!authLoading && !canManage) {
      navigate("/tools");
    }
  }, [authLoading, canManage, navigate]);

  if (authLoading || isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title={isEditing ? "Editar Ferramenta" : "Nova Ferramenta"}
        description={isEditing ? "Atualize os dados da ferramenta" : "Preencha os dados para cadastrar"}
        action={
          <Button variant="outline" onClick={() => navigate("/tools")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        }
      />

      <Card className="max-w-4xl">
        <CardContent className="p-6 space-y-6">
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
                  Almoxarifado *
                </Label>
                <Select
                  value={formData.warehouse_id || ""}
                  onValueChange={(v) => setFormData({ ...formData, warehouse_id: v })}
                >
                  <SelectTrigger className={!formData.warehouse_id ? "border-destructive/50" : ""}>
                    <SelectValue placeholder="Selecione o almoxarifado" />
                  </SelectTrigger>
                  <SelectContent>
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
                  <Label htmlFor="is_maintenance" className={`font-medium ${isEditing && formData.is_maintenance ? "cursor-not-allowed" : "cursor-pointer"}`}>
                    Em manutenção
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {isEditing && formData.is_maintenance 
                      ? "Resolva a ocorrência para liberar" 
                      : "Indisponível para empréstimo"}
                  </p>
                </div>
                <Switch
                  id="is_maintenance"
                  checked={formData.is_maintenance}
                  onCheckedChange={(v) => setFormData({ ...formData, is_maintenance: v })}
                  disabled={isEditing && formData.is_maintenance}
                />
              </div>

              <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                isLinkedToKit
                  ? "border-muted bg-muted/30 opacity-60"
                  : formData.requires_kit 
                  ? "border-amber-500/30 bg-amber-500/5" 
                  : "border-muted bg-muted/30"
              }`}>
                <div className="space-y-0.5">
                  <Label htmlFor="requires_kit" className={`font-medium ${isLinkedToKit ? "cursor-not-allowed" : "cursor-pointer"}`}>
                    Não faz parte de kit
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {isLinkedToKit 
                      ? "Esta ferramenta está vinculada a um kit" 
                      : "Requer kit completo"}
                  </p>
                </div>
                <Switch
                  id="requires_kit"
                  checked={formData.requires_kit}
                  onCheckedChange={(v) => setFormData({ ...formData, requires_kit: v })}
                  disabled={isLinkedToKit}
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

          <Separator />

          {/* Footer com botões */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate("/tools")}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isEditing ? "Salvar Alterações" : "Cadastrar Ferramenta"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
