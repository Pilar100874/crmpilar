import { useState } from "react";
import { Search, UserPlus, Camera, Car, Building2, User, MessageCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CVPageHeader } from "@/pages/controle-veiculos/CVPageHeader";
import { useVisitantesControl } from "@/hooks/useVisitantesControl";
import type { Visitor } from "@/types/visitantes";
import { validateCPF, formatCPF, formatWhatsApp } from "./visUtils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CVisEntrada() {
  const [cpfSearch, setCpfSearch] = useState("");
  const [foundVisitor, setFoundVisitor] = useState<Visitor | null>(null);
  const [isNewVisitor, setIsNewVisitor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [entryType, setEntryType] = useState<"immediate" | "pending">("immediate");

  const [vData, setVData] = useState({ name: "", company: "", email: "", whatsapp: "", photo: "" });
  const [visitData, setVisitData] = useState({ contactPersonId: "", vehiclePlate: "", purpose: "", notes: "" });

  const {
    findVisitorByCpf, createVisitor, createAccessRecord, createPendingVisitor,
    getActiveVisitors, contactPersons,
  } = useVisitantesControl();

  const handleSearch = () => {
    const clean = cpfSearch.replace(/\D/g, "");
    if (!validateCPF(clean)) {
      toast.error("CPF inválido");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const v = findVisitorByCpf(clean);
      if (v) {
        if (getActiveVisitors().some((r) => r.visitor.cpf === clean)) {
          toast.error(`${v.name} já está no local`);
          setLoading(false);
          return;
        }
        setFoundVisitor(v);
        setVData({ name: v.name, company: v.company, email: v.email || "", whatsapp: v.whatsapp || "", photo: v.photo || "" });
        setIsNewVisitor(false);
        toast.success(`Encontrado: ${v.name}`);
      } else {
        setFoundVisitor(null);
        setIsNewVisitor(true);
        setVData({ name: "", company: "", email: "", whatsapp: "", photo: "" });
        toast.info("Novo visitante — preencha os dados");
      }
      setLoading(false);
    }, 300);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setVData((p) => ({ ...p, photo: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!vData.name || !vData.company || !visitData.contactPersonId) {
      toast.error("Preencha nome, empresa e pessoa de contato");
      return;
    }
    setConfirmOpen(true);
  };

  const confirmEntry = async () => {
    setConfirmOpen(false);
    setLoading(true);
    try {
      let v = foundVisitor;
      if (isNewVisitor || !v) {
        v = await createVisitor({
          cpf: cpfSearch.replace(/\D/g, ""),
          name: vData.name,
          company: vData.company,
          email: vData.email || undefined,
          whatsapp: vData.whatsapp.replace(/\D/g, "") || undefined,
          photo: vData.photo || undefined,
        });
      }
      const contact = contactPersons.find((c) => c.id === visitData.contactPersonId);
      if (entryType === "immediate") {
        await createAccessRecord({
          visitorId: v.id, visitor: v, contactPerson: contact?.name || "",
          contactPersonId: visitData.contactPersonId,
          vehiclePlate: visitData.vehiclePlate || undefined,
          purpose: visitData.purpose || undefined,
          notes: visitData.notes || undefined,
        });
      } else {
        await createPendingVisitor({
          visitor: v, contactPersonId: visitData.contactPersonId,
          contactPerson: contact?.name || "",
          vehiclePlate: visitData.vehiclePlate || undefined,
          purpose: visitData.purpose || undefined,
          notes: visitData.notes || undefined,
        });
      }
      // reset
      setCpfSearch(""); setFoundVisitor(null); setIsNewVisitor(false);
      setVData({ name: "", company: "", email: "", whatsapp: "", photo: "" });
      setVisitData({ contactPersonId: "", vehiclePlate: "", purpose: "", notes: "" });
      setEntryType("immediate");
    } catch {
      // toasts já disparados no hook
    } finally {
      setLoading(false);
    }
  };

  const openWhats = (id: string) => {
    const c = contactPersons.find((x) => x.id === id);
    if (c) window.open(`https://web.whatsapp.com/send?phone=55${c.whatsapp}`, "_blank");
  };

  return (
    <div className="space-y-5">
      <CVPageHeader icon={LogIn} title="Registrar Entrada" subtitle="Identifique o visitante e registre a entrada" />

      <div className="max-w-3xl mx-auto space-y-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="cpf" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CPF do Visitante</Label>
                <Input id="cpf" placeholder="000.000.000-00" value={cpfSearch}
                  onChange={(e) => setCpfSearch(formatCPF(e.target.value))} maxLength={14}
                  className="h-11 text-base font-mono" />
              </div>
              <div className="flex items-end">
                <Button onClick={handleSearch} disabled={loading} className="w-full sm:w-auto h-11 px-6 font-semibold">
                  <Search className="h-4 w-4 mr-2" />
                  {loading ? "Buscando..." : "Buscar"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {(foundVisitor || isNewVisitor) && (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  {isNewVisitor
                    ? <UserPlus className="h-4 w-4 text-primary" />
                    : <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                  {isNewVisitor ? "Novo Visitante" : "Dados do Visitante"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto] gap-6">
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nome *</Label>
                        <Input value={vData.name} onChange={(e) => setVData((p) => ({ ...p, name: e.target.value }))} disabled={!isNewVisitor} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Empresa *</Label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input value={vData.company} onChange={(e) => setVData((p) => ({ ...p, company: e.target.value }))}
                            className="pl-9" disabled={!isNewVisitor} />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">E-mail</Label>
                        <Input type="email" value={vData.email}
                          onChange={(e) => setVData((p) => ({ ...p, email: e.target.value }))} disabled={!isNewVisitor} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">WhatsApp</Label>
                        <Input placeholder="(11) 99999-9999" value={vData.whatsapp}
                          onChange={(e) => setVData((p) => ({ ...p, whatsapp: formatWhatsApp(e.target.value) }))} disabled={!isNewVisitor} maxLength={15} />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <Label className="text-xs mb-1.5">Foto</Label>
                    {vData.photo ? (
                      <div className="relative">
                        <img src={vData.photo} alt="Foto" className="w-24 h-32 object-cover rounded-xl border-2 border-border" />
                        {isNewVisitor && (
                          <Button variant="outline" size="sm" className="mt-2 text-xs w-full"
                            onClick={() => document.getElementById("cvis-photo")?.click()}>
                            <Camera className="h-3 w-3 mr-1" /> Alterar
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="w-24 h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center bg-muted/30">
                        <Camera className="h-6 w-6 text-muted-foreground/50 mb-1.5" />
                        {isNewVisitor && (
                          <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2"
                            onClick={() => document.getElementById("cvis-photo")?.click()}>
                            Adicionar
                          </Button>
                        )}
                      </div>
                    )}
                    {isNewVisitor && (
                      <input id="cvis-photo" type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Dados da Visita</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Pessoa para Contato *</Label>
                    <div className="flex gap-2">
                      <Select value={visitData.contactPersonId} onValueChange={(v) => setVisitData((p) => ({ ...p, contactPersonId: v }))}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {contactPersons.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {visitData.contactPersonId && (
                        <Button type="button" variant="outline" size="icon" onClick={() => openWhats(visitData.contactPersonId)}>
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {contactPersons.length === 0 && (
                      <p className="text-[11px] text-muted-foreground">Nenhum contato cadastrado. Cadastre em "Pessoas de Contato".</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Placa do Veículo</Label>
                    <div className="relative">
                      <Car className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input value={visitData.vehiclePlate}
                        onChange={(e) => setVisitData((p) => ({ ...p, vehiclePlate: e.target.value.toUpperCase() }))}
                        placeholder="ABC-1234" className="pl-9 font-mono uppercase" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Motivo da Visita</Label>
                  <Input value={visitData.purpose} placeholder="Reunião, entrega, manutenção..."
                    onChange={(e) => setVisitData((p) => ({ ...p, purpose: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Observações</Label>
                  <Textarea value={visitData.notes} rows={2} className="resize-none"
                    onChange={(e) => setVisitData((p) => ({ ...p, notes: e.target.value }))} />
                </div>

                <div className="border-t border-border/50 pt-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Tipo de Entrada</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setEntryType("immediate")}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        entryType === "immediate"
                          ? "border-emerald-500 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                          : "border-border hover:border-border/80 text-muted-foreground"
                      }`}>
                      <span className="font-semibold block text-xs">Entrada Imediata</span>
                      <span className="text-[10px] opacity-70">Liberar acesso agora</span>
                    </button>
                    <button type="button" onClick={() => setEntryType("pending")}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        entryType === "pending"
                          ? "border-amber-500 bg-amber-500/5 text-amber-600 dark:text-amber-400"
                          : "border-border hover:border-border/80 text-muted-foreground"
                      }`}>
                      <span className="font-semibold block text-xs">Aguardar Autorização</span>
                      <span className="text-[10px] opacity-70">Pendente aprovação</span>
                    </button>
                  </div>
                </div>

                <Button onClick={handleSubmit} disabled={loading}
                  className={`w-full h-12 font-semibold text-sm text-white ${
                    entryType === "immediate" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-amber-500 hover:bg-amber-600"
                  }`}>
                  {loading ? "Processando..." : entryType === "immediate" ? "Registrar Entrada" : "Enviar para Autorização"}
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        <AlertDialog open={isConfirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar {entryType === "immediate" ? "Entrada" : "Solicitação"}</AlertDialogTitle>
              <AlertDialogDescription>
                {entryType === "immediate"
                  ? `Confirma a entrada de ${vData.name} (${vData.company})?`
                  : `Enviar solicitação de autorização para ${vData.name}?`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={confirmEntry}
                className={entryType === "immediate" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-amber-500 hover:bg-amber-600 text-white"}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
