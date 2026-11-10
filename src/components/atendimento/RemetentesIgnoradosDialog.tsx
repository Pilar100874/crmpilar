import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Mail, Globe, Phone, RotateCcw, Search, X } from "lucide-react";
import { format } from "date-fns";

const ICONE = { email: Mail, dominio: Globe, telefone: Phone } as const;
const ROTULO = { email: "E-mail", dominio: "Domínio", telefone: "Telefone" } as const;

export function RemetentesIgnoradosDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [lista, setLista] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [pesquisa, setPesquisa] = useState("");
  const normalizar = (valor: string) => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const termo = normalizar(pesquisa);
  const filtrados = lista.filter((item) => {
    if (!termo) return true;
    const valor = String(item.valor || "");
    const texto = `${valor} ${ROTULO[item.tipo as keyof typeof ROTULO] || item.tipo}`;
    const numeros = pesquisa.replace(/\D/g, "");
    return normalizar(texto).includes(termo)
      || (item.tipo === "telefone" && numeros.length > 0 && /^[\d\s()+.-]+$/.test(pesquisa.trim()) && valor.replace(/\D/g, "").includes(numeros));
  });

  useEffect(() => {
    if (!open) return;
    setPesquisa("");
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
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Pesquisar remetentes ignorados"
            placeholder="Pesquisar e-mail, domínio ou telefone..."
            value={pesquisa}
            onChange={(event) => setPesquisa(event.target.value)}
            className="pl-9 pr-10"
          />
          {pesquisa && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2" title="Limpar pesquisa" aria-label="Limpar pesquisa" onClick={() => setPesquisa("")}><X className="h-4 w-4" /></Button>}
        </div>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto overflow-x-hidden">
          {carregando && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {!carregando && lista.length === 0 && <p className="text-sm text-muted-foreground">Nenhum remetente ignorado.</p>}
          {!carregando && lista.length > 0 && filtrados.length === 0 && <p role="status" className="text-sm text-muted-foreground">Nenhum remetente encontrado.</p>}
          {filtrados.map((i) => {
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
