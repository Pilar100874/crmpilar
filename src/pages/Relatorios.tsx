import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { StimulsoftDesignerComponent } from "@/components/stimulsoft/StimulsoftDesignerComponent";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Copy, FileText, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

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
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showDesigner, setShowDesigner] = useState(false);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
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
      
      // Abrir designer Stimulsoft inline
      setCurrentReportId(data.id);
      setShowDesigner(true);
    } catch (error: any) {
      toast.error("Erro ao criar relatório: " + error.message);
    }
  };

  const handleEdit = (report: Report) => {
    // Abrir designer Stimulsoft inline
    setCurrentReportId(report.id);
    setShowDesigner(true);
  };

  const handlePreview = (report: Report) => {
    // Salvar relatório no localStorage e navegar para o viewer
    if (report.layout_json && typeof report.layout_json === 'string') {
      localStorage.setItem('stimulsoft_preview_report', report.layout_json);
    } else if (report.layout_json) {
      localStorage.setItem('stimulsoft_preview_report', JSON.stringify(report.layout_json));
    }
    navigate('/stimulsoft-viewer');
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
    <>
      {showDesigner && (
        <StimulsoftDesignerComponent
          reportId={currentReportId}
          onClose={handleCloseDesigner}
        />
      )}
      
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Modelos de Relatório
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie templates de relatórios profissionais com Stimulsoft
          </p>
        </div>
        <Button onClick={() => setShowNewDialog(true)} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Novo Modelo
        </Button>
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.length === 0 ? (
          <div className="col-span-full text-center py-12 border-2 border-dashed rounded-lg">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Nenhum modelo de relatório cadastrado
            </p>
            <Button onClick={() => setShowNewDialog(true)} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Modelo
            </Button>
          </div>
        ) : (
          reports.map((report) => (
            <div
              key={report.id}
              className="group border rounded-lg p-6 hover:shadow-lg transition-all bg-card hover:border-primary/50"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                    {report.nome}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {report.descricao || "Sem descrição"}
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="text-xs text-muted-foreground">
                  Criado em {new Date(report.created_at).toLocaleDateString("pt-BR")}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEdit(report)}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePreview(report)}
                  title="Visualizar relatório"
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDuplicate(report)}
                  title="Duplicar modelo"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(report.id)}
                  title="Excluir modelo"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Dialog de Novo Modelo */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Modelo de Relatório</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Relatório de Vendas Mensal"
              />
            </div>
            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição detalhada do modelo..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNewDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate}>Criar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
