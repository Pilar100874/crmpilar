import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus, Search, Building2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useAddressLookup } from "@/hooks/useAddressLookup";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CadastroCardList } from "@/components/cadastros/CadastroCardList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CertificadoUnidade } from "@/components/config/CertificadoUnidade";
import { REGIMES_TRIBUTARIOS, rotuloRegime } from "@/lib/fiscal/regimeTributario";
import { CRT } from "@/lib/fiscal/motorFiscal";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  estabelecimento_id?: string | null;
  cnpj?: string | null;
  inscricao_estadual?: string | null;
  regime_tributario?: string | null;
  crt?: string | null;
  cnae_fiscal?: string | null;
  certificado_path?: string | null;
  certificado_nome_arquivo?: string | null;
  certificado_titular?: string | null;
  certificado_valido_ate?: string | null;
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
  const [cnpj, setCnpj] = useState("");
  const [inscricaoEstadual, setInscricaoEstadual] = useState("");
  const [regime, setRegime] = useState("");
  const [crt, setCrt] = useState("");
  const [cnae, setCnae] = useState("");
  const [serieNfe, setSerieNfe] = useState("1");
  const [proximoNumero, setProximoNumero] = useState("");
  const [ieSt, setIeSt] = useState("");
  const [buscandoFiscal, setBuscandoFiscal] = useState(false);
  const buscarDadosFiscais = async () => {
    const doc = cnpj.replace(/\D/g, "");
    if (doc.length !== 14) { toast({ title: "Informe o CNPJ da unidade (14 dígitos)", variant: "destructive" }); return; }
    setBuscandoFiscal(true);
    try {
      const { data, error } = await supabase.functions.invoke("nfe-focus", { body: { acao: "consultar_cnpj", cnpj: doc } });
      if (error) {
        let msg = error.message;
        try { msg = (await (error as any).context.json()).error ?? msg; } catch { /* sem corpo */ }
        throw new Error(msg);
      }
      const d = data?.dados ?? {};
      const preenchidos: string[] = [];
      if (d.optante_mei === true) { setRegime("mei"); setCrt("4"); preenchidos.push("regime (MEI)"); }
      else if (d.optante_simples_nacional === true) { setRegime("simples_nacional"); setCrt("1"); preenchidos.push("regime (Simples Nacional)"); }
      else if (d.optante_simples_nacional === false) { setCrt("3"); preenchidos.push("CRT regime normal"); }
      if (d.cnae_principal) { setCnae(String(d.cnae_principal)); preenchidos.push("CNAE"); }
      const ies: any[] = Array.isArray(d.inscricoes_estaduais) ? d.inscricoes_estaduais : [];
      const ie = d.inscricao_estadual || ies.find((x) => !uf || String(x.uf ?? "").toUpperCase() === uf.toUpperCase())?.inscricao_estadual;
      if (ie) { setInscricaoEstadual(String(ie)); preenchidos.push("inscrição estadual"); }
      toast({ title: preenchidos.length ? `Preenchido: ${preenchidos.join(", ")}` : "Nada novo encontrado para este CNPJ",
        description: ie ? undefined : "A consulta não trouxe a inscrição estadual; preencha manualmente." });
    } catch (e: any) {
      toast({ title: "Não foi possível consultar", description: e.message, variant: "destructive" });
    } finally { setBuscandoFiscal(false); }
  };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [unidadeToDelete, setUnidadeToDelete] = useState<Unidade | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const { toast } = useToast();
  const { lookupCEP, loading: cepLoading } = useAddressLookup();

  const fetchUnidades = useCallback(async () => {
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
  }, [estabelecimentoId, toast]);

  useEffect(() => {
    fetchUnidades();
  }, [fetchUnidades]);

  const handleCepBlur = async () => {
    if (!cep || cep.length < 8) return;
    
    try {
      const data = await lookupCEP(cep);
      if (data) {
        setLogradouro(data.logradouro || "");
        setBairro(data.bairro || "");
        setCidade(data.localidade || "");
        setUf(data.uf || "");
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
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
      cnpj: cnpj.replace(/\D/g, "") || null,
      inscricao_estadual: inscricaoEstadual.trim() || null,
      regime_tributario: regime || null,
      crt: crt || null,
      cnae_fiscal: cnae.replace(/\D/g, "") || null,
      serie_nfe: Number(serieNfe) || 1,
      proximo_numero_nfe: Number(proximoNumero) || null,
      ie_substituto: ieSt.split(/\n|;/).map((l) => l.trim()).filter(Boolean).map((l) => { const [uf, ...ie] = l.split(/[\s:=-]+/); return { uf: (uf || "").toUpperCase().slice(0, 2), ie: ie.join("").replace(/\D/g, "") }; }).filter((x) => x.uf.length === 2 && x.ie),
    } as any;

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
        resetForm();
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
        resetForm();
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
    setCnpj(unidade.cnpj || "");
    setInscricaoEstadual(unidade.inscricao_estadual || "");
    setRegime(unidade.regime_tributario || "");
    setCrt(unidade.crt || "");
    setCnae(unidade.cnae_fiscal || "");
    setSerieNfe(String((unidade as any).serie_nfe ?? 1));
    setProximoNumero((unidade as any).proximo_numero_nfe ? String((unidade as any).proximo_numero_nfe) : "");
    setIeSt((((unidade as any).ie_substituto ?? []) as any[]).map((x) => `${x.uf} ${x.ie}`).join("\n"));
    setEditingId(unidade.id);
    setFormOpen(true);
  };

  const resetForm = () => {
    setSerieNfe("1"); setProximoNumero(""); setIeSt("");
    setNome("");
    setCep("");
    setLogradouro("");
    setNumero("");
    setComplemento("");
    setBairro("");
    setCidade("");
    setUf("");
    setCnpj("");
    setInscricaoEstadual("");
    setRegime("");
    setCrt("");
    setCnae("");
    setEditingId(null);
    setFormOpen(false);
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

  const normalizedSearch = searchTerm.trim().toLocaleLowerCase("pt-BR");
  const filteredUnidades = unidades.filter((unidade) =>
    [unidade.nome, unidade.cidade, unidade.uf, unidade.bairro]
      .filter(Boolean)
      .some((value) => value?.toLocaleLowerCase("pt-BR").includes(normalizedSearch))
  );

  const actionButtons = (unidade: Unidade) => (
    <>
      <Button variant="ghost" size="icon" onClick={() => handleEdit(unidade)} aria-label={`Editar ${unidade.nome}`}>
        <Edit className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(unidade)} aria-label={`Excluir ${unidade.nome}`}>
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{unidades.length} {unidades.length === 1 ? "unidade cadastrada" : "unidades cadastradas"}</p>
        <Button onClick={() => { resetForm(); setFormOpen(true); }} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Nova unidade
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Pesquisar por nome, cidade, UF ou bairro" className="pl-9" />
      </div>

      {formOpen && <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 border-b pb-3">
          <Building2 className="h-5 w-5 text-primary" />
          <h4 className="font-semibold">{editingId ? "Editar unidade" : "Nova unidade"}</h4>
        </div>
        <Tabs defaultValue="dados" className="w-full">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="dados">Dados da unidade</TabsTrigger>
          <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
        </TabsList>
        <TabsContent value="dados" forceMount className="data-[state=inactive]:hidden">
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
        </TabsContent>

        <TabsContent value="fiscal" forceMount className="space-y-4 data-[state=inactive]:hidden">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="min-w-0 space-y-2">
            <Label htmlFor="unidade-cnpj">CNPJ da unidade</Label>
            <div className="flex gap-2">
              <Input id="unidade-cnpj" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
              <Button type="button" variant="outline" size="icon" aria-label="Buscar dados fiscais pelo CNPJ" title="Buscar dados fiscais (Focus NFe)" disabled={buscandoFiscal} onClick={buscarDadosFiscais}><Search className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="unidade-ie">Inscrição estadual</Label>
            <Input id="unidade-ie" value={inscricaoEstadual} onChange={(e) => setInscricaoEstadual(e.target.value)} />
          </div>
          <div className="min-w-0 space-y-2">
            <Label>Regime tributário</Label>
            <Select value={regime || "nao_informado"} onValueChange={(v) => setRegime(v === "nao_informado" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nao_informado">Não informado</SelectItem>
                {REGIMES_TRIBUTARIOS.map((r) => <SelectItem key={r.valor} value={r.valor}>{r.rotulo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 space-y-2">
            <Label>CRT (código de regime da NF-e)</Label>
            <Select value={crt || "auto"} onValueChange={(v) => setCrt(v === "auto" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Pelo regime tributário</SelectItem>
                {CRT.map((c) => <SelectItem key={c.valor} value={c.valor}>{c.rotulo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="unidade-cnae">CNAE principal</Label>
            <Input id="unidade-cnae" value={cnae} onChange={(e) => setCnae(e.target.value)} placeholder="Ex.: 2222-6/00" />
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="unidade-serie">Série da NF-e</Label>
            <Input id="unidade-serie" inputMode="numeric" value={serieNfe} onChange={(e) => setSerieNfe(e.target.value.replace(/\D/g, "").slice(0, 3))} />
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="unidade-numero-nfe">Próximo número da NF-e</Label>
            <Input id="unidade-numero-nfe" inputMode="numeric" value={proximoNumero} onChange={(e) => setProximoNumero(e.target.value.replace(/\D/g, "").slice(0, 9))} placeholder="Automático pelo emissor" />
          </div>
          <div className="min-w-0 space-y-2 sm:col-span-3">
            <Label htmlFor="unidade-ie-st">Inscrição estadual de substituto tributário em outros estados</Label>
            <Textarea id="unidade-ie-st" rows={2} value={ieSt} onChange={(e) => setIeSt(e.target.value)} placeholder={"Uma por linha, ex.:\nRJ 12345678\nMG 0012345670099"} />
            <p className="text-xs text-muted-foreground">Usada quando a unidade recolhe a ST direto para o estado do cliente.</p>
          </div>
        </div>

        {editingId ? (
          (() => {
            const atual = unidades.find((u) => u.id === editingId);
            return atual ? <CertificadoUnidade unidade={atual} onAlterado={fetchUnidades} /> : null;
          })()
        ) : (
          <p className="text-xs text-muted-foreground">Salve a unidade para poder importar o certificado digital.</p>
        )}
        </TabsContent>
        </Tabs>

        <div className="flex gap-2">
          <Button type="submit">
            {editingId ? "Atualizar" : <><Plus className="w-4 h-4 mr-2" /> Adicionar</>}
          </Button>
          {editingId && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
              }}
            >
              Cancelar
            </Button>
          )}
        </div>
          {!editingId && <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>}
      </form>}

      {filteredUnidades.length === 0 ? (
        <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
          {searchTerm ? "Nenhuma unidade encontrada para esta pesquisa." : "Nenhuma unidade cadastrada ainda."}
        </div>
      ) : <>
        <div className="md:hidden">
          <CadastroCardList items={filteredUnidades.map((unidade) => ({
            id: unidade.id,
            title: unidade.nome,
            subtitle: [[unidade.cidade, unidade.uf].filter(Boolean).join(" - ") || "Endereço não informado", unidade.regime_tributario ? rotuloRegime(unidade.regime_tributario) : "", unidade.certificado_path ? "Certificado A1" : ""].filter(Boolean).join(" · "),
            fields: [{ label: "Bairro", value: unidade.bairro || "-" }, { label: "CEP", value: unidade.cep || "-" }],
            actions: actionButtons(unidade),
          }))} />
        </div>
        <div className="hidden overflow-hidden rounded-lg border md:block">
          <Table>
            <TableHeader><TableRow><TableHead>Unidade</TableHead><TableHead>Localização</TableHead><TableHead>CEP</TableHead><TableHead className="w-24 text-right">Ações</TableHead></TableRow></TableHeader>
            <TableBody>{filteredUnidades.map((unidade) => <TableRow key={unidade.id}>
              <TableCell className="font-medium">{unidade.nome}</TableCell>
              <TableCell>{[unidade.cidade, unidade.uf].filter(Boolean).join(" - ") || "-"}</TableCell>
              <TableCell>{unidade.cep || "-"}</TableCell>
              <TableCell><div className="flex justify-end gap-1">{actionButtons(unidade)}</div></TableCell>
            </TableRow>)}</TableBody>
          </Table>
        </div>
      </>}

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
