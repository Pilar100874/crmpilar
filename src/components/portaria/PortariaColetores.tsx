import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, RefreshCw, Trash2, Wifi, WifiOff, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useToast } from "@/hooks/use-toast";

type Coletor = {
  id: string;
  nome: string;
  token?: string | null; // mantido só por compatibilidade; não é mais exibido
  ativo: boolean;
  versao: string | null;
  ip_local: string | null;
  ultima_comunicacao: string | null;
};

function estaOnline(c: Coletor) {
  if (!c.ultima_comunicacao) return false;
  return Date.now() - new Date(c.ultima_comunicacao).getTime() < 2 * 60 * 1000;
}

export default function PortariaColetores() {
  const { toast } = useToast();
  const [lista, setLista] = useState<Coletor[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [nome, setNome] = useState("");
  const [criando, setCriando] = useState(false);
  const [excluir, setExcluir] = useState<Coletor | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from("port_coletores")
      .select("id, nome, ativo, versao, ip_local, ultima_comunicacao")
      .order("created_at", { ascending: true });
    if (error) toast({ title: "Não foi possível carregar os coletores", description: error.message, variant: "destructive" });
    setLista((data ?? []) as Coletor[]);
    setCarregando(false);
  }, [toast]);

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 30000);
    return () => clearInterval(t);
  }, [carregar]);

  const criar = async () => {
    if (!nome.trim()) {
      toast({ title: "Informe um nome para o coletor.", variant: "destructive" });
      return;
    }
    setCriando(true);
    const { error } = await supabase.from("port_coletores").insert({ nome: nome.trim().toUpperCase() });
    setCriando(false);
    if (error) {
      toast({ title: "Não foi possível criar", description: error.message, variant: "destructive" });
      return;
    }
    setNome("");
    carregar();
    toast({ title: "Coletor criado", description: "No appliance ISO (1.9.4+) a conexão é automática — ele se registra sozinho ao ligar." });
  };

  const alternarAtivo = async (c: Coletor, ativo: boolean) => {
    await supabase.from("port_coletores").update({ ativo }).eq("id", c.id);
    setLista((atual) => atual.map((i) => (i.id === c.id ? { ...i, ativo } : i)));
  };

  const confirmarExclusao = async () => {
    if (!excluir) return;
    await supabase.from("port_coletores").delete().eq("id", excluir.id);
    setExcluir(null);
    carregar();
  };


  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-muted/30 p-4 space-y-1">
        <p className="text-sm font-medium">Dispositivos em rede local (IP interno)</p>
        <p className="text-xs text-muted-foreground">
          Equipamentos com IP tipo <strong>192.168.x.x</strong> não são alcançados pela nuvem. Instale o
          <strong> Coletor Pilar</strong> em um computador da mesma rede e marque a opção
          <strong> “Acessar pela rede local (Coletor Pilar)”</strong> no cadastro do dispositivo.
          Assim o CRM envia o comando e o Coletor abre o portão localmente — sem abrir portas no roteador.
        </p>
        <p className="text-xs text-muted-foreground">
          <strong>Não é preciso copiar chave:</strong> no appliance ISO (versão 1.9.4+) o coletor se cadastra e
          conecta sozinho assim que liga. Para instalação manual do Coletor Pilar no Windows (versões antigas),
          baixe o instalador abaixo e siga as instruções do módulo <strong>Coletor de Portaria</strong> do app.
        </p>
        <Button variant="outline" size="sm" className="mt-2" asChild>
          <a href="https://github.com/Pilar100874/crmpilar/releases/latest/download/ColetorPilar-Setup.exe">
            <Download className="h-4 w-4 mr-2" />Baixar Coletor Pilar (Windows)
          </a>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1">
          <Label className="text-xs">Nome do coletor</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="PORTARIA MATRIZ" />
        </div>
        <Button onClick={criar} disabled={criando}>
          {criando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
          Novo coletor
        </Button>
        <Button variant="outline" onClick={carregar} disabled={carregando}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {carregando ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : lista.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhum coletor cadastrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {lista.map((c) => {
            const online = estaOnline(c);
            return (
              <div key={c.id} className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate flex items-center gap-2">
                      {online ? <Wifi className="h-4 w-4 text-emerald-500" /> : <WifiOff className="h-4 w-4 text-muted-foreground" />}
                      {c.nome}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[c.ip_local, c.versao && `v${c.versao}`].filter(Boolean).join(" · ") || "Aguardando primeira conexão"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge variant={online ? "default" : "secondary"}>{online ? "Online" : "Offline"}</Badge>
                      {c.ultima_comunicacao && (
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(c.ultima_comunicacao).toLocaleString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Switch checked={c.ativo} onCheckedChange={(v) => alternarAtivo(c, v)} />
                    <Button variant="ghost" size="icon" onClick={() => setExcluir(c)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DeleteConfirmDialog
        open={!!excluir}
        onOpenChange={(o) => !o && setExcluir(null)}
        onConfirm={confirmarExclusao}
        itemName={excluir?.nome}
      />
    </div>
  );
}
