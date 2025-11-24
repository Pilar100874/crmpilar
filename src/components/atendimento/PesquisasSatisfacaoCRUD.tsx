import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast-config";
import { Plus, Edit, Trash2, MessageCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Pesquisa {
  id: string;
  nome: string;
  tipo: 'csat' | 'nps' | 'ces';
  ativa: boolean;
  trigger_tipo: string;
  trigger_delay_minutos: number;
  pergunta_principal: string;
  escala_minima: number;
  escala_maxima: number;
  label_minima?: string;
  label_maxima?: string;
  permite_comentario: boolean;
  pergunta_comentario?: string;
  canais: string[];
  aplica_filas?: string[];
  aplica_atendentes?: string[];
}

interface PesquisasSatisfacaoCRUDProps {
  estabelecimentoId: string;
}

export default function PesquisasSatisfacaoCRUD({ estabelecimentoId }: PesquisasSatisfacaoCRUDProps) {
  const [pesquisas, setPesquisas] = useState<Pesquisa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPesquisa, setEditingPesquisa] = useState<Pesquisa | null>(null);
  const [formData, setFormData] = useState<Partial<Pesquisa>>({
    nome: "",
    tipo: "csat",
    ativa: true,
    trigger_tipo: "apos_encerramento",
    trigger_delay_minutos: 0,
    pergunta_principal: "",
    escala_minima: 1,
    escala_maxima: 10,
    label_minima: "",
    label_maxima: "",
    permite_comentario: true,
    pergunta_comentario: "",
    canais: ["whatsapp"],
  });

  useEffect(() => {
    loadPesquisas();
  }, [estabelecimentoId]);

  const loadPesquisas = async () => {
    try {
      const { data, error } = await supabase
        .from("pesquisas_satisfacao")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPesquisas((data as Pesquisa[]) || []);
    } catch (error: any) {
      console.error("Erro ao carregar pesquisas:", error);
      toast.error("Erro ao carregar pesquisas");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.nome || !formData.pergunta_principal) {
        toast.error("Preencha os campos obrigatórios");
        return;
      }

      const dataToSave: any = {
        ...formData,
        estabelecimento_id: estabelecimentoId,
      };

      if (editingPesquisa) {
        const { error } = await supabase
          .from("pesquisas_satisfacao")
          .update(dataToSave)
          .eq("id", editingPesquisa.id);

        if (error) throw error;
        toast.success("Pesquisa atualizada com sucesso");
      } else {
        const { error } = await supabase
          .from("pesquisas_satisfacao")
          .insert([dataToSave]);

        if (error) throw error;
        toast.success("Pesquisa criada com sucesso");
      }

      setDialogOpen(false);
      setEditingPesquisa(null);
      resetForm();
      loadPesquisas();
    } catch (error: any) {
      console.error("Erro ao salvar pesquisa:", error);
      toast.error(error.message || "Erro ao salvar pesquisa");
    }
  };

  const handleEdit = (pesquisa: Pesquisa) => {
    setEditingPesquisa(pesquisa);
    setFormData(pesquisa);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta pesquisa?")) return;

    try {
      const { error } = await supabase
        .from("pesquisas_satisfacao")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Pesquisa excluída com sucesso");
      loadPesquisas();
    } catch (error: any) {
      console.error("Erro ao excluir pesquisa:", error);
      toast.error("Erro ao excluir pesquisa");
    }
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      tipo: "csat",
      ativa: true,
      trigger_tipo: "apos_encerramento",
      trigger_delay_minutos: 0,
      pergunta_principal: "",
      escala_minima: 1,
      escala_maxima: 10,
      label_minima: "",
      label_maxima: "",
      permite_comentario: true,
      pergunta_comentario: "",
      canais: ["whatsapp"],
    });
  };

  const getTipoBadgeColor = (tipo: string) => {
    switch (tipo) {
      case "nps": return "bg-blue-500";
      case "csat": return "bg-green-500";
      case "ces": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "nps": return "NPS";
      case "csat": return "CSAT";
      case "ces": return "CES";
      default: return tipo.toUpperCase();
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Pesquisas de Satisfação</h2>
        <Button
          onClick={() => {
            resetForm();
            setEditingPesquisa(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Pesquisa
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Disparo</TableHead>
              <TableHead>Canais</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pesquisas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhuma pesquisa cadastrada
                </TableCell>
              </TableRow>
            ) : (
              pesquisas.map((pesquisa) => (
                <TableRow key={pesquisa.id}>
                  <TableCell className="font-medium">{pesquisa.nome}</TableCell>
                  <TableCell>
                    <Badge className={getTipoBadgeColor(pesquisa.tipo)}>
                      {getTipoLabel(pesquisa.tipo)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={pesquisa.ativa ? "default" : "secondary"}>
                      {pesquisa.ativa ? "Ativa" : "Inativa"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {pesquisa.trigger_tipo === "apos_encerramento"
                      ? "Após encerramento"
                      : pesquisa.trigger_tipo === "apos_tempo"
                      ? `${pesquisa.trigger_delay_minutos}min após`
                      : "Manual"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {pesquisa.canais.map((canal) => (
                        <Badge key={canal} variant="outline" className="text-xs">
                          {canal}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(pesquisa)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(pesquisa.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPesquisa ? "Editar Pesquisa" : "Nova Pesquisa"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome da Pesquisa *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Avaliação pós-atendimento"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tipo">Tipo de Pesquisa *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value: 'csat' | 'nps' | 'ces') =>
                    setFormData({ ...formData, tipo: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csat">CSAT - Satisfação do Cliente</SelectItem>
                    <SelectItem value="nps">NPS - Pontuação de Indicação</SelectItem>
                    <SelectItem value="ces">CES - Pontuação de Esforço do Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="trigger_tipo">Quando Enviar *</Label>
                <Select
                  value={formData.trigger_tipo}
                  onValueChange={(value) =>
                    setFormData({ ...formData, trigger_tipo: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apos_encerramento">
                      Logo após encerramento
                    </SelectItem>
                    <SelectItem value="apos_tempo">
                      Após um tempo
                    </SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.trigger_tipo === "apos_tempo" && (
              <div>
                <Label htmlFor="delay">Delay (minutos)</Label>
                <Input
                  id="delay"
                  type="number"
                  value={formData.trigger_delay_minutos}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      trigger_delay_minutos: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            )}

            <div>
              <Label htmlFor="pergunta">Pergunta Principal *</Label>
              <Textarea
                id="pergunta"
                value={formData.pergunta_principal}
                onChange={(e) =>
                  setFormData({ ...formData, pergunta_principal: e.target.value })
                }
                placeholder="Ex: Como você avalia nosso atendimento?"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="escala_min">Escala Mínima</Label>
                <Input
                  id="escala_min"
                  type="number"
                  value={formData.escala_minima}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      escala_minima: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="escala_max">Escala Máxima</Label>
                <Input
                  id="escala_max"
                  type="number"
                  value={formData.escala_maxima}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      escala_maxima: parseInt(e.target.value) || 10,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="label_min">Label Mínima</Label>
                <Input
                  id="label_min"
                  value={formData.label_minima}
                  onChange={(e) =>
                    setFormData({ ...formData, label_minima: e.target.value })
                  }
                  placeholder="Ex: Muito insatisfeito"
                />
              </div>

              <div>
                <Label htmlFor="label_max">Label Máxima</Label>
                <Input
                  id="label_max"
                  value={formData.label_maxima}
                  onChange={(e) =>
                    setFormData({ ...formData, label_maxima: e.target.value })
                  }
                  placeholder="Ex: Muito satisfeito"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="permite_comentario"
                checked={formData.permite_comentario}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, permite_comentario: checked })
                }
              />
              <Label htmlFor="permite_comentario">Permitir comentário adicional</Label>
            </div>

            {formData.permite_comentario && (
              <div>
                <Label htmlFor="pergunta_comentario">Pergunta para Comentário</Label>
                <Input
                  id="pergunta_comentario"
                  value={formData.pergunta_comentario}
                  onChange={(e) =>
                    setFormData({ ...formData, pergunta_comentario: e.target.value })
                  }
                  placeholder="Ex: Gostaria de deixar algum comentário?"
                />
              </div>
            )}

            <div>
              <Label>Canais Ativos</Label>
              <div className="flex flex-wrap gap-4 mt-2">
                {["whatsapp", "telegram", "webchat", "facebook"].map((canal) => (
                  <div key={canal} className="flex items-center space-x-2">
                    <Checkbox
                      id={canal}
                      checked={formData.canais?.includes(canal)}
                      onCheckedChange={(checked) => {
                        const newCanais = checked
                          ? [...(formData.canais || []), canal]
                          : (formData.canais || []).filter((c) => c !== canal);
                        setFormData({ ...formData, canais: newCanais });
                      }}
                    />
                    <Label htmlFor={canal} className="capitalize">
                      {canal}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="ativa"
                checked={formData.ativa}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, ativa: checked })
                }
              />
              <Label htmlFor="ativa">Pesquisa Ativa</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              <MessageCircle className="mr-2 h-4 w-4" />
              {editingPesquisa ? "Atualizar" : "Criar"} Pesquisa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
