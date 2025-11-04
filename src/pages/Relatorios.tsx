import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [reports, setReports] = useState<Report[]>([]);
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    conexao_id: "",
  });

  useEffect(() => {
    loadReports();
    loadConnections();
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

  const loadConnections = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      const { data, error } = await supabase
        .from("database_connections")
        .select("id, name, database_type")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("active", true);

      if (error) throw error;
      setConnections(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar conexões: " + error.message);
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
          conexao_id: formData.conexao_id || null,
          layout_json: {},
          query_sql: "",
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success("Relatório criado com sucesso");
      setShowNewDialog(false);
      setFormData({ nome: "", descricao: "", conexao_id: "" });
      loadReports();
    } catch (error: any) {
      toast.error("Erro ao criar relatório: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este relatório?")) return;

    try {
      const { error } = await supabase
        .from("relatorios")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Relatório excluído com sucesso");
      loadReports();
    } catch (error: any) {
      toast.error("Erro ao excluir relatório: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">
            Crie e gerencie relatórios personalizados - Sistema em desenvolvimento
          </p>
        </div>
        <Button onClick={() => setShowNewDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Relatório
        </Button>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Conexão</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhum relatório cadastrado
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report) => {
                const connection = connections.find(c => c.id === report.conexao_id);
                return (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.nome}</TableCell>
                    <TableCell>{report.descricao}</TableCell>
                    <TableCell>
                      {connection ? `${connection.name} (${connection.database_type})` : "-"}
                    </TableCell>
                    <TableCell>
                      {new Date(report.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toast.info("Editor em desenvolvimento")}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(report.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de Novo Relatório */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Relatório</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do relatório"
              />
            </div>
            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição do relatório"
              />
            </div>
            <div>
              <Label htmlFor="conexao">Conexão de Banco de Dados</Label>
              <Select
                value={formData.conexao_id}
                onValueChange={(value) => setFormData({ ...formData, conexao_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conexão" />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      {conn.name} ({conn.database_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
  );
}
