import { useEffect, useState } from "react";
import { PhoneIncoming, UserPlus, Link2, PauseCircle, Loader2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ContatoBinado { id: string; nome: string; tel?: string | null; telefone?: string | null; email?: string | null }

interface Props {
  numero: string | null;
  estabelecimentoId?: string | null;
  temPendencias: boolean;
  discadorParado: boolean;
  onClose: () => void;
  /** Abre o card do contato; `pausar` = liberar atendimento simultâneo antes de abrir. */
  onAbrir: (contato: ContatoBinado, pausar: boolean) => void;
}

const digitos = (v?: string | null) => (v || "").replace(/\D/g, "");

/** Popup de chamada recebida: bina o número, procura o contato e permite abrir, vincular ou criar. */
export function ChamadaRecebidaDialog({ numero, estabelecimentoId, temPendencias, discadorParado, onClose, onAbrir }: Props) {
  const [buscando, setBuscando] = useState(false);
  const [encontrados, setEncontrados] = useState<ContatoBinado[]>([]);
  const [modo, setModo] = useState<"inicio" | "vincular" | "criar">("inicio");
  const [termo, setTermo] = useState("");
  const [resultados, setResultados] = useState<ContatoBinado[]>([]);
  const [nomeNovo, setNomeNovo] = useState("");
  const [salvando, setSalvando] = useState(false);

  const final8 = digitos(numero).slice(-8);

  useEffect(() => {
    setModo("inicio"); setTermo(""); setResultados([]); setNomeNovo(""); setEncontrados([]);
    if (!numero || final8.length < 8) return;
    setBuscando(true);
    void supabase.from("customers").select("id, nome, tel, telefone, email")
      .or(`tel.ilike.%${final8},telefone.ilike.%${final8}`).limit(5)
      .then(({ data }) => { setEncontrados((data as any) || []); setBuscando(false); });
  }, [numero, final8]);

  useEffect(() => {
    if (modo !== "vincular" || termo.trim().length < 2) { setResultados([]); return; }
    const t = setTimeout(() => {
      void supabase.from("customers").select("id, nome, tel, telefone, email")
        .ilike("nome", `%${termo.trim()}%`).eq("ativo", true).limit(10)
        .then(({ data }) => setResultados((data as any) || []));
    }, 300);
    return () => clearTimeout(t);
  }, [termo, modo]);

  const abrir = (c: ContatoBinado) => onAbrir(c, temPendencias);

  const vincular = async (c: ContatoBinado) => {
    setSalvando(true);
    const campo = c.tel ? "telefone" : "tel";
    const { error } = await supabase.from("customers").update({ [campo]: numero } as any).eq("id", c.id);
    setSalvando(false);
    if (error) { toast.error("Não foi possível vincular o número"); return; }
    toast.success(`Número vinculado a ${c.nome}`);
    abrir({ ...c, [campo]: numero });
  };

  const criar = async () => {
    if (!nomeNovo.trim()) return;
    setSalvando(true);
    const { data, error } = await supabase.from("customers")
      .insert({ nome: nomeNovo.trim(), email: "", tel: numero, estabelecimento_id: estabelecimentoId, ativo: true } as any)
      .select("id, nome, tel, telefone, email").single();
    setSalvando(false);
    if (error || !data) { toast.error("Não foi possível criar o contato"); return; }
    toast.success("Contato criado");
    abrir(data as any);
  };

  const rotuloAbrir = temPendencias ? "Pausar e abrir card" : "Abrir card";

  return (
    <Dialog open={!!numero} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneIncoming className="h-5 w-5 text-success" /> Chamada recebida
          </DialogTitle>
          <DialogDescription>
            <span className="text-lg font-semibold text-foreground">{numero}</span>
            {discadorParado && <span className="block text-xs mt-1">O discador foi parado automaticamente.</span>}
          </DialogDescription>
        </DialogHeader>

        {temPendencias && (
          <p className="flex items-start gap-2 rounded-lg bg-warning/10 p-2 text-xs text-foreground">
            <PauseCircle className="h-4 w-4 shrink-0 text-warning" />
            Você tem atendimento a finalizar. Ele fica pausado enquanto atende este contato e continua obrigatório depois.
          </p>
        )}

        {buscando ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Procurando contato...</div>
        ) : modo === "inicio" && encontrados.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm">Deseja abrir o card do contato?</p>
            {encontrados.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2">
                <span className="truncate text-sm font-medium">{c.nome}</span>
                <Button size="sm" onClick={() => abrir(c)}>{rotuloAbrir}</Button>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="w-full" onClick={onClose}>Agora não</Button>
          </div>
        ) : modo === "inicio" ? (
          <div className="space-y-2">
            <p className="text-sm">Nenhum contato tem este número. O que deseja fazer?</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setModo("vincular")}><Link2 className="h-4 w-4 mr-1" /> Vincular a contato</Button>
              <Button onClick={() => setModo("criar")}><UserPlus className="h-4 w-4 mr-1" /> Criar contato</Button>
            </div>
            <Button variant="ghost" size="sm" className="w-full" onClick={onClose}>Agora não</Button>
          </div>
        ) : modo === "vincular" ? (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input autoFocus className="pl-8" placeholder="Buscar contato pelo nome" value={termo} onChange={(e) => setTermo(e.target.value)} />
            </div>
            <div className="max-h-56 overflow-y-auto space-y-1">
              {resultados.map((c) => (
                <button key={c.id} type="button" disabled={salvando} onClick={() => void vincular(c)}
                  className="w-full rounded-lg border border-border p-2 text-left text-sm hover:bg-muted">
                  <span className="font-medium">{c.nome}</span>
                  <span className="block text-xs text-muted-foreground">{c.tel || c.telefone || c.email || "Sem telefone"}</span>
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setModo("inicio")}>Voltar</Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Input autoFocus placeholder="Nome do contato" value={nomeNovo} onChange={(e) => setNomeNovo(e.target.value)} />
            <p className="text-xs text-muted-foreground">Telefone: {numero}</p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setModo("inicio")}>Voltar</Button>
              <Button size="sm" className="flex-1" disabled={!nomeNovo.trim() || salvando} onClick={() => void criar()}>
                {salvando && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Criar e abrir card
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
