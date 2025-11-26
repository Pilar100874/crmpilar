import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useAddressLookup } from "@/hooks/useAddressLookup";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Unidade {
  id: string;
  nome: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
}

interface UnidadesCRUDProps {
  estabelecimentoId?: string;
}

export const UnidadesCRUD = ({ estabelecimentoId }: UnidadesCRUDProps) => {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [nome, setNome] = useState("");
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [unidadeToDelete, setUnidadeToDelete] = useState<Unidade | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { lookupCEP, loading: cepLoading } = useAddressLookup();

  useEffect(() => {
    fetchUnidades();
  }, [estabelecimentoId]);

  const fetchUnidades = async () => {
    let targetEstabelecimentoId = estabelecimentoId;

    if (!targetEstabelecimentoId) {
      // Get current user's estabelecimento_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('usuarios')
        .select('estabelecimento_id')
        .eq('email', user.email)
        .maybeSingle();

      targetEstabelecimentoId = userData?.estabelecimento_id;
    }

    if (!targetEstabelecimentoId) return;

    const { data, error } = await supabase
      .from("unidades")
      .select("*")
      .eq('estabelecimento_id', targetEstabelecimentoId)
      .order("nome");

    if (error) {
      toast({
        title: "Erro ao carregar unidades",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setUnidades(data || []);
    }
  };

  const handleCepBlur = async () => {
    if (cep && cep.length >= 8) {
      const data = await lookupCEP(cep);
      if (data) {
        setLogradouro(data.logradouro || "");
        setBairro(data.bairro || "");
        setCidade(data.localidade || "");
        setUf(data.uf || "");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedNome = nome.trim();
    if (!trimmedNome) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, preencha o nome da unidade",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicates (case-insensitive)
    const existingUnidade = unidades.find(u => 
      u.nome.toLowerCase() === trimmedNome.toLowerCase() && u.id !== editingId
    );
    
    if (existingUnidade) {
      toast({
        title: "Nome duplicado",
        description: "Já existe uma unidade com este nome",
        variant: "destructive",
      });
      return;
    }

    const unidadeData = {
      nome: trimmedNome,
      cep: cep || null,
      logradouro: logradouro || null,
      numero: numero || null,
      complemento: complemento || null,
      bairro: bairro || null,
      cidade: cidade || null,
      uf: uf || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from("unidades")
        .update(unidadeData)
        .eq("id", editingId);

      if (error) {
        toast({
          title: "Erro ao atualizar",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Unidade atualizada com sucesso!" });
        setNome("");
        setCep("");
        setLogradouro("");
        setNumero("");
        setComplemento("");
        setBairro("");
        setCidade("");
        setUf("");
        setEditingId(null);
        fetchUnidades();
      }
    } else {
      let targetEstabelecimentoId = estabelecimentoId;

      if (!targetEstabelecimentoId) {
        // Get current user's estabelecimento_id
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData } = await supabase
          .from('usuarios')
          .select('estabelecimento_id')
          .eq('email', user.email)
          .maybeSingle();

        targetEstabelecimentoId = userData?.estabelecimento_id;
      }

      if (!targetEstabelecimentoId) {
        toast({
          title: "Erro",
          description: "Estabelecimento não identificado",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("unidades")
        .insert([{ ...unidadeData, estabelecimento_id: targetEstabelecimentoId }]);

      if (error) {
        const errorMsg = error.message.includes('unidades_nome_unique') 
          ? 'Já existe uma unidade com este nome'
          : error.message;
        toast({
          title: "Erro ao criar",
          description: errorMsg,
          variant: "destructive",
        });
      } else {
        toast({ title: "Unidade criada com sucesso!" });
        setNome("");
        setCep("");
        setLogradouro("");
        setNumero("");
        setComplemento("");
        setBairro("");
        setCidade("");
        setUf("");
        fetchUnidades();
      }
    }
  };

  const handleEdit = (unidade: Unidade) => {
    setNome(unidade.nome);
    setCep(unidade.cep || "");
    setLogradouro(unidade.logradouro || "");
    setNumero(unidade.numero || "");
    setComplemento(unidade.complemento || "");
    setBairro(unidade.bairro || "");
    setCidade(unidade.cidade || "");
    setUf(unidade.uf || "");
    setEditingId(unidade.id);
  };

  const handleDeleteClick = (unidade: Unidade) => {
    setUnidadeToDelete(unidade);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!unidadeToDelete) return;

    setIsDeleting(true);

    // Verificar vínculos com usuarios
    const { data: usuarios, error: checkError } = await supabase
      .from("usuarios")
      .select("id")
      .eq("unidade_id", unidadeToDelete.id)
      .limit(1);

    if (checkError) {
      toast({
        title: "Erro ao verificar vínculos",
        description: checkError.message,
        variant: "destructive",
      });
      setIsDeleting(false);
      return;
    }

    if (usuarios && usuarios.length > 0) {
      toast({
        title: "Não é possível excluir",
        description: "Esta unidade possui usuários vinculados. Remova os vínculos primeiro.",
        variant: "destructive",
      });
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setUnidadeToDelete(null);
      return;
    }

    const { error } = await supabase
      .from("unidades")
      .delete()
      .eq("id", unidadeToDelete.id);

    setIsDeleting(false);

    if (error) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Unidade excluída com sucesso!" });
      fetchUnidades();
    }

    setDeleteDialogOpen(false);
    setUnidadeToDelete(null);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="unidade-nome">Nome da Filial *</Label>
            <Input
              id="unidade-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite o nome da filial"
              required
            />
          </div>

          <div>
            <Label htmlFor="unidade-cep">CEP</Label>
            <Input
              id="unidade-cep"
              value={cep}
              onChange={(e) => setCep(e.target.value)}
              onBlur={handleCepBlur}
              placeholder="00000-000"
              maxLength={9}
              disabled={cepLoading}
            />
          </div>

          <div>
            <Label htmlFor="unidade-numero">Número</Label>
            <Input
              id="unidade-numero"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="Número"
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="unidade-logradouro">Logradouro</Label>
            <Input
              id="unidade-logradouro"
              value={logradouro}
              onChange={(e) => setLogradouro(e.target.value)}
              placeholder="Rua, Avenida, etc."
            />
          </div>

          <div>
            <Label htmlFor="unidade-complemento">Complemento</Label>
            <Input
              id="unidade-complemento"
              value={complemento}
              onChange={(e) => setComplemento(e.target.value)}
              placeholder="Apto, Sala, etc."
            />
          </div>

          <div>
            <Label htmlFor="unidade-bairro">Bairro</Label>
            <Input
              id="unidade-bairro"
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              placeholder="Bairro"
            />
          </div>

          <div>
            <Label htmlFor="unidade-cidade">Cidade</Label>
            <Input
              id="unidade-cidade"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="Cidade"
            />
          </div>

          <div>
            <Label htmlFor="unidade-uf">UF</Label>
            <Select value={uf} onValueChange={setUf}>
              <SelectTrigger id="unidade-uf">
                <SelectValue placeholder="Selecione o estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AC">AC</SelectItem>
                <SelectItem value="AL">AL</SelectItem>
                <SelectItem value="AP">AP</SelectItem>
                <SelectItem value="AM">AM</SelectItem>
                <SelectItem value="BA">BA</SelectItem>
                <SelectItem value="CE">CE</SelectItem>
                <SelectItem value="DF">DF</SelectItem>
                <SelectItem value="ES">ES</SelectItem>
                <SelectItem value="GO">GO</SelectItem>
                <SelectItem value="MA">MA</SelectItem>
                <SelectItem value="MT">MT</SelectItem>
                <SelectItem value="MS">MS</SelectItem>
                <SelectItem value="MG">MG</SelectItem>
                <SelectItem value="PA">PA</SelectItem>
                <SelectItem value="PB">PB</SelectItem>
                <SelectItem value="PR">PR</SelectItem>
                <SelectItem value="PE">PE</SelectItem>
                <SelectItem value="PI">PI</SelectItem>
                <SelectItem value="RJ">RJ</SelectItem>
                <SelectItem value="RN">RN</SelectItem>
                <SelectItem value="RS">RS</SelectItem>
                <SelectItem value="RO">RO</SelectItem>
                <SelectItem value="RR">RR</SelectItem>
                <SelectItem value="SC">SC</SelectItem>
                <SelectItem value="SP">SP</SelectItem>
                <SelectItem value="SE">SE</SelectItem>
                <SelectItem value="TO">TO</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit">
            {editingId ? "Atualizar" : <><Plus className="w-4 h-4 mr-2" /> Adicionar</>}
          </Button>
          {editingId && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNome("");
                setCep("");
                setLogradouro("");
                setNumero("");
                setComplemento("");
                setBairro("");
                setCidade("");
                setUf("");
                setEditingId(null);
              }}
            >
              Cancelar
            </Button>
          )}
        </div>
      </form>

      <div className="space-y-2">
        {unidades.map((unidade) => (
          <div
            key={unidade.id}
            className="flex items-center justify-between p-3 border rounded-md"
          >
            <span>{unidade.nome}</span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEdit(unidade)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteClick(unidade)}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        itemName={unidadeToDelete?.nome}
        isLoading={isDeleting}
      />
    </div>
  );
};
