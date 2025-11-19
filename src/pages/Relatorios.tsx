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
import { Plus, FileText, Eye, Copy, Trash2, MoreVertical, Edit, Pencil } from "lucide-react";
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
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [reportToEdit, setReportToEdit] = useState<Report | null>(null);
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
      const { data, error } = await supabase
        .from("relatorios")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("created_at", { ascending: false });

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

  const handleEdit = (report: Report) => {
    // Abrir designer ReportBro
    setCurrentReportId(report.id);
    setShowDesigner(true);
  };

  const handlePreview = (report: Report) => {
    // Salvar relatório no localStorage e abrir visualização ReportBro
    if (!report.layout_json) {
      toast.error('Relatório sem layout definido');
      return;
    }
    
    try {
      const layoutJsonObj = typeof report.layout_json === 'string' 
        ? JSON.parse(report.layout_json)
        : report.layout_json;
      
      const layoutStr = JSON.stringify(layoutJsonObj);
      
      // Salva no localStorage
      localStorage.setItem('reportbro_preview', layoutStr);
      
      // Abre nova aba
      const newWindow = window.open('/relatorios/viewer', '_blank');
      
      if (!newWindow) {
        toast.error('Permita pop-ups para visualizar o relatório');
        return;
      }
      
      toast.success('Abrindo visualização...');
    } catch (error) {
      console.error('Erro ao visualizar:', error);
      toast.error(`Erro ao abrir visualização: ${error}`);
    }
  };


  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este modelo de relatório?")) return;

    try {
      const { error } = await supabase
        .from("relatorios")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Modelo excluído com sucesso");
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

  const handleCloseDesigner = () => {
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
    <div className={showDesigner ? 'h-screen' : 'p-8 space-y-8 animate-fade-in bg-white min-h-full'}>
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

          {/* Seção: Criar Novos Modelos */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">Criar Novos Modelos</h2>
              <p className="text-sm text-muted-foreground">Crie novos modelos de relatório personalizados</p>
            </div>
            <div className="grid gap-[1cm] md:grid-cols-3 lg:grid-cols-4">
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

              {/* Card de Modelo para Produtos Importados */}
              <Card 
                className="hover:shadow-lg transition-all cursor-pointer border-2 border-dashed border-accent/30 h-full flex flex-col"
                onClick={async () => {
                  // Verificar se já existe um modelo para produtos importados
                  const estabelecimentoId = await getEstabelecimentoId();
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
                  } else {
                    setFormData({ 
                      nome: "Modelo para Produtos Importados", 
                      descricao: "Modelo único para visualização de produtos importados" 
                    });
                    await handleCreate();
                  }
                }}
              >
                <CardHeader className="flex-1 p-4">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                    <FileText className="w-6 h-6 text-accent" />
                  </div>
                  <CardTitle>Modelo para Produtos Importados</CardTitle>
                  <CardDescription>
                    Modelo único para visualizar qualquer API de importação de produtos
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto p-4 pt-0">
                  <Button variant="secondary" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar/Editar Modelo
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Seção: Modelos Personalizados */}
          {reports.length > 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">Modelos Personalizados</h2>
                <p className="text-sm text-muted-foreground">Seus modelos de relatório criados</p>
              </div>
              <div className="grid gap-[1cm] md:grid-cols-3 lg:grid-cols-4">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="animate-pulse h-full">
                      <CardHeader>
                        <div className="w-12 h-12 rounded-lg bg-muted mb-4"></div>
                        <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-muted rounded w-full"></div>
                      </CardHeader>
                    </Card>
                  ))
                ) : (
                  reports.map((report) => (
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
                          handlePreview(report);
                        }}>
                          <Eye className="w-4 h-4 mr-2" />
                          Visualizar
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
                ))
              )}
            </div>
          </div>
          )}

          {!loading && reports.length === 0 && (
            <div className="text-center py-8 mt-8 border-t border-border">
              <div className="w-20 h-20 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
                <FileText className="w-10 h-10 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                Você ainda não tem modelos personalizados criados.
              </p>
            </div>
          )}

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
