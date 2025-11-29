import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Package, Truck, DollarSign, Barcode } from "lucide-react";
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
  { value: "ncm", label: "NCM", required: false },
  { value: "gramatura", label: "Gramatura", required: false },
  { value: "numero_folhas", label: "Número de Folhas", required: false },
  { value: "foto_url", label: "URL da Foto", required: false },
  { value: "ativo", label: "Ativo", required: false },
];

const FREIGHT_FIELDS = [
  { value: "peso_unitario", label: "Peso Unitário (kg)", required: false },
  { value: "peso_frete_tipo", label: "Tipo de Cálculo de Peso", required: false },
  { value: "altura", label: "Altura (cm)", required: false },
  { value: "largura", label: "Largura (cm)", required: false },
  { value: "comprimento", label: "Comprimento (cm)", required: false },
  { value: "cubagem", label: "Cubagem (m³)", required: false },
  { value: "fragil", label: "Frágil", required: false },
  { value: "empilhamento_maximo", label: "Empilhamento Máximo", required: false },
  { value: "observacoes_frete", label: "Observações do Frete", required: false },
  { value: "valor_seguro", label: "Valor do Seguro (R$)", required: false },
];

const PACKAGING_FIELDS = [
  { value: "ean_13", label: "EAN-13", required: false },
  { value: "ean_14_1", label: "EAN-14 (Caixa Mestre)", required: false },
  { value: "ean_14_2", label: "EAN-14 (Caixa Mestre 2)", required: false },
  { value: "embalagem_peso", label: "Peso da Embalagem (kg)", required: false },
  { value: "embalagem_altura", label: "Altura da Embalagem (cm)", required: false },
  { value: "embalagem_largura", label: "Largura da Embalagem (cm)", required: false },
  { value: "embalagem_comprimento", label: "Comprimento da Embalagem (cm)", required: false },
];

const PRICE_FIELDS = [
  { value: "preco_tabela", label: "Preço de Tabela (R$)", required: false },
  { value: "preco_minimo", label: "Preço Mínimo (R$)", required: false },
  { value: "tipo_preco", label: "Tipo de Preço", required: false },
  { value: "preco_ativo", label: "Preço Ativo", required: false },
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

  const totalFields = STANDARD_FIELDS.length + FREIGHT_FIELDS.length + PACKAGING_FIELDS.length + PRICE_FIELDS.length + customFields.length;

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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="standard" className="flex items-center gap-1 text-xs">
            <Package className="h-3 w-3" />
            <span className="hidden sm:inline">Padrão</span>
            <span className="sm:hidden">Pad</span>
            ({STANDARD_FIELDS.length})
          </TabsTrigger>
          <TabsTrigger value="freight" className="flex items-center gap-1 text-xs">
            <Truck className="h-3 w-3" />
            <span className="hidden sm:inline">Frete</span>
            <span className="sm:hidden">Frt</span>
            ({FREIGHT_FIELDS.length})
          </TabsTrigger>
          <TabsTrigger value="packaging" className="flex items-center gap-1 text-xs">
            <Barcode className="h-3 w-3" />
            <span className="hidden sm:inline">Embalagem</span>
            <span className="sm:hidden">Emb</span>
            ({PACKAGING_FIELDS.length})
          </TabsTrigger>
          <TabsTrigger value="price" className="flex items-center gap-1 text-xs">
            <DollarSign className="h-3 w-3" />
            <span className="hidden sm:inline">Preço</span>
            <span className="sm:hidden">Pre</span>
            ({PRICE_FIELDS.length})
          </TabsTrigger>
          <TabsTrigger value="custom" className="text-xs">
            <span className="hidden sm:inline">Custom</span>
            <span className="sm:hidden">Cus</span>
            ({customFields.length})
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

        <TabsContent value="freight" className="mt-4">
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {FREIGHT_FIELDS.map((field) => 
                renderFieldMapping(field.value, field.label, field.required)
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="packaging" className="mt-4">
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {PACKAGING_FIELDS.map((field) => 
                renderFieldMapping(field.value, field.label, field.required)
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="price" className="mt-4">
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {PRICE_FIELDS.map((field) => 
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
