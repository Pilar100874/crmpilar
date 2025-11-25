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
  const [avaliacaoDialogOpen, setAvaliacaoDialogOpen] = useState(false);
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
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold">Controle de Qualidade</h2>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Gerencie formulários de avaliação e acompanhe a qualidade
          </p>
        </div>
        <Button onClick={() => setFormDialogOpen(true)} size="sm" className="self-start sm:self-auto">
          <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          <span className="text-xs sm:text-sm">Novo Formulário</span>
        </Button>
      </div>

      <Tabs defaultValue="formularios" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="formularios" className="text-xs sm:text-sm py-2">
            <FileText className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Formulários</span>
            <span className="sm:hidden">Forms</span>
          </TabsTrigger>
          <TabsTrigger value="avaliacoes" className="text-xs sm:text-sm py-2">
            <ClipboardCheck className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Avaliações</span>
            <span className="sm:hidden">Aval.</span>
          </TabsTrigger>
          <TabsTrigger value="metricas" className="text-xs sm:text-sm py-2">
            <BarChart3 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Métricas</span>
            <span className="sm:hidden">Métr.</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="formularios" className="space-y-3 sm:space-y-4 mt-4">
          {formularios.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
                <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-center text-xs sm:text-sm">
                  Nenhum formulário criado ainda
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {formularios.map((form) => (
                <Card key={form.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm sm:text-base flex items-center gap-2 flex-wrap">
                          <span className="truncate">{form.nome}</span>
                          {form.ativo && (
                            <span className="text-[10px] sm:text-xs bg-green-500/10 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full whitespace-nowrap">
                              Ativo
                            </span>
                          )}
                        </CardTitle>
                        {form.descricao && (
                          <CardDescription className="text-xs mt-1 line-clamp-2">{form.descricao}</CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex gap-1.5 sm:gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCriteriosDialog(form)}
                        className="flex-1 text-xs"
                      >
                        <Award className="mr-1 h-3 w-3" />
                        <span className="hidden sm:inline">Critérios</span>
                        <span className="sm:hidden">Crit.</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(form)}
                        className="px-2"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeletingFormularioId(form.id)}
                        className="px-2"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="avaliacoes" className="mt-4">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-semibold">Avaliações Realizadas</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Histórico de avaliações</p>
              </div>
              <Button onClick={() => setAvaliacaoDialogOpen(true)} size="sm" className="self-start">
                <Plus className="mr-1.5 h-3 w-3" />
                <span className="text-xs">Nova Avaliação</span>
              </Button>
            </div>

            {avaliacoes.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
                  <ClipboardCheck className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground text-center text-xs sm:text-sm">
                    Nenhuma avaliação realizada ainda
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {avaliacoes.map((avaliacao) => (
                  <Card key={avaliacao.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm sm:text-base truncate">
                            Avaliação #{avaliacao.id.substring(0, 8)}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {new Date(avaliacao.data_avaliacao).toLocaleDateString('pt-BR')}
                          </CardDescription>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xl sm:text-2xl font-bold text-primary">
                            {avaliacao.percentual.toFixed(1)}%
                          </div>
                          <div className="text-[10px] sm:text-xs text-muted-foreground">
                            {avaliacao.pontuacao_total} / {avaliacao.pontuacao_maxima}
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

        <TabsContent value="metricas" className="mt-4">
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-base sm:text-lg font-semibold">Dashboard de Qualidade</h3>
            
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Score Médio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">85.2%</div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Últimos 30 dias</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Avaliações</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{avaliacoes.length}</div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Total realizadas</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Acima da Meta</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">75%</div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Atendentes</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Abaixo da Meta</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-red-600">25%</div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Atendentes</p>
                </CardContent>
              </Card>
            </div>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base">Evolução Temporal</CardTitle>
                <CardDescription className="text-xs">Score médio por período</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-48 sm:h-64 flex items-center justify-center text-muted-foreground text-xs sm:text-sm">
                  Gráfico de evolução temporal
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm sm:text-base">Critérios com Pior Desempenho</CardTitle>
                <CardDescription className="text-xs">Áreas de melhoria</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex justify-between items-center gap-3">
                    <span className="text-xs sm:text-sm truncate flex-1">Clareza na comunicação</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-20 sm:w-32 bg-muted rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                      </div>
                      <span className="text-xs sm:text-sm font-medium w-10 text-right">60%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center gap-3">
                    <span className="text-xs sm:text-sm truncate flex-1">Tempo de resposta</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-20 sm:w-32 bg-muted rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '72%' }}></div>
                      </div>
                      <span className="text-xs sm:text-sm font-medium w-10 text-right">72%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center gap-3">
                    <span className="text-xs sm:text-sm truncate flex-1">Empatia</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-20 sm:w-32 bg-muted rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '88%' }}></div>
                      </div>
                      <span className="text-xs sm:text-sm font-medium w-10 text-right">88%</span>
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
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {selectedFormulario ? "Editar Formulário" : "Novo Formulário"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Configure o formulário de avaliação de qualidade
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="nome" className="text-xs sm:text-sm">Nome do Formulário</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) =>
                  setFormData({ ...formData, nome: e.target.value })
                }
                placeholder="Ex: Avaliação Padrão"
                className="text-xs sm:text-sm"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="descricao" className="text-xs sm:text-sm">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) =>
                  setFormData({ ...formData, descricao: e.target.value })
                }
                placeholder="Descreva o propósito"
                className="text-xs sm:text-sm min-h-[60px]"
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
              <Label htmlFor="ativo" className="text-xs sm:text-sm">Formulário ativo</Label>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setFormDialogOpen(false);
                resetFormData();
              }}
              size="sm"
              className="text-xs sm:text-sm"
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveFormulario} size="sm" className="text-xs sm:text-sm">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
 
      {/* Dialog de Critérios */}
      <Dialog
        open={!!selectedFormulario && !formDialogOpen}
        onOpenChange={(open) => !open && setSelectedFormulario(null)}
      >
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              Critérios: {selectedFormulario?.nome}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Gerencie os critérios de avaliação
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            <Button
              onClick={() => setCriterioDialogOpen(true)}
              className="w-full"
              size="sm"
            >
              <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="text-xs sm:text-sm">Adicionar Critério</span>
            </Button>
            
            {criterios.length === 0 ? (
              <p className="text-muted-foreground text-center py-6 sm:py-8 text-xs sm:text-sm">
                Nenhum critério adicionado ainda
              </p>
            ) : (
              <div className="space-y-2">
                {criterios.map((criterio) => (
                  <Card key={criterio.id} className="hover:shadow-sm transition-shadow">
                    <CardHeader className="py-2 sm:py-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-xs sm:text-sm truncate">{criterio.nome}</CardTitle>
                          {criterio.descricao && (
                            <CardDescription className="text-[10px] sm:text-xs line-clamp-2">
                              {criterio.descricao}
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                          <span className="text-[10px] sm:text-xs bg-primary/10 text-primary px-1.5 sm:px-2 py-0.5 sm:py-1 rounded whitespace-nowrap">
                            Peso: {criterio.peso}
                          </span>
                          <span className="text-[10px] sm:text-xs bg-secondary text-secondary-foreground px-1.5 sm:px-2 py-0.5 sm:py-1 rounded whitespace-nowrap">
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
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Novo Critério</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Adicione um novo critério
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="criterio-nome" className="text-xs sm:text-sm">Nome do Critério</Label>
              <Input
                id="criterio-nome"
                value={criterioData.nome}
                onChange={(e) =>
                  setCriterioData({ ...criterioData, nome: e.target.value })
                }
                placeholder="Ex: Clareza"
                className="text-xs sm:text-sm"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="criterio-desc" className="text-xs sm:text-sm">Descrição</Label>
              <Textarea
                id="criterio-desc"
                value={criterioData.descricao}
                onChange={(e) =>
                  setCriterioData({ ...criterioData, descricao: e.target.value })
                }
                placeholder="Explique o que avaliar"
                className="text-xs sm:text-sm min-h-[60px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="criterio-tipo" className="text-xs sm:text-sm">Tipo</Label>
                <Select
                  value={criterioData.tipo}
                  onValueChange={(value) =>
                    setCriterioData({ ...criterioData, tipo: value })
                  }
                >
                  <SelectTrigger className="text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boolean" className="text-xs sm:text-sm">Sim/Não</SelectItem>
                    <SelectItem value="escala" className="text-xs sm:text-sm">Escala</SelectItem>
                    <SelectItem value="texto" className="text-xs sm:text-sm">Texto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="criterio-peso" className="text-xs sm:text-sm">Peso</Label>
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
                  className="text-xs sm:text-sm"
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
              <Label htmlFor="obrigatorio" className="text-xs sm:text-sm">Obrigatório</Label>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setCriterioDialogOpen(false);
                resetCriterioData();
              }}
              size="sm"
              className="text-xs sm:text-sm"
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveCriterio} size="sm" className="text-xs sm:text-sm">Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
 
      {/* Dialog de Nova Avaliação */}
      <Dialog open={avaliacaoDialogOpen} onOpenChange={setAvaliacaoDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Nova Avaliação</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Em breve você poderá registrar avaliações completas
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 sm:py-4 text-xs sm:text-sm text-muted-foreground">
            Esta versão já prepara o fluxo visual de avaliações. Nas próximas etapas
            vamos conectar este formulário aos chats e atendentes.
          </div>
          <DialogFooter>
            <Button onClick={() => setAvaliacaoDialogOpen(false)} size="sm" className="text-xs sm:text-sm">
              Fechar
            </Button>
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
