import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Plus, Eye, EyeOff, Database, Edit } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

interface DatabaseConnection {
  id: string;
  name: string;
  description: string;
  database_type: string;
  sql_server: string;
  sql_database: string;
  sql_username: string;
  sql_password: string;
  sql_port: string;
  proxy_url?: string;
  active: boolean;
}

interface DatabaseConnectionsCRUDProps {
  estabelecimentoId?: string;
  onConnectionsChange?: () => void;
}

export function DatabaseConnectionsCRUD({ estabelecimentoId, onConnectionsChange }: DatabaseConnectionsCRUDProps = {}) {
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    database_type: "sqlserver",
    sql_server: "",
    sql_database: "",
    sql_username: "",
    sql_password: "",
    sql_port: "1433",
    proxy_url: "",
  });

  useEffect(() => {
    loadConnections();
  }, [estabelecimentoId]);

  const loadConnections = async () => {
    try {
      let query = supabase
        .from("database_connections")
        .select("*");

      if (estabelecimentoId) {
        query = query.eq("estabelecimento_id", estabelecimentoId);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      setConnections(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar conexões: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingId) {
        const { error } = await supabase
          .from("database_connections")
          .update(formData)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Conexão atualizada com sucesso!");
      } else {
        const estabId = await getEstabelecimentoId(estabelecimentoId);
        if (!estabId) {
          toast.error("Estabelecimento não identificado");
          return;
        }

        const { error } = await supabase
          .from("database_connections")
          .insert([{ ...formData, estabelecimento_id: estabId }]);
        
        if (error) throw error;
        toast.success("Conexão criada com sucesso!");
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: "",
        description: "",
        database_type: "sqlserver",
        sql_server: "",
        sql_database: "",
        sql_username: "",
        sql_password: "",
        sql_port: "1433",
        proxy_url: "",
      });
      loadConnections();
      onConnectionsChange?.();
    } catch (error: any) {
      toast.error("Erro ao salvar conexão: " + error.message);
    }
  };

  const editConnection = (conn: DatabaseConnection) => {
    setFormData({
      name: conn.name,
      description: conn.description || "",
      database_type: conn.database_type,
      sql_server: conn.sql_server,
      sql_database: conn.sql_database,
      sql_username: conn.sql_username,
      sql_password: conn.sql_password,
      sql_port: conn.sql_port,
      proxy_url: conn.proxy_url || "",
    });
    setEditingId(conn.id);
    setShowForm(true);
  };

  const deleteConnection = async (id: string) => {
    // Check if connection is being used
    const { data: apisUsingConnection } = await supabase
      .from("api_endpoints")
      .select("id, name")
      .eq("connection_id", id);

    if (apisUsingConnection && apisUsingConnection.length > 0) {
      toast.error(
        `Esta conexão está sendo usada por ${apisUsingConnection.length} API(s). Modifique as APIs primeiro.`
      );
      return;
    }

    setConnectionToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteConnection = async () => {
    if (!connectionToDelete) return;

    try {
      const { error } = await supabase
        .from("database_connections")
        .delete()
        .eq("id", connectionToDelete);

      if (error) throw error;
      toast.success("Conexão excluída!");
      loadConnections();
      onConnectionsChange?.();
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    } finally {
      setDeleteConfirmOpen(false);
      setConnectionToDelete(null);
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from("database_connections")
        .update({ active: !active })
        .eq("id", id);

      if (error) throw error;
      toast.success(active ? "Conexão desativada" : "Conexão ativada");
      loadConnections();
      onConnectionsChange?.();
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    }
  };

  if (loading) {
    return <div className="p-4">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Conexões de Banco de Dados</h2>
          <p className="text-muted-foreground">Gerencie conexões reutilizáveis para seus endpoints</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          {showForm ? "Voltar" : "Nova Conexão"}
        </Button>
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Editar Conexão" : "Nova Conexão"}</CardTitle>
            <CardDescription>Configure os dados de acesso ao banco de dados</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Conexão</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: SQL Server Produção"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="database_type">Tipo de Banco</Label>
                  <Select
                    value={formData.database_type}
                    onValueChange={(value) => {
                      const defaultPorts: Record<string, string> = {
                        sqlserver: '1433',
                        postgresql: '5432',
                        mysql: '3306',
                        oracle: '1521',
                        mariadb: '3306',
                        firebird: '3050',
                        sqlite: ''
                      };
                      setFormData({ 
                        ...formData, 
                        database_type: value,
                        sql_port: defaultPorts[value] || '1433'
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sqlserver">SQL Server</SelectItem>
                      <SelectItem value="postgresql">PostgreSQL</SelectItem>
                      <SelectItem value="mysql">MySQL</SelectItem>
                      <SelectItem value="oracle">Oracle</SelectItem>
                      <SelectItem value="mariadb">MariaDB</SelectItem>
                      <SelectItem value="firebird">Firebird</SelectItem>
                      <SelectItem value="sqlite">SQLite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição da conexão"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sql_server">Servidor</Label>
                  <Input
                    id="sql_server"
                    required
                    value={formData.sql_server}
                    onChange={(e) => setFormData({ ...formData, sql_server: e.target.value })}
                    placeholder="servidor.database.windows.net"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sql_port">Porta</Label>
                  <Input
                    id="sql_port"
                    required={formData.database_type !== 'sqlite'}
                    disabled={formData.database_type === 'sqlite'}
                    value={formData.sql_port}
                    onChange={(e) => setFormData({ ...formData, sql_port: e.target.value })}
                    placeholder={
                      formData.database_type === 'sqlserver' ? '1433' :
                      formData.database_type === 'postgresql' ? '5432' :
                      formData.database_type === 'mysql' ? '3306' :
                      formData.database_type === 'oracle' ? '1521' :
                      formData.database_type === 'mariadb' ? '3306' :
                      formData.database_type === 'firebird' ? '3050' :
                      'N/A'
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sql_database">Database</Label>
                <Input
                  id="sql_database"
                  required
                  value={formData.sql_database}
                  onChange={(e) => setFormData({ ...formData, sql_database: e.target.value })}
                  placeholder="Nome do banco"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sql_username">Usuário</Label>
                  <Input
                    id="sql_username"
                    required
                    value={formData.sql_username}
                    onChange={(e) => setFormData({ ...formData, sql_username: e.target.value })}
                    placeholder="Usuário do banco"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sql_password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="sql_password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.sql_password}
                      onChange={(e) => setFormData({ ...formData, sql_password: e.target.value })}
                      placeholder="Senha"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {formData.database_type === 'sqlserver' && (
                <div className="space-y-2">
                  <Label htmlFor="proxy_url">URL do Servidor Proxy (Opcional)</Label>
                  <Input
                    id="proxy_url"
                    value={formData.proxy_url}
                    onChange={(e) => setFormData({ ...formData, proxy_url: e.target.value })}
                    placeholder="https://seu-proxy.railway.app"
                  />
                  <p className="text-xs text-muted-foreground">
                    Necessário apenas para conexões SQL Server via proxy externo
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full">
                {editingId ? "Atualizar Conexão" : "Criar Conexão"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {connections.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma conexão cadastrada</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Servidor</TableHead>
                    <TableHead>Database</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {connections.map((conn) => (
                    <TableRow key={conn.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{conn.name}</div>
                          {conn.description && (
                            <div className="text-sm text-muted-foreground">{conn.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{conn.database_type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{conn.sql_server}</TableCell>
                      <TableCell className="text-sm">{conn.sql_database}</TableCell>
                      <TableCell>
                        <Switch
                          checked={conn.active}
                          onCheckedChange={() => toggleActive(conn.id, conn.active)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => editConnection(conn)}
                            title="Editar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteConnection(conn.id)}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      )}

      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDeleteConnection}
        title="Confirmar exclusão"
        description="Tem certeza que deseja excluir esta conexão? Esta ação não pode ser desfeita."
      />
    </div>
  );
}
