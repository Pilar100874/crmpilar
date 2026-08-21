import { supabase } from "@/integrations/supabase/client";

export { supabase };

export type ToolType = "manual" | "eletrica" | "pneumatica";
export type AppRole = "admin" | "almoxarifado" | "usuario";
export type LoanStatus = "ativo" | "devolvido" | "vencido" | "renovacao_solicitada";
export type RenewalStatus = "pendente" | "aprovada" | "rejeitada";
export type ReturnIssueType = "manutencao" | "danificada" | "perdida";
export type IssueStatus = "pendente" | "resolvido" | "descartado";

export interface Company {
  id: string;
  cnpj: string;
  name: string;
  user_limit: number;
  is_active: boolean;
  trial_ends_at: string | null;
  approved_until: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  qr_code: string | null;
  warehouse_id: string | null;
  company_id: string | null;
  allow_relend: boolean;
  avatar_url: string | null;
  last_location_lat: number | null;
  last_location_lng: number | null;
  last_location_updated_at: string | null;
  is_approved: boolean;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tool {
  id: string;
  name: string;
  type: ToolType;
  purchase_date: string | null;
  purchase_value: number | null;
  photo_url: string | null;
  requires_return_photo: boolean;
  is_maintenance: boolean;
  requires_kit: boolean;
  kit_id: string | null;
  warehouse_id: string | null;
  serial_number: string | null;
  description: string | null;
  qr_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface Kit {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KitTool {
  id: string;
  kit_id: string;
  tool_id: string;
  is_required: boolean;
}

export interface Loan {
  id: string;
  tool_id: string;
  user_id: string;
  warehouse_id: string;
  registered_by: string | null;
  loan_date: string;
  due_date: string;
  return_date: string | null;
  returned_by: string | null;
  return_photo_url: string | null;
  status: LoanStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanRenewal {
  id: string;
  loan_id: string;
  requested_by: string;
  new_due_date: string;
  status: RenewalStatus;
  approved_by: string | null;
  request_date: string;
  approval_date: string | null;
  reason: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  loan_id: string | null;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export interface UserWarehouse {
  id: string;
  user_id: string;
  warehouse_id: string;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role: string;
  route: string;
  can_access: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReturnIssue {
  id: string;
  loan_id: string;
  tool_id: string;
  user_id: string;
  reported_by: string;
  issue_type: ReturnIssueType;
  description: string | null;
  requires_discount: boolean;
  discount_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  status: IssueStatus;
  created_at: string;
  updated_at: string;
}
