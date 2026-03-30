import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ReportBroDesigner } from "@/components/reportbro/ReportBroDesigner";
import { SubMenuHeader } from "@/components/SubMenuHeader";
import { useLayout } from "@/contexts/LayoutContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, FileText, FileDown, FileSpreadsheet, Copy, Trash2, MoreVertical, Edit, Pencil } from "lucide-react";
import { toast } from "@/lib/toast-config";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Report {
  id: string;
  nome: string;
  descricao: string;
  layout_json: any;
  conexao_id: string | null;
  query_sql: string | null;
  created_at: string;
  updated_at: string;
}

interface DatabaseConnection {
  id: string;
  name: string;
  database_type: string;
}

export default function Relatorios() {
  const navigate = useNavigate();
  const { openSubmenu } = useLayout();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showDesigner, setShowDesigner] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [reportToEdit, setReportToEdit] = useState<Report | null>(null);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
  });

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      console.log("🏢 Estabelecimento ID (Relatorios):", estabelecimentoId);
      
      let query = supabase
        .from("relatorios")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (estabelecimentoId) {
        query = query.eq("estabelecimento_id", estabelecimentoId);
      }
      
      const { data, error } = await query;

      if (error) throw error;
      setReports(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar relatórios: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.nome) {
      toast.error("Nome é obrigatório");
      return;
    }

    try {
      const estabelecimentoId = await getEstabelecimentoId();
      const { data, error } = await supabase
        .from("relatorios")
        .insert([{
          estabelecimento_id: estabelecimentoId,
          nome: formData.nome,
          descricao: formData.descricao,
          conexao_id: null,
          layout_json: {},
          query_sql: "",
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success("Relatório criado com sucesso");
      setShowNewDialog(false);
      setFormData({ nome: "", descricao: "" });
      
      // Abrir designer ReportBro
      setCurrentReportId(data.id);
      setShowDesigner(true);
    } catch (error: any) {
      toast.error("Erro ao criar relatório: " + error.message);
    }
  };

  const handleCreateImportProductsModel = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      
      // Verificar se já existe
      const { data: existing } = await supabase
        .from("relatorios")
        .select("id")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("nome", "Modelo para Produtos Importados")
        .maybeSingle();
      
      if (existing) {
        toast.info("Editando modelo para produtos importados");
        setCurrentReportId(existing.id);
        setShowDesigner(true);
        return;
      }

      // Criar novo modelo
      const { data, error } = await supabase
        .from("relatorios")
        .insert([{
          estabelecimento_id: estabelecimentoId,
          nome: "Modelo para Produtos Importados",
          descricao: "Modelo único para visualização de produtos importados",
          conexao_id: null,
          layout_json: {},
          query_sql: "",
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success("Modelo criado com sucesso");
      setCurrentReportId(data.id);
      setShowDesigner(true);
      await loadReports();
    } catch (error: any) {
      toast.error("Erro ao criar modelo: " + error.message);
    }
  };

  const handleEdit = (report: Report) => {
    // Abrir designer ReportBro
    setCurrentReportId(report.id);
    setShowDesigner(true);
  };

  const handleGenerateReport = async (report: Report, outputType: 'pdf' | 'xlsx') => {
    if (!report.layout_json || Object.keys(report.layout_json).length === 0) {
      toast.error('Relatório sem layout definido. Edite o modelo primeiro.');
      return;
    }
    
    const toastId = toast.loading(`Gerando ${outputType.toUpperCase()}...`);
    
    try {
      const { data, error } = await supabase.functions.invoke('gerar-relatorio-pdf', {
        body: {
          relatorioId: report.id,
          outputType,
        }
      });

      if (error) {
        toast.dismiss(toastId);
        console.error('Erro na função:', error);
        throw new Error(error.message || 'Erro ao chamar função');
      }
      
      if (!data?.success) {
        toast.dismiss(toastId);
        throw new Error(data?.error || 'Erro ao gerar relatório');
      }

      // Baixar o arquivo via fetch e criar blob para download
      const fileUrl = data.fileUrl || data.pdfUrl || data.url;
      if (fileUrl) {
        toast.loading('Baixando arquivo...', { id: toastId });
        
        try {
          const response = await fetch(fileUrl);
          if (!response.ok) throw new Error('Falha ao baixar arquivo');
          
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = data.fileName || `${report.nome}.${outputType}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Limpar blob URL após download
          setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
          
          toast.success(`${outputType.toUpperCase()} baixado com sucesso!`, { id: toastId });
        } catch (fetchError) {
          console.error('Erro ao baixar:', fetchError);
          // Fallback: abrir em nova aba
          window.open(fileUrl, '_blank');
          toast.success(`${outputType.toUpperCase()} gerado! Abrindo em nova aba...`, { id: toastId });
        }
      } else {
        toast.dismiss(toastId);
        console.error('Resposta sem URL:', data);
        toast.error('URL do arquivo não retornada');
      }
    } catch (error: any) {
      toast.dismiss(toastId);
      console.error('Erro ao gerar relatório:', error);
      toast.error(`Erro ao gerar ${outputType.toUpperCase()}: ${error.message}`);
    }
  };


  const handleDelete = (id: string) => {
    setReportToDelete(id);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!reportToDelete) return;

    try {
      const { error } = await supabase
        .from("relatorios")
        .delete()
        .eq("id", reportToDelete);

      if (error) throw error;

      toast.success("Modelo excluído com sucesso");
      setShowDeleteDialog(false);
      setReportToDelete(null);
      loadReports();
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  const handleDuplicate = async (report: Report) => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      const { data, error } = await supabase
        .from("relatorios")
        .insert([{
          estabelecimento_id: estabelecimentoId,
          nome: `${report.nome} (cópia)`,
          descricao: report.descricao,
          conexao_id: report.conexao_id,
          layout_json: report.layout_json,
          query_sql: report.query_sql,
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success("Modelo duplicado com sucesso");
      loadReports();
    } catch (error: any) {
      toast.error("Erro ao duplicar: " + error.message);
    }
  };

  const handleOpenEdit = (report: Report) => {
    setReportToEdit(report);
    setFormData({
      nome: report.nome,
      descricao: report.descricao || "",
    });
    setShowEditDialog(true);
  };

  const handleUpdateReport = async () => {
    if (!formData.nome) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (!reportToEdit) return;

    try {
      const { error } = await supabase
        .from("relatorios")
        .update({
          nome: formData.nome,
          descricao: formData.descricao,
          updated_at: new Date().toISOString(),
        })
        .eq("id", reportToEdit.id);

      if (error) throw error;

      toast.success("Relatório atualizado com sucesso");
      setShowEditDialog(false);
      setReportToEdit(null);
      setFormData({ nome: "", descricao: "" });
      loadReports();
    } catch (error: any) {
      toast.error("Erro ao atualizar relatório: " + error.message);
    }
  };

  const handleCloseDesigner = async () => {
    // Verificar se o relatório está vazio antes de fechar
    if (currentReportId) {
      try {
        const { data: report } = await supabase
          .from("relatorios")
          .select("layout_json, nome")
          .eq("id", currentReportId)
          .single();

        if (report) {
          const layoutJson = report.layout_json as any;
          const isEmpty = !report.layout_json || 
                         Object.keys(report.layout_json).length === 0 ||
                         (layoutJson?.content === "" && 
                          (!layoutJson?.elements || layoutJson.elements.length === 0));

          // Se estiver vazio, deletar o registro
          if (isEmpty) {
            await supabase
              .from("relatorios")
              .delete()
              .eq("id", currentReportId);
            
            toast.info("Relatório vazio não foi salvo");
          }
        }
      } catch (error) {
        console.error("Erro ao verificar relatório vazio:", error);
      }
    }

    setShowDesigner(false);
    setCurrentReportId(null);
    loadReports();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className={showDesigner ? 'h-screen' : 'p-8 space-y-8 animate-fade-in bg-background dark:bg-background min-h-full'}>
      {!showDesigner && (
        <>
          <div>
            <div className="flex items-center gap-3 mb-3">
              <SubMenuHeader 
                title="Relatórios"
                onOpenSubmenu={() => openSubmenu("Relatórios")}
              />
              <h1 className="text-lg font-bold text-foreground">Modelos de Relatório</h1>
            </div>
            <p className="text-muted-foreground">
              Gerencie templates de relatórios profissionais com ReportBro Designer
            </p>
          </div>

          {/* Grupo 1: Modelos Personalizados */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">Modelos Personalizados</h2>
              <p className="text-sm text-muted-foreground">Configure modelos de relatório do zero</p>
            </div>
            <div className="grid gap-[1cm] md:grid-cols-3 lg:grid-cols-4">
              {/* Card: Criar Novo Modelo */}
              <Card 
                className="hover:shadow-lg transition-all cursor-pointer border-2 border-dashed border-primary/30 h-full flex flex-col"
                onClick={() => setShowNewDialog(true)}
              >
                <CardHeader className="flex-1 p-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Criar Novo Modelo</CardTitle>
                  <CardDescription>
                    Configure um novo modelo de relatório profissional com o designer ReportBro
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto p-4 pt-0">
                  <Button className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Modelo
                  </Button>
                </CardContent>
              </Card>

              {/* Cards dos Reports Existentes (exceto Modelo para Produtos Importados) */}
              {reports.filter(r => r.nome !== "Modelo para Produtos Importados").map((report) => (
                <Card
                  key={report.id}
                  className="hover:shadow-lg transition-all relative group h-full flex flex-col"
                >
                  <div className="absolute top-4 right-4 z-10">
                    <DropdownMenu open={openMenuId === report.id} onOpenChange={(open) => setOpenMenuId(open ? report.id : null)}>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          handleEdit(report);
                        }}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar Designer
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          handleOpenEdit(report);
                        }}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Renomear
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          handleGenerateReport(report, 'pdf');
                        }}>
                          <FileDown className="w-4 h-4 mr-2" />
                          Gerar PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          handleGenerateReport(report, 'xlsx');
                        }}>
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          Gerar XLS
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          handleDuplicate(report);
                        }}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                            handleDelete(report.id);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <CardHeader className="flex-1 p-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="pr-8">{report.nome}</CardTitle>
                    {report.descricao && (
                      <p className="text-sm text-muted-foreground mb-2">{report.descricao}</p>
                    )}
                    <CardDescription>
                      Criado {formatDistanceToNow(new Date(report.created_at), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto p-4 pt-0">
                    <Button 
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(report);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar Modelo
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Grupo 2: Modelos de Importação */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">Modelos de Importação</h2>
              <p className="text-sm text-muted-foreground">Modelos especiais para APIs de importação</p>
            </div>
            <div className="grid gap-[1cm] md:grid-cols-3 lg:grid-cols-4">
              {/* Card: Criar Modelo para Produtos Importados */}
              {reports.filter(r => r.nome === "Modelo para Produtos Importados").length === 0 ? (
                <Card 
                  className="hover:shadow-lg transition-all cursor-pointer border-2 border-dashed border-secondary/40 bg-secondary/5 h-full flex flex-col"
                  onClick={handleCreateImportProductsModel}
                >
                  <CardHeader className="flex-1 p-4">
                    <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center mb-4">
                      <FileText className="w-6 h-6 text-secondary-foreground" />
                    </div>
                    <CardTitle>Modelo para Produtos Importados</CardTitle>
                    <CardDescription>
                      Modelo único para visualizar qualquer API de importação de produtos
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto p-4 pt-0">
                    <Button variant="secondary" className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Modelo
                    </Button>
                  </CardContent>
                </Card>
              ) : null}

              {/* Cards dos Modelos de Importação Criados */}
              {reports.filter(r => r.nome === "Modelo para Produtos Importados").map((report) => (
                <Card
                  key={report.id}
                  className="hover:shadow-lg transition-all relative group h-full flex flex-col bg-secondary/5"
                >
                  <div className="absolute top-4 right-4 z-10">
                    <DropdownMenu open={openMenuId === report.id} onOpenChange={(open) => setOpenMenuId(open ? report.id : null)}>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          handleEdit(report);
                        }}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar Designer
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          handleOpenEdit(report);
                        }}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Renomear
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          handleGenerateReport(report, 'pdf');
                        }}>
                          <FileDown className="w-4 h-4 mr-2" />
                          Gerar PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          handleGenerateReport(report, 'xlsx');
                        }}>
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          Gerar XLS
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(null);
                          handleDuplicate(report);
                        }}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(null);
                            handleDelete(report.id);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <CardHeader className="flex-1 p-4">
                    <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center mb-4">
                      <FileText className="w-6 h-6 text-secondary-foreground" />
                    </div>
                    <CardTitle className="pr-8">{report.nome}</CardTitle>
                    {report.descricao && (
                      <p className="text-sm text-muted-foreground mb-2">{report.descricao}</p>
                    )}
                    <CardDescription>
                      Criado {formatDistanceToNow(new Date(report.created_at), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto p-4 pt-0">
                    <Button 
                      variant="secondary"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(report);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Editar Modelo
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Dialog de Novo Modelo */}
          <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Modelo de Relatório</DialogTitle>
                <DialogDescription>
                  Informe os dados do novo modelo
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Relatório de Vendas Mensal"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descrição detalhada do modelo..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate}>Criar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog de Editar Modelo */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Editar Modelo de Relatório</DialogTitle>
                <DialogDescription>
                  Atualize os dados do modelo
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-nome">Nome *</Label>
                  <Input
                    id="edit-nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Relatório de Vendas Mensal"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-descricao">Descrição</Label>
                  <Textarea
                    id="edit-descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descrição detalhada do modelo..."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setShowEditDialog(false);
                  setReportToEdit(null);
                  setFormData({ nome: "", descricao: "" });
                }}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdateReport}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog de Confirmação de Exclusão */}
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Confirmar Exclusão</DialogTitle>
                <DialogDescription>
                  Tem certeza que deseja excluir este modelo de relatório? Esta ação não pode ser desfeita.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setReportToDelete(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={confirmDelete}>
                  Excluir
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Designer em tela cheia */}
      {showDesigner && (
        <ReportBroDesigner
          reportId={currentReportId}
          onClose={handleCloseDesigner}
        />
      )}
    </div>
  );
}
