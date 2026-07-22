import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Pencil, Trash2, Layers } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import PontoFuncionariosLoteDialog from "@/components/ponto/PontoFuncionariosLoteDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePontoEmpresa } from "./usePontoEmpresa";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { MaskedInput } from "@/components/ui/masked-input";
import { maskCPF, maskPIS, maskPhone, maskCEP } from "@/lib/masks";
import { validateCPF, validatePIS, validateEmail, validatePhone } from "@/lib/validators";

type Func = any;

const emptyForm: any = {
  // definições
  nome: "",
  sobrenome: "",
  cpf: "",
  pis: "",
  matricula: "",
  matricula_esocial: "",
  centro_custo: "",
  email: "",
  pin: "",
  foto_url: "",
  eh_clt: true,
  registra_ponto: true,
  tipo_registro_ponto: "relogio",
  codigo_dominio: "",
  admissao: "",
  // dados pessoais
  data_nascimento: "",
  eh_aposentado: false,
  pais_nascimento: "",
  cidade_nascimento: "",
  estado_civil: "",
  genero: "",
  nome_mae: "",
  nome_pai: "",
  etnia: "",
  escolaridade: "",
  notas: "",
  // contato/endereço
  telefone: "",
  telefone_alt: "",
  email_alt: "",
  cep: "",
  cidade: "",
  uf: "",
  tipo_local: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  // empresa
  cargo_id: "",
  departamento_id: "",
  equipe_id: "",
  filial_id: "",
  escala_id: "",
  // especiais
  deficiencia_fisica: false,
  deficiencia_mental: false,
  deficiencia_auditiva: false,
  deficiencia_intelectual: false,
  deficiencia_visual: false,
  reabilitado: false,
  notas_especiais: "",
  // extras
  config_controle_ponto: "",
  data_inicio_ponto: "",
  jornada_contratada_horas: "",
  tipo_contrato: "mensalista",
  valor_hora: "",
  permitir_localizacao: "conta",
  permitir_offline: "conta",
  permitir_qualquer_dispositivo: false,
};

const ESTADO_CIVIL = ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "União estável"];
const ESCOLARIDADE = [
  "Analfabeto", "Fundamental incompleto", "Fundamental completo",
  "Médio incompleto", "Médio completo", "Superior incompleto",
  "Superior completo", "Pós-graduação", "Mestrado", "Doutorado"
];
const ETNIAS = ["Branca", "Preta", "Parda", "Amarela", "Indígena", "Não informado"];
const TIPO_DEP = ["Cônjuge", "Filho(a)", "Enteado(a)", "Pais", "Outro"];
const TIPO_DOC = ["RG", "CNH", "CTPS", "Título de Eleitor", "Reservista", "Passaporte", "Outro"];

export default function PontoFuncionarios() {
  const { empresaId } = usePontoEmpresa();
  const [items, setItems] = useState<Func[]>([]);
  const [filiais, setFiliais] = useState<any[]>([]);
  const [escalas, setEscalas] = useState<any[]>([]);
  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const [cargos, setCargos] = useState<any[]>([]);
  const [equipes, setEquipes] = useState<any[]>([]);
  const [exportLayouts, setExportLayouts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Func | null>(null);
  const [editing, setEditing] = useState<Func | null>(null);
  const [f, setF] = useState<any>(emptyForm);
  const [tab, setTab] = useState("definicoes");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loteOpen, setLoteOpen] = useState(false);


  const [dependentes, setDependentes] = useState<any[]>([]);
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [novoDep, setNovoDep] = useState<any>({ tipo: "", nome: "", cpf: "", data_nascimento: "", deduz_irrf: false, salario_familia: false, previdenciario: false });
  const [novoDoc, setNovoDoc] = useState<any>({ tipo: "", numero: "", orgao_expedidor: "", data_expedicao: "" });

  const load = async () => {
    if (!empresaId) return;
    const sb = supabase as any;
    const filtro = `empresa_id.eq.${empresaId},global.eq.true`;
    const [r1, r2, r3, rDep, rCar, rEqu, rLay] = await Promise.all([
      sb.from("ponto_funcionarios").select("*").eq("empresa_id", empresaId).order("nome"),
      sb.from("ponto_filiais").select("id, nome").eq("empresa_id", empresaId),
      sb.from("ponto_escalas").select("id, nome").eq("empresa_id", empresaId),
      sb.from("ponto_departamentos").select("id, nome").or(filtro).order("nome"),
      sb.from("ponto_cargos").select("id, nome, cbo").or(filtro).order("nome"),
      sb.from("ponto_equipes").select("id, nome").or(filtro).order("nome"),
      sb.from("ponto_export_layouts").select("id, descricao, software").eq("empresa_id", empresaId).eq("ativo", true).order("descricao"),
    ]);
    setItems((r1.data as any) || []);
    setFiliais(r2.data || []);
    setEscalas(r3.data || []);
    setDepartamentos(rDep.data || []);
    setCargos(rCar.data || []);
    setEquipes(rEqu.data || []);
    setExportLayouts(rLay.data || []);
  };
  useEffect(() => { load(); }, [empresaId]);

  const openCreate = () => {
    setEditing(null);
    setF(emptyForm);
    setDependentes([]);
    setDocumentos([]);
    setTab("definicoes");
    setOpen(true);
  };
  const openEdit = async (x: any) => {
    setEditing(x);
    const sb = supabase as any;
    const [mem, deps, docs] = await Promise.all([
      sb.from("ponto_equipe_membros").select("equipe_id").eq("funcionario_id", x.id).limit(1).maybeSingle(),
      sb.from("ponto_funcionario_dependentes").select("*").eq("funcionario_id", x.id).order("created_at"),
      sb.from("ponto_funcionario_documentos").select("*").eq("funcionario_id", x.id).order("created_at"),
    ]);
    setF({
      ...emptyForm,
      ...x,
      cpf: maskCPF(x.cpf ?? ""),
      pis: maskPIS(x.pis ?? ""),
      telefone: maskPhone(x.telefone ?? ""),
      telefone_alt: maskPhone(x.telefone_alt ?? ""),
      cep: maskCEP(x.cep ?? ""),
      equipe_id: mem.data?.equipe_id ?? "",
      jornada_contratada_horas: x.jornada_contratada_horas ?? "",
      valor_hora: x.valor_hora ?? "",
    });
    setDependentes(deps.data || []);
    setDocumentos(docs.data || []);
    setTab("definicoes");
    setOpen(true);
  };

  const cpfInvalid = !!f.cpf && !validateCPF(f.cpf);
  const pisInvalid = !!f.pis && !validatePIS(f.pis);
  const emailInvalid = !!f.email && !validateEmail(f.email);
  const phoneInvalid = !!f.telefone && !validatePhone(f.telefone);

  const save = async () => {
    if (!empresaId) return toast.error("Selecione uma empresa");
    if (!f.nome.trim() || !f.cpf) return toast.error("Nome e CPF obrigatórios");
    if (!validateCPF(f.cpf)) return toast.error("CPF inválido");
    if (!f.departamento_id) return toast.error("Departamento obrigatório");
    if (!f.cargo_id) return toast.error("Cargo obrigatório");
    if (!f.equipe_id) return toast.error("Equipe obrigatória");
    if (!f.escala_id) return toast.error("Escala obrigatória");
    if (f.pis && !validatePIS(f.pis)) return toast.error("PIS inválido");
    if (f.email && !validateEmail(f.email)) return toast.error("E-mail inválido");

    const cargoNome = cargos.find((c) => c.id === f.cargo_id)?.nome ?? null;
    const payload: any = {
      empresa_id: empresaId,
      nome: f.nome.trim(),
      sobrenome: f.sobrenome?.trim() || null,
      cpf: f.cpf.replace(/\D/g, ""),
      pis: f.pis.replace(/\D/g, "") || null,
      matricula: f.matricula?.trim() || null,
      matricula_esocial: f.matricula_esocial?.trim() || null,
      centro_custo: f.centro_custo?.trim() || null,
      pin: f.pin?.trim() || null,
      foto_url: f.foto_url?.trim() || null,
      eh_clt: !!f.eh_clt,
      registra_ponto: !!f.registra_ponto,
      tipo_registro_ponto: f.tipo_registro_ponto || null,
      cargo_id: f.cargo_id,
      cargo: cargoNome,
      departamento_id: f.departamento_id,
      email: f.email?.trim() || null,
      telefone: f.telefone.replace(/\D/g, "") || null,
      telefone_alt: f.telefone_alt.replace(/\D/g, "") || null,
      email_alt: f.email_alt?.trim() || null,
      admissao: f.admissao || null,
      filial_id: f.filial_id || null,
      escala_id: f.escala_id || null,
      codigo_dominio: f.codigo_dominio?.trim() || null,
      layout_exportacao_id: f.layout_exportacao_id || null,
      data_nascimento: f.data_nascimento || null,
      eh_aposentado: !!f.eh_aposentado,
      pais_nascimento: f.pais_nascimento || null,
      cidade_nascimento: f.cidade_nascimento || null,
      estado_civil: f.estado_civil || null,
      genero: f.genero || null,
      nome_mae: f.nome_mae || null,
      nome_pai: f.nome_pai || null,
      etnia: f.etnia || null,
      escolaridade: f.escolaridade || null,
      notas: f.notas || null,
      cep: f.cep.replace(/\D/g, "") || null,
      cidade: f.cidade || null,
      uf: f.uf || null,
      tipo_local: f.tipo_local || null,
      endereco: f.endereco || null,
      numero: f.numero || null,
      complemento: f.complemento || null,
      bairro: f.bairro || null,
      deficiencia_fisica: !!f.deficiencia_fisica,
      deficiencia_mental: !!f.deficiencia_mental,
      deficiencia_auditiva: !!f.deficiencia_auditiva,
      deficiencia_intelectual: !!f.deficiencia_intelectual,
      deficiencia_visual: !!f.deficiencia_visual,
      reabilitado: !!f.reabilitado,
      notas_especiais: f.notas_especiais || null,
      config_controle_ponto: f.config_controle_ponto || null,
      data_inicio_ponto: f.data_inicio_ponto || null,
      jornada_contratada_horas: f.jornada_contratada_horas ? Number(f.jornada_contratada_horas) : null,
      tipo_contrato: f.tipo_contrato || null,
      valor_hora: f.valor_hora ? Number(f.valor_hora) : null,
      permitir_localizacao: f.permitir_localizacao || null,
      permitir_offline: f.permitir_offline || null,
      permitir_qualquer_dispositivo: !!f.permitir_qualquer_dispositivo,
    };

    let funcionarioId = editing?.id;
    if (editing) {
      const { error } = await supabase.from("ponto_funcionarios").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { data, error } = await supabase.from("ponto_funcionarios").insert(payload).select("id").single();
      if (error) return toast.error(error.message);
      funcionarioId = (data as any)?.id;
    }

    const sb = supabase as any;
    if (funcionarioId) {
      await sb.from("ponto_equipe_membros").delete().eq("funcionario_id", funcionarioId);
      await sb.from("ponto_equipe_membros").insert({ funcionario_id: funcionarioId, equipe_id: f.equipe_id });
      // dependentes
      await sb.from("ponto_funcionario_dependentes").delete().eq("funcionario_id", funcionarioId);
      if (dependentes.length) {
        await sb.from("ponto_funcionario_dependentes").insert(
          dependentes.map((d) => ({
            funcionario_id: funcionarioId, tipo: d.tipo, nome: d.nome,
            cpf: d.cpf?.replace(/\D/g, "") || null,
            data_nascimento: d.data_nascimento || null,
            deduz_irrf: !!d.deduz_irrf, salario_familia: !!d.salario_familia, previdenciario: !!d.previdenciario,
          }))
        );
      }
      // documentos
      await sb.from("ponto_funcionario_documentos").delete().eq("funcionario_id", funcionarioId);
      if (documentos.length) {
        await sb.from("ponto_funcionario_documentos").insert(
          documentos.map((d) => ({
            funcionario_id: funcionarioId, tipo: d.tipo, numero: d.numero,
            orgao_expedidor: d.orgao_expedidor || null,
            data_expedicao: d.data_expedicao || null,
          }))
        );
      }
    }

    toast.success("Salvo");
    setOpen(false);
    load();
  };

  const remove = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("ponto_funcionarios").delete().eq("id", deleting.id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    setDeleting(null);
    load();
  };

  const addDep = () => {
    if (!novoDep.tipo || !novoDep.nome) return toast.error("Tipo e Nome obrigatórios");
    setDependentes([...dependentes, { ...novoDep, id: crypto.randomUUID() }]);
    setNovoDep({ tipo: "", nome: "", cpf: "", data_nascimento: "", deduz_irrf: false, salario_familia: false, previdenciario: false });
  };
  const addDoc = () => {
    if (!novoDoc.tipo || !novoDoc.numero) return toast.error("Tipo e Número obrigatórios");
    setDocumentos([...documentos, { ...novoDoc, id: crypto.randomUUID() }]);
    setNovoDoc({ tipo: "", numero: "", orgao_expedidor: "", data_expedicao: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Funcionários</h2>
          <p className="text-sm text-muted-foreground">Cadastro completo de colaboradores</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {selected.size > 0 && (
            <Button variant="secondary" onClick={() => setLoteOpen(true)} className="w-full sm:w-auto">
              <Layers className="mr-2 h-4 w-4" /> Editar em lote ({selected.size})
            </Button>
          )}
          <Button onClick={openCreate} disabled={!empresaId} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> Novo
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {empresaId ? "Nenhum funcionário cadastrado." : "Cadastre uma empresa primeiro."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border resp-table-wrap">
          <table className="w-full table-fixed text-sm resp-table">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3 w-10">
                  <Checkbox
                    checked={items.length > 0 && selected.size === items.length}
                    onCheckedChange={(v) => {
                      if (v) setSelected(new Set(items.map((i) => i.id)));
                      else setSelected(new Set());
                    }}
                  />
                </th>
                <th className="p-3">Nome</th>
                <th className="p-3 hidden sm:table-cell">CPF</th>
                <th className="p-3 hidden md:table-cell">Matrícula</th>
                <th className="p-3 hidden lg:table-cell">Cargo</th>
                <th className="p-3">Status</th>
                <th className="p-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => (
                <tr key={x.id} className="border-t">
                  <td className="p-3">
                    <Checkbox
                      checked={selected.has(x.id)}
                      onCheckedChange={(v) => {
                        const ns = new Set(selected);
                        if (v) ns.add(x.id); else ns.delete(x.id);
                        setSelected(ns);
                      }}
                    />
                  </td>
                  <td className="p-3 font-medium">{x.nome} {x.sobrenome || ""}</td>
                  <td className="p-3 hidden sm:table-cell">{maskCPF(x.cpf)}</td>
                  <td className="p-3 hidden md:table-cell">{x.matricula}</td>
                  <td className="p-3 hidden lg:table-cell">{x.cargo}</td>
                  <td className="p-3">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs">{x.status}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(x)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleting(x)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar funcionário" : "Novo funcionário"}</DialogTitle>
          </DialogHeader>

          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <div className="sm:hidden mb-2">
              <Select value={tab} onValueChange={setTab}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="definicoes">Definições</SelectItem>
                  <SelectItem value="pessoais">Dados pessoais</SelectItem>
                  <SelectItem value="contato">Contato/Endereço</SelectItem>
                  <SelectItem value="empresa">Dados da empresa</SelectItem>
                  <SelectItem value="dependentes">Dependentes</SelectItem>
                  <SelectItem value="documentos">Documentos</SelectItem>
                  <SelectItem value="especiais">Inf. especiais</SelectItem>
                  <SelectItem value="extras">Config. extras</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <TabsList className="hidden sm:flex flex-wrap h-auto gap-1">
              <TabsTrigger value="definicoes">Definições</TabsTrigger>
              <TabsTrigger value="pessoais">Dados pessoais</TabsTrigger>
              <TabsTrigger value="contato">Contato/Endereço</TabsTrigger>
              <TabsTrigger value="empresa">Dados da empresa</TabsTrigger>
              <TabsTrigger value="dependentes">Dependentes</TabsTrigger>
              <TabsTrigger value="documentos">Documentos</TabsTrigger>
              <TabsTrigger value="especiais">Inf. especiais</TabsTrigger>
              <TabsTrigger value="extras">Config. extras</TabsTrigger>
            </TabsList>

            {/* DEFINIÇÕES */}
            <TabsContent value="definicoes" className="grid gap-3 sm:grid-cols-2 mt-4">
              <div className="flex items-center gap-2"><Switch checked={f.eh_clt} onCheckedChange={(v) => setF({ ...f, eh_clt: v })} /><Label>É CLT?</Label></div>
              <div className="flex items-center gap-2"><Switch checked={f.registra_ponto} onCheckedChange={(v) => setF({ ...f, registra_ponto: v })} /><Label>Registra ponto?</Label></div>
              <div className="sm:col-span-2">
                <Label>Tipo de registro de ponto *</Label>
                <Select value={f.tipo_registro_ponto || undefined} onValueChange={(v) => setF({ ...f, tipo_registro_ponto: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relogio">Relógio ponto</SelectItem>
                    <SelectItem value="app">Aplicativo</SelectItem>
                    <SelectItem value="web">Web</SelectItem>
                    <SelectItem value="totem">Totem QR Code</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Primeiro nome *</Label><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
              <div><Label>Sobrenome</Label><Input value={f.sobrenome} onChange={(e) => setF({ ...f, sobrenome: e.target.value })} /></div>
              <div>
                <Label>CPF *</Label>
                <MaskedInput mask={maskCPF} value={f.cpf} onValueChange={(v) => setF({ ...f, cpf: v })} invalid={cpfInvalid} placeholder="000.000.000-00" />
                {cpfInvalid && <p className="mt-1 text-xs text-destructive">CPF inválido</p>}
              </div>
              <div>
                <Label>PIS / PASEP</Label>
                <MaskedInput mask={maskPIS} value={f.pis} onValueChange={(v) => setF({ ...f, pis: v })} invalid={pisInvalid} placeholder="000.00000.00-0" />
                {pisInvalid && <p className="mt-1 text-xs text-destructive">PIS inválido</p>}
              </div>
              <div><Label>Matrícula eSocial</Label><Input value={f.matricula_esocial} onChange={(e) => setF({ ...f, matricula_esocial: e.target.value })} /></div>
              <div><Label>Matrícula</Label><Input value={f.matricula} onChange={(e) => setF({ ...f, matricula: e.target.value })} /></div>
              <div><Label>Centro de custo</Label><Input value={f.centro_custo} onChange={(e) => setF({ ...f, centro_custo: e.target.value })} /></div>
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={emailInvalid ? "border-destructive" : ""} />
                {emailInvalid && <p className="mt-1 text-xs text-destructive">E-mail inválido</p>}
              </div>
              <div><Label>PIN</Label><Input value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value })} placeholder="PIN para registro de ponto" /></div>
              <div><Label>Código Domínio</Label><Input value={f.codigo_dominio} onChange={(e) => setF({ ...f, codigo_dominio: e.target.value })} /></div>
              <div>
                <Label>Layout de exportação</Label>
                <Select value={f.layout_exportacao_id || "_none"} onValueChange={(v) => setF({ ...f, layout_exportacao_id: v === "_none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Usa padrão da exportação" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Usar layout padrão —</SelectItem>
                    {exportLayouts.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.descricao || l.software}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">Define o layout de folha usado na exportação consolidada (ex.: funcionários com HE 60% em layout próprio).</p>
              </div>
              <div><Label>Admissão</Label><Input type="date" value={f.admissao} onChange={(e) => setF({ ...f, admissao: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>URL da foto</Label><Input value={f.foto_url} onChange={(e) => setF({ ...f, foto_url: e.target.value })} placeholder="https://..." /></div>
            </TabsContent>

            {/* DADOS PESSOAIS */}
            <TabsContent value="pessoais" className="grid gap-3 sm:grid-cols-2 mt-4">
              <div><Label>Data de nascimento</Label><Input type="date" value={f.data_nascimento} onChange={(e) => setF({ ...f, data_nascimento: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={f.eh_aposentado} onCheckedChange={(v) => setF({ ...f, eh_aposentado: v })} /><Label>É aposentado</Label></div>
              <div><Label>País de nascimento</Label><Input value={f.pais_nascimento} onChange={(e) => setF({ ...f, pais_nascimento: e.target.value })} /></div>
              <div><Label>Cidade de nascimento</Label><Input value={f.cidade_nascimento} onChange={(e) => setF({ ...f, cidade_nascimento: e.target.value })} /></div>
              <div>
                <Label>Estado civil</Label>
                <Select value={f.estado_civil || undefined} onValueChange={(v) => setF({ ...f, estado_civil: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{ESTADO_CIVIL.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Gênero</Label>
                <Select value={f.genero || undefined} onValueChange={(v) => setF({ ...f, genero: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Feminino">Feminino</SelectItem>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Nome da mãe</Label><Input value={f.nome_mae} onChange={(e) => setF({ ...f, nome_mae: e.target.value })} /></div>
              <div><Label>Nome do pai</Label><Input value={f.nome_pai} onChange={(e) => setF({ ...f, nome_pai: e.target.value })} /></div>
              <div>
                <Label>Etnia</Label>
                <Select value={f.etnia || undefined} onValueChange={(v) => setF({ ...f, etnia: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{ETNIAS.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Escolaridade</Label>
                <Select value={f.escolaridade || undefined} onValueChange={(v) => setF({ ...f, escolaridade: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{ESCOLARIDADE.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2"><Label>Notas</Label><Textarea value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} /></div>
            </TabsContent>

            {/* CONTATO/ENDEREÇO */}
            <TabsContent value="contato" className="grid gap-3 sm:grid-cols-2 mt-4">
              <div>
                <Label>Telefone principal</Label>
                <MaskedInput mask={maskPhone} value={f.telefone} onValueChange={(v) => setF({ ...f, telefone: v })} invalid={phoneInvalid} placeholder="(00) 00000-0000" />
              </div>
              <div>
                <Label>Telefone alternativo</Label>
                <MaskedInput mask={maskPhone} value={f.telefone_alt} onValueChange={(v) => setF({ ...f, telefone_alt: v })} placeholder="(00) 00000-0000" />
              </div>
              <div className="sm:col-span-2"><Label>E-mail alternativo</Label><Input value={f.email_alt} onChange={(e) => setF({ ...f, email_alt: e.target.value })} /></div>
              <div>
                <Label>CEP</Label>
                <MaskedInput mask={maskCEP} value={f.cep} onValueChange={(v) => setF({ ...f, cep: v })} placeholder="00000-000" />
              </div>
              <div><Label>Cidade</Label><Input value={f.cidade} onChange={(e) => setF({ ...f, cidade: e.target.value })} /></div>
              <div><Label>UF</Label><Input maxLength={2} value={f.uf} onChange={(e) => setF({ ...f, uf: e.target.value.toUpperCase() })} /></div>
              <div>
                <Label>Tipo de local</Label>
                <Select value={f.tipo_local || undefined} onValueChange={(v) => setF({ ...f, tipo_local: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Rua">Rua</SelectItem>
                    <SelectItem value="Avenida">Avenida</SelectItem>
                    <SelectItem value="Travessa">Travessa</SelectItem>
                    <SelectItem value="Praça">Praça</SelectItem>
                    <SelectItem value="Rodovia">Rodovia</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2"><Label>Endereço</Label><Input value={f.endereco} onChange={(e) => setF({ ...f, endereco: e.target.value })} /></div>
              <div><Label>Número</Label><Input value={f.numero} onChange={(e) => setF({ ...f, numero: e.target.value })} /></div>
              <div><Label>Complemento</Label><Input value={f.complemento} onChange={(e) => setF({ ...f, complemento: e.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Bairro</Label><Input value={f.bairro} onChange={(e) => setF({ ...f, bairro: e.target.value })} /></div>
            </TabsContent>

            {/* EMPRESA */}
            <TabsContent value="empresa" className="grid gap-3 sm:grid-cols-2 mt-4">
              <div>
                <Label>Departamento *</Label>
                <Select value={f.departamento_id || undefined} onValueChange={(v) => setF({ ...f, departamento_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {departamentos.map((x) => <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cargo *</Label>
                <Select value={f.cargo_id || undefined} onValueChange={(v) => setF({ ...f, cargo_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {cargos.map((x) => <SelectItem key={x.id} value={x.id}>{x.nome}{x.cbo ? ` (${x.cbo})` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Equipe *</Label>
                <Select value={f.equipe_id || undefined} onValueChange={(v) => setF({ ...f, equipe_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{equipes.map((x) => <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Filial</Label>
                <Select value={f.filial_id || undefined} onValueChange={(v) => setF({ ...f, filial_id: v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{filiais.map((x) => <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Escala / Turno *</Label>
                <Select value={f.escala_id || undefined} onValueChange={(v) => setF({ ...f, escala_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{escalas.map((x) => <SelectItem key={x.id} value={x.id}>{x.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* DEPENDENTES */}
            <TabsContent value="dependentes" className="space-y-4 mt-4">
              <div className="rounded-lg border p-3 space-y-3">
                <p className="text-sm font-medium">Adicionar dependente</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Tipo *</Label>
                    <Select value={novoDep.tipo || undefined} onValueChange={(v) => setNovoDep({ ...novoDep, tipo: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{TIPO_DEP.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Nome completo *</Label><Input value={novoDep.nome} onChange={(e) => setNovoDep({ ...novoDep, nome: e.target.value })} /></div>
                  <div><Label>CPF</Label><MaskedInput mask={maskCPF} value={novoDep.cpf} onValueChange={(v) => setNovoDep({ ...novoDep, cpf: v })} /></div>
                  <div><Label>Data nascimento</Label><Input type="date" value={novoDep.data_nascimento} onChange={(e) => setNovoDep({ ...novoDep, data_nascimento: e.target.value })} /></div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2"><Switch checked={novoDep.deduz_irrf} onCheckedChange={(v) => setNovoDep({ ...novoDep, deduz_irrf: v })} /><Label>Dedução IRRF</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={novoDep.salario_familia} onCheckedChange={(v) => setNovoDep({ ...novoDep, salario_familia: v })} /><Label>Salário-família</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={novoDep.previdenciario} onCheckedChange={(v) => setNovoDep({ ...novoDep, previdenciario: v })} /><Label>Previdenciário</Label></div>
                </div>
                <Button type="button" size="sm" onClick={addDep}><Plus className="mr-1 h-4 w-4" /> Adicionar</Button>
              </div>
              {dependentes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum dependente cadastrado.</p>
              ) : (
                <div className="space-y-2">
                  {dependentes.map((d, i) => (
                    <div key={d.id} className="flex items-center justify-between rounded border p-2 text-sm">
                      <div><strong>{d.tipo}</strong> — {d.nome} {d.cpf && `(${maskCPF(d.cpf)})`}</div>
                      <Button size="icon" variant="ghost" onClick={() => setDependentes(dependentes.filter((_, idx) => idx !== i))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* DOCUMENTOS */}
            <TabsContent value="documentos" className="space-y-4 mt-4">
              <div className="rounded-lg border p-3 space-y-3">
                <p className="text-sm font-medium">Adicionar documento</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Tipo *</Label>
                    <Select value={novoDoc.tipo || undefined} onValueChange={(v) => setNovoDoc({ ...novoDoc, tipo: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{TIPO_DOC.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Número *</Label><Input value={novoDoc.numero} onChange={(e) => setNovoDoc({ ...novoDoc, numero: e.target.value })} /></div>
                  <div><Label>Órgão expedidor</Label><Input value={novoDoc.orgao_expedidor} onChange={(e) => setNovoDoc({ ...novoDoc, orgao_expedidor: e.target.value })} /></div>
                  <div><Label>Data de expedição</Label><Input type="date" value={novoDoc.data_expedicao} onChange={(e) => setNovoDoc({ ...novoDoc, data_expedicao: e.target.value })} /></div>
                </div>
                <Button type="button" size="sm" onClick={addDoc}><Plus className="mr-1 h-4 w-4" /> Adicionar</Button>
              </div>
              {documentos.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum documento cadastrado.</p>
              ) : (
                <div className="space-y-2">
                  {documentos.map((d, i) => (
                    <div key={d.id} className="flex items-center justify-between rounded border p-2 text-sm">
                      <div><strong>{d.tipo}</strong> — {d.numero} {d.orgao_expedidor && `· ${d.orgao_expedidor}`}</div>
                      <Button size="icon" variant="ghost" onClick={() => setDocumentos(documentos.filter((_, idx) => idx !== i))}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* INF ESPECIAIS */}
            <TabsContent value="especiais" className="grid gap-3 sm:grid-cols-2 mt-4">
              <div className="flex items-center gap-2"><Switch checked={f.deficiencia_fisica} onCheckedChange={(v) => setF({ ...f, deficiencia_fisica: v })} /><Label>Possui deficiência física</Label></div>
              <div className="flex items-center gap-2"><Switch checked={f.deficiencia_mental} onCheckedChange={(v) => setF({ ...f, deficiencia_mental: v })} /><Label>Possui deficiência mental</Label></div>
              <div className="flex items-center gap-2"><Switch checked={f.deficiencia_auditiva} onCheckedChange={(v) => setF({ ...f, deficiencia_auditiva: v })} /><Label>Possui deficiência auditiva</Label></div>
              <div className="flex items-center gap-2"><Switch checked={f.deficiencia_intelectual} onCheckedChange={(v) => setF({ ...f, deficiencia_intelectual: v })} /><Label>Possui deficiência intelectual</Label></div>
              <div className="flex items-center gap-2"><Switch checked={f.deficiencia_visual} onCheckedChange={(v) => setF({ ...f, deficiencia_visual: v })} /><Label>Possui deficiência visual</Label></div>
              <div className="flex items-center gap-2"><Switch checked={f.reabilitado} onCheckedChange={(v) => setF({ ...f, reabilitado: v })} /><Label>É reabilitado/readaptado</Label></div>
              <div className="sm:col-span-2"><Label>Notas</Label><Textarea value={f.notas_especiais} onChange={(e) => setF({ ...f, notas_especiais: e.target.value })} /></div>
            </TabsContent>

            {/* EXTRAS */}
            <TabsContent value="extras" className="grid gap-3 sm:grid-cols-2 mt-4">
              <div><Label>Configurações de controle de ponto</Label><Input value={f.config_controle_ponto} onChange={(e) => setF({ ...f, config_controle_ponto: e.target.value })} placeholder="Ex: HE 60 / 100%" /></div>
              <div><Label>Data de início no controle de ponto</Label><Input type="date" value={f.data_inicio_ponto} onChange={(e) => setF({ ...f, data_inicio_ponto: e.target.value })} /></div>
              <div><Label>Jornada contratada (horas semanais)</Label><Input type="number" step="0.01" value={f.jornada_contratada_horas} onChange={(e) => setF({ ...f, jornada_contratada_horas: e.target.value })} placeholder="Ex: 44" /></div>
              <div><Label>Valor/Hora</Label><Input type="number" step="0.01" value={f.valor_hora} onChange={(e) => setF({ ...f, valor_hora: e.target.value })} /></div>
              <div>
                <Label>Tipo de contrato</Label>
                <Select value={f.tipo_contrato || undefined} onValueChange={(v) => setF({ ...f, tipo_contrato: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensalista">Mensalista</SelectItem>
                    <SelectItem value="comissionista">Comissionista</SelectItem>
                    <SelectItem value="horista">Horista</SelectItem>
                    <SelectItem value="diarista">Diarista</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2"><Switch checked={f.permitir_qualquer_dispositivo} onCheckedChange={(v) => setF({ ...f, permitir_qualquer_dispositivo: v })} /><Label>Permitir registro em qualquer dispositivo</Label></div>
              <div>
                <Label>Permitir enviar localização?</Label>
                <Select value={f.permitir_localizacao} onValueChange={(v) => setF({ ...f, permitir_localizacao: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                    <SelectItem value="conta">Usar configuração da conta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Permitir registrar ponto offline?</Label>
                <Select value={f.permitir_offline} onValueChange={(v) => setF({ ...f, permitir_offline: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                    <SelectItem value="conta">Usar configuração da conta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        onConfirm={remove}
        itemName={deleting?.nome ?? ""}
        title="Excluir funcionário"
      />

      <PontoFuncionariosLoteDialog
        open={loteOpen}
        onOpenChange={setLoteOpen}
        selectedIds={Array.from(selected)}
        empresaId={empresaId || ""}
        cargos={cargos}
        departamentos={departamentos}
        equipes={equipes}
        filiais={filiais}
        escalas={escalas}
        exportLayouts={exportLayouts.map((l) => ({ id: l.id, descricao: l.descricao }))}
        onSaved={() => { setSelected(new Set()); load(); }}
      />
    </div>
  );
}
