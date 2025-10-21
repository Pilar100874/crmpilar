import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Trash2, Plus, Eye, EyeOff, Play, Database, Server, Globe } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface APIEndpoint {
  id: string;
  name: string;
  description: string;
  database_type: string;
  sql_server: string;
  sql_database: string;
  sql_username: string;
  sql_password: string;
  query: string;
  http_method: string;
  endpoint_path: string;
  active: boolean;
  connection_id?: string;
}

export function APIGeneratorCRUD() {
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    database_type: "supabase",
    sql_server: "",
    sql_database: "",
    sql_username: "",
    sql_password: "",
    query: "",
    http_method: "GET",
    endpoint_path: "",
  });

  useEffect(() => {
    loadEndpoints();
  }, []);

  const loadEndpoints = async () => {
    try {
      const { data, error } = await supabase
        .from("api_endpoints")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEndpoints(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar endpoints: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateEndpointPath = () => {
    const random = Math.random().toString(36).substring(2, 10);
    return `api-${random}`;
  };

  const testQuery = async () => {
    if (!formData.query) {
      toast.error("Preencha a query SQL");
      return;
    }

    setTestLoading(true);
    setTestResult(null);

    try {
      const basicValidation = formData.query.trim().toLowerCase();
      
      if (!basicValidation.startsWith('select')) {
        throw new Error('Por segurança, apenas queries SELECT são permitidas');
      }
      
      if (basicValidation.includes('drop') || basicValidation.includes('delete') || 
          basicValidation.includes('truncate') || basicValidation.includes('alter')) {
        throw new Error('Queries de modificação não são permitidas');
      }

      if (formData.database_type === 'sqlserver') {
        if (!formData.sql_server || !formData.sql_database || 
            !formData.sql_username || !formData.sql_password) {
          throw new Error('Preencha todos os campos de conexão SQL Server');
        }
      }

      setTestResult({
        success: true,
        message: 'Query validada com sucesso! ✓',
        info: 'A query será executada quando a API for chamada.',
        query: formData.query,
        type: formData.database_type
      });
      toast.success("Query validada!");
    } catch (error: any) {
      toast.error("Erro: " + error.message);
      setTestResult({ error: error.message, success: false });
    } finally {
      setTestLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const endpointPath = formData.endpoint_path || generateEndpointPath();
      
      const { error } = await supabase.from("api_endpoints").insert([{
        name: formData.name,
        description: formData.description,
        database_type: formData.database_type,
        sql_server: formData.sql_server,
        sql_database: formData.sql_database,
        sql_username: formData.sql_username,
        sql_password: formData.sql_password,
        query: formData.query,
        http_method: formData.http_method,
        endpoint_path: endpointPath,
        parameters: [],
      }]);

      if (error) throw error;

      toast.success("Endpoint criado com sucesso!");
      setShowForm(false);
      setFormData({
        name: "",
        description: "",
        database_type: "supabase",
        sql_server: "",
        sql_database: "",
        sql_username: "",
        sql_password: "",
        query: "",
        http_method: "GET",
        endpoint_path: "",
      });
      setTestResult(null);
      loadEndpoints();
    } catch (error: any) {
      toast.error("Erro ao criar endpoint: " + error.message);
    }
  };

  const deleteEndpoint = async (id: string) => {
    if (!confirm("Deseja realmente excluir este endpoint?")) return;

    try {
      const { error } = await supabase
        .from("api_endpoints")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Endpoint excluído!");
      loadEndpoints();
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  };

  const toggleActive = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from("api_endpoints")
        .update({ active: !active })
        .eq("id", id);

      if (error) throw error;
      toast.success(active ? "Endpoint desativado" : "Endpoint ativado");
      loadEndpoints();
    } catch (error: any) {
      toast.error("Erro ao atualizar: " + error.message);
    }
  };

  const copyToClipboard = (endpoint: APIEndpoint) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const url = `https://${projectId}.supabase.co/functions/v1/execute-dynamic-query/${endpoint.endpoint_path}`;
    
    navigator.clipboard.writeText(url);
    toast.success("URL copiada para a área de transferência!");
  };

  if (loading) {
    return <div className="p-4">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">APIs Dinâmicas</h2>
          <p className="text-muted-foreground">Gerencie endpoints de API personalizados</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          {showForm ? "Voltar" : "Criar Nova API"}
        </Button>
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Criar Novo Endpoint</CardTitle>
            <CardDescription>Configure a conexão e a query SQL</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Endpoint</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Listar Clientes"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="database_type">Tipo de Banco</Label>
                  <Select
                    value={formData.database_type}
                    onValueChange={(value) => setFormData({ ...formData, database_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supabase">Supabase (Atual)</SelectItem>
                      <SelectItem value="sqlserver">SQL Server</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição do endpoint"
                />
              </div>

              {formData.database_type === 'sqlserver' && (
                <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
                  <div className="space-y-2">
                    <Label htmlFor="sql_server">Servidor SQL</Label>
                    <Input
                      id="sql_server"
                      required
                      value={formData.sql_server}
                      onChange={(e) => setFormData({ ...formData, sql_server: e.target.value })}
                      placeholder="Ex: servidor.database.windows.net"
                    />
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
              )}

              <div className="space-y-2">
                <Label htmlFor="query">Query SQL</Label>
                <Textarea
                  id="query"
                  required
                  value={formData.query}
                  onChange={(e) => setFormData({ ...formData, query: e.target.value })}
                  placeholder="SELECT * FROM tabela WHERE ..."
                  rows={5}
                  className="font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="http_method">Método HTTP</Label>
                  <Select
                    value={formData.http_method}
                    onValueChange={(value) => setFormData({ ...formData, http_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endpoint_path">Path do Endpoint (opcional)</Label>
                  <Input
                    id="endpoint_path"
                    value={formData.endpoint_path}
                    onChange={(e) => setFormData({ ...formData, endpoint_path: e.target.value })}
                    placeholder="Será gerado automaticamente"
                  />
                </div>
              </div>

              {testResult && (
                <Card className={testResult.success ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}>
                  <CardContent className="p-4">
                    <p className="font-semibold">{testResult.message || testResult.error}</p>
                    {testResult.info && <p className="text-sm text-muted-foreground mt-1">{testResult.info}</p>}
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={testQuery} disabled={testLoading} className="gap-2">
                  <Play className="h-4 w-4" />
                  {testLoading ? "Validando..." : "Validar Query"}
                </Button>
                <Button type="submit" className="flex-1">Criar Endpoint</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {endpoints.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum endpoint criado ainda</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {endpoints.map((endpoint) => (
                    <TableRow key={endpoint.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{endpoint.name}</div>
                          {endpoint.description && (
                            <div className="text-sm text-muted-foreground">{endpoint.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <Database className="h-3 w-3" />
                          {endpoint.database_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={endpoint.http_method === 'GET' ? 'secondary' : 'default'}>
                          {endpoint.http_method}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {endpoint.endpoint_path}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={endpoint.active}
                          onCheckedChange={() => toggleActive(endpoint.id, endpoint.active)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(endpoint)}
                            title="Copiar URL"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteEndpoint(endpoint.id)}
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

      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Resultado da Query</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {testResult && (
              <pre className="text-xs overflow-x-auto bg-secondary p-3 rounded">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}