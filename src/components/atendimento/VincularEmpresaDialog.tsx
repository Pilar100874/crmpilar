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
import { Building2, Search, Loader2, ArrowRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { useCNPJLookup, CNPJData } from "@/hooks/useCNPJLookup";
import { maskCPF, maskCNPJ } from "@/lib/masks";
import { EmpresaFormSheet } from "./EmpresaFormSheet";

interface VincularEmpresaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: string;
  emailVinculo?: string;
  whatsappVinculo?: string;
  onSuccess?: () => void;
  // Novo modo: usado nos formulários de contato para vincular empresa diretamente
  modoFormulario?: boolean;
  onEmpresaVinculada?: (empresa: { id: string; nome: string; nome_fantasia: string; cnpj: string }) => void;
}

interface Empresa {
  id: string;
  nome: string | null;
  nome_fantasia: string | null;
  cnpj: string | null;
}

export function VincularEmpresaDialog({
  open,
  onOpenChange,
  customerId,
  emailVinculo,
  whatsappVinculo,
  onSuccess,
  modoFormulario = false,
  onEmpresaVinculada,
}: VincularEmpresaDialogProps) {
  const [documento, setDocumento] = useState("");
  const [etapa, setEtapa] = useState<"input" | "encontrada">("input");
  const [buscando, setBuscando] = useState(false);
  const [vinculando, setVinculando] = useState(false);
  const [empresaEncontrada, setEmpresaEncontrada] = useState<Empresa | null>(null);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  
  // Dialog de cadastro de empresa
  const [showCadastro, setShowCadastro] = useState(false);
  const [dadosCNPJ, setDadosCNPJ] = useState<CNPJData | null>(null);
  const [documentoParaCadastro, setDocumentoParaCadastro] = useState("");
  
  const { lookupCNPJ, loading: loadingCNPJ } = useCNPJLookup();

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
    setDocumento("");
    setEtapa("input");
    setEmpresaEncontrada(null);
    setBuscando(false);
    setShowCadastro(false);
    setDadosCNPJ(null);
    setDocumentoParaCadastro("");
  };

  const handleDocumentoChange = (value: string) => {
    const clean = value.replace(/\D/g, "");
    if (clean.length <= 11) {
      setDocumento(maskCPF(value));
    } else {
      setDocumento(maskCNPJ(value));
    }
  };

  const handleContinuar = async () => {
    const cleanDoc = documento.replace(/\D/g, "");
    
    if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
      toast.error("Digite um CPF (11 dígitos) ou CNPJ (14 dígitos) válido");
      return;
    }

    if (!estabelecimentoId) {
      toast.error("Estabelecimento não encontrado");
      return;
    }

    setBuscando(true);

    try {
      // Buscar empresa existente no banco
      const { data: empresas } = await supabase
        .from("empresas")
        .select("id, nome, nome_fantasia, cnpj")
        .eq("estabelecimento_id", estabelecimentoId)
        .not("cnpj", "is", null);

      const empresaExistente = empresas?.find(
        (e) => e.cnpj?.replace(/\D/g, "") === cleanDoc
      );

      if (empresaExistente) {
        // Empresa já existe - mostrar para vincular
        setEmpresaEncontrada(empresaExistente);
        setEtapa("encontrada");
      } else {
        // Empresa não existe - buscar dados e abrir cadastro
        setDocumentoParaCadastro(cleanDoc);
        
        if (cleanDoc.length === 14) {
          // É CNPJ - buscar dados automaticamente
          const cnpjData = await lookupCNPJ(cleanDoc);
          setDadosCNPJ(cnpjData);
        }
        
        // Abrir formulário de cadastro
        setShowCadastro(true);
      }
    } catch (error) {
      console.error("Erro ao buscar empresa:", error);
      toast.error("Erro ao buscar empresa");
    } finally {
      setBuscando(false);
    }
  };

  const handleVincular = async () => {
    if (!empresaEncontrada) return;

    if (modoFormulario) {
      // Modo formulário: apenas retornar a empresa para o formulário pai
      onEmpresaVinculada?.(empresaEncontrada as any);
      handleClose();
      return;
    }

    // Modo legado: vincular diretamente no banco
    if (!customerId && !emailVinculo && !whatsappVinculo) {
      toast.error("Nenhum contato para vincular");
      return;
    }

    setVinculando(true);

    try {
      if (customerId) {
        // Verificar se já está vinculada
        const { data: vinculoExistente } = await supabase
          .from("customer_empresas")
          .select("id")
          .eq("customer_id", customerId)
          .eq("empresa_id", empresaEncontrada.id)
          .maybeSingle();

        if (vinculoExistente) {
          toast.error("Empresa já está vinculada a este contato");
          setVinculando(false);
          return;
        }

        const { error } = await supabase
          .from("customer_empresas")
          .insert({
            customer_id: customerId,
            empresa_id: empresaEncontrada.id,
            is_primary: false,
          });

        if (error) throw error;

        toast.success("Empresa vinculada com sucesso!");
        onSuccess?.();
        handleClose();
      }
    } catch (error: any) {
      console.error("Erro ao vincular:", error);
      toast.error(error?.message || "Erro ao vincular empresa");
    } finally {
      setVinculando(false);
    }
  };

  const handleEmpresaCriada = (empresaId: string) => {
    // Empresa foi criada - fechar cadastro e buscar dados
    setShowCadastro(false);
    
    // Buscar dados da empresa criada e vincular
    supabase
      .from("empresas")
      .select("id, nome, nome_fantasia, cnpj")
      .eq("id", empresaId)
      .single()
      .then(({ data }) => {
        if (data) {
          if (modoFormulario) {
            onEmpresaVinculada?.(data);
            handleClose();
          } else if (customerId) {
            // Vincular automaticamente
            supabase
              .from("customer_empresas")
              .insert({
                customer_id: customerId,
                empresa_id: empresaId,
                is_primary: false,
              })
              .then(() => {
                toast.success("Empresa criada e vinculada com sucesso!");
                onSuccess?.();
                handleClose();
              });
          } else {
            onSuccess?.();
            handleClose();
          }
        }
      });
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open && !showCadastro} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle>Vincular Empresa</DialogTitle>
                <DialogDescription>
                  {etapa === "input"
                    ? "Digite o CPF ou CNPJ da empresa"
                    : "Empresa encontrada"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {etapa === "input" && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>CPF ou CNPJ</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={documento}
                    onChange={(e) => handleDocumentoChange(e.target.value)}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    className="pl-9"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleContinuar();
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Se a empresa existir será vinculada. Caso contrário, o cadastro será aberto automaticamente.
                </p>
              </div>
            </div>
          )}

          {etapa === "encontrada" && empresaEncontrada && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {empresaEncontrada.nome_fantasia || empresaEncontrada.nome}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {empresaEncontrada.cnpj}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Esta empresa já está cadastrada. Deseja vinculá-la ao contato?
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>

            {etapa === "input" && (
              <Button
                onClick={handleContinuar}
                disabled={buscando || loadingCNPJ || documento.replace(/\D/g, "").length < 11}
              >
                {buscando || loadingCNPJ ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    Continuar
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}

            {etapa === "encontrada" && (
              <Button onClick={handleVincular} disabled={vinculando}>
                {vinculando ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Vinculando...
                  </>
                ) : (
                  <>
                    <Building2 className="w-4 h-4 mr-2" />
                    Vincular Empresa
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Formulário de cadastro de empresa */}
      <EmpresaFormSheet
        open={showCadastro}
        onOpenChange={(open) => {
          if (!open) {
            setShowCadastro(false);
            // Se fechar sem salvar, voltar ao dialog principal
          }
        }}
        onSuccess={handleEmpresaCriada}
        initialData={
          dadosCNPJ
            ? {
                cpf_cnpj: dadosCNPJ.cnpj,
                nome: dadosCNPJ.nome,
                nome_fantasia: dadosCNPJ.fantasia,
                endereco: dadosCNPJ.logradouro,
                numero: dadosCNPJ.numero,
                complemento: dadosCNPJ.complemento,
                bairro: dadosCNPJ.bairro,
                cidade: dadosCNPJ.municipio,
                estado: dadosCNPJ.uf,
                cep: dadosCNPJ.cep,
                telefone: dadosCNPJ.telefone,
                email: dadosCNPJ.email,
              }
            : documentoParaCadastro
            ? { cpf_cnpj: documentoParaCadastro.length === 11 ? maskCPF(documentoParaCadastro) : maskCNPJ(documentoParaCadastro) }
            : undefined
        }
      />
    </>
  );
}
