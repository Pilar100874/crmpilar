export interface Visitor {
  id: string;
  cpf: string;
  name: string;
  company: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  photo?: string;
  createdAt: string;
}

export interface ContactPerson {
  id: string;
  name: string;
  whatsapp: string;
  cpf: string;
  createdAt: string;
}

export interface PendingVisitor {
  id: string;
  visitor: Visitor;
  contactPersonId: string;
  contactPerson: string;
  vehiclePlate?: string;
  purpose?: string;
  notes?: string;
  status: "pending" | "authorized" | "denied";
  createdAt: string;
  authorizedAt?: string;
  authorizedBy?: string;
}

export interface AccessRecord {
  id: string;
  visitorId: string;
  visitor: Visitor;
  contactPerson: string;
  contactPersonId?: string;
  vehiclePlate?: string;
  purpose?: string;
  notes?: string;
  entryDate: string;
  exitDate?: string;
  status: "inside" | "exited";
}

export interface AccessFilters {
  cpf?: string;
  name?: string;
  vehiclePlate?: string;
  status?: "all" | "inside" | "exited";
  startDate?: string;
  endDate?: string;
}
