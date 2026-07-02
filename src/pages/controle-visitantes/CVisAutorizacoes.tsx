import { useState } from "react";
import { Clock, User, Building2, Car, CheckCircle, XCircle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CVPageHeader } from "@/pages/controle-veiculos/CVPageHeader";
import { useVisitantesControl } from "@/hooks/useVisitantesControl";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

function fmt(dt: string) {
  const d = new Date(dt);
  return { date: d.toLocaleDateString("pt-BR"), time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) };
}
function waitTime(dt: string) {
  const diff = Date.now() - new Date(dt).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
}

export default function CVisAutorizacoes() {
  const [selId, setSelId] = useState<string | null>(null);
  const [authorizedBy, setAuthorizedBy] = useState("");
  const [authOpen, setAuthOpen] = useState(false);

  const {
    pendingVisitors, authorizePendingVisitor, denyPendingVisitor,
    createAccessRecord, deletePendingVisitor,
  } = useVisitantesControl();

  const pending = pendingVisitors.filter((p) => p.status === "pending");
  const authorized = pendingVisitors.filter((p) => p.status === "authorized");

  const openAuthDialog = (id: string) => { setSelId(id); setAuthOpen(true); };

  const doAuthorize = async () => {
    if (!authorizedBy.trim()) { toast.error("Informe quem está autorizando"); return; }
    if (!selId) return;
    const p = pendingVisitors.find((x) => x.id === selId);
    if (!p) return;
    try {
      await authorizePendingVisitor(selId, authorizedBy);
      await createAccessRecord({
        visitorId: p.visitor.id, visitor: p.visitor, contactPerson: p.contactPerson,
        contactPersonId: p.contactPersonId, vehiclePlate: p.vehiclePlate, purpose: p.purpose, notes: p.notes,
      });
      await deletePendingVisitor(selId);
      setAuthOpen(false); setAuthorizedBy(""); setSelId(null);
    } catch {}
  };

  const handleEntry = async (p: any) => {
    try {
      await createAccessRecord({
        visitorId: p.visitor.id, visitor: p.visitor, contactPerson: p.contactPerson,
        contactPersonId: p.contactPersonId, vehiclePlate: p.vehiclePlate, purpose: p.purpose, notes: p.notes,
      });
      await deletePendingVisitor(p.id);
    } catch {}
  };

  const notifyWA = (phone: string, name: string, ok: boolean) => {
    const msg = ok
      ? `Olá ${name}! Sua entrada foi autorizada.`
      : `Olá ${name}, sua entrada não foi autorizada.`;
    window.open(`https://web.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div className="space-y-5">
      <CVPageHeader icon={Clock} title="Autorizações Pendentes" subtitle="Aprovar ou negar solicitações de entrada" />

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pendentes ({pending.length})
            </span>
          </div>

          {pending.length === 0 ? (
            <Card><CardContent className="py-10 text-center">
              <p className="text-sm text-muted-foreground">Nenhuma autorização pendente</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {pending.map((p) => {
                const { date, time } = fmt(p.createdAt);
                return (
                  <Card key={p.id} className="border-amber-500/20 hover:shadow-md transition-all">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-shrink-0">
                          {p.visitor.photo ? (
                            <img src={p.visitor.photo} alt="" className="w-14 h-[72px] object-cover rounded-xl border border-border" />
                          ) : (
                            <div className="w-14 h-[72px] bg-muted rounded-xl flex items-center justify-center border border-border">
                              <User className="h-6 w-6 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div>
                            <h3 className="text-sm font-bold">{p.visitor.name}</h3>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Building2 className="h-3 w-3" /> {p.visitor.company}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><User className="h-3 w-3" /> {p.contactPerson}</span>
                            {p.vehiclePlate && <span className="flex items-center gap-1"><Car className="h-3 w-3" /> {p.vehiclePlate}</span>}
                            {p.purpose && <span>{p.purpose}</span>}
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-muted-foreground">{date} {time}</span>
                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-semibold px-2 py-0 h-5">
                              {waitTime(p.createdAt)}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-row sm:flex-col gap-2 flex-shrink-0">
                          <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold flex-1 sm:flex-auto"
                            onClick={() => openAuthDialog(p.id)}>
                            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Autorizar
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-destructive border-destructive/20 text-xs flex-1 sm:flex-auto">
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Negar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Negar Entrada</AlertDialogTitle>
                                <AlertDialogDescription>Negar entrada de <strong>{p.visitor.name}</strong>?</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => denyPendingVisitor(p.id)} className="bg-destructive text-destructive-foreground">
                                  Negar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {authorized.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Autorizados ({authorized.length})
              </span>
            </div>
            <div className="space-y-3">
              {authorized.map((p) => {
                const { date, time } = fmt(p.authorizedAt!);
                return (
                  <Card key={p.id} className="border-emerald-500/20">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold">{p.visitor.name}</h3>
                        <p className="text-xs text-muted-foreground">{p.visitor.company}</p>
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400">Por {p.authorizedBy} • {date} {time}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {p.visitor.whatsapp && (
                          <Button variant="outline" size="sm" className="text-xs h-8"
                            onClick={() => notifyWA(p.visitor.whatsapp!, p.visitor.name, true)}>
                            <MessageCircle className="h-3 w-3 mr-1" /> Avisar
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs h-8 font-semibold">Entrada</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Registrar Entrada</AlertDialogTitle>
                              <AlertDialogDescription>Confirmar entrada de <strong>{p.visitor.name}</strong>?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleEntry(p)} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                                Confirmar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <Dialog open={authOpen} onOpenChange={setAuthOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Autorizar Entrada</DialogTitle>
              <DialogDescription>Informe seu nome para registrar a autorização.</DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label className="text-xs">Autorizado por *</Label>
              <Input placeholder="Seu nome" value={authorizedBy} onChange={(e) => setAuthorizedBy(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAuthOpen(false)}>Cancelar</Button>
              <Button onClick={doAuthorize} className="bg-emerald-500 hover:bg-emerald-600 text-white">Autorizar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
