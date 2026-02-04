import { useState, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Upload, Download, FileSpreadsheet, CheckCircle, XCircle, 
  AlertTriangle, ArrowLeft, ArrowRight, Loader2, FileWarning,
  User, Phone, Mail, Tag, Users
} from "lucide-react";
import { toast } from "@/lib/toast-config";
import { validateEmail, validateWhatsApp, validatePhone } from "@/lib/validators";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { maskWhatsApp, maskPhone } from "@/lib/masks";

// Função para formatar WhatsApp no padrão do sistema: +55 (XX) XXXXX-XXXX
const formatWhatsAppNumber = (value: string): string => {
  if (!value) return '';
  // Remove tudo que não é número
  let cleanValue = value.replace(/\D/g, '');
  if (cleanValue.length === 0) return '';
  
  // Se não começa com 55, adiciona
  if (!cleanValue.startsWith('55') && cleanValue.length <= 11) {
    cleanValue = '55' + cleanValue;
  }
  
  // Usa a máscara do sistema
  return maskWhatsApp(cleanValue);
};

// Função para formatar telefone no padrão do sistema: +55 (XX) XXXXX-XXXX
const formatPhoneNumber = (value: string): string => {
  if (!value) return '';
  // Remove tudo que não é número
  let cleanValue = value.replace(/\D/g, '');
  if (cleanValue.length === 0) return '';
  
  // Se não começa com 55, adiciona
  if (!cleanValue.startsWith('55') && cleanValue.length <= 11) {
    cleanValue = '55' + cleanValue;
  }
  
  // Usa a máscara do sistema
  return maskWhatsApp(cleanValue);
};

interface ImportRow {
  rowIndex: number;
  nome: string;
  whatsapp: string;
  telefone: string;
  email: string;
  position: string;
  segmento_id: string;
  usuario_id: string;
  isValid: boolean;
  errors: string[];
  selected: boolean;
}

interface ColumnMapping {
  nome: string;
  whatsapp: string;
  telefone: string;
  email: string;
  position: string;
  segmento: string;
  usuario: string;
}

interface ImportContatosWizardProps {
  onClose: () => void;
  onImportComplete: () => void;
}

const STEPS = [
  { id: 1, title: "Upload", icon: Upload },
  { id: 2, title: "Mapeamento", icon: FileSpreadsheet },
  { id: 3, title: "Validação", icon: CheckCircle },
  { id: 4, title: "Importar", icon: Download },
];

export function ImportContatosWizard({ onClose, onImportComplete }: ImportContatosWizardProps) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    nome: "",
    whatsapp: "",
    telefone: "",
    email: "",
    position: "",
    segmento: "",
    usuario: "",
  });
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    failedRows: ImportRow[];
  } | null>(null);
  
  // Dados para seleção
  const [segmentos, setSegmentos] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [selectedSegmentoId, setSelectedSegmentoId] = useState<string>("");
  const [selectedUsuarioId, setSelectedUsuarioId] = useState<string>("");

  // Carregar segmentos e usuários ao montar
  const loadSelectData = useCallback(async () => {
    const estabId = await getEstabelecimentoId();
    if (!estabId) return;

    const [segmentosRes, usuariosRes] = await Promise.all([
      supabase
        .from("segmentos")
        .select("id, nome")
        .eq("estabelecimento_id", estabId)
        .order("nome"),
      supabase
        .from("usuarios")
        .select("id, nome")
        .eq("estabelecimento_id", estabId)
        .order("nome"),
    ]);

    if (segmentosRes.data) setSegmentos(segmentosRes.data);
    if (usuariosRes.data) setUsuarios(usuariosRes.data);
  }, []);

  // Carregar dados ao montar
  useEffect(() => {
    loadSelectData();
  }, [loadSelectData]);

  // Step 1: Upload file
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];

    if (!validTypes.includes(uploadedFile.type) && !uploadedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error("Formato inválido. Use arquivos Excel (.xlsx, .xls) ou CSV.");
      return;
    }

    if (uploadedFile.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }

    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length < 2) {
          toast.error("Arquivo vazio ou sem dados válidos.");
          return;
        }

        const headerRow = jsonData[0].map((h: any) => String(h || "").trim());
        const dataRows = jsonData.slice(1).filter((row) => row.some((cell) => cell));

        setHeaders(headerRow);
        setRawData(dataRows);

        // Auto-map columns by name similarity
        const autoMapping: ColumnMapping = {
          nome: "",
          whatsapp: "",
          telefone: "",
          email: "",
          position: "",
          segmento: "",
          usuario: "",
        };

        headerRow.forEach((header, index) => {
          const h = header.toLowerCase();
          if (h.includes("nome") || h.includes("name")) {
            autoMapping.nome = String(index);
          } else if (h.includes("whatsapp") || h.includes("celular") || h.includes("mobile")) {
            autoMapping.whatsapp = String(index);
          } else if (h.includes("telefone") || h.includes("phone") || h.includes("fone")) {
            if (!autoMapping.whatsapp) {
              autoMapping.whatsapp = String(index);
            } else {
              autoMapping.telefone = String(index);
            }
          } else if (h.includes("email") || h.includes("e-mail") || h.includes("mail")) {
            autoMapping.email = String(index);
          } else if (h.includes("cargo") || h.includes("position") || h.includes("função") || h.includes("funcao")) {
            autoMapping.position = String(index);
          }
        });

        setColumnMapping(autoMapping);
        setStep(2);
        toast.success(`Arquivo carregado: ${dataRows.length} linhas encontradas`);
      } catch (error) {
        console.error("Erro ao processar arquivo:", error);
        toast.error("Erro ao processar o arquivo. Verifique o formato.");
      }
    };

    reader.readAsArrayBuffer(uploadedFile);
  }, []);

  // Step 2: Validate mapping and process rows
  const processMapping = useCallback(() => {
    if (!columnMapping.nome) {
      toast.error("Mapeie pelo menos a coluna 'Nome'");
      return;
    }

    if (!columnMapping.whatsapp && !columnMapping.telefone && !columnMapping.email) {
      toast.error("Mapeie pelo menos uma coluna de contato (WhatsApp, Telefone ou E-mail)");
      return;
    }

    const rows: ImportRow[] = rawData.map((row, index) => {
      const nome = columnMapping.nome ? String(row[parseInt(columnMapping.nome)] || "").trim() : "";
      const rawWhatsapp = columnMapping.whatsapp ? String(row[parseInt(columnMapping.whatsapp)] || "").trim() : "";
      const rawTelefone = columnMapping.telefone ? String(row[parseInt(columnMapping.telefone)] || "").trim() : "";
      const email = columnMapping.email ? String(row[parseInt(columnMapping.email)] || "").trim() : "";
      const position = columnMapping.position ? String(row[parseInt(columnMapping.position)] || "").trim() : "";

      // Formatar telefone e WhatsApp no padrão do sistema
      const whatsapp = rawWhatsapp ? formatWhatsAppNumber(rawWhatsapp) : "";
      const telefone = rawTelefone ? formatPhoneNumber(rawTelefone) : "";

      const errors: string[] = [];

      // Validate name
      if (!nome) {
        errors.push("Nome é obrigatório");
      }

      // Validate at least one contact field
      const hasContact = whatsapp || telefone || email;
      if (!hasContact) {
        errors.push("Informe WhatsApp, Telefone ou E-mail");
      }

      // Validate email format
      if (email && !validateEmail(email)) {
        errors.push("E-mail inválido");
      }

      // Validate WhatsApp format - agora usa o número já formatado
      if (rawWhatsapp) {
        const cleanWhatsApp = rawWhatsapp.replace(/\D/g, "");
        // Remove 55 se existir para validação
        const phoneDigits = cleanWhatsApp.startsWith('55') && cleanWhatsApp.length > 11 
          ? cleanWhatsApp.substring(2) 
          : cleanWhatsApp;
        if (phoneDigits.length < 10 || phoneDigits.length > 11) {
          errors.push("WhatsApp inválido (10-11 dígitos)");
        }
      }

      // Validate phone format
      if (rawTelefone) {
        const cleanPhone = rawTelefone.replace(/\D/g, "");
        const phoneDigits = cleanPhone.startsWith('55') && cleanPhone.length > 11 
          ? cleanPhone.substring(2) 
          : cleanPhone;
        if (phoneDigits.length < 8 || phoneDigits.length > 11) {
          errors.push("Telefone inválido");
        }
      }

      return {
        rowIndex: index + 2, // +2 because of header row and 0-index
        nome,
        whatsapp,
        telefone,
        email,
        position,
        segmento_id: "",
        usuario_id: "",
        isValid: errors.length === 0,
        errors,
        selected: errors.length === 0,
      };
    });

    setParsedRows(rows);
    setStep(3);
  }, [columnMapping, rawData]);

  // Toggle row selection
  const toggleRowSelection = (index: number) => {
    setParsedRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, selected: !row.selected } : row))
    );
  };

  // Select all valid
  const selectAllValid = () => {
    setParsedRows((prev) => prev.map((row) => ({ ...row, selected: row.isValid })));
  };

  // Step 4: Import contacts
  const importContacts = async () => {
    // Validar segmento obrigatório
    if (!selectedSegmentoId) {
      toast.error("Selecione um segmento antes de importar");
      setStep(2); // Voltar para a tela de mapeamento
      return;
    }

    const selectedRows = parsedRows.filter((r) => r.selected);
    if (selectedRows.length === 0) {
      toast.error("Selecione pelo menos um contato para importar");
      return;
    }

    setIsProcessing(true);
    setStep(4);
    setImportProgress(0);

    const estabId = await getEstabelecimentoId();
    if (!estabId) {
      toast.error("Estabelecimento não encontrado");
      setIsProcessing(false);
      return;
    }

    let successCount = 0;
    const failedRows: ImportRow[] = [];

    // Adicionar linhas com erro de validação que não foram selecionadas
    const validationErrorRows = parsedRows.filter((r) => !r.isValid);
    validationErrorRows.forEach((row) => {
      failedRows.push({
        ...row,
        errors: row.errors.length > 0 ? row.errors : ["Erro de validação"],
      });
    });

    for (let i = 0; i < selectedRows.length; i++) {
      const row = selectedRows[i];
      
      try {
        // Check for duplicates
        const whatsappClean = row.whatsapp.replace(/\D/g, "");
        const emailLower = row.email.toLowerCase().trim();

        let isDuplicate = false;
        
        if (whatsappClean) {
          const { data: existingByPhone } = await supabase
            .from("customers")
            .select("id")
            .eq("estabelecimento_id", estabId)
            .or(`telefone.ilike.%${whatsappClean}%,tel.ilike.%${whatsappClean}%`)
            .limit(1);
          
          if (existingByPhone && existingByPhone.length > 0) {
            isDuplicate = true;
          }
        }

        if (!isDuplicate && emailLower) {
          const { data: existingByEmail } = await supabase
            .from("customers")
            .select("id")
            .eq("estabelecimento_id", estabId)
            .ilike("email", emailLower)
            .limit(1);
          
          if (existingByEmail && existingByEmail.length > 0) {
            isDuplicate = true;
          }
        }

        if (isDuplicate) {
          failedRows.push({
            ...row,
            errors: ["Contato já existe (duplicado)"],
          });
          continue;
        }

        // Insert contact
        const { data: newCustomer, error } = await supabase.from("customers").insert({
          estabelecimento_id: estabId,
          nome: row.nome,
          telefone: row.whatsapp || row.telefone || "",
          tel: row.telefone && row.whatsapp ? row.telefone : null,
          email: row.email || "",
          custom_fields: {
            position: row.position,
          },
          tags: [],
          tipo_operador: false, // prospect
        }).select().single();

        if (error) throw error;
        
        // Vincular ao segmento (obrigatório)
        if (newCustomer && selectedSegmentoId) {
          await supabase.from("customer_segmentos").insert({
            customer_id: newCustomer.id,
            segmento_id: selectedSegmentoId,
          });
        }

        // Vincular ao usuário se selecionado
        if (newCustomer && selectedUsuarioId) {
          await supabase.from("customer_vinculos").insert({
            customer_id: newCustomer.id,
            usuario_id: selectedUsuarioId,
            estabelecimento_id: estabId,
          });
        }

        successCount++;
      } catch (error: any) {
        console.error("Erro ao importar contato:", error);
        // Traduzir mensagens de erro do banco de dados
        let errorMessage = error.message || "Erro ao salvar";
        if (errorMessage.includes("customers_email_estabelecimento_unique") || 
            (errorMessage.includes("duplicate key") && errorMessage.includes("email"))) {
          errorMessage = "E-mail já cadastrado em outro usuário";
        } else if (errorMessage.includes("customers_telefone_estabelecimento_unique") || 
                   errorMessage.includes("customers_whatsapp") ||
                   (errorMessage.includes("duplicate key") && (errorMessage.includes("telefone") || errorMessage.includes("whatsapp")))) {
          errorMessage = "WhatsApp já cadastrado em outro usuário";
        } else if (errorMessage.includes("duplicate key") || errorMessage.includes("unique constraint")) {
          errorMessage = "Cadastro duplicado";
        }
        failedRows.push({
          ...row,
          errors: [errorMessage],
        });
      }

      setImportProgress(Math.round(((i + 1) / selectedRows.length) * 100));
    }

    // Ordenar por número da linha
    failedRows.sort((a, b) => a.rowIndex - b.rowIndex);

    setImportResults({
      success: successCount,
      failed: failedRows.length,
      failedRows,
    });

    setIsProcessing(false);

    if (successCount > 0) {
      toast.success(`${successCount} contatos importados com sucesso!`);
      onImportComplete();
    }

    if (failedRows.length > 0) {
      toast.warning(`${failedRows.length} contatos não puderam ser importados`);
    }
  };

  // Export failed rows
  const exportFailedRows = () => {
    if (!importResults?.failedRows.length) return;

    const wb = XLSX.utils.book_new();
    const wsData = [
      ["Linha", "Nome", "WhatsApp", "Telefone", "E-mail", "Cargo", "Erro"],
      ...importResults.failedRows.map((row) => [
        row.rowIndex,
        row.nome,
        row.whatsapp,
        row.telefone,
        row.email,
        row.position,
        row.errors.join("; "),
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [{ wch: 8 }, { wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 30 }, { wch: 20 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws, "Erros");
    XLSX.writeFile(wb, "contatos_nao_importados.xlsx");
    toast.success("Planilha de erros baixada!");
  };

  // Download template
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const headers = ["Nome", "WhatsApp", "Telefone", "E-mail", "Cargo"];
    const example = ["João Silva", "(11) 99999-9999", "(11) 3333-3333", "joao@email.com", "Gerente"];
    const wsData = [headers, example];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, "Contatos");
    XLSX.writeFile(wb, "modelo_importacao_contatos.xlsx");
    toast.success("Modelo baixado!");
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;
  const selectedCount = parsedRows.filter((r) => r.selected).length;

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((s, idx) => (
          <div key={s.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  step >= s.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <s.icon className="w-5 h-5" />
              </div>
              <span className="text-xs mt-1 font-medium">{s.title}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`flex-1 h-1 mx-2 rounded ${
                  step > s.id ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <FileSpreadsheet className="w-10 h-10 text-primary" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold">Importar Contatos</h3>
              <p className="text-muted-foreground max-w-md">
                Faça upload de uma planilha Excel (.xlsx, .xls) ou CSV com seus contatos.
                O arquivo deve conter pelo menos o <strong>Nome</strong> e um campo de contato
                (<strong>WhatsApp</strong>, <strong>Telefone</strong> ou <strong>E-mail</strong>).
              </p>
            </div>

            <div className="border-2 border-dashed border-border rounded-lg p-8 w-full max-w-md">
              <label className="flex flex-col items-center justify-center cursor-pointer">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">Clique para selecionar</span>
                <span className="text-xs text-muted-foreground mt-1">Máx. 10MB</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Baixar Modelo de Planilha
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Column Mapping */}
      {step === 2 && (
        <Card className="p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">Mapeamento de Colunas</h3>
              <p className="text-sm text-muted-foreground">
                Associe as colunas da sua planilha aos campos do sistema.
                Arquivo: <strong>{file?.name}</strong> ({rawData.length} linhas)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nome <span className="text-destructive">*</span>
                </label>
                <Select
                  value={columnMapping.nome || "__none__"}
                  onValueChange={(v) => setColumnMapping((prev) => ({ ...prev, nome: v === "__none__" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Não mapear --</SelectItem>
                    {headers.map((h, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {h || `Coluna ${i + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  WhatsApp
                </label>
                <Select
                  value={columnMapping.whatsapp || "__none__"}
                  onValueChange={(v) => setColumnMapping((prev) => ({ ...prev, whatsapp: v === "__none__" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Não mapear --</SelectItem>
                    {headers.map((h, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {h || `Coluna ${i + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Telefone Fixo
                </label>
                <Select
                  value={columnMapping.telefone || "__none__"}
                  onValueChange={(v) => setColumnMapping((prev) => ({ ...prev, telefone: v === "__none__" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Não mapear --</SelectItem>
                    {headers.map((h, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {h || `Coluna ${i + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  E-mail
                </label>
                <Select
                  value={columnMapping.email || "__none__"}
                  onValueChange={(v) => setColumnMapping((prev) => ({ ...prev, email: v === "__none__" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Não mapear --</SelectItem>
                    {headers.map((h, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {h || `Coluna ${i + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Cargo/Função</label>
                <Select
                  value={columnMapping.position || "__none__"}
                  onValueChange={(v) => setColumnMapping((prev) => ({ ...prev, position: v === "__none__" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a coluna" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Não mapear --</SelectItem>
                    {headers.map((h, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {h || `Coluna ${i + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Campos de seleção fixa (não da planilha) */}
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Atribuir a todos os contatos importados:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Segmento <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={selectedSegmentoId || "__none__"}
                    onValueChange={(v) => setSelectedSegmentoId(v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o segmento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">-- Selecione --</SelectItem>
                      {segmentos.map((seg) => (
                        <SelectItem key={seg.id} value={seg.id}>
                          {seg.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Usuário Responsável
                  </label>
                  <Select
                    value={selectedUsuarioId || "__none__"}
                    onValueChange={(v) => setSelectedUsuarioId(v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o usuário (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">-- Nenhum --</SelectItem>
                      {usuarios.map((usr) => (
                        <SelectItem key={usr.id} value={usr.id}>
                          {usr.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2">Prévia das primeiras 3 linhas:</h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((h, i) => (
                        <TableHead key={i} className="text-xs whitespace-nowrap">
                          {h || `Col ${i + 1}`}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rawData.slice(0, 3).map((row, i) => (
                      <TableRow key={i}>
                        {headers.map((_, j) => (
                          <TableCell key={j} className="text-xs py-2">
                            {String(row[j] || "").substring(0, 30)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: Validation */}
      {step === 3 && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Validação dos Dados</h3>
                <p className="text-sm text-muted-foreground">
                  Revise os contatos antes de importar
                </p>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>{validCount} válidos</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-destructive" />
                  <span>{invalidCount} com erros</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{selectedCount} selecionados</Badge>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAllValid}>
                Selecionar todos válidos
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setParsedRows((prev) => prev.map((r) => ({ ...r, selected: false })))}
              >
                Desmarcar todos
              </Button>
            </div>

            <ScrollArea className="h-[400px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="w-12">Linha</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row, index) => (
                    <TableRow
                      key={index}
                      className={!row.isValid ? "bg-destructive/5" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={row.selected}
                          onCheckedChange={() => toggleRowSelection(index)}
                          disabled={!row.isValid}
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {row.rowIndex}
                      </TableCell>
                      <TableCell className="font-medium">{row.nome || "-"}</TableCell>
                      <TableCell>{row.whatsapp || "-"}</TableCell>
                      <TableCell>{row.telefone || "-"}</TableCell>
                      <TableCell>{row.email || "-"}</TableCell>
                      <TableCell>{row.position || "-"}</TableCell>
                      <TableCell>
                        {row.isValid ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Válido
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            {row.errors[0]}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </Card>
      )}

      {/* Step 4: Import Results */}
      {step === 4 && (
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center space-y-6">
            {isProcessing ? (
              <>
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">Importando contatos...</h3>
                  <p className="text-muted-foreground">Aguarde enquanto processamos os dados</p>
                </div>
                <div className="w-full max-w-md">
                  <Progress value={importProgress} className="h-3" />
                  <p className="text-center text-sm text-muted-foreground mt-2">
                    {importProgress}% concluído
                  </p>
                </div>
              </>
            ) : importResults ? (
              <>
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center ${
                    importResults.failed === 0
                      ? "bg-green-100 text-green-600"
                      : importResults.success === 0
                      ? "bg-destructive/10 text-destructive"
                      : "bg-yellow-100 text-yellow-600"
                  }`}
                >
                  {importResults.failed === 0 ? (
                    <CheckCircle className="w-10 h-10" />
                  ) : importResults.success === 0 ? (
                    <XCircle className="w-10 h-10" />
                  ) : (
                    <AlertTriangle className="w-10 h-10" />
                  )}
                </div>

                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">Importação Concluída</h3>
                  <div className="flex gap-6 justify-center text-lg">
                    <div className="text-green-600">
                      <span className="font-bold">{importResults.success}</span> importados
                    </div>
                    {importResults.failed > 0 && (
                      <div className="text-destructive">
                        <span className="font-bold">{importResults.failed}</span> com erro
                      </div>
                    )}
                  </div>
                </div>

                {importResults.failed > 0 && (
                  <div className="w-full max-w-4xl">
                    <div className="bg-muted/50 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileWarning className="w-5 h-5 text-destructive" />
                        <h4 className="font-medium">Contatos não importados ({importResults.failed})</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Revise os erros abaixo ou baixe a planilha para corrigir e importar novamente.
                      </p>
                      
                      {/* Tabela de erros */}
                      <ScrollArea className="h-[250px] rounded-lg border bg-background mb-4">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="w-16">Linha</TableHead>
                              <TableHead>Nome</TableHead>
                              <TableHead>WhatsApp</TableHead>
                              <TableHead>E-mail</TableHead>
                              <TableHead>Erro</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {importResults.failedRows.map((row, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-mono text-xs">{row.rowIndex}</TableCell>
                                <TableCell className="max-w-[150px] truncate">{row.nome || "-"}</TableCell>
                                <TableCell className="text-xs">{row.whatsapp || "-"}</TableCell>
                                <TableCell className="text-xs max-w-[150px] truncate">{row.email || "-"}</TableCell>
                                <TableCell>
                                  <Badge variant="destructive" className="text-xs whitespace-normal">
                                    {row.errors.join("; ")}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>

                      <Button onClick={exportFailedRows} className="w-full">
                        <Download className="w-4 h-4 mr-2" />
                        Baixar Planilha de Erros ({importResults.failed} contatos)
                      </Button>
                    </div>
                  </div>
                )}

                <Button onClick={onClose} variant="outline">
                  Fechar
                </Button>
              </>
            ) : null}
          </div>
        </Card>
      )}

      {/* Navigation Buttons */}
      {step < 4 && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {step === 1 ? "Cancelar" : "Voltar"}
          </Button>

          {step === 2 && (
            <Button onClick={processMapping}>
              Validar Dados
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}

          {step === 3 && (
            <Button onClick={importContacts} disabled={selectedCount === 0}>
              Importar {selectedCount} Contatos
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
