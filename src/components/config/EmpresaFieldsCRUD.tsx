import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, GripVertical, Trash2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface CustomField {
  id: string;
  field_id: string;
  field_label: string;
  field_type: string;
  field_order: number;
  required: boolean;
  locked: boolean;
  options?: any;
  mask_type?: string;
  custom_mask?: string;
}

const fieldTypeOptions = [
  { value: "text", label: "Texto" },
  { value: "select", label: "Lista de opções" },
  { value: "checkbox", label: "Checkbox" },
  { value: "textarea", label: "Área de texto" },
  { value: "number", label: "Número" },
  { value: "date", label: "Data" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Telefone" },
];

const maskTypeOptions = [
  { value: "none", label: "Sem máscara" },
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "phone", label: "Telefone" },
  { value: "cep", label: "CEP" },
  { value: "date", label: "Data" },
  { value: "custom", label: "Personalizada" },
];

interface SortableFieldItemProps {
  field: CustomField;
  onRemove: (id: string) => void;
  onToggleRequired: (id: string) => void;
}

const SortableFieldItem = ({ field, onRemove, onToggleRequired }: SortableFieldItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 border rounded-md bg-white"
    >
      <div {...attributes} {...listeners} className="cursor-move">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      
      <div className="flex-1">
        <div className="font-medium">{field.field_label}</div>
        <div className="text-sm text-muted-foreground">
          {fieldTypeOptions.find(t => t.value === field.field_type)?.label || field.field_type}
          {field.mask_type && field.mask_type !== "none" && (
            <> • Máscara: {field.custom_mask || maskTypeOptions.find(m => m.value === field.mask_type)?.label}</>
          )}
          {field.options && Array.isArray(field.options) && (
            <> • {field.options.length} opções</>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={field.required}
          onCheckedChange={() => onToggleRequired(field.id)}
          disabled={field.locked}
        />
        <span className="text-sm text-muted-foreground">Obrigatório</span>
      </div>

      {!field.locked && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(field.id)}
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      )}
    </div>
  );
};

export const EmpresaFieldsCRUD = () => {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);

  // Form states
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [fieldRequired, setFieldRequired] = useState(false);
  const [maskType, setMaskType] = useState("none");
  const [customMask, setCustomMask] = useState("");
  const [selectOptions, setSelectOptions] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadEstabelecimento();
  }, []);

  useEffect(() => {
    if (estabelecimentoId) {
      loadFields();
      loadOrCreateMainFields();
    }
  }, [estabelecimentoId]);

  const loadOrCreateMainFields = async () => {
    if (!estabelecimentoId) return;

    try {
      // Campos principais que devem sempre existir
      const mainFields = [
        { field_id: "cpf_cnpj", field_label: "CPF/CNPJ", field_type: "text", field_order: 0, required: true, locked: true },
        { field_id: "company_name", field_label: "Razão Social", field_type: "text", field_order: 1, required: true, locked: false },
        { field_id: "company_fantasia", field_label: "Nome Fantasia", field_type: "text", field_order: 2, required: true, locked: false },
        { field_id: "email", field_label: "E-mail", field_type: "email", field_order: 3, required: false, locked: false },
        { field_id: "telefone", field_label: "Telefone", field_type: "phone", field_order: 4, required: false, locked: false },
        { field_id: "cep", field_label: "CEP", field_type: "text", field_order: 5, required: true, locked: false },
        { field_id: "address", field_label: "Endereço", field_type: "text", field_order: 6, required: true, locked: false },
        { field_id: "city", field_label: "Cidade", field_type: "text", field_order: 7, required: true, locked: false },
        { field_id: "neighborhood", field_label: "Bairro", field_type: "text", field_order: 8, required: false, locked: false },
        { field_id: "state", field_label: "UF", field_type: "text", field_order: 9, required: true, locked: false },
      ];

      // Verificar quais campos principais já existem
      const { data: existingFields } = await supabase
        .from("form_field_configs")
        .select("field_id")
        .eq("form_type", "empresa")
        .eq("estabelecimento_id", estabelecimentoId)
        .in("field_id", mainFields.map(f => f.field_id));

      const existingFieldIds = new Set(existingFields?.map(f => f.field_id) || []);

      // Inserir apenas os campos que ainda não existem
      const fieldsToInsert = mainFields
        .filter(field => !existingFieldIds.has(field.field_id))
        .map(field => ({
          estabelecimento_id: estabelecimentoId,
          form_type: "empresa",
          ...field,
          options: null,
        }));

      if (fieldsToInsert.length > 0) {
        const { error } = await supabase
          .from("form_field_configs")
          .insert(fieldsToInsert);

        if (error) {
          console.error("Error creating main fields:", error);
        } else {
          loadFields();
        }
      }
    } catch (error) {
      console.error("Error in loadOrCreateMainFields:", error);
    }
  };

  const loadEstabelecimento = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from("usuarios")
        .select("estabelecimento_id")
        .eq("id", user.id)
        .single();

      if (userData) {
        setEstabelecimentoId(userData.estabelecimento_id);
      }
    } catch (error) {
      console.error("Error loading estabelecimento:", error);
    }
  };

  const loadFields = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("form_field_configs")
        .select("*")
        .eq("form_type", "empresa")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("field_order", { ascending: true });

      if (error) throw error;

      setFields((data || []).map(field => {
        const options = field.options as any;
        return {
          ...field,
          mask_type: options?.mask_type,
          custom_mask: options?.custom_mask,
        };
      }));
    } catch (error) {
      console.error("Error loading fields:", error);
      toast.error("Erro ao carregar campos");
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = async () => {
    if (!fieldLabel.trim()) {
      toast.error("Digite o nome do campo");
      return;
    }

    if (!estabelecimentoId) {
      toast.error("Estabelecimento não identificado");
      return;
    }

    if (fieldType === "select" && !selectOptions.trim()) {
      toast.error("Digite as opções separadas por vírgula");
      return;
    }

    if (maskType === "custom" && !customMask.trim()) {
      toast.error("Digite a máscara personalizada (ex: XXX.XX/NN)");
      return;
    }

    try {
      const fieldId = fieldLabel.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "_");

      const options: any = {};
      if (fieldType === "select") {
        options.options = selectOptions.split(",").map(opt => opt.trim()).filter(opt => opt);
      }
      if (maskType !== "none") {
        options.mask_type = maskType;
        if (maskType === "custom") {
          options.custom_mask = customMask;
        }
      }

      const { error } = await supabase
        .from("form_field_configs")
        .insert({
          estabelecimento_id: estabelecimentoId,
          form_type: "empresa",
          field_id: fieldId,
          field_label: fieldLabel,
          field_type: fieldType,
          field_order: fields.length,
          required: fieldRequired,
          locked: false,
          options: Object.keys(options).length > 0 ? options : null,
        });

      if (error) throw error;

      toast.success("Campo adicionado com sucesso");
      loadFields();
      resetForm();
    } catch (error) {
      console.error("Error adding field:", error);
      toast.error("Erro ao adicionar campo");
    }
  };

  const resetForm = () => {
    setFieldLabel("");
    setFieldType("text");
    setFieldRequired(false);
    setMaskType("none");
    setCustomMask("");
    setSelectOptions("");
  };

  const handleRemoveField = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este campo?")) return;

    try {
      const { error } = await supabase
        .from("form_field_configs")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Campo removido");
      loadFields();
    } catch (error) {
      console.error("Error removing field:", error);
      toast.error("Erro ao remover campo");
    }
  };

  const handleToggleRequired = async (id: string) => {
    const field = fields.find(f => f.id === id);
    if (!field) return;

    try {
      const { error } = await supabase
        .from("form_field_configs")
        .update({ required: !field.required })
        .eq("id", id);

      if (error) throw error;

      loadFields();
    } catch (error) {
      console.error("Error updating field:", error);
      toast.error("Erro ao atualizar campo");
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex(f => f.id === active.id);
      const newIndex = fields.findIndex(f => f.id === over.id);

      const newFields = arrayMove(fields, oldIndex, newIndex);
      setFields(newFields);

      // Update field_order in database
      try {
        const updates = newFields.map((field, index) => ({
          id: field.id,
          field_order: index,
        }));

        for (const update of updates) {
          await supabase
            .from("form_field_configs")
            .update({ field_order: update.field_order })
            .eq("id", update.id);
        }

        toast.success("Ordem atualizada");
      } catch (error) {
        console.error("Error updating order:", error);
        toast.error("Erro ao atualizar ordem");
        loadFields();
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Adicionar Novo Campo
          </CardTitle>
          <CardDescription>
            Configure campos personalizados para o cadastro de empresas. Use N para números e X para caracteres em máscaras personalizadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do Campo</Label>
              <Input
                value={fieldLabel}
                onChange={(e) => setFieldLabel(e.target.value)}
                placeholder="ex: Inscrição Estadual"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo do Campo</Label>
              <Select value={fieldType} onValueChange={setFieldType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fieldTypeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {fieldType === "select" && (
            <div className="space-y-2">
              <Label>Opções (separadas por vírgula)</Label>
              <Input
                value={selectOptions}
                onChange={(e) => setSelectOptions(e.target.value)}
                placeholder="ex: Opção 1, Opção 2, Opção 3"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Máscara/Validação</Label>
              <Select value={maskType} onValueChange={setMaskType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {maskTypeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {maskType === "custom" && (
              <div className="space-y-2">
                <Label>Máscara Personalizada</Label>
                <Input
                  value={customMask}
                  onChange={(e) => setCustomMask(e.target.value)}
                  placeholder="ex: XXX.XX/NN (N=número, X=caracter)"
                />
                <p className="text-xs text-muted-foreground">
                  Use N para números, X para caracteres. Exemplo: XXX.XX/NN ficaria abc.de/12
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={fieldRequired}
              onCheckedChange={setFieldRequired}
            />
            <Label>Campo obrigatório</Label>
          </div>

          <Button onClick={handleAddField} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Campo
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Campos Configurados ({fields.length})</CardTitle>
          <CardDescription>
            Arraste para reordenar os campos. Campos principais aparecem primeiro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : fields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum campo configurado
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={fields.map(f => f.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {fields.map((field) => (
                    <SortableFieldItem
                      key={field.id}
                      field={field}
                      onRemove={handleRemoveField}
                      onToggleRequired={handleToggleRequired}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
