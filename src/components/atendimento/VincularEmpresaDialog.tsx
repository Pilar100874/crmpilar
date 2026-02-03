import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Building2, Search, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { CreateEmpresaDialog } from "./CreateEmpresaDialog";

interface VincularEmpresaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: string;
  emailVinculo?: string;
  whatsappVinculo?: string;
  onSuccess?: () => void;
}

interface Empresa {
  id: string;
  nome: string | null;
  nome_fantasia: string | null;
  cnpj: string | null;
  custom_fields?: any;
  emails_vinculados?: string[];
  whatsapps_vinculados?: string[];
}

export function VincularEmpresaDialog({
  open,
  onOpenChange,
  customerId,
  emailVinculo,
  whatsappVinculo,
  onSuccess
}: VincularEmpresaDialogProps) {
  const [busca, setBusca] = useState("");
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresasFiltradas, setEmpresasFiltradas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [vinculando, setVinculando] = useState(false);
  
  // Estado para abrir o CreateEmpresaDialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    if (open) {
      loadEmpresas();
      setShowCreateDialog(false);
    }
  }, [open]);

  const loadEmpresas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nome, nome_fantasia, cnpj, custom_fields, emails_vinculados, whatsapps_vinculados')
        .order('nome_fantasia', { ascending: true });

      if (error) throw error;
      setEmpresas(data || []);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (valor: string) => {
    setBusca(valor);
    if (valor.trim()) {
      const termo = valor.toLowerCase();
      const filtradas = empresas.filter(emp =>
        emp.nome_fantasia?.toLowerCase().includes(termo) ||
        emp.nome?.toLowerCase().includes(termo) ||
        emp.cnpj?.includes(termo.replace(/\D/g, ''))
      );
      setEmpresasFiltradas(filtradas);
    } else {
      setEmpresasFiltradas([]);
    }
  };

  const handleVincular = async (empresaId: string) => {
    setVinculando(true);
    try {
      const estabId = await getEstabelecimentoId();
      
      if (customerId) {
        const { data: customerExists, error: checkError } = await supabase
          .from('customers')
          .select('id')
          .eq('id', customerId)
          .maybeSingle();

        if (checkError || !customerExists) {
          console.error("Customer não encontrado:", customerId);
          toast.error("Contato não encontrado. Tente criar um novo vínculo.");
          setVinculando(false);
          return;
        }

        const { error } = await supabase
          .from('customer_empresas')
          .insert({
            customer_id: customerId,
            empresa_id: empresaId,
            is_primary: false
          });

        if (error) {
          if (error.code === '23505') {
            toast.error("Empresa já está vinculada a este cliente");
          } else {
            throw error;
          }
        } else {
          const empresa = empresas.find(e => e.id === empresaId);
          const updates: any = {};
          
          if (emailVinculo && !empresa?.emails_vinculados?.includes(emailVinculo)) {
            updates.emails_vinculados = [...(empresa?.emails_vinculados || []), emailVinculo];
          }
          if (whatsappVinculo && !empresa?.whatsapps_vinculados?.includes(whatsappVinculo)) {
            updates.whatsapps_vinculados = [...(empresa?.whatsapps_vinculados || []), whatsappVinculo];
          }
          
          if (Object.keys(updates).length > 0) {
            await supabase
              .from('empresas')
              .update(updates)
              .eq('id', empresaId);
          }
          
          toast.success("Empresa vinculada com sucesso!");
          onSuccess?.();
          onOpenChange(false);
          setBusca("");
          setEmpresasFiltradas([]);
        }
      } 
      else if (emailVinculo) {
        const empresa = empresas.find(e => e.id === empresaId);
        const emailsAtuais = empresa?.emails_vinculados || [];
        
        if (emailsAtuais.includes(emailVinculo)) {
          toast.error("Este email já está vinculado a esta empresa");
          setVinculando(false);
          return;
        }

        const { data: novoContato, error: contatoErr } = await supabase
          .from('customers')
          .insert([{
            estabelecimento_id: estabId,
            nome: emailVinculo.split('@')[0],
            telefone: '',
            email: '',
            tipo_operador: true
          }])
          .select('id')
          .maybeSingle();

        if (contatoErr) throw contatoErr;

        await supabase
          .from('customer_empresas')
          .insert([{
            customer_id: novoContato!.id,
            empresa_id: empresaId,
            is_primary: false
          }]);

        await supabase
          .from('empresas')
          .update({
            emails_vinculados: [...emailsAtuais, emailVinculo]
          })
          .eq('id', empresaId);
        
        toast.success("Email vinculado à empresa com sucesso!");
        onSuccess?.();
        onOpenChange(false);
        setBusca("");
        setEmpresasFiltradas([]);
      }
      else if (whatsappVinculo) {
        const empresa = empresas.find(e => e.id === empresaId);
        const whatsappsAtuais = empresa?.whatsapps_vinculados || [];
        
        if (whatsappsAtuais.includes(whatsappVinculo)) {
          toast.error("Este WhatsApp já está vinculado a esta empresa");
          setVinculando(false);
          return;
        }

        const { data: novoContato, error: contatoErr } = await supabase
          .from('customers')
          .insert([{
            estabelecimento_id: estabId,
            nome: whatsappVinculo,
            telefone: whatsappVinculo,
            email: '',
            tipo_operador: true
          }])
          .select('id')
          .maybeSingle();

        if (contatoErr) throw contatoErr;

        await supabase
          .from('customer_empresas')
          .insert([{
            customer_id: novoContato!.id,
            empresa_id: empresaId,
            is_primary: false
          }]);

        await supabase
          .from('empresas')
          .update({
            whatsapps_vinculados: [...whatsappsAtuais, whatsappVinculo]
          })
          .eq('id', empresaId);
        
        toast.success("WhatsApp vinculado à empresa com sucesso!");
        onSuccess?.();
        onOpenChange(false);
        setBusca("");
        setEmpresasFiltradas([]);
      }
      else {
        toast.error("Nenhum cliente ou contato para vincular");
      }
    } catch (error: any) {
      console.error('Erro ao vincular:', error);
      toast.error(error?.message || "Erro ao vincular");
    } finally {
      setVinculando(false);
    }
  };

  const handleEmpresaCriada = (empresaId: string) => {
    // Empresa criada com sucesso, fechar dialogs e notificar
    setShowCreateDialog(false);
    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Vincular Empresa
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Campo de busca */}
            <div className="space-y-2">
              <Label className="text-sm">Buscar Empresa</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Digite nome, CNPJ..."
                  value={busca}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Lista de empresas filtradas */}
            {!loading && empresasFiltradas.length > 0 && (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {empresasFiltradas.map((empresa) => (
                  <Card
                    key={empresa.id}
                    className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleVincular(empresa.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {empresa.nome_fantasia || empresa.nome}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {empresa.cnpj || 'Sem CNPJ'}
                        </p>
                      </div>
                      {vinculando ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 text-primary" />
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Mensagem quando não encontra + botão de cadastrar */}
            {!loading && busca && empresasFiltradas.length === 0 && (
              <div className="text-center py-6 space-y-4">
                <div className="text-muted-foreground">
                  <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma empresa encontrada</p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar "{busca}"
                </Button>
              </div>
            )}

            {/* Estado inicial */}
            {!loading && !busca && (
              <div className="text-center py-6 space-y-4">
                <div className="text-muted-foreground">
                  <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Digite para buscar uma empresa</p>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar Nova Empresa
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de criação de empresa */}
      <CreateEmpresaDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        customerId={customerId}
        onSuccess={handleEmpresaCriada}
      />
    </>
  );
}
