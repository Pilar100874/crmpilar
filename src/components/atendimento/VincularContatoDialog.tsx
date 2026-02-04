import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { User, Search, Loader2, ArrowRight, Check, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { ContatoFormSheet } from "./ContatoFormSheet";

interface VincularContatoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: string;
  onSuccess?: () => void;
}

interface Contato {
  id: string;
  nome: string;
  telefone: string | null;
  tel: string | null;
  email: string | null;
}

export function VincularContatoDialog({
  open,
  onOpenChange,
  empresaId,
  onSuccess,
}: VincularContatoDialogProps) {
  const [busca, setBusca] = useState("");
  const [etapa, setEtapa] = useState<"input" | "resultados" | "nao_encontrado">("input");
  const [buscando, setBuscando] = useState(false);
  const [vinculando, setVinculando] = useState(false);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [contatoSelecionado, setContatoSelecionado] = useState<Contato | null>(null);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  
  // Dialog de cadastro de contato
  const [showCadastro, setShowCadastro] = useState(false);

  useEffect(() => {
    if (open) {
      loadEstabelecimento();
      resetState();
    }
  }, [open]);

  const loadEstabelecimento = async () => {
    const estabId = await getEstabelecimentoId();
    setEstabelecimentoId(estabId);
  };

  const resetState = () => {
    setBusca("");
    setEtapa("input");
    setContatos([]);
    setContatoSelecionado(null);
    setBuscando(false);
    setShowCadastro(false);
  };

  const handleBuscar = async () => {
    if (!busca.trim()) {
      toast.error("Digite um nome, telefone ou email para buscar");
      return;
    }

    if (!estabelecimentoId) {
      toast.error("Estabelecimento não encontrado");
      return;
    }

    setBuscando(true);

    try {
      const searchTerm = busca.trim().toLowerCase();
      
      // Buscar contatos que correspondam à busca
      const { data: contatosData } = await supabase
        .from("customers")
        .select("id, nome, telefone, tel, email")
        .eq("estabelecimento_id", estabelecimentoId)
        .or(`nome.ilike.%${searchTerm}%,telefone.ilike.%${searchTerm}%,tel.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(10);

      if (contatosData && contatosData.length > 0) {
        // Filtrar contatos que já estão vinculados a esta empresa
        const { data: vinculosExistentes } = await supabase
          .from("customer_empresas")
          .select("customer_id")
          .eq("empresa_id", empresaId);
        
        const idsVinculados = new Set(vinculosExistentes?.map(v => v.customer_id) || []);
        const contatosDisponiveis = contatosData.filter(c => !idsVinculados.has(c.id));
        
        if (contatosDisponiveis.length > 0) {
          setContatos(contatosDisponiveis);
          setEtapa("resultados");
        } else {
          setEtapa("nao_encontrado");
        }
      } else {
        setEtapa("nao_encontrado");
      }
    } catch (error) {
      console.error("Erro ao buscar contatos:", error);
      toast.error("Erro ao buscar contatos");
    } finally {
      setBuscando(false);
    }
  };

  const handleVincular = async () => {
    if (!contatoSelecionado || !empresaId) return;

    setVinculando(true);

    try {
      const { error } = await supabase
        .from("customer_empresas")
        .insert({
          customer_id: contatoSelecionado.id,
          empresa_id: empresaId,
          is_primary: false,
        });

      if (error) throw error;

      toast.success("Contato vinculado com sucesso!");
      onSuccess?.();
      handleClose();
    } catch (error: any) {
      console.error("Erro ao vincular:", error);
      toast.error(error?.message || "Erro ao vincular contato");
    } finally {
      setVinculando(false);
    }
  };

  const handleContatoCriado = async (contatoId: string) => {
    setShowCadastro(false);
    
    // Vincular automaticamente o contato recém-criado
    try {
      const { error } = await supabase
        .from("customer_empresas")
        .insert({
          customer_id: contatoId,
          empresa_id: empresaId,
          is_primary: false,
        });

      if (error) throw error;

      toast.success("Contato criado e vinculado com sucesso!");
      onSuccess?.();
      handleClose();
    } catch (error: any) {
      console.error("Erro ao vincular contato:", error);
      toast.error("Contato criado, mas houve erro ao vincular");
      onSuccess?.();
      handleClose();
    }
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleNovaBusca = () => {
    setBusca("");
    setContatos([]);
    setContatoSelecionado(null);
    setEtapa("input");
  };

  return (
    <>
      <Dialog open={open && !showCadastro} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Vincular Contato</DialogTitle>
                <DialogDescription>
                  {etapa === "input"
                    ? "Busque por nome, telefone ou email"
                    : etapa === "resultados"
                    ? "Selecione um contato"
                    : "Nenhum contato encontrado"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {etapa === "input" && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Buscar contato</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Nome, telefone ou email"
                    className="pl-9"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleBuscar();
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {etapa === "resultados" && (
            <div className="space-y-4 py-4">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {contatos.map((contato) => (
                  <button
                    key={contato.id}
                    className={`w-full p-3 rounded-lg border text-left transition-colors ${
                      contatoSelecionado?.id === contato.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted"
                    }`}
                    onClick={() => setContatoSelecionado(contato)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{contato.nome}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {contato.telefone || contato.tel || contato.email || "-"}
                        </p>
                      </div>
                      {contatoSelecionado?.id === contato.id && (
                        <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={handleNovaBusca}
              >
                Nova busca
              </Button>
            </div>
          )}

          {etapa === "nao_encontrado" && (
            <div className="space-y-4 py-4 text-center">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Nenhum contato encontrado</p>
                <p className="text-sm text-muted-foreground">
                  Deseja criar um novo contato?
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={handleNovaBusca}>
                  Nova busca
                </Button>
                <Button onClick={() => setShowCadastro(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Criar Contato
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>

            {etapa === "input" && (
              <Button
                onClick={handleBuscar}
                disabled={buscando || !busca.trim()}
              >
                {buscando ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    Buscar
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}

            {etapa === "resultados" && (
              <Button onClick={handleVincular} disabled={vinculando || !contatoSelecionado}>
                {vinculando ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Vinculando...
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4 mr-2" />
                    Vincular Contato
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Formulário de cadastro de contato */}
      <ContatoFormSheet
        open={showCadastro}
        onOpenChange={(open) => {
          if (!open) {
            setShowCadastro(false);
          }
        }}
        onSuccess={handleContatoCriado}
      />
    </>
  );
}
