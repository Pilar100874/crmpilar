import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, Building2, AlertCircle } from "lucide-react";
import { Node } from "@xyflow/react";
import { useMemo } from "react";

interface EmpresaFieldValidatorProps {
  selectedNode: Node | null;
  context: Record<string, any>;
}

interface FieldValidation {
  fieldName: string;
  label: string;
  value: string;
  isValid: boolean;
  expectedFormat: string;
  errorMessage?: string;
}

// Função para interpolar variáveis no template
const interpolateTemplate = (template: string, context: Record<string, any>): string => {
  if (!template) return "";
  
  return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    const value = context[varName];
    return value !== undefined && value !== null ? String(value) : match;
  });
};

// Funções de validação
const validateCNPJ = (value: string): boolean => {
  if (!value) return false;
  const cleaned = value.replace(/\D/g, "");
  return cleaned.length === 14 && /^\d+$/.test(cleaned);
};

const validateCEP = (value: string): boolean => {
  if (!value) return false;
  const cleaned = value.replace(/\D/g, "");
  return cleaned.length === 8 && /^\d+$/.test(cleaned);
};

const validateTelefone = (value: string): boolean => {
  if (!value) return false;
  const cleaned = value.replace(/\D/g, "");
  return cleaned.length >= 10 && cleaned.length <= 11 && /^\d+$/.test(cleaned);
};

const validateEmail = (value: string): boolean => {
  if (!value) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value.toLowerCase());
};

const validateEstado = (value: string): boolean => {
  if (!value) return false;
  const estados = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
    "RS", "RO", "RR", "SC", "SP", "SE", "TO"
  ];
  return estados.includes(value.toUpperCase());
};

const validateText = (value: string): boolean => {
  return value !== undefined && value !== null && value.trim().length > 0;
};

// Mapear validações para cada campo
const fieldValidators: Record<string, {
  validate: (value: string) => boolean;
  format: string;
}> = {
  cnpj: { validate: validateCNPJ, format: "14 dígitos numéricos" },
  cep: { validate: validateCEP, format: "8 dígitos numéricos" },
  telefone: { validate: validateTelefone, format: "10-11 dígitos numéricos (DDD + número)" },
  email: { validate: validateEmail, format: "email@exemplo.com" },
  estado: { validate: validateEstado, format: "Sigla UF (ex: SP, RJ, MG)" },
  razao_social: { validate: validateText, format: "Texto não vazio" },
  nome_fantasia: { validate: validateText, format: "Texto não vazio" },
  endereco: { validate: validateText, format: "Texto não vazio" },
  cidade: { validate: validateText, format: "Texto não vazio" },
};

// Labels amigáveis para os campos
const fieldLabels: Record<string, string> = {
  cnpj: "CNPJ",
  razao_social: "Nome",
  nome_fantasia: "Nome Fantasia",
  email: "E-mail",
  telefone: "Telefone",
  endereco: "Endereço",
  cidade: "Cidade",
  estado: "UF",
  cep: "CEP",
  bairro: "Bairro",
};

export function EmpresaFieldValidator({ selectedNode, context }: EmpresaFieldValidatorProps) {
  const validations = useMemo((): FieldValidation[] => {
    if (!selectedNode) return [];
    
    const nodeData = selectedNode.data as any;
    if (nodeData.type !== "crm_cadastro_empresa") return [];
    
    const config = nodeData.config || {};
    const fieldMappings = config.fieldMappings || {};
    
    const results: FieldValidation[] = [];
    
    // Campos permitidos para validação
    const allowedFields = new Set(["cnpj","razao_social","nome_fantasia","cep","endereco","cidade","bairro","estado"]);
    
    // Processar cada campo mapeado
    for (const [fieldName, variableTemplate] of Object.entries(fieldMappings)) {
      if (!allowedFields.has(fieldName)) continue;
      if (variableTemplate && typeof variableTemplate === 'string') {
        // Interpolar o valor
        const interpolatedValue = interpolateTemplate(variableTemplate, context);
        
        // Verificar se tem validador para este campo
        const validator = fieldValidators[fieldName];
        
        if (validator) {
          const isValid = validator.validate(interpolatedValue);
          results.push({
            fieldName,
            label: fieldLabels[fieldName] || fieldName,
            value: interpolatedValue,
            isValid,
            expectedFormat: validator.format,
            errorMessage: isValid ? undefined : `Formato inválido. Esperado: ${validator.format}`,
          });
        } else {
          // Campo sem validação específica, apenas verifica se não está vazio
          results.push({
            fieldName,
            label: fieldLabels[fieldName] || fieldName,
            value: interpolatedValue,
            isValid: validateText(interpolatedValue),
            expectedFormat: "Texto não vazio",
            errorMessage: validateText(interpolatedValue) ? undefined : "Campo vazio ou inválido",
          });
        }
      }
    }
    
    return results;
  }, [selectedNode, context]);
  
  const isEmpresaCadastroBlock = selectedNode?.data && (selectedNode.data as any).type === "crm_cadastro_empresa";
  const invalidFields = validations.filter(v => !v.isValid);
  const hasInvalidFields = invalidFields.length > 0;
  
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 bg-white border-border text-foreground/80 hover:bg-muted hover:text-foreground"
          title="Validar campos do cadastro de empresa"
          disabled={!isEmpresaCadastroBlock}
        >
          <Building2 className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[600px] sm:w-[800px] bg-white border-border">
        <SheetHeader>
          <SheetTitle className="text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Validação de Campos - Cadastro de Empresa
          </SheetTitle>
          <SheetDescription className="text-foreground/70">
            Valores atuais e validação de formato dos campos configurados
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {/* Resumo */}
          <div className="mb-4 p-4 rounded-lg border-2 bg-gradient-to-r from-slate-50 to-blue-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Total de campos: {validations.length}
                </p>
                <p className="text-xs text-foreground/70 mt-1">
                  Válidos: {validations.length - invalidFields.length} | 
                  Inválidos: {invalidFields.length}
                </p>
              </div>
              {hasInvalidFields ? (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm font-semibold">Atenção: Campos inválidos</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-semibold">Todos os campos válidos</span>
                </div>
              )}
            </div>
          </div>

          {validations.length === 0 ? (
            <div className="bg-muted border border-border rounded-lg p-8 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/60 mx-auto mb-3" />
              <p className="text-foreground/70">Nenhum campo configurado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Configure os campos no painel de propriedades do bloco
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="bg-white border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-muted bg-primary/5">
                      <TableHead className="text-foreground font-bold w-[180px]">Campo</TableHead>
                      <TableHead className="text-foreground font-bold">Valor Atual</TableHead>
                      <TableHead className="text-foreground font-bold w-[200px]">Formato Esperado</TableHead>
                      <TableHead className="text-foreground font-bold w-[100px] text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validations.map((validation, index) => (
                      <TableRow 
                        key={index}
                        className={`border-border ${validation.isValid ? 'hover:bg-green-50/30' : 'hover:bg-red-50/30 bg-red-50/20'}`}
                      >
                        <TableCell className="align-top font-semibold text-foreground">
                          {validation.label}
                          <div className="text-xs text-muted-foreground font-normal mt-0.5">
                            {validation.fieldName}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <code 
                            className={`text-sm font-mono ${validation.isValid ? 'text-foreground bg-muted' : 'text-red-900 bg-red-50'} px-2 py-1 rounded border ${validation.isValid ? 'border-border' : 'border-red-300'} break-all max-w-full inline-block`}
                          >
                            {validation.value || <span className="text-muted-foreground italic">(vazio)</span>}
                          </code>
                          {validation.errorMessage && (
                            <p className="text-xs text-red-600 mt-1 flex items-start gap-1">
                              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              {validation.errorMessage}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="text-xs text-foreground/70 bg-muted px-2 py-1 rounded border border-border">
                            {validation.expectedFormat}
                          </div>
                        </TableCell>
                        <TableCell className="align-top text-center">
                          {validation.isValid ? (
                            <Badge 
                              variant="outline" 
                              className="text-green-700 border-green-300 bg-green-50 whitespace-nowrap"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Válido
                            </Badge>
                          ) : (
                            <Badge 
                              variant="outline" 
                              className="text-red-700 border-red-300 bg-red-50 whitespace-nowrap"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Inválido
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Dicas de formato */}
              <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-xs font-semibold text-primary mb-2">💡 Formatos esperados:</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-primary/80">
                  <div><strong>CNPJ:</strong> Apenas números (14 dígitos)</div>
                  <div><strong>CEP:</strong> Apenas números (8 dígitos)</div>
                  <div><strong>Telefone:</strong> DDD + número (10-11 dígitos)</div>
                  <div><strong>E-mail:</strong> formato@exemplo.com</div>
                  <div><strong>Estado:</strong> Sigla de 2 letras (SP, RJ, MG, etc)</div>
                  <div><strong>Textos:</strong> Não podem estar vazios</div>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
