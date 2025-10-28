import { useState, useEffect } from "react";
import * as React from "react";
import * as XLSX from 'xlsx';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, MoreVertical, Trash2, GripVertical, Search, Filter, Calendar, X, Pencil, Check, Loader2, Edit, Settings2, ArrowUpDown, ArrowUp, ArrowDown, Upload, Download } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { validateCPF, validateCNPJ, validateEmail, validatePhone, validateCEP, validateInscricaoEstadual } from "@/lib/validators";
import { maskCPF, maskCNPJ, maskCEP, maskPhone, maskDate, applyCustomMask } from "@/lib/masks";
import { useAddressLookup } from "@/hooks/useAddressLookup";
import { useCNPJLookup } from "@/hooks/useCNPJLookup";
import { supabase } from "@/integrations/supabase/client";
import { FieldMaskConfig, type FieldMask } from "@/components/config/FieldMaskConfig";
import { SortableFieldItem } from "@/components/config/SortableFieldItem";
import { TableColumnsConfig, type TableColumn } from "@/components/config/TableColumnsConfig";
import { APIImportDialog } from "@/components/config/APIImportDialog";
import { SegmentosCRUD } from "@/components/config/SegmentosCRUD";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface CustomField {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "textarea" | "select" | "checkbox" | "date" | "number";
  category: "contact" | "company";
  options?: string[];
  required?: boolean;
  locked?: boolean; // Não pode ser removido
  searchable?: boolean; // Aparece nos filtros de pesquisa
}

interface Contact {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  position: string;
  responsible: string;
  tags: string[];
  createdAt: string;
  createdBy: string;
  modifiedAt: string;
  modifiedBy: string;
  customFields: Record<string, any>;
  active: boolean;
  segmentos?: string[];
}

interface Segmento {
  id: string;
  nome: string;
  estabelecimento_id: string;
}

interface SearchFilters {
  unifiedSearch: string;
  dateFilter: string;
  funnel: string;
  responsible: string;
  createdBy: string;
  modifiedBy: string;
  tasks: string;
  tags: string;
  [key: string]: string; // Permite campos dinâmicos customizados
}

export default function Contatos() {
  const [showForm, setShowForm] = useState(false);
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editingCell, setEditingCell] = useState<{ contactId: string; field: string } | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  
  // Gerenciamento de colunas da tabela
  const [tableColumns, setTableColumns] = useState<TableColumn[]>(() => {
    const saved = localStorage.getItem("contactsTableColumns");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Garantir que a coluna actions sempre existe
        const hasActions = parsed.some((col: TableColumn) => col.id === 'actions');
        if (!hasActions) {
          return [
            { id: "actions", label: "Ações", visible: true, width: 80, locked: true },
            ...parsed
          ];
        }
        // Garantir que actions está locked
        return parsed.map((col: TableColumn) => 
          col.id === 'actions' ? { ...col, locked: true, visible: true } : col
        );
      } catch {
        // Se houver erro ao parsear, usar valores padrão
      }
    }
    return [
      { id: "actions", label: "Ações", visible: true, width: 80, locked: true },
      { id: "name", label: "Nome", visible: true, width: 250, locked: true },
      { id: "company", label: "Empresa", visible: true, width: 200 },
      { id: "phone", label: "Telefone/WhatsApp", visible: true, width: 180 },
      { id: "email", label: "E-mail", visible: true, width: 250 },
      { id: "position", label: "Posição", visible: false, width: 150 },
      { id: "cpf_cnpj", label: "CPF/CNPJ", visible: false, width: 180 },
      { id: "company_fantasia", label: "Nome Fantasia", visible: false, width: 200 },
      { id: "city", label: "Cidade", visible: false, width: 150 },
      { id: "state", label: "UF", visible: false, width: 80 },
    ];
  });

  // Estado de ordenação
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Salvar configurações de colunas no localStorage
  useEffect(() => {
    localStorage.setItem("contactsTableColumns", JSON.stringify(tableColumns));
  }, [tableColumns]);

  const handleColumnsChange = (newColumns: TableColumn[]) => {
    setTableColumns(newColumns);
  };

  const handleSort = (columnId: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === columnId) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else {
        // Remove sort
        setSortConfig(null);
        return;
      }
    }
    
    setSortConfig({ key: columnId, direction });
  };

  const getSortIcon = (columnId: string) => {
    if (!sortConfig || sortConfig.key !== columnId) {
      return <ArrowUpDown className="w-3 h-3 text-muted-foreground" />;
    }
    
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-primary" />
      : <ArrowDown className="w-3 h-3 text-primary" />;
  };
  
  // Hooks para buscar CEP e CNPJ
  const { lookupCEP, loading: cepLoading } = useAddressLookup();
  const { lookupCNPJ, loading: cnpjLoading } = useCNPJLookup();
  
  // Campos obrigatórios fixos de contato (não podem ser removidos)
  const [contactFields, setContactFields] = useState<CustomField[]>([
    { id: "name", label: "Nome de contato", type: "text", category: "contact", required: true, locked: true },
    { id: "phone", label: "WhatsApp", type: "phone", category: "contact", required: true, locked: true },
    { id: "email", label: "E-mail", type: "email", category: "contact", required: true, locked: true },
    { id: "position", label: "Posição", type: "text", category: "contact", required: true, locked: true },
  ]);
  
  // Campos obrigatórios fixos de empresa (não podem ser removidos)
  const [companyFields, setCompanyFields] = useState<CustomField[]>([
    { id: "company_type", label: "Tipo", type: "select", category: "company", options: ["Pessoa Física", "Pessoa Jurídica"], required: true, locked: true },
    { id: "cpf_cnpj", label: "CPF/CNPJ", type: "text", category: "company", required: true, locked: true },
    { id: "company_name", label: "Nome", type: "text", category: "company", required: true, locked: true },
    { id: "company_fantasia", label: "Nome Fantasia", type: "text", category: "company", required: true, locked: true },
    { id: "cep", label: "CEP", type: "text", category: "company", required: true, locked: true },
    { id: "address", label: "Endereço", type: "text", category: "company", required: true, locked: true },
    { id: "city", label: "Cidade", type: "text", category: "company", required: true, locked: true },
    { id: "neighborhood", label: "Bairro", type: "text", category: "company", required: true, locked: true },
    { id: "state", label: "UF", type: "text", category: "company", required: true, locked: true },
    { id: "inscricao", label: "Inscrição", type: "text", category: "company", required: true, locked: true },
  ]);

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldType, setNewFieldType] = useState<CustomField["type"]>("text");
  const [newFieldOptions, setNewFieldOptions] = useState("");
  const [activeFieldTab, setActiveFieldTab] = useState<"contact" | "company">("contact");
  const [fieldMasks, setFieldMasks] = useState<FieldMask[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [segmentosSelecionados, setSegmentosSelecionados] = useState<string[]>([]);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  
  // Sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    unifiedSearch: "",
    dateFilter: "",
    funnel: "",
    responsible: "",
    createdBy: "",
    modifiedBy: "",
    tasks: "",
    tags: "",
  });

  // Carregar estabelecimento e segmentos
  useEffect(() => {
    const fetchEstabelecimentoAndSegmentos = async () => {
      const estabId = localStorage.getItem("estabelecimentoId");
      console.log("🔍 Contatos - estabelecimentoId do localStorage:", estabId);
      setEstabelecimentoId(estabId);
      
      if (estabId) {
        console.log("🔍 Contatos - Buscando segmentos para estabelecimento:", estabId);
        const { data, error } = await supabase
          .from("segmentos")
          .select("*")
          .eq("estabelecimento_id", estabId)
          .order("nome");
        
        console.log("🔍 Contatos - Segmentos retornados:", data);
        console.log("🔍 Contatos - Erro na busca:", error);
        
        if (error) {
          console.error("❌ Erro ao buscar segmentos:", error);
          toast.error("Erro ao carregar segmentos: " + error.message);
        }
        
        setSegmentos(data || []);
      } else {
        console.warn("⚠️ estabelecimentoId não encontrado no localStorage");
      }
    };
    
    fetchEstabelecimentoAndSegmentos();
  }, []);

  // Carregar contatos do localStorage
  useEffect(() => {
    const savedContacts = localStorage.getItem("contacts");
    if (savedContacts) {
      setContacts(JSON.parse(savedContacts));
    }
  }, []);

  // Salvar contatos no localStorage
  const saveContactsToStorage = (updatedContacts: Contact[]) => {
    localStorage.setItem("contacts", JSON.stringify(updatedContacts));
    setContacts(updatedContacts);
  };

  const handleAddField = () => {
    if (!newFieldLabel.trim()) {
      toast.error("Digite um nome para o campo");
      return;
    }

    const newField: CustomField = {
      id: `custom_${Date.now()}`,
      label: newFieldLabel,
      type: newFieldType,
      category: activeFieldTab,
      options: newFieldType === "select" && newFieldOptions ? newFieldOptions.split(",").map(o => o.trim()) : undefined,
      searchable: false, // Por padrão não aparece na busca
    };

    if (activeFieldTab === "contact") {
      setContactFields([...contactFields, newField]);
    } else {
      setCompanyFields([...companyFields, newField]);
    }

    setNewFieldLabel("");
    setNewFieldType("text");
    setNewFieldOptions("");
    toast.success("Campo adicionado com sucesso");
  };

  const handleDragEndContact = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setContactFields((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDragEndCompany = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCompanyFields((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleToggleSearchable = (fieldId: string, category: "contact" | "company") => {
    if (category === "contact") {
      setContactFields(contactFields.map(f => 
        f.id === fieldId ? { ...f, searchable: !f.searchable } : f
      ));
    } else {
      setCompanyFields(companyFields.map(f => 
        f.id === fieldId ? { ...f, searchable: !f.searchable } : f
      ));
    }
  };

  const handleRemoveField = (fieldId: string, category: "contact" | "company") => {
    const fields = category === "contact" ? contactFields : companyFields;
    const field = fields.find(f => f.id === fieldId);
    
    // Não permite remover campos bloqueados
    if (field?.locked) {
      toast.error("Este campo é obrigatório e não pode ser removido");
      return;
    }
    
    if (category === "contact") {
      setContactFields(contactFields.filter(f => f.id !== fieldId));
    } else {
      setCompanyFields(companyFields.filter(f => f.id !== fieldId));
    }
    toast.success("Campo removido com sucesso");
  };

  // Buscar dados do CNPJ
  const handleCNPJLookup = async (cnpj: string) => {
    if (!validateCNPJ(cnpj)) {
      toast.error("CNPJ inválido");
      return;
    }

    const data = await lookupCNPJ(cnpj);
    if (data) {
      setFormData({
        ...formData,
        company_name: data.nome,
        company_fantasia: data.fantasia,
        cep: data.cep,
        address: data.logradouro + (data.numero ? ', ' + data.numero : ''),
        city: data.municipio,
        neighborhood: data.bairro,
        state: data.uf,
      });
      toast.success("Dados preenchidos automaticamente");
    }
  };

  // Buscar dados do CEP
  const handleCEPLookup = async (cep: string) => {
    if (!validateCEP(cep)) {
      toast.error("CEP inválido");
      return;
    }

    const data = await lookupCEP(cep);
    if (data) {
      setFormData({
        ...formData,
        address: data.logradouro,
        city: data.localidade,
        neighborhood: data.bairro,
        state: data.uf,
      });
      toast.success("Endereço preenchido automaticamente");
    }
  };

  // Aplicar máscara ao campo
  const applyFieldMask = (fieldId: string, value: string): string => {
    const mask = fieldMasks.find(m => m.fieldId === fieldId);
    if (!mask) return value;

    switch (mask.maskType) {
      case "cpf":
        return maskCPF(value);
      case "cnpj":
        return maskCNPJ(value);
      case "date":
        return maskDate(value);
      case "phone":
        return maskPhone(value);
      case "custom":
        return mask.customMask ? applyCustomMask(value, mask.customMask) : value;
      default:
        return value;
    }
  };

  const renderField = (field: CustomField) => {
    const value = formData[field.id] || "";
    
    // Aplicar máscara se configurada
    const displayValue = applyFieldMask(field.id, value);
    
    const handleFieldChange = (newValue: string) => {
      let processedValue = newValue;
      
      // Limpar erro do campo quando o usuário começar a digitar
      if (fieldErrors[field.id]) {
        setFieldErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field.id];
          return newErrors;
        });
      }
      
      // Aplicar máscara automática baseada no ID do campo
      if (field.id === "cpf_cnpj") {
        const companyType = formData.company_type;
        if (companyType === "Pessoa Física") {
          processedValue = maskCPF(newValue);
        } else if (companyType === "Pessoa Jurídica") {
          processedValue = maskCNPJ(newValue);
        }
      } else if (field.id === "cep") {
        processedValue = maskCEP(newValue);
      } else if (field.id === "phone" || field.type === "phone") {
        processedValue = maskPhone(newValue);
      }
      
      // Auto-preencher inscrição como "isento" para pessoa física
      if (field.id === "company_type" && newValue === "Pessoa Física") {
        setFormData({ ...formData, [field.id]: newValue, inscricao: "ISENTO" });
      } else {
        setFormData({ ...formData, [field.id]: processedValue });
      }
    };
    
    const handleFieldBlur = () => {
      const cleanValue = value.replace(/\D/g, '');
      
      // Validar CPF/CNPJ ao sair do campo
      if (field.id === "cpf_cnpj") {
        const companyType = formData.company_type;
        if (companyType === "Pessoa Física") {
          if (cleanValue.length === 11) {
            if (!validateCPF(value)) {
              toast.error("CPF inválido");
            }
          }
        } else if (companyType === "Pessoa Jurídica") {
          if (cleanValue.length === 14) {
            if (!validateCNPJ(value)) {
              toast.error("CNPJ inválido");
            } else {
              // Auto-buscar CNPJ quando completo
              handleCNPJLookup(value);
            }
          }
        }
      }
      
      // Validar CEP ao sair do campo
      if (field.id === "cep" && cleanValue.length === 8) {
        if (!validateCEP(value)) {
          toast.error("CEP inválido");
        } else {
          // Auto-buscar CEP quando completo
          handleCEPLookup(value);
        }
      }
      
      // Validar email ao sair do campo
      if (field.type === "email" && value) {
        if (!validateEmail(value)) {
          toast.error("E-mail inválido");
        }
      }
      
      // Validar telefone ao sair do campo
      if ((field.id === "phone" || field.type === "phone") && value) {
        if (!validatePhone(value)) {
          toast.error("Telefone inválido");
        }
      }
      
      // Validar inscrição estadual ao sair do campo
      if (field.id === "inscricao" && value && value.toUpperCase() !== "ISENTO") {
        if (!validateInscricaoEstadual(value)) {
          toast.error("Inscrição estadual inválida");
        }
      }
    };
    
    switch (field.type) {
      case "textarea":
        return (
          <div>
            <Textarea
              id={field.id}
              placeholder="..."
              value={value}
              onChange={(e) => {
                if (fieldErrors[field.id]) {
                  setFieldErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[field.id];
                    return newErrors;
                  });
                }
                setFormData({ ...formData, [field.id]: e.target.value });
              }}
              onBlur={handleFieldBlur}
              required={field.required}
              className={fieldErrors[field.id] ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {fieldErrors[field.id] && (
              <p className="text-sm text-red-500 mt-1">{fieldErrors[field.id]}</p>
            )}
          </div>
        );
      case "select":
        return (
          <div>
            <Select value={value} onValueChange={(val) => handleFieldChange(val)}>
              <SelectTrigger className={fieldErrors[field.id] ? "border-red-500 focus-visible:ring-red-500" : ""}>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors[field.id] && (
              <p className="text-sm text-red-500 mt-1">{fieldErrors[field.id]}</p>
            )}
          </div>
        );
      case "checkbox":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={value === true}
              onCheckedChange={(checked) => setFormData({ ...formData, [field.id]: checked })}
            />
            <label htmlFor={field.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Sim
            </label>
          </div>
        );
      default:
        return (
          <div className="relative">
            <Input
              id={field.id}
              type={field.type === "email" ? "email" : field.type === "number" ? "number" : "text"}
              placeholder="..."
              value={displayValue}
              onChange={(e) => handleFieldChange(e.target.value)}
              onBlur={handleFieldBlur}
              required={field.required}
              className={fieldErrors[field.id] ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {fieldErrors[field.id] && (
              <p className="text-sm text-red-500 mt-1">{fieldErrors[field.id]}</p>
            )}
            {(field.id === "cpf_cnpj" && cnpjLoading) || (field.id === "cep" && cepLoading) ? (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
            ) : null}
          </div>
        );
    }
  };

  const handleSaveContact = () => {
    const errors: Record<string, string> = {};
    
    // Validar campos obrigatórios de contato
    if (!formData.name) {
      errors.name = "Campo obrigatório";
    }
    if (!formData.phone) {
      errors.phone = "Campo obrigatório";
    } else if (!validatePhone(formData.phone)) {
      errors.phone = "Telefone/WhatsApp inválido";
    }
    if (!formData.email) {
      errors.email = "Campo obrigatório";
    } else if (!validateEmail(formData.email)) {
      errors.email = "E-mail inválido";
    }
    if (!formData.position) {
      errors.position = "Campo obrigatório";
    }

    // Validar campos obrigatórios de empresa se preenchidos
    if (formData.company_type) {
      const requiredCompanyFields = [
        { id: "company_type", label: "Tipo" },
        { id: "cpf_cnpj", label: "CPF/CNPJ" },
        { id: "company_name", label: "Nome" },
        { id: "company_fantasia", label: "Nome Fantasia" },
        { id: "cep", label: "CEP" },
        { id: "address", label: "Endereço" },
        { id: "city", label: "Cidade" },
        { id: "neighborhood", label: "Bairro" },
        { id: "state", label: "UF" },
        { id: "inscricao", label: "Inscrição" }
      ];
      
      requiredCompanyFields.forEach(field => {
        if (!formData[field.id]) {
          errors[field.id] = "Campo obrigatório";
        }
      });

      // Validar CPF ou CNPJ
      if (formData.cpf_cnpj) {
        const companyType = formData.company_type;
        if (companyType === "Pessoa Física" && !validateCPF(formData.cpf_cnpj)) {
          errors.cpf_cnpj = "CPF inválido";
        }
        if (companyType === "Pessoa Jurídica" && !validateCNPJ(formData.cpf_cnpj)) {
          errors.cpf_cnpj = "CNPJ inválido";
        }
      }

      // Validar CEP
      if (formData.cep && !validateCEP(formData.cep)) {
        errors.cep = "CEP inválido";
      }
    }

    // Validar duplicatas (CPF/CNPJ/WhatsApp)
    const duplicateCpfCnpj = contacts.find(c => 
      c.id !== (editingContact?.id) && 
      c.active &&
      c.customFields?.cpf_cnpj && 
      formData.cpf_cnpj && 
      c.customFields.cpf_cnpj.replace(/\D/g, '') === formData.cpf_cnpj.replace(/\D/g, '')
    );
    
    if (duplicateCpfCnpj) {
      errors.cpf_cnpj = "CPF/CNPJ já cadastrado";
      toast.error("CPF/CNPJ já cadastrado no sistema");
    }
    
    const duplicatePhone = contacts.find(c => 
      c.id !== (editingContact?.id) && 
      c.active &&
      c.phone && 
      formData.phone && 
      c.phone.replace(/\D/g, '') === formData.phone.replace(/\D/g, '')
    );
    
    if (duplicatePhone) {
      errors.phone = "WhatsApp já cadastrado";
      toast.error("WhatsApp já cadastrado no sistema");
    }

    // Se houver erros, marcar campos e fazer scroll para o primeiro erro
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstErrorField = Object.keys(errors)[0];
      const firstErrorElement = document.getElementById(firstErrorField);
      if (firstErrorElement) {
        firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstErrorElement.focus();
      }
      toast.error("Preencha todos os campos obrigatórios corretamente");
      return;
    }

    const newContact: Contact = {
      id: editingContact?.id || `contact_${Date.now()}`,
      name: formData.name || "",
      company: formData.company_name || "",
      phone: formData.phone || "",
      email: formData.email || "",
      position: formData.position || "",
      responsible: formData.responsible || "",
      tags: [],
      createdAt: editingContact?.createdAt || new Date().toISOString(),
      createdBy: editingContact?.createdBy || "Usuário Atual",
      modifiedAt: new Date().toISOString(),
      modifiedBy: "Usuário Atual",
      customFields: formData,
      active: editingContact?.active ?? true,
      segmentos: segmentosSelecionados,
    };

    if (editingContact) {
      const updatedContacts = contacts.map(c => c.id === editingContact.id ? newContact : c);
      saveContactsToStorage(updatedContacts);
      toast.success("Contato atualizado com sucesso");
    } else {
      saveContactsToStorage([...contacts, newContact]);
      toast.success("Contato salvo com sucesso");
    }
    
    setShowForm(false);
    setFormData({});
    setEditingContact(null);
    setFieldErrors({});
    setSegmentosSelecionados([]);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setFormData(contact.customFields);
    setSegmentosSelecionados(contact.segmentos || []);
    setShowForm(true);
  };

  const handleDeleteContact = (contactId: string) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;
    
    setContactToDelete(contact);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!contactToDelete) return;
    
    // Verificar se o contato está em uso (simular verificação)
    // Em um sistema real, você verificaria se há conversas, pedidos, etc
    const isInUse = Math.random() > 0.7; // Simula 30% de chance de estar em uso
    
    if (isInUse) {
      // Inativar ao invés de excluir
      const updatedContacts = contacts.map(c =>
        c.id === contactToDelete.id ? { ...c, active: false } : c
      );
      saveContactsToStorage(updatedContacts);
      toast.warning("Contato inativado pois está em uso no sistema");
    } else {
      // Pode excluir
      const updatedContacts = contacts.filter(c => c.id !== contactToDelete.id);
      saveContactsToStorage(updatedContacts);
      toast.success("Contato excluído com sucesso");
    }
    
    setDeleteDialogOpen(false);
    setContactToDelete(null);
  };

  const handleStartEdit = (contactId: string, field: string, value: string) => {
    setEditingCell({ contactId, field });
    setEditingValue(value);
  };

  const handleSaveInlineEdit = () => {
    if (!editingCell) return;

    const trimmedValue = editingValue.trim();
    
    // Validar campo antes de salvar
    if (editingCell.field === 'email') {
      if (trimmedValue && !validateEmail(trimmedValue)) {
        toast.error("E-mail inválido");
        return;
      }
    }
    
    if (editingCell.field === 'phone') {
      if (trimmedValue && !validatePhone(trimmedValue)) {
        toast.error("Telefone inválido");
        return;
      }
      
      // Verificar duplicação de WhatsApp
      const duplicatePhone = contacts.find(c => 
        c.id !== editingCell.contactId && 
        c.active &&
        c.phone && 
        c.phone.replace(/\D/g, '') === trimmedValue.replace(/\D/g, '')
      );
      
      if (duplicatePhone) {
        toast.error("WhatsApp já cadastrado");
        return;
      }
    }
    
    if (editingCell.field === 'cpf_cnpj') {
      if (trimmedValue) {
        const cleanValue = trimmedValue.replace(/\D/g, '');
        if (cleanValue.length === 11) {
          if (!validateCPF(trimmedValue)) {
            toast.error("CPF inválido");
            return;
          }
        } else if (cleanValue.length === 14) {
          if (!validateCNPJ(trimmedValue)) {
            toast.error("CNPJ inválido");
            return;
          }
        } else {
          toast.error("CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos");
          return;
        }
        
        // Verificar duplicação de CPF/CNPJ
        const duplicateCpfCnpj = contacts.find(c => 
          c.id !== editingCell.contactId && 
          c.active &&
          c.customFields?.cpf_cnpj && 
          c.customFields.cpf_cnpj.replace(/\D/g, '') === cleanValue
        );
        
        if (duplicateCpfCnpj) {
          toast.error("CPF/CNPJ já cadastrado");
          return;
        }
      }
    }
    
    if (editingCell.field === 'cep') {
      if (trimmedValue && !validateCEP(trimmedValue)) {
        toast.error("CEP inválido");
        return;
      }
    }
    
    // Validar campos obrigatórios
    const requiredFields = ['name', 'phone', 'email'];
    if (requiredFields.includes(editingCell.field) && !trimmedValue) {
      toast.error("Este campo é obrigatório");
      return;
    }

    const updatedContacts = contacts.map(contact => {
      if (contact.id === editingCell.contactId) {
        // Atualizar campo principal ou customField
        if (['name', 'company', 'phone', 'email', 'position'].includes(editingCell.field)) {
          return {
            ...contact,
            [editingCell.field]: trimmedValue,
            modifiedAt: new Date().toISOString(),
            modifiedBy: "Usuário Atual",
          };
        } else {
          return {
            ...contact,
            customFields: {
              ...contact.customFields,
              [editingCell.field]: trimmedValue,
            },
            modifiedAt: new Date().toISOString(),
            modifiedBy: "Usuário Atual",
          };
        }
      }
      return contact;
    });

    saveContactsToStorage(updatedContacts);
    setEditingCell(null);
    setEditingValue("");
    toast.success("Campo atualizado com sucesso");
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditingValue("");
  };

  const filteredContacts = contacts.filter(contact => {
    // Filtrar apenas contatos ativos
    if (!contact.active) return false;
    
    // Busca unificada nos campos principais
    if (searchFilters.unifiedSearch) {
      const searchTerm = searchFilters.unifiedSearch.toLowerCase();
      const cpfCnpj = (contact.customFields?.cpf_cnpj || "").toString().toLowerCase();
      const companyName = (contact.customFields?.company_name || "").toString().toLowerCase();
      const companyFantasia = (contact.customFields?.company_fantasia || "").toString().toLowerCase();
      
      const matchesSearch = 
        contact.name.toLowerCase().includes(searchTerm) ||
        cpfCnpj.includes(searchTerm) ||
        companyName.includes(searchTerm) ||
        companyFantasia.includes(searchTerm) ||
        contact.phone.includes(searchTerm) ||
        contact.email.toLowerCase().includes(searchTerm);
      
      if (!matchesSearch) {
        return false;
      }
    }
    
    // Filtrar por campos customizados marcados como searchable
    const allSearchableFields = [...contactFields, ...companyFields].filter(f => f.searchable);
    for (const field of allSearchableFields) {
      const filterValue = searchFilters[field.id as keyof SearchFilters];
      const contactValue = contact.customFields[field.id];
      
      if (filterValue && contactValue) {
        const filterStr = String(filterValue).toLowerCase();
        const contactStr = String(contactValue).toLowerCase();
        
        if (!contactStr.includes(filterStr)) {
          return false;
        }
      }
    }
    
    return true;
  });

  // Aplicar ordenação
  const sortedContacts = React.useMemo(() => {
    if (!sortConfig) return filteredContacts;

    return [...filteredContacts].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Obter valores baseado na coluna
      switch (sortConfig.key) {
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'company':
          aValue = a.company;
          bValue = b.company;
          break;
        case 'phone':
          aValue = a.phone;
          bValue = b.phone;
          break;
        case 'email':
          aValue = a.email;
          bValue = b.email;
          break;
        case 'position':
          aValue = a.position;
          bValue = b.position;
          break;
        default:
          aValue = a.customFields?.[sortConfig.key] || '';
          bValue = b.customFields?.[sortConfig.key] || '';
      }

      // Converter para string para comparação
      aValue = String(aValue || '').toLowerCase();
      bValue = String(bValue || '').toLowerCase();

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredContacts, sortConfig]);

  if (!showForm) {
    return (
      <div className="flex-1 flex flex-col h-full bg-background">
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-foreground">TODOS OS CONTATOS E EMPRESAS</h1>
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              ADICIONAR CONTATO
            </Button>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-primary/10 text-primary border-primary/20"
            >
              Lista completa
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => setShowSearchPanel(true)}
            >
              <Filter className="w-4 h-4" />
              Filtros avançados
            </Button>
            
            <TableColumnsConfig 
              columns={tableColumns} 
              onColumnsChange={handleColumnsChange}
            />
            
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF/CNPJ, empresa, fantasia, WhatsApp ou e-mail..."
                  value={searchFilters.unifiedSearch}
                  onChange={(e) => setSearchFilters({ ...searchFilters, unifiedSearch: e.target.value })}
                  className="pl-10 h-9"
                />
              </div>
            </div>
            
            <div className="ml-auto text-sm text-muted-foreground">
              {sortedContacts.length} elementos
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {sortedContacts.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              Nenhum contato cadastrado. Clique em "ADICIONAR CONTATO" para começar.
            </div>
          ) : (
            <div className="relative">
              <table className="w-full">
                <thead className="border-b border-border sticky top-0 bg-background z-10">
                  <tr>
                    {tableColumns.filter(col => col.visible).map((column, index) => (
                      <th
                        key={column.id}
                        className={`text-left p-3 font-medium text-sm text-muted-foreground relative ${
                          index === 0 ? 'sticky left-0 bg-background border-r border-border z-20' : ''
                        }`}
                        style={{ width: column.width, minWidth: column.width }}
                      >
                        <div className="flex items-center justify-between gap-2 pr-4">
                          <span>{column.label.toUpperCase()}</span>
                          {column.id !== 'actions' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 hover:bg-transparent"
                              onClick={() => handleSort(column.id)}
                            >
                              {getSortIcon(column.id)}
                            </Button>
                          )}
                        </div>
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary bg-border/50 z-20"
                          style={{ touchAction: 'none' }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const startX = e.clientX;
                            const startWidth = column.width;

                            const handleMouseMove = (moveEvent: MouseEvent) => {
                              moveEvent.preventDefault();
                              const diff = moveEvent.clientX - startX;
                              const newWidth = Math.max(60, startWidth + diff);
                              setTableColumns(prev =>
                                prev.map(col =>
                                  col.id === column.id ? { ...col, width: newWidth } : col
                                )
                              );
                            };

                            const handleMouseUp = () => {
                              document.removeEventListener('mousemove', handleMouseMove);
                              document.removeEventListener('mouseup', handleMouseUp);
                              document.body.style.cursor = '';
                              document.body.style.userSelect = '';
                            };

                            document.body.style.cursor = 'col-resize';
                            document.body.style.userSelect = 'none';
                            document.addEventListener('mousemove', handleMouseMove);
                            document.addEventListener('mouseup', handleMouseUp);
                          }}
                        />
                      </th>
                    ))}
                    <th className="w-[50px] p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedContacts.map((contact) => (
                    <tr key={contact.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      {tableColumns.filter(col => col.visible).map((column, index) => {
                        if (column.id === 'actions') {
                          return (
                            <td key="actions" className="p-3 sticky left-0 bg-background border-r border-border">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => {
                                  setEditingContact(contact);
                                  setFormData({
                                    name: contact.name,
                                    phone: contact.phone,
                                    email: contact.email,
                                    position: contact.position,
                                    ...contact.customFields
                                  });
                                  setShowForm(true);
                                }}
                                title="Editar cadastro completo"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </td>
                          );
                        }

                        return (
                        <td 
                          key={column.id} 
                          className="p-3 group relative"
                          style={{ width: column.width, maxWidth: column.width }}
                        >
                          {editingCell?.contactId === contact.id && editingCell?.field === column.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveInlineEdit();
                                  if (e.key === "Escape") handleCancelEdit();
                                }}
                                className="h-8"
                                autoFocus
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 flex-shrink-0"
                                onClick={handleSaveInlineEdit}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between min-w-0">
                              <span className={`truncate ${column.id === 'name' ? 'font-medium text-primary' : ''}`}>
                                {column.id === 'name' && contact.name}
                                {column.id === 'company' && (contact.company || "-")}
                                {column.id === 'phone' && contact.phone}
                                {column.id === 'email' && contact.email}
                                {column.id === 'position' && contact.position}
                                {column.id === 'cpf_cnpj' && (contact.customFields?.cpf_cnpj || "-")}
                                {column.id === 'company_fantasia' && (contact.customFields?.company_fantasia || "-")}
                                {column.id === 'city' && (contact.customFields?.city || "-")}
                                {column.id === 'state' && (contact.customFields?.state || "-")}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  let value = "";
                                  if (column.id === 'name') value = contact.name;
                                  else if (column.id === 'company') value = contact.company || "";
                                  else if (column.id === 'phone') value = contact.phone;
                                  else if (column.id === 'email') value = contact.email;
                                  else if (column.id === 'position') value = contact.position;
                                  else value = contact.customFields?.[column.id] || "";
                                  handleStartEdit(contact.id, column.id, value);
                                }}
                                title="Edição rápida"
                              >
                                <Pencil className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </td>
                        );
                      })}
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteContact(contact.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Dialog de confirmação de exclusão */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o contato <strong>{contactToDelete?.name}</strong>?
                {"\n\n"}
                Se o contato estiver em uso no sistema (conversas, pedidos, etc.), 
                ele será inativado ao invés de excluído.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Search Panel */}
        <Sheet open={showSearchPanel} onOpenChange={setShowSearchPanel}>
          <SheetContent side="right" className="w-full sm:max-w-[900px] p-0 overflow-hidden">
            <div className="flex h-full">
              {/* Left Sidebar - Filter Lists */}
              <div className="w-64 border-r border-border bg-muted/30 overflow-y-auto">
                <div className="p-4">
                  <div className="mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-left font-medium text-primary bg-primary/10 hover:bg-primary/20"
                    >
                      Lista completa
                    </Button>
                  </div>
                  
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-left font-normal text-muted-foreground hover:text-foreground"
                    >
                      Contatos sem tarefas atribuí...
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-left font-normal text-muted-foreground hover:text-foreground"
                    >
                      Contatos com tarefas atrasa...
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-left font-normal text-muted-foreground hover:text-foreground"
                    >
                      Sem leads vinculado
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-left font-normal text-muted-foreground hover:text-foreground"
                    >
                      Exluído
                    </Button>
                  </div>
                </div>
              </div>

              {/* Main Content - Search Fields */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-6">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Left Column */}
                      <div className="space-y-4">
                      <div>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal h-10 text-muted-foreground"
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          A qualquer hora
                        </Button>
                      </div>

                      <div>
                        <Input
                          placeholder="Funil de vendas, etapas"
                          value={searchFilters.funnel}
                          onChange={(e) => setSearchFilters({ ...searchFilters, funnel: e.target.value })}
                          className="h-10"
                        />
                      </div>

                      <div>
                        <Input
                          placeholder="Usuário responsável"
                          value={searchFilters.responsible}
                          onChange={(e) => setSearchFilters({ ...searchFilters, responsible: e.target.value })}
                          className="h-10"
                        />
                      </div>

                      <div>
                        <Input
                          placeholder="Criado por"
                          value={searchFilters.createdBy}
                          onChange={(e) => setSearchFilters({ ...searchFilters, createdBy: e.target.value })}
                          className="h-10"
                        />
                      </div>

                      <div>
                        <Input
                          placeholder="Modificado por"
                          value={searchFilters.modifiedBy}
                          onChange={(e) => setSearchFilters({ ...searchFilters, modifiedBy: e.target.value })}
                          className="h-10"
                        />
                      </div>

                      <div>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal h-10 text-muted-foreground"
                        >
                          Tarefas: Todos valores
                        </Button>
                      </div>
                      
                      {/* Campos customizados searchable */}
                      {[...contactFields, ...companyFields]
                        .filter(f => f.searchable && !f.locked)
                        .map((field) => (
                          <div key={field.id}>
                            <Input
                              placeholder={field.label}
                              value={searchFilters[field.id as keyof SearchFilters] || ""}
                              onChange={(e) => setSearchFilters({ ...searchFilters, [field.id]: e.target.value })}
                              className="h-10"
                            />
                          </div>
                        ))}
                    </div>

                    {/* Right Column - Tags */}
                    <div className="space-y-4">
                      <div className="border border-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium">TAGS</span>
                          <Button variant="link" className="h-auto p-0 text-primary text-sm">
                            Gerenciar
                          </Button>
                        </div>
                        <Input
                          placeholder="Localizar tags"
                          value={searchFilters.tags}
                          onChange={(e) => setSearchFilters({ ...searchFilters, tags: e.target.value })}
                          className="h-10 mb-3"
                        />
                        <p className="text-sm text-muted-foreground">
                          Você não tem tags conectadas
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6 pt-6 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchFilters({
                          unifiedSearch: "",
                          dateFilter: "",
                          funnel: "",
                          responsible: "",
                          createdBy: "",
                          modifiedBy: "",
                          tasks: "",
                          tags: "",
                        });
                      }}
                    >
                      Limpar filtros
                    </Button>
                    <Button
                      onClick={() => setShowSearchPanel(false)}
                    >
                      Aplicar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <div className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">{editingContact ? editingContact.name : "Novo Contato"}</h1>
          <Button variant="ghost" size="sm" className="gap-2 ml-auto">
            #ADICIONAR TAGS
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <Tabs defaultValue="principal" className="w-full">
          <div className="border-b border-border bg-card px-6">
            <TabsList className="bg-transparent h-auto p-0">
              <TabsTrigger 
                value="principal" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
              >
                Principal
              </TabsTrigger>
              <TabsTrigger 
                value="leads"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
              >
                Leads
              </TabsTrigger>
              <TabsTrigger 
                value="segmentos"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
              >
                Segmentos
              </TabsTrigger>
              <TabsTrigger 
                value="configuracoes"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
              >
                Configurações
              </TabsTrigger>
              <TabsTrigger 
                value="importacao"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none bg-transparent"
              >
                Importação
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="principal" className="p-6 space-y-6">
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-foreground/70">INFORMAÇÕES DO CONTATO</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="responsible">Usuário responsável</Label>
                  <Input
                    id="responsible"
                    placeholder="Marcos P"
                    value={formData.responsible || ""}
                    onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                  />
                </div>

                {contactFields.map((field) => (
                  <div key={field.id}>
                    <Label htmlFor={field.id}>{field.label}</Label>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Plus className="w-5 h-5 text-muted-foreground" />
                <h3 className="text-sm font-medium text-foreground/70">Adicionar empresa</h3>
              </div>

              <div className="space-y-4">
                {companyFields.map((field) => (
                  <div key={field.id}>
                    <Label htmlFor={field.id}>{field.label}</Label>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Plus className="w-5 h-5 text-muted-foreground" />
                <h3 className="text-sm font-medium text-foreground/70">Segmentos</h3>
              </div>

              <div className="space-y-3">
                <Label>Selecione um ou mais segmentos</Label>
                {segmentos.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {segmentos.map((segmento) => (
                      <div key={segmento.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`segmento-${segmento.id}`}
                          checked={segmentosSelecionados.includes(segmento.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSegmentosSelecionados([...segmentosSelecionados, segmento.id]);
                            } else {
                              setSegmentosSelecionados(segmentosSelecionados.filter(id => id !== segmento.id));
                            }
                          }}
                        />
                        <Label
                          htmlFor={`segmento-${segmento.id}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {segmento.nome}
                        </Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhum segmento cadastrado. Configure segmentos nas configurações do estabelecimento.
                  </p>
                )}
              </div>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveContact}>
                Salvar
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="leads" className="p-6">
            <div className="text-center text-muted-foreground py-12">
              Nenhum lead associado a este contato
            </div>
          </TabsContent>

          <TabsContent value="segmentos" className="p-6">
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Segmentos do Contato</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Selecione um ou mais segmentos para categorizar este contato.
                  </p>
                </div>

                {segmentos.length > 0 ? (
                  <div className="space-y-2">
                    {segmentos.map((segmento) => (
                      <div key={segmento.id} className="flex items-center space-x-3 p-3 border rounded-md hover:bg-accent transition-colors">
                        <Checkbox
                          id={`seg-tab-${segmento.id}`}
                          checked={segmentosSelecionados.includes(segmento.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSegmentosSelecionados([...segmentosSelecionados, segmento.id]);
                            } else {
                              setSegmentosSelecionados(segmentosSelecionados.filter(id => id !== segmento.id));
                            }
                          }}
                        />
                        <Label
                          htmlFor={`seg-tab-${segmento.id}`}
                          className="text-base font-normal cursor-pointer flex-1"
                        >
                          {segmento.nome}
                        </Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground mb-4">
                      Nenhum segmento cadastrado
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Configure segmentos nas configurações do estabelecimento para poder categorizar seus contatos.
                    </p>
                  </div>
                )}

                {segmentosSelecionados.length > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">
                      Segmentos selecionados: <span className="font-semibold">{segmentosSelecionados.length}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {segmentosSelecionados.map((segId) => {
                        const seg = segmentos.find(s => s.id === segId);
                        return seg ? (
                          <Badge key={segId} variant="secondary">
                            {seg.nome}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="configuracoes" className="p-6">
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Campos e grupos</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Adicione seus próprios campos personalizados. Eles são ótimos para filtrar dados e compilar relatórios.
                  </p>
                </div>

                <Tabs value={activeFieldTab} onValueChange={(v) => setActiveFieldTab(v as "contact" | "company")} className="w-full">
                  <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="contact">Campos de Contato</TabsTrigger>
                    <TabsTrigger value="company">Campos de Empresa</TabsTrigger>
                  </TabsList>

                  <TabsContent value="contact" className="space-y-4 mt-6">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEndContact}
                    >
                      <SortableContext
                        items={contactFields.map(f => f.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          {contactFields.map((field) => (
                            <SortableFieldItem
                              key={field.id}
                              field={field}
                              onRemove={(id) => handleRemoveField(id, "contact")}
                              onToggleSearchable={(id) => handleToggleSearchable(id, "contact")}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>

                    <div className="border-t pt-6 space-y-4">
                      <h4 className="text-sm font-semibold">Adicionar novo campo</h4>
                      <div className="grid gap-4">
                        <div>
                          <Label htmlFor="newFieldLabel">Nome do campo</Label>
                          <Input
                            id="newFieldLabel"
                            placeholder="Ex: Cargo, Departamento..."
                            value={newFieldLabel}
                            onChange={(e) => setNewFieldLabel(e.target.value)}
                          />
                        </div>

                        <div>
                          <Label htmlFor="newFieldType">Tipo de campo</Label>
                          <Select value={newFieldType} onValueChange={(val: any) => setNewFieldType(val)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Texto</SelectItem>
                              <SelectItem value="email">E-mail</SelectItem>
                              <SelectItem value="phone">Telefone</SelectItem>
                              <SelectItem value="number">Número</SelectItem>
                              <SelectItem value="date">Data</SelectItem>
                              <SelectItem value="textarea">Texto longo</SelectItem>
                              <SelectItem value="select">Lista de opções</SelectItem>
                              <SelectItem value="checkbox">Checkbox</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {newFieldType === "select" && (
                          <div>
                            <Label htmlFor="newFieldOptions">Opções (separadas por vírgula)</Label>
                            <Input
                              id="newFieldOptions"
                              placeholder="Opção 1, Opção 2, Opção 3"
                              value={newFieldOptions}
                              onChange={(e) => setNewFieldOptions(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Digite as opções separadas por vírgula
                            </p>
                          </div>
                        )}

                        <Button onClick={handleAddField} className="w-full">
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar campo
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="company" className="space-y-4 mt-6">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEndCompany}
                    >
                      <SortableContext
                        items={companyFields.map(f => f.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          {companyFields.map((field) => (
                            <SortableFieldItem
                              key={field.id}
                              field={field}
                              onRemove={(id) => handleRemoveField(id, "company")}
                              onToggleSearchable={(id) => handleToggleSearchable(id, "company")}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>

                    <div className="border-t pt-6 space-y-4">
                      <h4 className="text-sm font-semibold">Adicionar novo campo</h4>
                      <div className="grid gap-4">
                        <div>
                          <Label htmlFor="newFieldLabel">Nome do campo</Label>
                          <Input
                            id="newFieldLabel"
                            placeholder="Ex: CNPJ, Setor..."
                            value={newFieldLabel}
                            onChange={(e) => setNewFieldLabel(e.target.value)}
                          />
                        </div>

                        <div>
                          <Label htmlFor="newFieldType">Tipo de campo</Label>
                          <Select value={newFieldType} onValueChange={(val: any) => setNewFieldType(val)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Texto</SelectItem>
                              <SelectItem value="email">E-mail</SelectItem>
                              <SelectItem value="phone">Telefone</SelectItem>
                              <SelectItem value="number">Número</SelectItem>
                              <SelectItem value="date">Data</SelectItem>
                              <SelectItem value="textarea">Texto longo</SelectItem>
                              <SelectItem value="select">Lista de opções</SelectItem>
                              <SelectItem value="checkbox">Checkbox</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {newFieldType === "select" && (
                          <div>
                            <Label htmlFor="newFieldOptions">Opções (separadas por vírgula)</Label>
                            <Input
                              id="newFieldOptions"
                              placeholder="Opção 1, Opção 2, Opção 3"
                              value={newFieldOptions}
                              onChange={(e) => setNewFieldOptions(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Digite as opções separadas por vírgula
                            </p>
                          </div>
                        )}

                        <Button onClick={handleAddField} className="w-full">
                          <Plus className="w-4 h-4 mr-2" />
                          Adicionar campo
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
                
                {/* Configuração de Máscaras */}
                <div className="mt-6">
                  <FieldMaskConfig
                    availableFields={[...contactFields, ...companyFields].map(f => ({ id: f.id, label: f.label }))}
                    masks={fieldMasks}
                    onMasksChange={setFieldMasks}
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="importacao" className="p-6">
            <Tabs defaultValue="arquivo" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="arquivo">Por Arquivo</TabsTrigger>
                <TabsTrigger value="api">Por API</TabsTrigger>
              </TabsList>

              <TabsContent value="arquivo">
                <Card className="p-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Importar Contatos por Arquivo</h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        Faça upload de um arquivo CSV ou Excel para importar múltiplos contatos de uma vez.
                      </p>
                    </div>

                <div className="border-2 border-dashed border-border rounded-lg p-8">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                    
                    <div className="text-center space-y-2">
                      <h4 className="font-medium">Arraste e solte seu arquivo aqui</h4>
                      <p className="text-sm text-muted-foreground">ou clique para selecionar</p>
                      <p className="text-xs text-muted-foreground">Formatos aceitos: CSV, XLS, XLSX (máx. 10MB)</p>
                    </div>

                    <Button className="mt-4">
                      <Upload className="w-4 h-4 mr-2" />
                      Selecionar Arquivo
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold">Campos Obrigatórios</h4>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">CONTATO</p>
                        <ul className="text-sm space-y-1">
                          <li>• Nome de contato</li>
                          <li>• WhatsApp</li>
                          <li>• E-mail</li>
                          <li>• Posição</li>
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">EMPRESA</p>
                        <ul className="text-sm space-y-1">
                          <li>• Tipo (Pessoa Física ou Pessoa Jurídica)</li>
                          <li>• CPF/CNPJ</li>
                          <li>• Nome</li>
                          <li>• Nome Fantasia</li>
                          <li>• CEP</li>
                          <li>• Endereço</li>
                          <li>• Cidade</li>
                          <li>• Bairro</li>
                          <li>• UF</li>
                          <li>• Inscrição</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold">Instruções de Importação</h4>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm">
                    <div className="flex gap-2">
                      <span className="font-medium min-w-6">1.</span>
                      <p>Baixe o modelo de importação clicando no botão abaixo</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium min-w-6">2.</span>
                      <p>Preencha todas as colunas obrigatórias (não deixe células vazias)</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium min-w-6">3.</span>
                      <p>Tipo deve ser exatamente: "Pessoa Física" ou "Pessoa Jurídica"</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium min-w-6">4.</span>
                      <p>Telefones no formato: (00) 00000-0000 ou (00) 0000-0000</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium min-w-6">5.</span>
                      <p>CPF/CNPJ no formato: 000.000.000-00 ou 00.000.000/0000-00</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium min-w-6">6.</span>
                      <p>CEP no formato: 00000-000</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium min-w-6">7.</span>
                      <p>Inscrição: número da IE ou "ISENTO" para pessoa física</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="font-medium min-w-6">8.</span>
                      <p>Contatos duplicados (mesmo telefone ou e-mail) serão ignorados</p>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      // Criar workbook Excel
                      const wb = XLSX.utils.book_new();
                      
                      // Definir cabeçalhos
                      const headers = [
                        "Nome de contato",
                        "WhatsApp",
                        "E-mail",
                        "Posição",
                        "Tipo",
                        "CPF/CNPJ",
                        "Nome",
                        "Nome Fantasia",
                        "CEP",
                        "Endereço",
                        "Cidade",
                        "Bairro",
                        "UF",
                        "Inscrição"
                      ];
                      
                      // Linha de exemplo
                      const exampleRow = [
                        "João Silva",
                        "(11) 99999-9999",
                        "joao@exemplo.com",
                        "Gerente",
                        "Pessoa Jurídica",
                        "12.345.678/0001-90",
                        "Empresa Exemplo LTDA",
                        "Empresa Exemplo",
                        "01310-100",
                        "Avenida Paulista, 1000",
                        "São Paulo",
                        "Bela Vista",
                        "SP",
                        "123456789"
                      ];
                      
                      // Criar worksheet com cabeçalhos e exemplo
                      const wsData = [headers, exampleRow];
                      const ws = XLSX.utils.aoa_to_sheet(wsData);
                      
                      // Definir largura das colunas
                      const colWidths = headers.map(() => ({ wch: 20 }));
                      ws['!cols'] = colWidths;
                      
                      // Adicionar worksheet ao workbook
                      XLSX.utils.book_append_sheet(wb, ws, "Contatos");
                      
                      // Gerar arquivo Excel e baixar
                      XLSX.writeFile(wb, "modelo_importacao_contatos.xlsx");
                      
                      toast.success("Modelo Excel baixado com sucesso!");
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Modelo de Importação (Excel)
                  </Button>
                </div>
              </div>
            </Card>
              </TabsContent>

              <TabsContent value="api">
                <APIImportDialog />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
