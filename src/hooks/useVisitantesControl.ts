import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  Visitor,
  AccessRecord,
  AccessFilters,
  ContactPerson,
  PendingVisitor,
} from "@/types/visitantes";
import { toast } from "sonner";
import { getEstabelecimentoId } from "@/lib/estabelecimento";

// Nomes reais das tabelas neste projeto
const T_VIS = "vis_visitors" as const;
const T_CP = "vis_contact_persons" as const;
const T_PV = "vis_pending_visitors" as const;
const T_AR = "vis_access_records" as const;

const mapVisitor = (v: any): Visitor => ({
  id: v.id,
  cpf: v.cpf,
  name: v.name,
  company: v.company,
  email: v.email ?? undefined,
  phone: v.phone ?? undefined,
  whatsapp: v.whatsapp ?? undefined,
  photo: v.photo ?? undefined,
  createdAt: v.created_at,
});

export function useVisitantesControl() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [accessRecords, setAccessRecords] = useState<AccessRecord[]>([]);
  const [contactPersons, setContactPersons] = useState<ContactPerson[]>([]);
  const [pendingVisitors, setPendingVisitors] = useState<PendingVisitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [vRes, cRes, rRes, pRes] = await Promise.all([
        supabase.from(T_VIS).select("*").order("created_at", { ascending: false }),
        supabase.from(T_CP).select("*").order("created_at", { ascending: false }),
        supabase.from(T_AR).select(`*, visitor:${T_VIS}(*)`).order("entry_date", { ascending: false }),
        supabase.from(T_PV).select(`*, visitor:${T_VIS}(*)`).order("created_at", { ascending: false }),
      ]);
      if (vRes.error) throw vRes.error;
      if (cRes.error) throw cRes.error;
      if (rRes.error) throw rRes.error;
      if (pRes.error) throw pRes.error;

      setVisitors((vRes.data ?? []).map(mapVisitor));
      setContactPersons(
        (cRes.data ?? []).map((c: any) => ({
          id: c.id,
          name: c.name,
          whatsapp: c.whatsapp,
          cpf: c.cpf,
          createdAt: c.created_at,
        }))
      );
      setAccessRecords(
        (rRes.data ?? []).map((r: any) => ({
          id: r.id,
          visitorId: r.visitor_id,
          visitor: mapVisitor(r.visitor),
          contactPerson: r.contact_person_name,
          contactPersonId: r.contact_person_id ?? undefined,
          vehiclePlate: r.vehicle_plate ?? undefined,
          purpose: r.purpose ?? undefined,
          notes: r.notes ?? undefined,
          entryDate: r.entry_date,
          exitDate: r.exit_date ?? undefined,
          status: r.status,
        }))
      );
      setPendingVisitors(
        (pRes.data ?? []).map((p: any) => ({
          id: p.id,
          visitor: mapVisitor(p.visitor),
          contactPersonId: p.contact_person_id,
          contactPerson: p.contact_person_name,
          vehiclePlate: p.vehicle_plate ?? undefined,
          purpose: p.purpose ?? undefined,
          notes: p.notes ?? undefined,
          status: p.status,
          createdAt: p.created_at,
          authorizedAt: p.authorized_at ?? undefined,
          authorizedBy: p.authorized_by ?? undefined,
        }))
      );
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar dados de visitantes");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const findVisitorByCpf = (cpf: string) => visitors.find((v) => v.cpf === cpf);

  const createVisitor = async (data: Omit<Visitor, "id" | "createdAt">): Promise<Visitor> => {
    const estId = await getEstabelecimentoId();
    if (!estId) { toast.error("Estabelecimento não encontrado"); throw new Error("no est"); }
    const { data: row, error } = await supabase
      .from(T_VIS)
      .insert([{
        cpf: data.cpf, name: data.name, company: data.company,
        email: data.email, phone: data.phone, whatsapp: data.whatsapp, photo: data.photo,
        estabelecimento_id: estId,
      }])
      .select()
      .single();
    if (error) { toast.error("Erro ao cadastrar visitante"); throw error; }
    const nv = mapVisitor(row);
    setVisitors((p) => [nv, ...p]);
    toast.success("Visitante cadastrado");
    return nv;
  };

  const updateVisitor = async (id: string, updates: Partial<Visitor>) => {
    const { error } = await supabase.from(T_VIS).update({
      name: updates.name, company: updates.company, email: updates.email,
      phone: updates.phone, whatsapp: updates.whatsapp, photo: updates.photo,
    }).eq("id", id);
    if (error) { toast.error("Erro ao atualizar visitante"); throw error; }
    setVisitors((p) => p.map((v) => (v.id === id ? { ...v, ...updates } : v)));
    toast.success("Visitante atualizado");
  };

  const deleteVisitor = async (id: string) => {
    const { error } = await supabase.from(T_VIS).delete().eq("id", id);
    if (error) { toast.error("Erro ao remover visitante"); throw error; }
    setVisitors((p) => p.filter((v) => v.id !== id));
    toast.success("Visitante removido");
  };

  const createAccessRecord = async (rec: Omit<AccessRecord, "id" | "entryDate" | "status">): Promise<AccessRecord> => {
    const estId = await getEstabelecimentoId();
    if (!estId) { toast.error("Estabelecimento não encontrado"); throw new Error("no est"); }
    const { data, error } = await supabase.from(T_AR).insert([{
      visitor_id: rec.visitorId,
      contact_person_name: rec.contactPerson,
      contact_person_id: rec.contactPersonId,
      vehicle_plate: rec.vehiclePlate,
      purpose: rec.purpose,
      notes: rec.notes,
      estabelecimento_id: estId,
    }]).select(`*, visitor:${T_VIS}(*)`).single();
    if (error) { toast.error("Erro ao registrar entrada"); throw error; }
    const nr: AccessRecord = {
      id: data.id, visitorId: data.visitor_id, visitor: mapVisitor(data.visitor),
      contactPerson: data.contact_person_name, contactPersonId: data.contact_person_id ?? undefined,
      vehiclePlate: data.vehicle_plate ?? undefined, purpose: data.purpose ?? undefined,
      notes: data.notes ?? undefined, entryDate: data.entry_date, exitDate: data.exit_date ?? undefined,
      status: data.status as "inside" | "exited",
    };
    setAccessRecords((p) => [nr, ...p]);
    toast.success("Entrada registrada");
    return nr;
  };

  const exitVisitor = async (recordId: string) => {
    const now = new Date().toISOString();
    const { error } = await supabase.from(T_AR).update({ exit_date: now, status: "exited" }).eq("id", recordId);
    if (error) { toast.error("Erro ao registrar saída"); throw error; }
    setAccessRecords((p) => p.map((r) => (r.id === recordId ? { ...r, exitDate: now, status: "exited" as const } : r)));
    toast.success("Saída registrada");
  };

  const getActiveVisitors = () => accessRecords.filter((r) => r.status === "inside");

  const getFilteredRecords = (f: AccessFilters): AccessRecord[] =>
    accessRecords.filter((r) => {
      if (f.cpf && !r.visitor.cpf.includes(f.cpf.replace(/\D/g, ""))) return false;
      if (f.name && !r.visitor.name.toLowerCase().includes(f.name.toLowerCase())) return false;
      if (f.vehiclePlate && !r.vehiclePlate?.includes(f.vehiclePlate)) return false;
      if (f.status && f.status !== "all" && r.status !== f.status) return false;
      if (f.startDate) {
        if (new Date(r.entryDate).toDateString() < new Date(f.startDate).toDateString()) return false;
      }
      if (f.endDate) {
        if (new Date(r.entryDate).toDateString() > new Date(f.endDate).toDateString()) return false;
      }
      return true;
    });

  const createContactPerson = async (d: Omit<ContactPerson, "id" | "createdAt">): Promise<ContactPerson> => {
    const { data, error } = await supabase.from(T_CP).insert([d]).select().single();
    if (error) throw error;
    const nc: ContactPerson = { id: data.id, name: data.name, whatsapp: data.whatsapp, cpf: data.cpf, createdAt: data.created_at };
    setContactPersons((p) => [nc, ...p]);
    toast.success("Contato cadastrado");
    return nc;
  };

  const updateContactPerson = async (id: string, updates: Partial<ContactPerson>) => {
    const { error } = await supabase.from(T_CP).update({ name: updates.name, whatsapp: updates.whatsapp, cpf: updates.cpf }).eq("id", id);
    if (error) { toast.error("Erro ao atualizar"); throw error; }
    setContactPersons((p) => p.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    toast.success("Contato atualizado");
  };

  const deleteContactPerson = async (id: string) => {
    const { error } = await supabase.from(T_CP).delete().eq("id", id);
    if (error) throw error;
    setContactPersons((p) => p.filter((c) => c.id !== id));
    toast.success("Contato removido");
  };

  const createPendingVisitor = async (pd: Omit<PendingVisitor, "id" | "createdAt" | "status">): Promise<PendingVisitor> => {
    const { data, error } = await supabase.from(T_PV).insert([{
      visitor_id: pd.visitor.id,
      contact_person_id: pd.contactPersonId,
      contact_person_name: pd.contactPerson,
      vehicle_plate: pd.vehiclePlate,
      purpose: pd.purpose,
      notes: pd.notes,
    }]).select(`*, visitor:${T_VIS}(*)`).single();
    if (error) { toast.error("Erro ao criar solicitação"); throw error; }
    const np: PendingVisitor = {
      id: data.id, visitor: mapVisitor(data.visitor),
      contactPersonId: data.contact_person_id, contactPerson: data.contact_person_name,
      vehiclePlate: data.vehicle_plate ?? undefined, purpose: data.purpose ?? undefined,
      notes: data.notes ?? undefined, status: data.status as "pending" | "authorized" | "denied", createdAt: data.created_at,
      authorizedAt: data.authorized_at ?? undefined, authorizedBy: data.authorized_by ?? undefined,
    };
    setPendingVisitors((p) => [np, ...p]);
    toast.success("Solicitação enviada");
    return np;
  };

  const deletePendingVisitor = async (id: string) => {
    const { error } = await supabase.from(T_PV).delete().eq("id", id);
    if (error) throw error;
    setPendingVisitors((p) => p.filter((x) => x.id !== id));
  };

  const authorizePendingVisitor = async (id: string, authorizedBy: string) => {
    const now = new Date().toISOString();
    const { error } = await supabase.from(T_PV).update({ status: "authorized", authorized_at: now, authorized_by: authorizedBy }).eq("id", id);
    if (error) throw error;
    setPendingVisitors((p) => p.map((x) => (x.id === id ? { ...x, status: "authorized" as const, authorizedAt: now, authorizedBy } : x)));
    toast.success("Visitante autorizado");
  };

  const denyPendingVisitor = async (id: string) => {
    const now = new Date().toISOString();
    const { error } = await supabase.from(T_PV).update({ status: "denied", authorized_at: now }).eq("id", id);
    if (error) throw error;
    setPendingVisitors((p) => p.map((x) => (x.id === id ? { ...x, status: "denied" as const, authorizedAt: now } : x)));
    toast.success("Solicitação negada");
  };

  return {
    visitors, accessRecords, contactPersons, pendingVisitors, isLoading,
    findVisitorByCpf, createVisitor, updateVisitor, deleteVisitor,
    createAccessRecord, exitVisitor, getActiveVisitors, getFilteredRecords,
    createContactPerson, updateContactPerson, deleteContactPerson,
    createPendingVisitor, deletePendingVisitor, authorizePendingVisitor, denyPendingVisitor,
    loadData,
  };
}
