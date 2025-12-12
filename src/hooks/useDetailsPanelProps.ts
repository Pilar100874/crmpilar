import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PanelType } from "@/components/atendimento/UnifiedDetailsPanel";

export interface DetailsPanelProps {
  type: PanelType;
  nome?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  customerId?: string;
  empresaId?: string;
  protocolo?: string;
  status?: string;
  valorTotal?: number;
  canal?: string;
  dataHora?: string;
  titulo?: string;
  descricao?: string;
  companies?: any[];
}

interface UseDetailsPanelPropsParams {
  activeTab: string;
  selectedConv?: any;
  selectedTaskData?: any;
  selectedEmailData?: any;
  selectedOrcamentoData?: any;
  customerCompanies?: any[];
}

export function getDetailsPanelProps({
  activeTab,
  selectedConv,
  selectedTaskData,
  selectedEmailData,
  selectedOrcamentoData,
  customerCompanies = []
}: UseDetailsPanelPropsParams): DetailsPanelProps | null {
  
  if (activeTab === "chat" && selectedConv) {
    return {
      type: "chat",
      nome: selectedConv.customer?.nome || "Cliente",
      telefone: selectedConv.customer?.telefone,
      whatsapp: selectedConv.customer?.telefone,
      email: selectedConv.customer?.email,
      customerId: selectedConv.customer?.id,
      protocolo: selectedConv.id?.slice(0, 8).toUpperCase(),
      status: selectedConv.chat_status || selectedConv.status,
      canal: selectedConv.canal,
      dataHora: selectedConv.updated_at 
        ? format(new Date(selectedConv.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
        : undefined,
      companies: customerCompanies
    };
  }

  if (activeTab === "agenda" && selectedTaskData) {
    return {
      type: "agenda",
      nome: selectedTaskData.customers?.nome || selectedTaskData.contact_name,
      telefone: selectedTaskData.customers?.telefone,
      whatsapp: selectedTaskData.customers?.telefone,
      email: selectedTaskData.customers?.email,
      customerId: selectedTaskData.customers?.id || selectedTaskData.contact_id,
      protocolo: selectedTaskData.id?.slice(0, 8).toUpperCase(),
      status: selectedTaskData.status === "concluido" ? "Concluído" : selectedTaskData.status === "pendente" ? "Pendente" : selectedTaskData.status,
      titulo: selectedTaskData.title,
      descricao: selectedTaskData.description,
      dataHora: selectedTaskData.date 
        ? `${format(new Date(selectedTaskData.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}${selectedTaskData.time ? ` às ${selectedTaskData.time}` : ""}`
        : undefined,
      companies: selectedTaskData.customers?.customer_empresas || []
    };
  }

  if (activeTab === "email" && selectedEmailData) {
    const emailCompanies = [
      ...(selectedEmailData.customer?.customer_empresas?.map((ce: any) => ({
        ...ce,
        empresas: ce.empresas
      })) || []),
      ...(selectedEmailData.empresa ? [{ empresas: selectedEmailData.empresa }] : [])
    ];

    return {
      type: "email",
      nome: selectedEmailData.customer?.nome || selectedEmailData.empresa?.nome_fantasia || selectedEmailData.empresa?.nome || selectedEmailData.from_email,
      telefone: selectedEmailData.customer?.telefone || selectedEmailData.empresa?.telefone,
      whatsapp: selectedEmailData.customer?.telefone || selectedEmailData.empresa?.telefone,
      email: selectedEmailData.from_email,
      customerId: selectedEmailData.customer?.id,
      protocolo: selectedEmailData.id?.slice(0, 8).toUpperCase(),
      status: selectedEmailData.read ? "Lido" : "Não lido",
      titulo: selectedEmailData.subject,
      dataHora: selectedEmailData.date 
        ? format(new Date(selectedEmailData.date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
        : undefined,
      companies: emailCompanies
    };
  }

  if (activeTab === "orcamento" && selectedOrcamentoData) {
    return {
      type: "orcamento",
      nome: selectedOrcamentoData.customers?.nome || selectedOrcamentoData.empresas?.nome_fantasia || selectedOrcamentoData.empresas?.nome || "Cliente",
      telefone: selectedOrcamentoData.customers?.telefone || selectedOrcamentoData.empresas?.telefone,
      whatsapp: selectedOrcamentoData.customers?.telefone || selectedOrcamentoData.empresas?.telefone,
      email: selectedOrcamentoData.customers?.email || selectedOrcamentoData.empresas?.email,
      customerId: selectedOrcamentoData.customers?.id,
      protocolo: selectedOrcamentoData.id?.slice(0, 8).toUpperCase(),
      status: selectedOrcamentoData.etapa || selectedOrcamentoData.status,
      valorTotal: selectedOrcamentoData.valor_total || 0,
      companies: selectedOrcamentoData.empresas 
        ? [{ empresas: selectedOrcamentoData.empresas, is_primary: true }]
        : customerCompanies
    };
  }

  return null;
}
