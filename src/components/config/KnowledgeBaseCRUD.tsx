import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Plus, Pencil, Trash2, Book, FolderOpen, 
  Eye, EyeOff, Search, Tag, FileText 
} from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Switch } from "@/components/ui/switch";

interface Categoria {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string | null;
  icone: string | null;
  ordem: number;
  ativa: boolean;
}

interface Artigo {
  id: string;
  titulo: string;
  resumo: string | null;
  conteudo: string;
  status: "rascunho" | "publicado" | "arquivado";
  categoria_id: string | null;
  visualizacoes: number;
  publico: boolean;
  created_at: string;
  kb_categorias?: { nome: string };
}

interface KnowledgeBaseCRUDProps {
  estabelecimentoId: string;
}

export default function KnowledgeBaseCRUD({ estabelecimentoId }: KnowledgeBaseCRUDProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [isArtigoDialogOpen, setIsArtigoDialogOpen] = useState(false);
  const [editingArtigo, setEditingArtigo] = useState<Artigo | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("todos");
  const [deletingArtigoId, setDeletingArtigoId] = useState<string | null>(null);
  const [deletingCategoriaId, setDeletingCategoriaId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    cor: "#3b82f6",
    icone: "Book",
    ordem: 0,
    ativa: true,
  });

  const [artigoFormData, setArtigoFormData] = useState({
    titulo: "",
    resumo: "",
    conteudo: "",
    categoria_id: "",
    status: "rascunho" as "rascunho" | "publicado" | "arquivado",
    publico: false,
  });

  useEffect(() => {
    if (estabelecimentoId) {
      fetchCategorias();
      fetchArtigos();
    }
  }, [estabelecimentoId]);

  const fetchCategorias = async () => {
    const { data, error } = await supabase
      .from("kb_categorias")
      .select("*")
      .eq("estabelecimento_id", estabelecimentoId)
      .order("ordem");

    if (error) {
      toast.error("Erro ao carregar categorias");
      console.error(error);
    } else {
      setCategorias(data || []);
    }
  };

  const fetchArtigos = async () => {
    const { data, error } = await supabase
      .from("kb_artigos")
      .select(`
        *,
        kb_categorias (nome)
      `)
      .eq("estabelecimento_id", estabelecimentoId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar artigos");
      console.error(error);
    } else {
      setArtigos((data || []) as any);
    }
  };

  const handleSaveCategoria = async () => {
    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    const data = {
      ...formData,
      estabelecimento_id: estabelecimentoId,
    };

    let error;
    if (editingCategoria) {
      ({ error } = await supabase
        .from("kb_categorias")
        .update(data)
        .eq("id", editingCategoria.id));
    } else {
      ({ error } = await supabase.from("kb_categorias").insert([data]));
    }

    if (error) {
      toast.error(`Erro ao ${editingCategoria ? "atualizar" : "criar"} categoria`);
      console.error(error);
    } else {
      toast.success(`Categoria ${editingCategoria ? "atualizada" : "criada"} com sucesso`);
      setIsDialogOpen(false);
      resetForm();
      fetchCategorias();
    }
  };

  const handleSaveArtigo = async () => {
    if (!artigoFormData.titulo.trim() || !artigoFormData.conteudo.trim()) {
      toast.error("Título e conteúdo são obrigatórios");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("id")
      .eq("auth_user_id", userData?.user?.id)
      .single();

    const data = {
      ...artigoFormData,
      estabelecimento_id: estabelecimentoId,
      autor_id: usuario?.id,
      categoria_id: artigoFormData.categoria_id || null,
      publicado_em: artigoFormData.status === "publicado" ? new Date().toISOString() : null,
    };

    let error;
    if (editingArtigo) {
      ({ error } = await supabase
        .from("kb_artigos")
        .update(data)
        .eq("id", editingArtigo.id));
    } else {
      ({ error } = await supabase.from("kb_artigos").insert([data]));
    }

    if (error) {
      toast.error(`Erro ao ${editingArtigo ? "atualizar" : "criar"} artigo`);
      console.error(error);
    } else {
      toast.success(`Artigo ${editingArtigo ? "atualizado" : "criado"} com sucesso`);
      setIsArtigoDialogOpen(false);
      resetArtigoForm();
      fetchArtigos();
    }
  };

  const handleDeleteCategoria = async (id: string) => {
    const { error } = await supabase.from("kb_categorias").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir categoria");
      console.error(error);
    } else {
      toast.success("Categoria excluída com sucesso");
      setDeletingCategoriaId(null);
      fetchCategorias();
    }
  };

  const handleDeleteArtigo = async (id: string) => {
    const { error } = await supabase.from("kb_artigos").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir artigo");
      console.error(error);
    } else {
      toast.success("Artigo excluído com sucesso");
      setDeletingArtigoId(null);
      fetchArtigos();
    }
  };

  const handleEditCategoria = (categoria: Categoria) => {
    setEditingCategoria(categoria);
    setFormData({
      nome: categoria.nome,
      descricao: categoria.descricao || "",
      cor: categoria.cor || "#3b82f6",
      icone: categoria.icone || "Book",
      ordem: categoria.ordem,
      ativa: categoria.ativa,
    });
    setIsDialogOpen(true);
  };

  const handleEditArtigo = (artigo: Artigo) => {
    setEditingArtigo(artigo);
    setArtigoFormData({
      titulo: artigo.titulo,
      resumo: artigo.resumo || "",
      conteudo: artigo.conteudo,
      categoria_id: artigo.categoria_id || "",
      status: artigo.status,
      publico: artigo.publico,
    });
    setIsArtigoDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      descricao: "",
      cor: "#3b82f6",
      icone: "Book",
      ordem: 0,
      ativa: true,
    });
    setEditingCategoria(null);
  };

  const resetArtigoForm = () => {
    setArtigoFormData({
      titulo: "",
      resumo: "",
      conteudo: "",
      categoria_id: "",
      status: "rascunho",
      publico: false,
    });
    setEditingArtigo(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      publicado: "default",
      rascunho: "secondary",
      arquivado: "outline",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const filteredArtigos = artigos.filter((artigo) => {
    const matchesSearch = artigo.titulo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "todos" || artigo.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <Tabs defaultValue="artigos" className="w-full">
      <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
        <TabsTrigger value="artigos">
          <FileText className="w-4 h-4 mr-2" />
          Artigos
        </TabsTrigger>
        <TabsTrigger value="categorias">
          <FolderOpen className="w-4 h-4 mr-2" />
          Categorias
        </TabsTrigger>
      </TabsList>

      <TabsContent value="artigos" className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar artigos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="publicado">Publicado</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="arquivado">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Dialog open={isArtigoDialogOpen} onOpenChange={setIsArtigoDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetArtigoForm}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Artigo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingArtigo ? "Editar Artigo" : "Novo Artigo"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="titulo">Título *</Label>
                  <Input
                    id="titulo"
                    value={artigoFormData.titulo}
                    onChange={(e) =>
                      setArtigoFormData({ ...artigoFormData, titulo: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="resumo">Resumo</Label>
                  <Textarea
                    id="resumo"
                    rows={2}
                    value={artigoFormData.resumo}
                    onChange={(e) =>
                      setArtigoFormData({ ...artigoFormData, resumo: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="conteudo">Conteúdo *</Label>
                  <Textarea
                    id="conteudo"
                    rows={10}
                    value={artigoFormData.conteudo}
                    onChange={(e) =>
                      setArtigoFormData({ ...artigoFormData, conteudo: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="categoria">Categoria</Label>
                    <Select
                      value={artigoFormData.categoria_id}
                      onValueChange={(value) =>
                        setArtigoFormData({ ...artigoFormData, categoria_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={artigoFormData.status}
                      onValueChange={(value: any) =>
                        setArtigoFormData({ ...artigoFormData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rascunho">Rascunho</SelectItem>
                        <SelectItem value="publicado">Publicado</SelectItem>
                        <SelectItem value="arquivado">Arquivado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="publico"
                    checked={artigoFormData.publico}
                    onCheckedChange={(checked) =>
                      setArtigoFormData({ ...artigoFormData, publico: checked })
                    }
                  />
                  <Label htmlFor="publico">Artigo público (acessível sem login)</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsArtigoDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveArtigo}>Salvar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Visualizações</TableHead>
                <TableHead>Público</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredArtigos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhum artigo encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredArtigos.map((artigo) => (
                  <TableRow key={artigo.id}>
                    <TableCell className="font-medium">{artigo.titulo}</TableCell>
                    <TableCell>
                      {artigo.kb_categorias ? (
                        <Badge variant="outline">{artigo.kb_categorias.nome}</Badge>
                      ) : (
                        <span className="text-muted-foreground">Sem categoria</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(artigo.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                        {artigo.visualizacoes}
                      </div>
                    </TableCell>
                    <TableCell>
                      {artigo.publico ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditArtigo(artigo)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingArtigoId(artigo.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <DeleteConfirmDialog
          open={deletingArtigoId !== null}
          onOpenChange={(open) => !open && setDeletingArtigoId(null)}
          onConfirm={() => deletingArtigoId && handleDeleteArtigo(deletingArtigoId)}
          title="Excluir artigo"
          description={`Tem certeza que deseja excluir este artigo? Esta ação não pode ser desfeita.`}
        />
      </TabsContent>

      <TabsContent value="categorias" className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Categorias da Base de Conhecimento</h3>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Categoria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategoria ? "Editar Categoria" : "Nova Categoria"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) =>
                      setFormData({ ...formData, descricao: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cor">Cor</Label>
                    <Input
                      id="cor"
                      type="color"
                      value={formData.cor}
                      onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ordem">Ordem</Label>
                    <Input
                      id="ordem"
                      type="number"
                      value={formData.ordem}
                      onChange={(e) =>
                        setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="ativa"
                    checked={formData.ativa}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, ativa: checked })
                    }
                  />
                  <Label htmlFor="ativa">Categoria ativa</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveCategoria}>Salvar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Ordem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categorias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhuma categoria cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                categorias.map((categoria) => (
                  <TableRow key={categoria.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: categoria.cor || "#3b82f6" }}
                        />
                        {categoria.nome}
                      </div>
                    </TableCell>
                    <TableCell>{categoria.descricao}</TableCell>
                    <TableCell>{categoria.ordem}</TableCell>
                    <TableCell>
                      <Badge variant={categoria.ativa ? "default" : "secondary"}>
                        {categoria.ativa ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditCategoria(categoria)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingCategoriaId(categoria.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <DeleteConfirmDialog
          open={deletingCategoriaId !== null}
          onOpenChange={(open) => !open && setDeletingCategoriaId(null)}
          onConfirm={() => deletingCategoriaId && handleDeleteCategoria(deletingCategoriaId)}
          title="Excluir categoria"
          description={`Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.`}
        />
      </TabsContent>
    </Tabs>
  );
}
