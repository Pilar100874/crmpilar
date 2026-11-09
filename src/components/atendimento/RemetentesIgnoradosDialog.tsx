import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail, Globe, Phone, RotateCcw } from "lucide-react";
import { format } from "date-fns";

const ICONE = { email: Mail, dominio: Globe, telefone: Phone } as const;
const ROTULO = { email: "E-mail", dominio: "Domínio", telefone: "Telefone" } as const;

export function RemetentesIgnoradosDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [lista, setLista] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCarregando(true);
    void (supabase as any).from("recebidos_ignorados").select("id, tipo, valor, criado_em").order("criado_em", { ascending: false })
      .then(({ data }: any) => { setLista(data || []); setCarregando(false); });
  }, [open]);

  const reativar = async (id: string) => {
    const { error } = await (supabase as any).from("recebidos_ignorados").delete().eq("id", id);
    if (error) { toast.error("Não foi possível reativar"); return; }
    setLista((l) => l.filter((i) => i.id !== id));
    window.dispatchEvent(new Event("recebidos-ignorados:atualizar"));
    toast.success("Remetente reativado — volta a aparecer nos Recebidos");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Remetentes ignorados</DialogTitle>
          <DialogDescription>
            Mensagens destes remetentes não aparecem nos Recebidos. E-mails automáticos (no-reply, notificações, boletos, newsletters) já são filtrados sozinhos.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {carregando && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {!carregando && lista.length === 0 && <p className="text-sm text-muted-foreground">Nenhum remetente ignorado.</p>}
          {lista.map((i) => {
            const Icone = ICONE[i.tipo as keyof typeof ICONE] || Mail;
            return (
              <div key={i.id} className="flex items-center gap-3 rounded-md border border-border p-2">
                <Icone className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{i.tipo === "dominio" ? `@${i.valor}` : i.valor}</p>
                  <p className="text-xs text-muted-foreground">{ROTULO[i.tipo as keyof typeof ROTULO]} · {i.criado_em ? format(new Date(i.criado_em), "dd/MM/yyyy HH:mm") : ""}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => void reativar(i.id)}>
                  <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reativar
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
