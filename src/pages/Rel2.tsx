import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast-config";
import { Plus, Edit, Trash2, Eye, Copy, FileText } from "lucide-react";
import { JSReportDesigner } from "@/components/jsreport/JSReportDesigner";

interface Report {
  id: string;
  nome: string;
  descricao: string | null;
  template: any;
  database_connection_id: string | null;
  estabelecimento_id: string;
  created_at: string;
  updated_at: string;
}

interface DatabaseConnection {
  id: string;
  nome: string;
}

export default function Rel2() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDesigner, setShowDesigner] = useState(false);
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [newReportName, setNewReportName] = useState("");
  const [newReportDescription, setNewReportDescription] = useState("");
  const [databaseConnections, setDatabaseConnections] = useState<DatabaseConnection[]>([]);
  const [selectedDbConnection, setSelectedDbConnection] = useState<string>("");

  useEffect(() => {
    loadReports();
    loadDatabaseConnections();
  }, []);

  const loadDatabaseConnections = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Try to get from usuarios first
      const { data: userData } = await supabase
        .from('usuarios')
        .select('estabelecimento_id')
        .eq('id', user.id)
        .maybeSingle();

      let estabelecimentoId = userData?.estabelecimento_id;

      // If not found, user might be selecting from localStorage
      if (!estabelecimentoId) {
        estabelecimentoId = localStorage.getItem('selected_estabelecimento_id');
      }

      if (!estabelecimentoId) return;

      const { data, error } = await supabase
        .from('database_connections')
        .select('id, name')
        .eq('estabelecimento_id', estabelecimentoId);

      if (error) throw error;
      setDatabaseConnections(data?.map(d => ({ id: d.id, nome: d.name })) || []);
    } catch (error) {
      console.error('Erro ao carregar conexões:', error);
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Try to get from usuarios first
      const { data: userData } = await supabase
        .from('usuarios')
        .select('estabelecimento_id')
        .eq('id', user.id)
        .maybeSingle();

      let estabelecimentoId = userData?.estabelecimento_id;

      // If not found, user might be selecting from localStorage
      if (!estabelecimentoId) {
        estabelecimentoId = localStorage.getItem('selected_estabelecimento_id');
      }

      if (!estabelecimentoId) return;

      const { data, error } = await supabase
        .from('report_templates_jsreport')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
      toast.error('Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newReportName.trim()) {
      toast.error('Digite um nome para o relatório');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar usuário na tabela usuarios
      const { data: userData } = await supabase
        .from('usuarios')
        .select('id, estabelecimento_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      
      let isAdmin = false;
      
      if (userData) {
        // Verificar se tem role admin
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userData.id)
          .eq('role', 'admin')
          .maybeSingle();
        
        isAdmin = !!roleData;
      }

      let estabelecimentoId = userData?.estabelecimento_id;

      // If not found, try localStorage
      if (!estabelecimentoId) {
        estabelecimentoId = localStorage.getItem('selected_estabelecimento_id');
      }

      // If still not found and not admin, show error
      if (!estabelecimentoId && !isAdmin) {
        toast.error('Estabelecimento não encontrado');
        return;
      }

      const { data, error } = await supabase
        .from('report_templates_jsreport')
        .insert({
          nome: newReportName,
          descricao: newReportDescription,
          template: {
            content: '',
            engine: 'handlebars',
            recipe: 'chrome-pdf'
          },
          database_connection_id: selectedDbConnection || null,
          estabelecimento_id: estabelecimentoId || null
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Relatório criado com sucesso');
      setShowCreateDialog(false);
      setNewReportName('');
      setNewReportDescription('');
      setSelectedDbConnection('');
      
      setCurrentReport(data);
      setShowDesigner(true);
    } catch (error) {
      console.error('Erro ao criar relatório:', error);
      toast.error('Erro ao criar relatório');
    }
  };

  const handleEdit = (report: Report) => {
    setCurrentReport(report);
    setShowDesigner(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este relatório?')) return;

    try {
      const { error } = await supabase
        .from('report_templates_jsreport')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Relatório excluído com sucesso');
      loadReports();
    } catch (error) {
      console.error('Erro ao excluir relatório:', error);
      toast.error('Erro ao excluir relatório');
    }
  };

  const handleDuplicate = async (report: Report) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Try to get from usuarios first
      const { data: userData } = await supabase
        .from('usuarios')
        .select('estabelecimento_id')
        .eq('id', user.id)
        .maybeSingle();

      let estabelecimentoId = userData?.estabelecimento_id;

      // If not found, user might be selecting from localStorage
      if (!estabelecimentoId) {
        estabelecimentoId = localStorage.getItem('selected_estabelecimento_id');
      }

      if (!estabelecimentoId) return;

      const { error } = await supabase
        .from('report_templates_jsreport')
        .insert({
          nome: `${report.nome} (Cópia)`,
          descricao: report.descricao,
          template: report.template,
          database_connection_id: report.database_connection_id,
          estabelecimento_id: estabelecimentoId
        });

      if (error) throw error;

      toast.success('Relatório duplicado com sucesso');
      loadReports();
    } catch (error) {
      console.error('Erro ao duplicar relatório:', error);
      toast.error('Erro ao duplicar relatório');
    }
  };

  const handleCloseDesigner = () => {
    setShowDesigner(false);
    setCurrentReport(null);
    loadReports();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Carregando relatórios...</p>
      </div>
    );
  }

  if (showDesigner && currentReport) {
    return (
      <JSReportDesigner
        report={currentReport}
        onClose={handleCloseDesigner}
      />
    );
  }

  return (
    <div className="p-8 bg-background min-h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Rel2 - JSReport</h1>
          <p className="text-muted-foreground mt-2">
            Gerador de relatórios avançado com JSReport
          </p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Relatório
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Relatório</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={newReportName}
                  onChange={(e) => setNewReportName(e.target.value)}
                  placeholder="Digite o nome do relatório"
                />
              </div>
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={newReportDescription}
                  onChange={(e) => setNewReportDescription(e.target.value)}
                  placeholder="Digite uma descrição (opcional)"
                />
              </div>
              {databaseConnections.length > 0 && (
                <div>
                  <Label htmlFor="db-connection">Conexão de Banco de Dados</Label>
                  <select
                    id="db-connection"
                    value={selectedDbConnection}
                    onChange={(e) => setSelectedDbConnection(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">Selecione uma conexão (opcional)</option>
                    {databaseConnections.map((conn) => (
                      <option key={conn.id} value={conn.id}>
                        {conn.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate}>Criar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {report.nome}
              </CardTitle>
              {report.descricao && (
                <CardDescription>{report.descricao}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(report)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDuplicate(report)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(report.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {reports.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Nenhum relatório criado ainda. Clique em "Novo Relatório" para começar.
          </p>
        </div>
      )}
    </div>
  );
}
