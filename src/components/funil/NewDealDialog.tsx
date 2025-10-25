import { useState } from 'react';
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
              <Input
                id="cliente"
                required
                value={formData.cliente}
                onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                placeholder="Ex: Empresa XYZ"
              />
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
