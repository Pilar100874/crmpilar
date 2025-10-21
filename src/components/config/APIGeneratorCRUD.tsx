import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Trash2, Plus, Eye, EyeOff, Play, Database, Globe, Edit, Link } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatabaseConnectionsCRUD } from "./DatabaseConnectionsCRUD";

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
  parameters: any[];
}

interface DatabaseConnection {
  id: string;
  name: string;
  database_type: string;
  sql_server: string;
  sql_database: string;
  sql_username: string;
  sql_password: string;
  sql_port: string;
  active: boolean;
}

interface QueryParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export function APIGeneratorCRUD() {
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([]);
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [showDocDialog, setShowDocDialog] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null);
  const [parameters, setParameters] = useState<QueryParameter[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testEndpoint, setTestEndpoint] = useState<APIEndpoint | null>(null);
  const [testParams, setTestParams] = useState<Record<string, string>>({});
  const [testViewMode, setTestViewMode] = useState<'table' | 'json'>('table');
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    database_type: "supabase",
    connection_id: "",
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
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const { data, error } = await supabase
        .from("database_connections")
        .select("*")
        .eq("active", true)
        .order("name");

      if (error) throw error;
      setConnections(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar conexões:", error);
    }
  };

  const loadEndpoints = async () => {
    try {
      const { data, error } = await supabase
        .from("api_endpoints")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const endpoints = (data || []).map(endpoint => ({
        ...endpoint,
        parameters: Array.isArray(endpoint.parameters) ? endpoint.parameters : []
      }));
      
      setEndpoints(endpoints);
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

      if (formData.database_type === 'sqlserver' && !formData.connection_id) {
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

  const addParameter = () => {
    setParameters([...parameters, { name: "", type: "string", required: true, description: "" }]);
  };

  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const updateParameter = (index: number, field: keyof QueryParameter, value: any) => {
    const newParams = [...parameters];
    newParams[index] = { ...newParams[index], [field]: value };
    setParameters(newParams);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const endpointPath = formData.endpoint_path || generateEndpointPath();
      
      let endpointData: any = {
        name: formData.name,
        description: formData.description,
        database_type: formData.database_type,
        query: formData.query,
        http_method: formData.http_method,
        endpoint_path: endpointPath,
        parameters: parameters,
      };

      if (formData.connection_id) {
        endpointData.connection_id = formData.connection_id;
      } else if (formData.database_type === 'sqlserver') {
        endpointData.sql_server = formData.sql_server;
        endpointData.sql_database = formData.sql_database;
        endpointData.sql_username = formData.sql_username;
        endpointData.sql_password = formData.sql_password;
      }

      if (editingId) {
        const { error } = await supabase
          .from("api_endpoints")
          .update(endpointData)
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Endpoint atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("api_endpoints").insert([endpointData]);
        if (error) throw error;
        toast.success("Endpoint criado com sucesso!");
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: "",
        description: "",
        database_type: "supabase",
        connection_id: "",
        sql_server: "",
        sql_database: "",
        sql_username: "",
        sql_password: "",
        query: "",
        http_method: "GET",
        endpoint_path: "",
      });
      setParameters([]);
      setTestResult(null);
      loadEndpoints();
    } catch (error: any) {
      toast.error("Erro ao salvar endpoint: " + error.message);
    }
  };

  const editEndpoint = (endpoint: APIEndpoint) => {
    setFormData({
      name: endpoint.name,
      description: endpoint.description || "",
      database_type: endpoint.database_type,
      connection_id: endpoint.connection_id || "",
      sql_server: endpoint.sql_server || "",
      sql_database: endpoint.sql_database || "",
      sql_username: endpoint.sql_username || "",
      sql_password: endpoint.sql_password || "",
      query: endpoint.query,
      http_method: endpoint.http_method,
      endpoint_path: endpoint.endpoint_path,
    });
    setParameters(endpoint.parameters || []);
    setEditingId(endpoint.id);
    setShowForm(true);
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

  const getFullUrl = (endpoint: APIEndpoint, includeParams: boolean = false) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    let url = `https://${projectId}.supabase.co/functions/v1/execute-dynamic-query/${endpoint.endpoint_path}`;
    
    if (includeParams && endpoint.parameters && endpoint.parameters.length > 0) {
      const params = endpoint.parameters.map(p => `${p.name}=XXXX`).join('&');
      url += `?${params}`;
    }
    
    return url;
  };

  const copyToClipboard = (endpoint: APIEndpoint) => {
    const url = getFullUrl(endpoint, true);
    navigator.clipboard.writeText(url);
    toast.success("URL copiada para a área de transferência!");
  };

  const openTestDialog = (endpoint: APIEndpoint) => {
    setTestEndpoint(endpoint);
    setTestResult(null);
    const initialParams: Record<string, string> = {};
    endpoint.parameters?.forEach(p => {
      initialParams[p.name] = '';
    });
    setTestParams(initialParams);
    setTestDialogOpen(true);
  };

  const executeTest = async () => {
    if (!testEndpoint) return;
    
    setTestLoading(true);
    try {
      let url = getFullUrl(testEndpoint, false);
      
      if (testEndpoint.http_method === 'GET' && testEndpoint.parameters?.length > 0) {
        const params = new URLSearchParams(testParams).toString();
        url += `?${params}`;
      }

      const options: RequestInit = {
        method: testEndpoint.http_method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (testEndpoint.http_method === 'POST') {
        options.body = JSON.stringify(testParams);
      }

      const response = await fetch(url, options);
      const result = await response.json();
      setTestResult(result);
      
      if (result.success) {
        toast.success("API executada com sucesso!");
      } else {
        toast.error("Erro ao executar API");
      }
    } catch (error: any) {
      toast.error("Erro ao executar API: " + error.message);
      setTestResult({ error: error.message });
    } finally {
      setTestLoading(false);
    }
  };

  const renderUrlWithParams = (endpoint: APIEndpoint) => {
    const hasParams = endpoint.parameters && endpoint.parameters.length > 0;
    const fullUrl = getFullUrl(endpoint, hasParams);
    
    return (
      <div className="p-2 bg-muted/50 rounded font-mono text-xs break-all">
        {fullUrl}
      </div>
    );
  };

  const showDocumentation = (endpoint: APIEndpoint) => {
    setSelectedEndpoint(endpoint);
    setShowDocDialog(true);
  };

  if (loading) {
    return <div className="p-4">Carregando...</div>;
  }

  return (
    <Tabs defaultValue="apis" className="space-y-6">
      <TabsList>
        <TabsTrigger value="apis">APIs</TabsTrigger>
        <TabsTrigger value="connections">Conexões de Banco</TabsTrigger>
      </TabsList>

      <TabsContent value="apis" className="space-y-6">
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
              <CardTitle>{editingId ? "Editar Endpoint" : "Criar Novo Endpoint"}</CardTitle>
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
                      onValueChange={(value) => setFormData({ ...formData, database_type: value, connection_id: "" })}
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

                {formData.database_type === 'sqlserver' && (
                  <div className="space-y-2">
                    <Label htmlFor="connection_id">Usar Conexão Salva (Opcional)</Label>
                    <Select
                      value={formData.connection_id || "none"}
                      onValueChange={(value) => setFormData({ ...formData, connection_id: value === "none" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma conexão ou preencha manualmente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nova conexão (preencher abaixo)</SelectItem>
                        {connections
                          .filter(c => c.database_type === formData.database_type)
                          .map(conn => (
                            <SelectItem key={conn.id} value={conn.id}>
                              {conn.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição do endpoint"
                  />
                </div>

                {formData.database_type === 'sqlserver' && !formData.connection_id && (
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
                    placeholder="SELECT * FROM tabela WHERE campo = {{parametro}}"
                    rows={5}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.database_type === 'supabase' && 'Use $1, $2, $3, etc. na query para adicionar parâmetros (Ex: WHERE id = $1)'}
                    {formData.database_type === 'sqlserver' && 'Use @nome_parametro na query (Ex: WHERE id = @id)'}
                    {formData.database_type === 'postgresql' && 'Use $1, $2, $3, etc. na query para adicionar parâmetros (Ex: WHERE id = $1)'}
                    {formData.database_type === 'mysql' && 'Use ? na query para adicionar parâmetros (Ex: WHERE id = ?)'}
                    {formData.database_type === 'oracle' && 'Use :nome_parametro na query (Ex: WHERE id = :id)'}
                    {formData.database_type === 'mariadb' && 'Use ? na query para adicionar parâmetros (Ex: WHERE id = ?)'}
                    {formData.database_type === 'sqlite' && 'Use ? na query para adicionar parâmetros (Ex: WHERE id = ?)'}
                    {formData.database_type === 'firebird' && 'Use :nome_parametro na query (Ex: WHERE id = :id)'}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Parâmetros da Query</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addParameter}>
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Parâmetro
                    </Button>
                  </div>
                  {parameters.length > 0 && (
                    <div className="space-y-2 border rounded-lg p-3">
                      {parameters.map((param, index) => (
                        <div key={index} className="flex flex-col sm:grid sm:grid-cols-12 gap-2">
                          <div className="sm:col-span-3">
                            <Input
                              placeholder="Nome"
                              value={param.name}
                              onChange={(e) => updateParameter(index, "name", e.target.value)}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Select
                              value={param.type}
                              onValueChange={(value) => updateParameter(index, "type", value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="string">String</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="boolean">Boolean</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="sm:col-span-4">
                            <Input
                              placeholder="Descrição"
                              value={param.description}
                              onChange={(e) => updateParameter(index, "description", e.target.value)}
                            />
                          </div>
                          <div className="sm:col-span-2 flex items-center gap-2">
                            <Label className="text-xs whitespace-nowrap">Obrigatório</Label>
                            <input
                              type="checkbox"
                              checked={param.required}
                              onChange={(e) => updateParameter(index, "required", e.target.checked)}
                            />
                          </div>
                          <div className="sm:col-span-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeParameter(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                      disabled={!!editingId}
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
                  <Button type="submit" className="flex-1">
                    {editingId ? "Atualizar Endpoint" : "Criar Endpoint"}
                  </Button>
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
              <div className="space-y-4">
                {endpoints.map((endpoint) => (
                  <Card key={endpoint.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold break-words">{endpoint.name}</h3>
                          {endpoint.description && (
                            <p className="text-sm text-muted-foreground break-words">{endpoint.description}</p>
                          )}
                        </div>
                        <Switch
                          checked={endpoint.active}
                          onCheckedChange={() => toggleActive(endpoint.id, endpoint.active)}
                        />
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="gap-1">
                          <Database className="h-3 w-3" />
                          {endpoint.database_type}
                        </Badge>
                        <Badge variant={endpoint.http_method === 'GET' ? 'secondary' : 'default'}>
                          {endpoint.http_method}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold">Endpoint:</Label>
                        {renderUrlWithParams(endpoint)}
                      </div>

                      <div className="flex flex-wrap gap-1 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openTestDialog(endpoint)}
                          className="gap-1"
                        >
                          <Play className="h-3 w-3" />
                          Testar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => editEndpoint(endpoint)}
                          className="gap-1"
                        >
                          <Edit className="h-3 w-3" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(endpoint)}
                          className="gap-1"
                        >
                          <Copy className="h-3 w-3" />
                          Copiar
                        </Button>
                        {endpoint.parameters?.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => showDocumentation(endpoint)}
                            className="gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            Docs
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteEndpoint(endpoint.id)}
                          className="gap-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Documentation Dialog */}
        <Dialog open={showDocDialog} onOpenChange={setShowDocDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Documentação da API</DialogTitle>
              <DialogDescription>
                {selectedEndpoint?.name}
              </DialogDescription>
            </DialogHeader>
            {selectedEndpoint && (
              <div className="space-y-4">
                <div>
                  <Label>URL do Endpoint</Label>
                  <div className="p-3 bg-muted rounded-md font-mono text-xs mt-2 break-all">
                    {getFullUrl(selectedEndpoint, selectedEndpoint.parameters?.length > 0)}
                  </div>
                </div>
                <div>
                  <Label>Método HTTP</Label>
                  <div className="mt-2">
                    <Badge>{selectedEndpoint.http_method}</Badge>
                  </div>
                </div>
                {selectedEndpoint.parameters && selectedEndpoint.parameters.length > 0 && (
                  <div>
                    <Label>Parâmetros</Label>
                    <div className="mt-2 space-y-2">
                      {selectedEndpoint.parameters.map((param: QueryParameter, idx: number) => (
                        <div key={idx} className="p-3 border rounded-md">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <code className="text-sm font-mono break-all">{param.name}</code>
                            <Badge variant="secondary">{param.type}</Badge>
                            {param.required && <Badge variant="destructive">Obrigatório</Badge>}
                          </div>
                          {param.description && (
                            <p className="text-sm text-muted-foreground break-words">{param.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <Label>Query SQL</Label>
                  <Textarea
                    value={selectedEndpoint.query}
                    readOnly
                    className="font-mono text-sm mt-2"
                    rows={5}
                  />
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Test API Dialog */}
        <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Testar API - {testEndpoint?.name}</DialogTitle>
            </DialogHeader>
            
            {testEndpoint && (
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-md font-mono text-xs break-all">
                  {getFullUrl(testEndpoint, testEndpoint.parameters?.length > 0)}
                </div>

                {testEndpoint.parameters && testEndpoint.parameters.length > 0 && (
                  <div className="space-y-3">
                    <Label className="font-semibold">Parâmetros</Label>
                    {testEndpoint.parameters.map((param) => (
                      <div key={param.name} className="space-y-1">
                        <Label className="text-sm">
                          {param.name}
                          {param.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        <Input
                          value={testParams[param.name] || ''}
                          onChange={(e) => setTestParams(prev => ({
                            ...prev,
                            [param.name]: e.target.value
                          }))}
                          placeholder={param.description || param.name}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={executeTest} disabled={testLoading}>
                    {testLoading ? "Executando..." : "Executar"}
                  </Button>
                  {testResult && (
                    <div className="flex gap-1">
                      <Button
                        variant={testViewMode === 'table' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTestViewMode('table')}
                      >
                        Tabela
                      </Button>
                      <Button
                        variant={testViewMode === 'json' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTestViewMode('json')}
                      >
                        JSON
                      </Button>
                    </div>
                  )}
                </div>

                {testResult && (
                  <div className="space-y-2">
                    <Label className="font-semibold">Resultado</Label>
                    {testViewMode === 'json' ? (
                      <pre className="p-4 bg-muted rounded-md text-xs overflow-auto max-h-96">
                        {JSON.stringify(testResult, null, 2)}
                      </pre>
                    ) : (
                      <div className="border rounded-md overflow-auto max-h-96">
                        {testResult.success && Array.isArray(testResult.data) && testResult.data.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {Object.keys(testResult.data[0]).map((key) => (
                                  <TableHead key={key}>{key}</TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {testResult.data.map((row: any, idx: number) => (
                                <TableRow key={idx}>
                                  {Object.values(row).map((value: any, vidx: number) => (
                                    <TableCell key={vidx}>{String(value)}</TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="p-4 text-sm text-muted-foreground">
                            {testResult.error ? `Erro: ${testResult.error}` : 'Nenhum dado retornado'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </TabsContent>

      <TabsContent value="connections">
        <DatabaseConnectionsCRUD />
      </TabsContent>
    </Tabs>
  );
}