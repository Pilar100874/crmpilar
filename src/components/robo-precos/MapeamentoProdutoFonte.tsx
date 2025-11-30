import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Pencil, Trash2, Search, Link2, Loader2 } from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimento";

interface Mapeamento {
  id: string;
  produto_id: string;
  fonte_id: string;
  termo_busca: string | null;
  termo_busca_alternativo: string | null;
  url_direta: string | null;
  chave_correspondencia: string | null;
  ativo: boolean;
  produto?: { id: string; nome: string; codigo: string; ean_13: string };
  fonte?: { id: string; nome_fonte: string; tipo: string };
}

export function MapeamentoProdutoFonte() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingMap, setEditingMap] = useState<Mapeamento | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    produto_id: "",
    fonte_id: "",
    termo_busca: "",
    termo_busca_alternativo: "",
    url_direta: "",
    chave_correspondencia: "",
    ativo: true
  });

  const { data: mapeamentos, isLoading } = useQuery({
    queryKey: ['produtos_fontes_precos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produtos_fontes_precos')
        .select(`
          *,
          produto:produtos(id, nome, codigo, ean_13),
          fonte:fontes_pesquisa_precos(id, nome_fonte, tipo)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Mapeamento[];
    }
  });

  const { data: produtos } = useQuery({
    queryKey: ['produtos_for_mapping'],
    queryFn: async () => {
      const estabelecimentoId = await getEstabelecimentoId();
      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, codigo, ean_13')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return data;
    }
  });

  const { data: fontes } = useQuery({
    queryKey: ['fontes_for_mapping'],
    queryFn: async () => {
      const estabelecimentoId = await getEstabelecimentoId();
      const { data, error } = await supabase
        .from('fontes_pesquisa_precos')
        .select('id, nome_fonte, tipo')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativo', true)
        .order('nome_fonte');
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('produtos_fontes_precos').insert({
        produto_id: data.produto_id,
        fonte_id: data.fonte_id,
        termo_busca: data.termo_busca || null,
        termo_busca_alternativo: data.termo_busca_alternativo || null,
        url_direta: data.url_direta || null,
        chave_correspondencia: data.chave_correspondencia || null,
        ativo: data.ativo
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos_fontes_precos'] });
      setShowDialog(false);
      resetForm();
      toast.success("Mapeamento criado com sucesso");
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { error } = await supabase.from('produtos_fontes_precos')
        .update({
          termo_busca: data.termo_busca || null,
          termo_busca_alternativo: data.termo_busca_alternativo || null,
          url_direta: data.url_direta || null,
          chave_correspondencia: data.chave_correspondencia || null,
          ativo: data.ativo
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos_fontes_precos'] });
      setShowDialog(false);
      setEditingMap(null);
      resetForm();
      toast.success("Mapeamento atualizado");
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('produtos_fontes_precos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos_fontes_precos'] });
      toast.success("Mapeamento excluído");
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      produto_id: "",
      fonte_id: "",
      termo_busca: "",
      termo_busca_alternativo: "",
      url_direta: "",
      chave_correspondencia: "",
      ativo: true
    });
  };

  const handleEdit = (map: Mapeamento) => {
    setEditingMap(map);
    setFormData({
      produto_id: map.produto_id,
      fonte_id: map.fonte_id,
      termo_busca: map.termo_busca || "",
      termo_busca_alternativo: map.termo_busca_alternativo || "",
      url_direta: map.url_direta || "",
      chave_correspondencia: map.chave_correspondencia || "",
      ativo: map.ativo
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.produto_id || !formData.fonte_id) {
      toast.error("Produto e fonte são obrigatórios");
      return;
    }
    
    if (editingMap) {
      updateMutation.mutate({ ...formData, id: editingMap.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Quando seleciona um produto, preenche o termo_busca com o nome
  const handleProdutoChange = (produtoId: string) => {
    const produto = produtos?.find(p => p.id === produtoId);
    setFormData(p => ({
      ...p,
      produto_id: produtoId,
      termo_busca: produto?.nome || ""
    }));
  };

  const filteredMapeamentos = mapeamentos?.filter(m => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      m.produto?.nome?.toLowerCase().includes(term) ||
      m.fonte?.nome_fonte?.toLowerCase().includes(term) ||
      m.termo_busca?.toLowerCase().includes(term)
    );
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Mapeamento Produto × Fonte
          </CardTitle>
          <CardDescription>Configure como cada produto deve ser pesquisado em cada fonte</CardDescription>
        </div>
        <Button className="gap-2" onClick={() => {
          resetForm();
          setEditingMap(null);
          setShowDialog(true);
        }}>
          <Plus className="h-4 w-4" />
          Novo Mapeamento
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por produto, fonte ou termo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredMapeamentos?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum mapeamento encontrado.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead>Termo de Busca</TableHead>
                <TableHead>URL Direta</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMapeamentos?.map((map) => (
                <TableRow key={map.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{map.produto?.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        SKU: {map.produto?.codigo || "-"} | EAN: {map.produto?.ean_13 || "-"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{map.fonte?.nome_fonte}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {map.termo_busca || map.produto?.nome}
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">
                    {map.url_direta || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={map.ativo ? "default" : "secondary"}>
                      {map.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(map)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        if (confirm("Excluir este mapeamento?")) {
                          deleteMutation.mutate(map.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMap ? "Editar Mapeamento" : "Novo Mapeamento"}</DialogTitle>
            <DialogDescription>
              O termo de busca é preenchido automaticamente com o nome do produto
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Produto *</Label>
              <Select 
                value={formData.produto_id} 
                onValueChange={handleProdutoChange}
                disabled={!!editingMap}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[200px]">
                    {produtos?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fonte *</Label>
              <Select 
                value={formData.fonte_id} 
                onValueChange={(v) => setFormData(p => ({ ...p, fonte_id: v }))}
                disabled={!!editingMap}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma fonte" />
                </SelectTrigger>
                <SelectContent>
                  {fontes?.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome_fonte}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Termo de Busca Principal</Label>
              <Input
                value={formData.termo_busca}
                onChange={(e) => setFormData(p => ({ ...p, termo_busca: e.target.value }))}
                placeholder="Preenchido automaticamente com o nome do produto"
              />
              <p className="text-xs text-muted-foreground">
                Este é o termo usado na pesquisa. Por padrão usa o nome do produto.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Termo Alternativo (opcional)</Label>
              <Input
                value={formData.termo_busca_alternativo}
                onChange={(e) => setFormData(p => ({ ...p, termo_busca_alternativo: e.target.value }))}
                placeholder="Ex: apelido, marca diferente..."
              />
            </div>

            <div className="space-y-2">
              <Label>URL Direta (opcional)</Label>
              <Input
                value={formData.url_direta}
                onChange={(e) => setFormData(p => ({ ...p, url_direta: e.target.value }))}
                placeholder="https://site.com/produto-especifico"
              />
              <p className="text-xs text-muted-foreground">
                Se você já sabe a URL exata do produto no concorrente
              </p>
            </div>

            <div className="space-y-2">
              <Label>Chave de Correspondência (opcional)</Label>
              <Select 
                value={formData.chave_correspondencia || "none"} 
                onValueChange={(v) => setFormData(p => ({ ...p, chave_correspondencia: v === "none" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  <SelectItem value="usar_ean">Usar EAN para validar</SelectItem>
                  <SelectItem value="usar_sku">Usar SKU para validar</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                EAN/SKU são usados apenas para validar/refinar resultados
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData(p => ({ ...p, ativo: checked }))}
              />
              <Label>Mapeamento ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingMap ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
