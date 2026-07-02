import { LogOut, Clock, Car, Building2, User, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CVPageHeader } from "@/pages/controle-veiculos/CVPageHeader";
import { useVisitantesControl } from "@/hooks/useVisitantesControl";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function formatDT(dt: string) {
  const d = new Date(dt);
  return {
    date: d.toLocaleDateString("pt-BR"),
    time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
}
function timeInside(entryDate: string) {
  const diff = Date.now() - new Date(entryDate).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function CVisPresentes() {
  const { getActiveVisitors, exitVisitor } = useVisitantesControl();
  const list = getActiveVisitors();

  return (
    <div className="space-y-5">
      <CVPageHeader icon={UserCheck} title="Visitantes Presentes" subtitle="Quem está no local agora" />

      <div className="max-w-4xl mx-auto">
        {list.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <User className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-1">Nenhum visitante presente</h3>
              <p className="text-xs text-muted-foreground/70">Todos já saíram ou nenhuma entrada foi registrada.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {list.map((r) => {
              const { date, time } = formatDT(r.entryDate);
              return (
                <Card key={r.id} className="hover:shadow-md transition-all">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-shrink-0">
                        {r.visitor.photo ? (
                          <img src={r.visitor.photo} alt={r.visitor.name} className="w-14 h-[72px] object-cover rounded-xl border border-border" />
                        ) : (
                          <div className="w-14 h-[72px] bg-muted rounded-xl flex items-center justify-center border border-border">
                            <User className="h-6 w-6 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div>
                          <h3 className="text-sm font-bold">{r.visitor.name}</h3>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Building2 className="h-3 w-3" /> {r.visitor.company}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><User className="h-3 w-3" /> {r.contactPerson}</span>
                          {r.vehiclePlate && <span className="flex items-center gap-1"><Car className="h-3 w-3" /> {r.vehiclePlate}</span>}
                          {r.purpose && <span>{r.purpose}</span>}
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> {date} {time}
                          </span>
                          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold px-2 py-0 h-5">
                            {timeInside(r.entryDate)}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex-shrink-0 self-center">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm"
                              className="border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500 hover:text-white gap-1.5 text-xs font-semibold w-full sm:w-auto">
                              <LogOut className="h-3.5 w-3.5" /> Saída
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Saída</AlertDialogTitle>
                              <AlertDialogDescription>Registrar saída de <strong>{r.visitor.name}</strong>?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => exitVisitor(r.id)} className="bg-amber-500 hover:bg-amber-600 text-white">
                                Confirmar Saída
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
    </div>
  );
}
