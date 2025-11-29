import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FieldMappingConfig {
  type: "field" | "fixed";
  value: string;
  format?: string;
}

interface CampoCustomizado {
  id: string;
  nome: string;
  campo_key: string;
  tipo: string;
  opcoes: any;
  obrigatorio: boolean;
  unidade: string | null;
}

interface Props {
  selectedFields: string[];
  selectedGrupoId: string;
  fieldMapping: Record<string, FieldMappingConfig>;
  onMappingChange: (mapping: Record<string, FieldMappingConfig>) => void;
}

const STANDARD_FIELDS = [
  { value: "codigo", label: "Código", required: false },
  { value: "nome", label: "Nome", required: true },
  { value: "descricao", label: "Descrição", required: false },
  { value: "preco", label: "Preço", required: false },
  { value: "unidade", label: "Unidade", required: false },
  { value: "estoque", label: "Estoque", required: false },
  { value: "codigo_barras", label: "Código de Barras", required: false },
  { value: "ncm", label: "NCM", required: false },
  { value: "marca", label: "Marca", required: false },
  { value: "modelo", label: "Modelo", required: false },
  { value: "peso", label: "Peso", required: false },
  { value: "peso_bruto", label: "Peso Bruto", required: false },
  { value: "observacoes", label: "Observações", required: false },
];

const FORMAT_OPTIONS = [
  { value: "none", label: "Sem formatação" },
  { value: "uppercase", label: "MAIÚSCULAS" },
  { value: "lowercase", label: "minúsculas" },
  { value: "capitalize", label: "Primeira Maiúscula" },
  { value: "number", label: "Número" },
  { value: "decimal", label: "Decimal (0.00)" },
];

export function ApiImportWizardStep5({ 
  selectedFields, 
  selectedGrupoId, 
  fieldMapping, 
  onMappingChange 
}: Props) {
  const [customFields, setCustomFields] = useState<CampoCustomizado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedGrupoId) {
      loadCustomFields();
    }
  }, [selectedGrupoId]);

  const loadCustomFields = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("produto_campos_customizados")
        .select("*")
        .eq("grupo_id", selectedGrupoId)
        .eq("ativo", true)
        .order("ordem");

      if (error) throw error;
      setCustomFields(data || []);
    } catch (error) {
      console.error("Erro ao carregar campos customizados:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateMapping = (targetField: string, config: FieldMappingConfig | null) => {
    const newMapping = { ...fieldMapping };
    if (!config) {
      delete newMapping[targetField];
    } else {
      newMapping[targetField] = config;
    }
    onMappingChange(newMapping);
  };

  const updateMappingType = (targetField: string, type: "field" | "fixed") => {
    const current = fieldMapping[targetField];
    updateMapping(targetField, {
      type,
      value: type === "field" ? "none" : "",
      format: current?.format || "none",
    });
  };

  const updateMappingValue = (targetField: string, value: string) => {
    const current = fieldMapping[targetField];
    if (value === "none") {
      delete fieldMapping[targetField];
      onMappingChange({ ...fieldMapping });
    } else {
      updateMapping(targetField, {
        type: current?.type || "field",
        value,
        format: current?.format || "none",
      });
    }
  };

  const updateMappingFormat = (targetField: string, format: string) => {
    const current = fieldMapping[targetField];
    updateMapping(targetField, {
      type: current?.type || "field",
      value: current?.value || "none",
      format,
    });
  };

  const renderFieldMapping = (
    fieldKey: string,
    fieldLabel: string,
    required: boolean = false,
    options?: string[]
  ) => {
    const config = fieldMapping[fieldKey];
    const mappingType = config?.type || "field";

    return (
      <Card key={fieldKey} className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label className="flex items-center gap-2">
                {fieldLabel}
                {required && (
                  <Badge variant="destructive" className="text-xs">
                    Obrigatório
                  </Badge>
                )}
              </Label>
            </div>

            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />

            <div className="flex-1">
              <RadioGroup
                value={mappingType}
                onValueChange={(value) => updateMappingType(fieldKey, value as "field" | "fixed")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="field" id={`${fieldKey}-field`} />
                  <Label htmlFor={`${fieldKey}-field`} className="font-normal cursor-pointer text-sm">
                    Mapear
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed" id={`${fieldKey}-fixed`} />
                  <Label htmlFor={`${fieldKey}-fixed`} className="font-normal cursor-pointer text-sm">
                    Fixo
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="flex gap-3">
            {mappingType === "field" ? (
              <Select
                value={config?.value || "none"}
                onValueChange={(value) => updateMappingValue(fieldKey, value)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione um campo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">(Não mapear)</span>
                  </SelectItem>
                  {selectedFields.map(field => (
                    <SelectItem key={field} value={field}>
                      {field}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : options ? (
              <Select
                value={config?.value || ""}
                onValueChange={(value) => updateMappingValue(fieldKey, value)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione uma opção..." />
                </SelectTrigger>
                <SelectContent>
                  {options.map(option => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="Digite o valor fixo..."
                value={config?.value || ""}
                onChange={(e) => updateMappingValue(fieldKey, e.target.value)}
                className="flex-1"
              />
            )}

            <Select
              value={config?.format || "none"}
              onValueChange={(value) => updateMappingFormat(fieldKey, value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Formatação..." />
              </SelectTrigger>
              <SelectContent>
                {FORMAT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>
    );
  };

  const getMappedCount = () => {
    return Object.keys(fieldMapping).filter(k => fieldMapping[k]?.value && fieldMapping[k]?.value !== "none").length;
  };

  const totalFields = STANDARD_FIELDS.length + customFields.length;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Mapeamento de Campos</h3>
        <p className="text-sm text-muted-foreground">
          Mapeie os campos da API para os campos do cadastro de produtos
        </p>
      </div>

      <div className="flex items-center justify-between">
        <Badge variant="secondary">
          {getMappedCount()} de {totalFields} campos mapeados
        </Badge>
      </div>

      <Tabs defaultValue="standard" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="standard">
            Campos Padrão ({STANDARD_FIELDS.length})
          </TabsTrigger>
          <TabsTrigger value="custom">
            Campos Customizados ({customFields.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="standard" className="mt-4">
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {STANDARD_FIELDS.map((field) => 
                renderFieldMapping(field.value, field.label, field.required)
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="custom" className="mt-4">
          <ScrollArea className="h-[400px] pr-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando campos customizados...
              </div>
            ) : customFields.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum campo customizado encontrado para este grupo
              </div>
            ) : (
              <div className="space-y-3">
                {customFields.map((campo) => 
                  renderFieldMapping(
                    `custom_${campo.campo_key}`,
                    `${campo.nome}${campo.unidade ? ` (${campo.unidade})` : ""}`,
                    campo.obrigatorio,
                    campo.tipo === "selecao" && campo.opcoes ? campo.opcoes : undefined
                  )
                )}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <div className="bg-muted/50 rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          💡 <strong>Dica:</strong> Campos não mapeados serão ignorados durante a importação.
        </p>
      </div>
    </div>
  );
}
