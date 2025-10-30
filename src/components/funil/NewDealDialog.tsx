import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Deal, FunilStage } from '@/types/funil';
import { supabase } from '@/integrations/supabase/client';
import { getEstabelecimentoId } from '@/lib/estabelecimentoUtils';
import { X } from 'lucide-react';

interface Empresa {
  id: string;
  nome_fantasia: string;
  nome: string | null;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  custom_fields?: any;
}

interface NewDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (deal: Omit<Deal, 'id'>) => void;
}

export function NewDealDialog({ open, onOpenChange, onSave }: NewDealDialogProps) {
  const [formData, setFormData] = useState({
    cliente: '',
    valor: '',
    dataEstimada: '',
    responsavel: '',
    origem: 'whatsapp',
    segmento: '',
    cluster: '',
    stage: 'lead' as FunilStage,
  });

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmpresasList, setShowEmpresasList] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);

  // Carregar empresas
  useEffect(() => {
    if (open) {
      loadEmpresas();
    }
  }, [open]);

  const loadEmpresas = async () => {
    const estabId = await getEstabelecimentoId();
    if (estabId) {
      const { data } = await supabase
        .from('empresas')
        .select('*')
        .eq('estabelecimento_id', estabId)
        .order('nome_fantasia');
      
      if (data) {
        setEmpresas(data);
      }
    }
  };

  // Filtrar empresas baseado na busca
  const filteredEmpresas = empresas.filter(empresa => {
    if (!searchQuery) return true;
    
    const searchTerm = searchQuery.toLowerCase();
    const cnpj = (empresa.cnpj || '').toLowerCase();
    const telefone = (empresa.telefone || '').toLowerCase();
    const email = (empresa.email || '').toLowerCase();
    const nomeFantasia = empresa.nome_fantasia.toLowerCase();
    const razaoSocial = (empresa.nome || '').toLowerCase();
    
    return (
      nomeFantasia.includes(searchTerm) ||
      razaoSocial.includes(searchTerm) ||
      cnpj.includes(searchTerm) ||
      telefone.includes(searchTerm) ||
      email.includes(searchTerm)
    );
  });

  const handleSelectEmpresa = (empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    setSearchQuery(empresa.nome_fantasia);
    setFormData({ ...formData, cliente: empresa.nome_fantasia });
    setShowEmpresasList(false);
  };

  const handleClearEmpresa = () => {
    setSelectedEmpresa(null);
    setSearchQuery('');
    setFormData({ ...formData, cliente: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSave({
      cliente: formData.cliente,
      valor: parseFloat(formData.valor) || 0,
      dataEstimada: formData.dataEstimada,
      responsavel: formData.responsavel,
      origem: formData.origem,
      segmento: formData.segmento,
      cluster: formData.cluster,
      status: 'normal',
      saude: 'verde',
      diasParado: 0,
      prioridade: 50,
      tags: [],
    });

    // Reset form
    setFormData({
      cliente: '',
      valor: '',
      dataEstimada: '',
      responsavel: '',
      origem: 'whatsapp',
      segmento: '',
      cluster: '',
      stage: 'lead',
    });
    setSelectedEmpresa(null);
    setSearchQuery('');
    setShowEmpresasList(false);
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Lead</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cliente">Nome do Cliente *</Label>
              <div className="relative">
                <Input
                  id="cliente"
                  required
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setFormData({ ...formData, cliente: e.target.value });
                    setShowEmpresasList(e.target.value.length > 0);
                  }}
                  onFocus={() => searchQuery.length > 0 && setShowEmpresasList(true)}
                  placeholder="Pesquisar empresa por nome, CNPJ, WhatsApp, email..."
                />
                {selectedEmpresa && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={handleClearEmpresa}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
                
                {/* Lista de empresas */}
                {showEmpresasList && filteredEmpresas.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredEmpresas.map((empresa) => (
                      <div
                        key={empresa.id}
                        className="p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0 transition-colors"
                        onClick={() => handleSelectEmpresa(empresa)}
                      >
                        <div className="font-medium text-sm">{empresa.nome_fantasia}</div>
                        <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                          {empresa.nome && empresa.nome !== empresa.nome_fantasia && (
                            <div>Razão Social: {empresa.nome}</div>
                          )}
                          {empresa.cnpj && (
                            <div>CNPJ: {empresa.cnpj}</div>
                          )}
                          {empresa.telefone && (
                            <div>Tel: {empresa.telefone}</div>
                          )}
                          {empresa.email && (
                            <div>Email: {empresa.email}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor">Valor Estimado (R$) *</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                required
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsavel">Responsável *</Label>
              <Select
                value={formData.responsavel}
                onValueChange={(value) => setFormData({ ...formData, responsavel: value })}
                required
              >
                <SelectTrigger id="responsavel">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Marcos">Marcos</SelectItem>
                  <SelectItem value="João">João</SelectItem>
                  <SelectItem value="Maria">Maria</SelectItem>
                  <SelectItem value="Pedro">Pedro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataEstimada">Data Estimada de Fechamento *</Label>
              <Input
                id="dataEstimada"
                type="date"
                required
                value={formData.dataEstimada}
                onChange={(e) => setFormData({ ...formData, dataEstimada: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="origem">Origem</Label>
              <Select
                value={formData.origem}
                onValueChange={(value) => setFormData({ ...formData, origem: value })}
              >
                <SelectTrigger id="origem">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="site">Site</SelectItem>
                  <SelectItem value="indicacao">Indicação</SelectItem>
                  <SelectItem value="telefone">Telefone</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="segmento">Segmento</Label>
              <Input
                id="segmento"
                value={formData.segmento}
                onChange={(e) => setFormData({ ...formData, segmento: e.target.value })}
                placeholder="Ex: Tecnologia"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cluster">Cluster</Label>
              <Input
                id="cluster"
                value={formData.cluster}
                onChange={(e) => setFormData({ ...formData, cluster: e.target.value })}
                placeholder="Ex: Pequena Empresa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stage">Etapa Inicial</Label>
              <Select
                value={formData.stage}
                onValueChange={(value) => setFormData({ ...formData, stage: value as FunilStage })}
              >
                <SelectTrigger id="stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="qualificacao">Qualificação</SelectItem>
                  <SelectItem value="proposta">Proposta</SelectItem>
                  <SelectItem value="negociacao">Negociação</SelectItem>
                  <SelectItem value="fechamento">Fechamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Criar Lead</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
