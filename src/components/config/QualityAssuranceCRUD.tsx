import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  ClipboardCheck,
  Award,
  BarChart3,
  FileText,
} from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

interface QAFormulario {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
}

interface QACriterio {
  id: string;
  formulario_id: string;
  nome: string;
  descricao: string | null;
  peso: number;
  tipo: string;
  opcoes: any;
  obrigatorio: boolean;
  ordem: number;
}

interface QAAvaliacao {
  id: string;
  chat_id: string;
  atendente_id: string;
  pontuacao_total: number;
  pontuacao_maxima: number;
  percentual: number;
  status: string;
  data_avaliacao: string;
}

export default function QualityAssuranceCRUD({ estabelecimentoId }: { estabelecimentoId: string }) {
  const [formularios, setFormularios] = useState<QAFormulario[]>([]);
  const [criterios, setCriterios] = useState<QACriterio[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<QAAvaliacao[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de diálogo
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [criterioDialogOpen, setCriterioDialogOpen] = useState(false);
  const [selectedFormulario, setSelectedFormulario] = useState<QAFormulario | null>(null);
  const [deletingFormularioId, setDeletingFormularioId] = useState<string | null>(null);
  
  // Estados de formulário
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    ativo: true,
  });
  
  const [criterioData, setCriterioData] = useState({
    nome: "",
    descricao: "",
    peso: 1,
    tipo: "boolean",
    obrigatorio: true,
    ordem: 0,
    opcoes: {},
  });

  useEffect(() => {
    if (estabelecimentoId) {
      loadFormularios();
    }
  }, [estabelecimentoId]);

  const loadFormularios = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("qa_formularios")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFormularios(data || []);
    } catch (error) {
      console.error("Erro ao carregar formulários:", error);
      toast.error("Erro ao carregar formulários");
    } finally {
      setLoading(false);
    }
  };

  const loadCriterios = async (formularioId: string) => {
    try {
      const { data, error } = await supabase
        .from("qa_criterios")
        .select("*")
        .eq("formulario_id", formularioId)
        .order("ordem", { ascending: true });

      if (error) throw error;
      setCriterios(data || []);
    } catch (error) {
      console.error("Erro ao carregar critérios:", error);
      toast.error("Erro ao carregar critérios");
    }
  };

  const handleSaveFormulario = async () => {
    try {
      if (selectedFormulario) {
        // Update
        const { error } = await supabase
          .from("qa_formularios")
          .update(formData)
          .eq("id", selectedFormulario.id);

        if (error) throw error;
        toast.success("Formulário atualizado com sucesso");
      } else {
        // Insert
        const { error } = await supabase
          .from("qa_formularios")
          .insert({
            ...formData,
            estabelecimento_id: estabelecimentoId,
          });

        if (error) throw error;
        toast.success("Formulário criado com sucesso");
      }

      setFormDialogOpen(false);
      resetFormData();
      loadFormularios();
    } catch (error) {
      console.error("Erro ao salvar formulário:", error);
      toast.error("Erro ao salvar formulário");
    }
  };

  const handleDeleteFormulario = async (id: string) => {
    try {
      const { error } = await supabase
        .from("qa_formularios")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Formulário excluído com sucesso");
      loadFormularios();
    } catch (error) {
      console.error("Erro ao excluir formulário:", error);
      toast.error("Erro ao excluir formulário");
    } finally {
      setDeletingFormularioId(null);
    }
  };

  const handleSaveCriterio = async () => {
    if (!selectedFormulario) return;

    try {
      const { error } = await supabase
        .from("qa_criterios")
        .insert({
          ...criterioData,
          formulario_id: selectedFormulario.id,
        });

      if (error) throw error;
      toast.success("Critério adicionado com sucesso");
      setCriterioDialogOpen(false);
      resetCriterioData();
      loadCriterios(selectedFormulario.id);
    } catch (error) {
      console.error("Erro ao salvar critério:", error);
      toast.error("Erro ao salvar critério");
    }
  };

  const resetFormData = () => {
    setFormData({
      nome: "",
      descricao: "",
      ativo: true,
    });
    setSelectedFormulario(null);
  };

  const resetCriterioData = () => {
    setCriterioData({
      nome: "",
      descricao: "",
      peso: 1,
      tipo: "boolean",
      obrigatorio: true,
      ordem: criterios.length,
      opcoes: {},
    });
  };

  const openEditDialog = (formulario: QAFormulario) => {
    setSelectedFormulario(formulario);
    setFormData({
      nome: formulario.nome,
      descricao: formulario.descricao || "",
      ativo: formulario.ativo,
    });
    setFormDialogOpen(true);
  };

  const openCriteriosDialog = (formulario: QAFormulario) => {
    setSelectedFormulario(formulario);
    loadCriterios(formulario.id);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Controle de Qualidade</h2>
          <p className="text-muted-foreground text-sm">
            Gerencie formulários de avaliação e acompanhe a qualidade dos atendimentos
          </p>
        </div>
        <Button onClick={() => setFormDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Formulário
        </Button>
      </div>

      <Tabs defaultValue="formularios" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="formularios">
            <FileText className="mr-2 h-4 w-4" />
            Formulários
          </TabsTrigger>
          <TabsTrigger value="avaliacoes">
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Avaliações
          </TabsTrigger>
          <TabsTrigger value="metricas">
            <BarChart3 className="mr-2 h-4 w-4" />
            Métricas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="formularios" className="space-y-4">
          {formularios.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  Nenhum formulário criado ainda
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {formularios.map((form) => (
                <Card key={form.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {form.nome}
                          {form.ativo && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Ativo
                            </span>
                          )}
                        </CardTitle>
                        {form.descricao && (
                          <CardDescription>{form.descricao}</CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCriteriosDialog(form)}
                      >
                        <Award className="mr-2 h-4 w-4" />
                        Critérios
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(form)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingFormularioId(form.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="avaliacoes">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Avaliações Realizadas</h3>
                <p className="text-sm text-muted-foreground">Histórico de avaliações de qualidade</p>
              </div>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Avaliação
              </Button>
            </div>

            {avaliacoes.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-center">
                    Nenhuma avaliação realizada ainda
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {avaliacoes.map((avaliacao) => (
                  <Card key={avaliacao.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">
                            Avaliação #{avaliacao.id.substring(0, 8)}
                          </CardTitle>
                          <CardDescription>
                            {new Date(avaliacao.data_avaliacao).toLocaleDateString('pt-BR')}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                              {avaliacao.percentual.toFixed(1)}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {avaliacao.pontuacao_total} / {avaliacao.pontuacao_maxima}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="metricas">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Dashboard de Qualidade</h3>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Score Médio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">85.2%</div>
                  <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avaliações</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{avaliacoes.length}</div>
                  <p className="text-xs text-muted-foreground">Total realizadas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Acima da Meta</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">75%</div>
                  <p className="text-xs text-muted-foreground">Atendentes</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Abaixo da Meta</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">25%</div>
                  <p className="text-xs text-muted-foreground">Atendentes</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Evolução Temporal</CardTitle>
                <CardDescription>Score médio por período</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Gráfico de evolução temporal
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Critérios com Pior Desempenho</CardTitle>
                <CardDescription>Identificar áreas de melhoria</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Clareza na comunicação</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-muted rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                      </div>
                      <span className="text-sm font-medium">60%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Tempo de resposta</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-muted rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '72%' }}></div>
                      </div>
                      <span className="text-sm font-medium">72%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Empatia</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-muted rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '88%' }}></div>
                      </div>
                      <span className="text-sm font-medium">88%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog de Formulário */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedFormulario ? "Editar Formulário" : "Novo Formulário"}
            </DialogTitle>
            <DialogDescription>
              Configure o formulário de avaliação de qualidade
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Formulário</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) =>
                  setFormData({ ...formData, nome: e.target.value })
                }
                placeholder="Ex: Avaliação Padrão de Atendimento"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) =>
                  setFormData({ ...formData, descricao: e.target.value })
                }
                placeholder="Descreva o propósito deste formulário"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, ativo: checked })
                }
              />
              <Label htmlFor="ativo">Formulário ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setFormDialogOpen(false);
                resetFormData();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveFormulario}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Critérios */}
      <Dialog
        open={!!selectedFormulario && !formDialogOpen}
        onOpenChange={(open) => !open && setSelectedFormulario(null)}
      >
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Critérios: {selectedFormulario?.nome}
            </DialogTitle>
            <DialogDescription>
              Gerencie os critérios de avaliação deste formulário
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Button
              onClick={() => setCriterioDialogOpen(true)}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Critério
            </Button>
            
            {criterios.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum critério adicionado ainda
              </p>
            ) : (
              <div className="space-y-2">
                {criterios.map((criterio) => (
                  <Card key={criterio.id}>
                    <CardHeader className="py-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-sm">{criterio.nome}</CardTitle>
                          {criterio.descricao && (
                            <CardDescription className="text-xs">
                              {criterio.descricao}
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            Peso: {criterio.peso}
                          </span>
                          <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                            {criterio.tipo}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Novo Critério */}
      <Dialog open={criterioDialogOpen} onOpenChange={setCriterioDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Novo Critério</DialogTitle>
            <DialogDescription>
              Adicione um novo critério de avaliação
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="criterio-nome">Nome do Critério</Label>
              <Input
                id="criterio-nome"
                value={criterioData.nome}
                onChange={(e) =>
                  setCriterioData({ ...criterioData, nome: e.target.value })
                }
                placeholder="Ex: Clareza na comunicação"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="criterio-desc">Descrição</Label>
              <Textarea
                id="criterio-desc"
                value={criterioData.descricao}
                onChange={(e) =>
                  setCriterioData({ ...criterioData, descricao: e.target.value })
                }
                placeholder="Explique o que deve ser avaliado"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="criterio-tipo">Tipo</Label>
                <Select
                  value={criterioData.tipo}
                  onValueChange={(value) =>
                    setCriterioData({ ...criterioData, tipo: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boolean">Sim/Não</SelectItem>
                    <SelectItem value="escala">Escala</SelectItem>
                    <SelectItem value="texto">Texto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="criterio-peso">Peso</Label>
                <Input
                  id="criterio-peso"
                  type="number"
                  min="1"
                  max="10"
                  value={criterioData.peso}
                  onChange={(e) =>
                    setCriterioData({
                      ...criterioData,
                      peso: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="obrigatorio"
                checked={criterioData.obrigatorio}
                onCheckedChange={(checked) =>
                  setCriterioData({ ...criterioData, obrigatorio: checked })
                }
              />
              <Label htmlFor="obrigatorio">Obrigatório</Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCriterioDialogOpen(false);
                resetCriterioData();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveCriterio}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <DeleteConfirmDialog
        open={!!deletingFormularioId}
        onOpenChange={(open) => !open && setDeletingFormularioId(null)}
        onConfirm={() => deletingFormularioId && handleDeleteFormulario(deletingFormularioId)}
        title="Excluir Formulário"
        description="Tem certeza que deseja excluir este formulário? Esta ação não pode ser desfeita e todas as avaliações associadas serão perdidas."
      />
    </div>
  );
}
