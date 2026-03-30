import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, GripVertical, Trash2, Settings2 } from "lucide-react";
import { toast } from "@/lib/toast-config";
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
  onChanged?: () => void;
}

const SortableFieldItem = ({ field, onRemove, onToggleRequired, onChanged }: SortableFieldItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
  const [isLocked, setIsLocked] = useState(field.locked);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleToggleLocked = async () => {
    // Tipo e CPF/CNPJ são campos de entrada manual, nunca bloqueados
    if (field.field_id === "cpf_cnpj" || field.field_id === "company_type") {
      toast.error("Campos de entrada manual não podem ser bloqueados");
      return;
    }
    
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error } = await supabase
        .from("form_field_configs")
        .update({ locked: !isLocked })
        .eq("id", field.id);

      if (error) throw error;

      setIsLocked(!isLocked);
      onChanged?.();
      const { toast } = await import("sonner");
      toast.success("Campo atualizado");
    } catch (error) {
      console.error("Error updating locked status:", error);
      const { toast } = await import("sonner");
      toast.error("Erro ao atualizar campo");
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 border rounded-md bg-card dark:bg-card"
    >
      <div {...attributes} {...listeners} className="cursor-move">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      
      <div className="flex-1">
        <div className="font-medium flex items-center gap-2">
          {field.field_label}
          {field.field_id === "cpf_cnpj" && (
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
              Chave Única - Sempre Obrigatório
            </span>
          )}
          {field.field_id === "company_type" && (
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
              Sempre Obrigatório
            </span>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {fieldTypeOptions.find(t => t.value === field.field_type)?.label || field.field_type}
          {field.mask_type && field.mask_type !== "none" && (
            <> • Máscara: {field.custom_mask || maskTypeOptions.find(m => m.value === field.mask_type)?.label}</>
          )}
          {field.field_type === "select" && field.options && Array.isArray((field.options as any)?.options || field.options) && (
            <> • {((field.options as any)?.options || field.options).length} opções</>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            checked={field.required}
            onCheckedChange={() => onToggleRequired(field.id)}
            disabled={field.field_id === "cpf_cnpj" || field.field_id === "company_type" || field.field_id === "telefone"}
          />
          <span className="text-sm text-muted-foreground whitespace-nowrap">Obrigatório</span>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={isLocked}
            onCheckedChange={handleToggleLocked}
          />
          <span className="text-sm text-muted-foreground whitespace-nowrap">Auto-preenchido</span>
        </div>
      </div>

      {field.field_id !== "cpf_cnpj" && field.field_id !== "company_type" && (
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

export const EmpresaFieldsCRUD = ({ onChanged, estabelecimentoId: estabelecimentoIdProp }: { onChanged?: () => void; estabelecimentoId?: string | null }) => {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(estabelecimentoIdProp || null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<string | null>(null);

  // Form states
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldLocked, setFieldLocked] = useState(false);
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
    if (estabelecimentoIdProp) {
      console.log('➡️ Using estabelecimentoId from props:', estabelecimentoIdProp);
      setEstabelecimentoId(estabelecimentoIdProp);
      return;
    }
    loadEstabelecimento();
  }, [estabelecimentoIdProp]);

  useEffect(() => {
    if (estabelecimentoId && !isInitializing) {
      initializeFields();
    }
  }, [estabelecimentoId]);

  const initializeFields = async () => {
    setIsInitializing(true);
    await loadOrCreateMainFields();
    await loadFields();
    setIsInitializing(false);
  };

  const loadOrCreateMainFields = async () => {
    if (!estabelecimentoId) {
      console.log('❌ No estabelecimento ID in loadOrCreateMainFields');
      return;
    }

    console.log('🔄 Starting loadOrCreateMainFields for estabelecimento:', estabelecimentoId);

    try {
      // Campos principais que devem sempre existir
      const mainFields = [
        { field_id: "company_type", field_label: "Tipo", field_type: "select", field_order: 0, required: true, locked: false, options: { options: ["Pessoa Física", "Pessoa Jurídica"] } },
        { field_id: "cpf_cnpj", field_label: "CPF/CNPJ", field_type: "text", field_order: 1, required: true, locked: false },
        { field_id: "company_name", field_label: "Nome", field_type: "text", field_order: 2, required: true, locked: true },
        { field_id: "company_fantasia", field_label: "Nome Fantasia", field_type: "text", field_order: 3, required: true, locked: true },
        { field_id: "cep", field_label: "CEP", field_type: "text", field_order: 4, required: true, locked: false },
        { field_id: "address", field_label: "Endereço", field_type: "text", field_order: 5, required: true, locked: true },
        { field_id: "city", field_label: "Cidade", field_type: "text", field_order: 6, required: true, locked: true },
        { field_id: "neighborhood", field_label: "Bairro", field_type: "text", field_order: 7, required: true, locked: true },
        { field_id: "state", field_label: "UF", field_type: "text", field_order: 8, required: true, locked: true },
        { field_id: "inscricao", field_label: "Inscrição", field_type: "text", field_order: 9, required: false, locked: true },
        { field_id: "telefone", field_label: "Telefone", field_type: "phone", field_order: 10, required: false, locked: true },
        { field_id: "email", field_label: "E-mail", field_type: "email", field_order: 11, required: false, locked: true },
      ];

      console.log('📋 Main fields to check:', mainFields.map(f => f.field_id).join(', '));

      // Verificar quais campos principais já existem
      const { data: existingFields, error: selectError } = await supabase
        .from("form_field_configs")
        .select("field_id")
        .eq("form_type", "empresa")
        .eq("estabelecimento_id", estabelecimentoId)
        .in("field_id", mainFields.map(f => f.field_id));

      if (selectError) {
        console.error('❌ Error checking existing fields:', selectError);
      } else {
        console.log('✅ Existing fields:', existingFields?.map(f => f.field_id).join(', ') || 'none');
      }

      const existingFieldIds = new Set(existingFields?.map(f => f.field_id) || []);

      // Inserir apenas os campos que ainda não existem
      const fieldsToInsert = mainFields
        .filter(field => !existingFieldIds.has(field.field_id))
        .map(field => ({
          estabelecimento_id: estabelecimentoId,
          form_type: "empresa",
          field_id: field.field_id,
          field_label: field.field_label,
          field_type: field.field_type,
          field_order: field.field_order,
          required: field.required,
          locked: field.locked,
          options: field.options || null,
        }));

      if (fieldsToInsert.length > 0) {
        console.log('📝 Inserting', fieldsToInsert.length, 'fields:', fieldsToInsert.map(f => f.field_id).join(', '));
        
        const { error } = await supabase
          .from("form_field_configs")
          .insert(fieldsToInsert);

        if (error) {
          console.error("❌ Error creating main fields:", error);
          toast.error("Erro ao criar campos principais: " + error.message);
        } else {
          console.log('✅ Fields created successfully');
          loadFields();
        }
      } else {
        console.log('✅ All main fields already exist');
      }
    } catch (error) {
      console.error("❌ Error in loadOrCreateMainFields:", error);
    }
  };

  const loadEstabelecimento = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ No user found');
        return;
      }

      console.log('✅ User found:', user.id);

      // Check if user is admin by email pattern
      const email = user.email || '';
      const isAdmin = email.includes('admin_') && email.includes('@sistema.local');
      
      if (isAdmin) {
        console.log('✅ Admin user detected, checking for estabelecimento');
        // Admin user - get any estabelecimento
        const { data: estabelecimentos } = await supabase
          .from("estabelecimentos")
          .select("id")
          .limit(1);

        if (estabelecimentos && estabelecimentos.length > 0) {
          console.log('✅ Found estabelecimento:', estabelecimentos[0].id);
          setEstabelecimentoId(estabelecimentos[0].id);
        } else {
          console.log('❌ No estabelecimento found');
        }
        return;
      }

      const { data: userData, error } = await supabase
        .from("usuarios")
        .select("estabelecimento_id")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error('❌ Error loading user data:', error);
      }

      if (userData) {
        console.log('✅ User estabelecimento_id:', userData.estabelecimento_id);
        setEstabelecimentoId(userData.estabelecimento_id);
      } else {
        console.log('❌ No user data found');
      }
    } catch (error) {
      console.error("❌ Error loading estabelecimento:", error);
    }
  };

  const loadFields = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading fields from database...');
      const { data, error } = await supabase
        .from("form_field_configs")
        .select("*")
        .eq("form_type", "empresa")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("field_order", { ascending: true });

      if (error) throw error;

      console.log('✅ Fields loaded:', data?.length, 'fields');
      console.log('📋 Fields details:', data?.map(f => ({ 
        id: f.field_id, 
        required: f.required,
        locked: f.locked 
      })));

      setFields((data || []).map(field => {
        const options = field.options as any;
        return {
          ...field,
          mask_type: options?.mask_type,
          custom_mask: options?.custom_mask,
          options: options?.options || field.options,
        };
      }));
    } catch (error) {
      console.error("❌ Error loading fields:", error);
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
          locked: fieldLocked,
          options: Object.keys(options).length > 0 ? options : null,
        });

      if (error) throw error;

      toast.success("Campo adicionado com sucesso");
      loadFields();
      resetForm();
      onChanged?.();
    } catch (error) {
      console.error("Error adding field:", error);
      toast.error("Erro ao adicionar campo");
    }
  };

  const resetForm = () => {
    setFieldLabel("");
    setFieldType("text");
    setFieldRequired(false);
    setFieldLocked(false);
    setMaskType("none");
    setCustomMask("");
    setSelectOptions("");
  };

  const handleRemoveField = async (id: string) => {
    setFieldToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteField = async () => {
    if (!fieldToDelete) return;

    try {
      const { error } = await supabase
        .from("form_field_configs")
        .delete()
        .eq("id", fieldToDelete);

      if (error) throw error;

      toast.success("Campo removido");
      loadFields();
      onChanged?.();
      setDeleteDialogOpen(false);
      setFieldToDelete(null);
    } catch (error) {
      console.error("Error removing field:", error);
      toast.error("Erro ao remover campo");
    }
  };

  const handleToggleRequired = async (id: string) => {
    const field = fields.find(f => f.id === id);
    if (!field) return;

    console.log('🔄 Toggling required for field:', field.field_id, 'from', field.required, 'to', !field.required);

    try {
      const { error } = await supabase
        .from("form_field_configs")
        .update({ required: !field.required })
        .eq("id", id);

      if (error) throw error;

      console.log('✅ Database updated successfully');
      await loadFields();
      console.log('✅ Fields reloaded in CRUD');
      toast.success(`Campo "${field.field_label}" atualizado`);
      onChanged?.();
      console.log('✅ onChanged callback invoked');
    } catch (error) {
      console.error("❌ Error updating field:", error);
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

          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={fieldRequired}
                onCheckedChange={setFieldRequired}
              />
              <Label>Campo obrigatório</Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                checked={fieldLocked}
                onCheckedChange={setFieldLocked}
              />
              <Label>Auto-preenchido (não pode ser editado manualmente)</Label>
            </div>
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
            Configure todos os campos do cadastro de empresas. CPF/CNPJ é sempre obrigatório. "Auto-preenchido" indica campos preenchidos automaticamente (ex: via busca CNPJ) que não podem ser editados manualmente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading || isInitializing ? (
            <div className="text-center py-8 text-muted-foreground">Carregando campos...</div>
          ) : fields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum campo configurado. Aguarde...
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
                      onChanged={onChanged}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este campo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteField}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
