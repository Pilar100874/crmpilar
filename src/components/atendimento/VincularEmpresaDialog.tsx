import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Building2, Search, Plus, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { geocodeAndSaveEmpresa } from "@/hooks/useGeocodingService";

interface VincularEmpresaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: string;
  emailVinculo?: string; // Para vincular email diretamente à empresa
  whatsappVinculo?: string; // Para vincular whatsapp diretamente à empresa
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
  
  // Estado para cadastro de nova empresa
  const [modoCadastro, setModoCadastro] = useState(false);
  const [novaEmpresa, setNovaEmpresa] = useState({
    nome_fantasia: "",
    nome: "",
    cnpj: "",
    email: "",
    telefone: ""
  });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (open) {
      loadEmpresas();
      setModoCadastro(false);
      setNovaEmpresa({ nome_fantasia: "", nome: "", cnpj: "", email: "", telefone: "" });
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
      
      // Se temos customerId, verificar se existe antes de vincular
      if (customerId) {
        // Primeiro verificar se o customer existe
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
          // Vincular email e whatsapp automaticamente à empresa
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
      // Se temos emailVinculo mas não customerId, criar contato e vincular
      else if (emailVinculo) {
        const empresa = empresas.find(e => e.id === empresaId);
        const emailsAtuais = empresa?.emails_vinculados || [];
        
        if (emailsAtuais.includes(emailVinculo)) {
          toast.error("Este email já está vinculado a esta empresa");
          setVinculando(false);
          return;
        }

        // Criar contato sem email temporário - deixar em branco
        const { data: novoContato, error: contatoErr } = await supabase
          .from('customers')
          .insert([{
            estabelecimento_id: estabId,
            nome: emailVinculo.split('@')[0], // Usar parte do email como nome inicial
            telefone: '',
            email: '', // Deixar email em branco para edição posterior
            tipo_operador: true
          }])
          .select('id')
          .maybeSingle();

        if (contatoErr) throw contatoErr;

        // Vincular contato à empresa
        await supabase
          .from('customer_empresas')
          .insert([{
            customer_id: novoContato!.id,
            empresa_id: empresaId,
            is_primary: false
          }]);

        // Adicionar email aos emails_vinculados da empresa
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
      // Se temos whatsappVinculo mas não customerId, criar contato e vincular
      else if (whatsappVinculo) {
        const empresa = empresas.find(e => e.id === empresaId);
        const whatsappsAtuais = empresa?.whatsapps_vinculados || [];
        
        if (whatsappsAtuais.includes(whatsappVinculo)) {
          toast.error("Este WhatsApp já está vinculado a esta empresa");
          setVinculando(false);
          return;
        }

        // Criar contato sem email temporário - deixar em branco
        const { data: novoContato, error: contatoErr } = await supabase
          .from('customers')
          .insert([{
            estabelecimento_id: estabId,
            nome: whatsappVinculo, // Usar número como nome inicial
            telefone: whatsappVinculo,
            email: '', // Deixar email em branco para edição posterior
            tipo_operador: true
          }])
          .select('id')
          .maybeSingle();

        if (contatoErr) throw contatoErr;

        // Vincular contato à empresa
        await supabase
          .from('customer_empresas')
          .insert([{
            customer_id: novoContato!.id,
            empresa_id: empresaId,
            is_primary: false
          }]);

        // Adicionar whatsapp aos whatsapps_vinculados da empresa
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

  const handleCadastrarEVincular = async () => {
    if (!novaEmpresa.nome_fantasia.trim()) {
      toast.error("Nome fantasia é obrigatório");
      return;
    }

    setSalvando(true);
    try {
      const estabId = await getEstabelecimentoId();
      
      // Criar a nova empresa
      const { data: empresaCriada, error: empresaErr } = await supabase
        .from('empresas')
        .insert({
          estabelecimento_id: estabId,
          nome_fantasia: novaEmpresa.nome_fantasia.trim(),
          nome: novaEmpresa.nome.trim() || novaEmpresa.nome_fantasia.trim(),
          cnpj: novaEmpresa.cnpj.trim() || null,
          email: novaEmpresa.email.trim() || null,
          telefone: novaEmpresa.telefone.trim() || null,
          emails_vinculados: emailVinculo ? [emailVinculo] : [],
          whatsapps_vinculados: whatsappVinculo ? [whatsappVinculo] : []
        })
        .select('id')
        .single();

      if (empresaErr) throw empresaErr;

      // Se temos customerId, vincular diretamente
      if (customerId) {
        await supabase
          .from('customer_empresas')
          .insert({
            customer_id: customerId,
            empresa_id: empresaCriada.id,
            is_primary: false
          });
      }

      toast.success("Empresa cadastrada e vinculada com sucesso!");
      onSuccess?.();
      onOpenChange(false);
      setBusca("");
      setEmpresasFiltradas([]);
      setModoCadastro(false);
      setNovaEmpresa({ nome_fantasia: "", nome: "", cnpj: "", email: "", telefone: "" });
    } catch (error: any) {
      console.error('Erro ao cadastrar empresa:', error);
      toast.error(error?.message || "Erro ao cadastrar empresa");
    } finally {
      setSalvando(false);
    }
  };

  const iniciarCadastro = () => {
    setModoCadastro(true);
    // Preencher nome fantasia com o termo buscado
    setNovaEmpresa(prev => ({ ...prev, nome_fantasia: busca }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {modoCadastro && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 mr-1"
                onClick={() => setModoCadastro(false)}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <Building2 className="w-5 h-5 text-primary" />
            {modoCadastro ? "Cadastrar Nova Empresa" : "Vincular Empresa"}
          </DialogTitle>
        </DialogHeader>

        {modoCadastro ? (
          // Formulário de cadastro de nova empresa
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm">Nome Fantasia *</Label>
              <Input
                placeholder="Nome fantasia da empresa"
                value={novaEmpresa.nome_fantasia}
                onChange={(e) => setNovaEmpresa(prev => ({ ...prev, nome_fantasia: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">Razão Social</Label>
              <Input
                placeholder="Razão social (opcional)"
                value={novaEmpresa.nome}
                onChange={(e) => setNovaEmpresa(prev => ({ ...prev, nome: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm">CNPJ</Label>
              <Input
                placeholder="00.000.000/0000-00"
                value={novaEmpresa.cnpj}
                onChange={(e) => setNovaEmpresa(prev => ({ ...prev, cnpj: e.target.value }))}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Email</Label>
                <Input
                  type="email"
                  placeholder="email@empresa.com"
                  value={novaEmpresa.email}
                  onChange={(e) => setNovaEmpresa(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Telefone</Label>
                <Input
                  placeholder="(00) 0000-0000"
                  value={novaEmpresa.telefone}
                  onChange={(e) => setNovaEmpresa(prev => ({ ...prev, telefone: e.target.value }))}
                />
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleCadastrarEVincular}
              disabled={salvando || !novaEmpresa.nome_fantasia.trim()}
            >
              {salvando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar e Vincular
                </>
              )}
            </Button>
          </div>
        ) : (
          // Modo de busca normal
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
                  onClick={iniciarCadastro}
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
                  onClick={() => setModoCadastro(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar Nova Empresa
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}