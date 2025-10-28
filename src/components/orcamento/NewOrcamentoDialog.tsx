import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NewOrcamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  orcamentoOrigemId?: string;
}

export default function NewOrcamentoDialog({ 
  open, 
  onOpenChange, 
  onSave,
  orcamentoOrigemId 
}: NewOrcamentoDialogProps) {
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    empresa_id: "",
    cliente_id: "",
    vendedor_id: "",
    observacoes: "",
  });

  useEffect(() => {
    if (open) {
      loadEmpresas();
      loadVendedores();
      loadCurrentUser();
    }
  }, [open]);

  useEffect(() => {
    if (formData.empresa_id) {
      loadClientesPorEmpresa(formData.empresa_id);
    } else {
      setClientes([]);
      setFormData(prev => ({ ...prev, cliente_id: "" }));
    }
  }, [formData.empresa_id]);

  const loadEmpresas = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nome_fantasia, razao_social, cnpj')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome_fantasia');

      if (error) throw error;
      setEmpresas(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  const loadClientesPorEmpresa = async (empresaId: string) => {
    try {
      const { data, error } = await supabase
        .from('customer_empresas')
        .select(`
          customer_id,
          customers:customer_id (
            id,
            nome,
            email,
            telefone
          )
        `)
        .eq('empresa_id', empresaId);

      if (error) throw error;
      
      const clientesFormatados = (data || [])
        .map(item => item.customers)
        .filter(Boolean);
      
      setClientes(clientesFormatados);
    } catch (error: any) {
      console.error('Erro ao carregar clientes da empresa:', error);
      setClientes([]);
    }
  };

  const loadVendedores = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');

      if (error) throw error;
      setVendedores(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar vendedores:', error);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setFormData(prev => ({ ...prev, vendedor_id: user.id }));
      }
    } catch (error: any) {
      console.error('Erro ao carregar usuário atual:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.empresa_id) {
      toast.error("Selecione uma empresa");
      return;
    }

    if (!formData.cliente_id) {
      toast.error("Selecione um contato da empresa");
      return;
    }

    try {
      setLoading(true);
      const estabelecimentoId = await getEstabelecimentoId();

      const novoOrcamento = {
        estabelecimento_id: estabelecimentoId,
        cliente_id: formData.cliente_id,
        vendedor_id: formData.vendedor_id,
        observacoes: formData.observacoes || null,
        etapa: 'orcamento',
        status: 'em_aberto',
        valor_total: 0,
        valor_desconto: 0,
        percentual_desconto: 0,
        orcamento_origem_id: orcamentoOrigemId || null,
        token_compartilhamento: crypto.randomUUID(),
      };

      const { data, error } = await supabase
        .from('orcamentos')
        .insert(novoOrcamento)
        .select()
        .single();

      if (error) throw error;

      // Se está duplicando, copiar os itens
      if (orcamentoOrigemId) {
        const { data: itensOrigem } = await supabase
          .from('orcamento_itens')
          .select('*')
          .eq('orcamento_id', orcamentoOrigemId);

        if (itensOrigem && itensOrigem.length > 0) {
          const novosItens = itensOrigem.map(item => ({
            orcamento_id: data.id,
            produto_id: item.produto_id,
            quantidade: item.quantidade,
            preco_unitario: item.preco_unitario,
            preco_original: item.preco_original,
            desconto: item.desconto,
            subtotal: item.subtotal,
          }));

          await supabase.from('orcamento_itens').insert(novosItens);
        }
      }

      toast.success("Orçamento criado com sucesso!");
      onSave();
      setFormData({
        empresa_id: "",
        cliente_id: "",
        vendedor_id: "",
        observacoes: "",
      });
    } catch (error: any) {
      console.error('Erro ao criar orçamento:', error);
      toast.error("Erro ao criar orçamento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {orcamentoOrigemId ? 'Duplicar Orçamento' : 'Novo Orçamento'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="empresa">Empresa *</Label>
            <Select
              value={formData.empresa_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, empresa_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent>
                {empresas.map((empresa) => (
                  <SelectItem key={empresa.id} value={empresa.id}>
                    {empresa.nome_fantasia} {empresa.cnpj && `(${empresa.cnpj})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cliente">Contato *</Label>
            <Select
              value={formData.cliente_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, cliente_id: value }))}
              disabled={!formData.empresa_id}
            >
              <SelectTrigger>
                <SelectValue placeholder={formData.empresa_id ? "Selecione o contato" : "Selecione a empresa primeiro"} />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    {cliente.nome} {cliente.telefone && `- ${cliente.telefone}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendedor">Vendedor</Label>
            <Select
              value={formData.vendedor_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, vendedor_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o vendedor" />
              </SelectTrigger>
              <SelectContent>
                {vendedores.map((vendedor) => (
                  <SelectItem key={vendedor.id} value={vendedor.id}>
                    {vendedor.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Input
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Observações sobre o orçamento"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Orçamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
