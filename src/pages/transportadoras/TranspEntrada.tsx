import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { NfeScannerDialog } from "@/components/transportadoras/NfeScannerDialog";
import { formatarChave, parseChaveNfe } from "@/lib/transportadoras/nfe";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  LogIn, Truck, User, CheckCircle, ChevronRight, ChevronLeft, Camera, Plus, Search,
  ScanLine, PackageCheck, PackageOpen, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { CVPageHeader } from "@/pages/controle-veiculos/CVPageHeader";
import { CVPhotoCapture, type CapturedPhoto, type PhotoAngle } from "@/components/cv/CVPhotoCapture";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import {
  TRANSP_ANGLES, TIPOS_VEICULO_TRANSP, listarTransportadoras, listarSetores,
  maskPlaca, normalizePlaca, maskWhatsapp, maskCpf, validarCpf, nomeTransportadora, linkAvisoSetor, OPERACOES,
  SEM_TRANSPORTADORA, idTransportadora,
  type TranspEmpresa, type TranspMotorista, type TranspVeiculo, type TranspSetor,
} from "@/lib/transportadoras/dados";
import { NovaTransportadoraDialog } from "@/components/transportadoras/NovaTransportadoraDialog";

export default function TranspEntrada() {
  const [empresas, setEmpresas] = useState<TranspEmpresa[]>([]);
  const [veiculos, setVeiculos] = useState<TranspVeiculo[]>([]);
  const [motoristas, setMotoristas] = useState<TranspMotorista[]>([]);
  const [setores, setSetores] = useState<TranspSetor[]>([]);
  const [dentroVeiculoIds, setDentroVeiculoIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [buscaV, setBuscaV] = useState("");
  const [buscaM, setBuscaM] = useState("");
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [sucesso, setSucesso] = useState<any>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [novaEmpresa, setNovaEmpresa] = useState(false);
  const [angles, setAngles] = useState<PhotoAngle[]>(TRANSP_ANGLES);
  const [photosRequired, setPhotosRequired] = useState(true);

  const [form, setForm] = useState({
    tipo_operacao: "" as "" | "entrega" | "coleta",
    transportadora_id: SEM_TRANSPORTADORA,
    veiculo_id: "",
    motorista_id: "",
    setor_id: "",
    nfe_chave: "",
    entrada_obs: "",
  });

  const entrega = form.tipo_operacao === "entrega";
  const STEPS = useMemo(
    () => ["Operação", "Veículo", "Motorista", entrega ? "NF-e e setor" : "Detalhes", "Fotos"],
    [entrega],
  );

  const nfeInfo = useMemo(() => (form.nfe_chave ? parseChaveNfe(form.nfe_chave) : null), [form.nfe_chave]);

  const [novoVeiculo, setNovoVeiculo] = useState({ open: false, placa: "", descricao: "", tipo_veiculo: "" });
  const [novoMotorista, setNovoMotorista] = useState({ open: false, nome: "", cpf: "", whatsapp: "" });

  const load = async () => {
    setLoading(true);
    const [emp, st, v, m, mov, cfg] = await Promise.all([
      listarTransportadoras(),
      listarSetores(),
      supabase.from("transp_veiculos").select("*").eq("ativo", true).order("placa"),
      supabase.from("transp_motoristas").select("*").eq("ativo", true).order("nome"),
      supabase.from("transp_movimentos").select("veiculo_id").neq("status", "saiu"),
      supabase.from("cv_inspection_config").select("*").eq("active", true).limit(1).maybeSingle(),
    ]);
    const cfgAngles = ((cfg.data as any)?.entry_photos ?? []) as PhotoAngle[];
    setAngles(cfgAngles.length ? cfgAngles : TRANSP_ANGLES);
    setPhotosRequired((cfg.data as any)?.entry_photos_required ?? true);
    setEmpresas(emp);
    setSetores(st);
    setVeiculos((v.data ?? []) as any);
    setMotoristas((m.data ?? []) as any);
    setDentroVeiculoIds(new Set(((mov.data ?? []) as any[]).map((x) => x.veiculo_id).filter(Boolean)));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const buscaVNorm = normalizePlaca(buscaV);
  const veiculosFiltrados = useMemo(() => veiculos.filter((v) =>
    !buscaVNorm || normalizePlaca(v.placa).includes(buscaVNorm) || (v.descricao ?? "").toLowerCase().includes(buscaV.toLowerCase())
  ), [veiculos, buscaV, buscaVNorm]);

  const motoristasFiltrados = useMemo(() => motoristas.filter((m) =>
    !buscaM || `${m.nome} ${m.cpf ?? ""} ${m.whatsapp ?? ""}`.toLowerCase().includes(buscaM.toLowerCase())
  ), [motoristas, buscaM]);

  const veiculoSel = veiculos.find((v) => v.id === form.veiculo_id);
  const motoristaSel = motoristas.find((m) => m.id === form.motorista_id);
  const empresaSel = empresas.find((e) => e.id === form.transportadora_id);
  const setorSel = setores.find((s) => s.id === form.setor_id);

  const canNext = () => {
    if (step === 0) return !!form.tipo_operacao;
    if (step === 1) return !!form.veiculo_id;
    if (step === 2) return !!form.motorista_id;
    if (step === 3 && entrega) return !!form.setor_id;
    return true;
  };

  const goNext = () => {
    if (!canNext()) {
      if (step === 3) return toast.error("Escolha o setor a ser avisado");
      return toast.error("Complete os campos obrigatórios");
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const criarVeiculo = async () => {
    const placa = maskPlaca(novoVeiculo.placa);
    if (!normalizePlaca(placa)) return toast.error("Placa obrigatória");
    if (!novoVeiculo.tipo_veiculo) return toast.error("Tipo de veículo obrigatório");
    const estId = await getEstabelecimentoId();
    if (!estId) return toast.error("Estabelecimento não encontrado");
    const { data, error } = await supabase.from("transp_veiculos").insert({
      estabelecimento_id: estId,
      transportadora_id: idTransportadora(form.transportadora_id),
      placa,
      descricao: novoVeiculo.descricao.toUpperCase() || null,
      tipo_veiculo: novoVeiculo.tipo_veiculo,
      ativo: true,
    } as any).select().single();
    if (error || !data) return toast.error(error?.message ?? "Erro ao criar veículo");
    setVeiculos((p) => [...p, data as any]);
    setForm((f) => ({ ...f, veiculo_id: (data as any).id }));
    setNovoVeiculo({ open: false, placa: "", descricao: "", tipo_veiculo: "" });
    toast.success("Veículo cadastrado e selecionado");
  };

  const criarMotorista = async () => {
    if (!novoMotorista.nome.trim()) return toast.error("Nome obrigatório");
    const cpfLimpo = novoMotorista.cpf.replace(/\D/g, "");
    if (!cpfLimpo) return toast.error("CPF obrigatório");
    if (cpfLimpo.length !== 11) return toast.error("CPF deve ter 11 dígitos");
    if (!validarCpf(cpfLimpo)) return toast.error("CPF inválido");
    if (!novoMotorista.whatsapp.replace(/\D/g, "")) return toast.error("WhatsApp / celular obrigatório");
    const estId = await getEstabelecimentoId();
    if (!estId) return toast.error("Estabelecimento não encontrado");
    const { data, error } = await supabase.from("transp_motoristas").insert({
      estabelecimento_id: estId,
      transportadora_id: idTransportadora(form.transportadora_id),
      nome: novoMotorista.nome.trim().toUpperCase(),
      cpf: novoMotorista.cpf.replace(/\D/g, ""),
      cnh: null,
      whatsapp: novoMotorista.whatsapp.replace(/\D/g, "") || null,
      ativo: true,
    } as any).select().single();
    if (error || !data) return toast.error(error?.message ?? "Erro ao criar motorista");
    setMotoristas((p) => [...p, data as any]);
    setForm((f) => ({ ...f, motorista_id: (data as any).id }));
    setNovoMotorista({ open: false, nome: "", cpf: "", whatsapp: "" });
    toast.success("Motorista cadastrado e selecionado");
  };

  const salvar = async () => {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const estId = await getEstabelecimentoId();
    if (!estId) { setBusy(false); return toast.error("Estabelecimento não encontrado"); }
    const entrada = new Date();

    const { data: mv, error } = await supabase.from("transp_movimentos").insert({
      estabelecimento_id: estId,
      transportadora_id: idTransportadora(form.transportadora_id),
      veiculo_id: form.veiculo_id || null,
      motorista_id: form.motorista_id || null,
      setor_id: entrega ? (form.setor_id || null) : null,
      placa: veiculoSel?.placa ?? null,
      motorista_nome: motoristaSel?.nome ?? null,
      ajudante_nome: null,
      documento: null,
      motivo: null,
      tipo_operacao: form.tipo_operacao,
      nfe_chave: entrega ? (form.nfe_chave || null) : null,
      nfe_dados: entrega && nfeInfo ? nfeInfo : null,
      entrada_time: entrada.toISOString(),
      entrada_obs: form.entrada_obs || null,
      entrada_por: user?.id ?? null,
      status: "dentro",
    } as any).select().single();

    if (error || !mv) { setBusy(false); return toast.error(error?.message ?? "Erro ao registrar entrada"); }

    if (photos.length) {
      await supabase.from("transp_movimento_fotos").insert(
        photos.map((p) => ({
          movimento_id: (mv as any).id,
          stage: "entrada",
          angle_key: p.angle_key,
          angle_label: p.angle_label,
          photo_url: p.photo_url,
          caption: p.caption || null,
          is_extra: p.is_extra ?? false,
          created_by: user?.id ?? null,
        })) as any,
      );
    }

    setBusy(false);
    setSucesso({
      operacao: entrega ? "Entrega (descarregamento)" : "Coleta (carregamento)",
      transportadora: nomeTransportadora(empresaSel),
      placa: veiculoSel?.placa,
      motorista: motoristaSel?.nome,
      hora: entrada.toLocaleString("pt-BR"),
      fotos: photos.length,
      setor: setorSel ?? null,
      avisoTexto: setorSel
        ? `Chegou veículo ${veiculoSel?.placa ?? ""} (${motoristaSel?.nome ?? ""}) para descarregamento. NF-e ${form.nfe_chave.slice(25, 34).replace(/^0+/, "")}.`
        : "",
    });
    toast.success("Entrada registrada!");
    setForm({
      tipo_operacao: "", transportadora_id: SEM_TRANSPORTADORA, veiculo_id: "", motorista_id: "",
      setor_id: "", nfe_chave: "", entrada_obs: "",
    });
    setPhotos([]);
    setStep(0);
    load();
  };

  if (loading) {
    return <Card><CardContent className="p-8 text-center text-muted-foreground">Carregando...</CardContent></Card>;
  }

  return (
    <>
      <Dialog open={!!sucesso} onOpenChange={() => setSucesso(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-3 p-3 bg-emerald-500/10 rounded-full w-fit">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <DialogTitle className="text-center">Entrada registrada</DialogTitle>
          </DialogHeader>
          {sucesso && (
            <div className="space-y-2 text-center text-sm">
              <div className="p-3 bg-muted/50 rounded"><p className="text-xs text-muted-foreground">Operação</p><p className="font-semibold">{sucesso.operacao}</p></div>
              <div className="p-3 bg-muted/50 rounded"><p className="text-xs text-muted-foreground">Veículo</p><p className="font-semibold font-mono">{sucesso.placa}</p></div>
              <div className="p-3 bg-muted/50 rounded"><p className="text-xs text-muted-foreground">Motorista</p><p className="font-semibold">{sucesso.motorista}</p></div>
              <div className="p-3 bg-muted/50 rounded"><p className="text-xs text-muted-foreground">Data/Hora</p><p className="font-semibold">{sucesso.hora}</p></div>
              {sucesso.setor?.numeros?.length ? sucesso.setor.numeros.map((n) => (
                <Button key={n.id} variant="outline" className="w-full" asChild>
                  <a href={`https://wa.me/55${n.numero.replace(/\D/g, "")}?text=${encodeURIComponent(sucesso.avisoTexto)}`} target="_blank" rel="noreferrer">
                    Avisar {n.descricao || sucesso.setor.nome} ({maskWhatsapp(n.numero)})
                  </a>
                </Button>
              )) : sucesso.setor?.whatsapp && (
                <Button variant="outline" className="w-full" asChild>
                  <a href={linkAvisoSetor(sucesso.setor, sucesso.avisoTexto)} target="_blank" rel="noreferrer">
                    Avisar setor {sucesso.setor.nome} no WhatsApp
                  </a>
                </Button>
              )}
              <Button className="w-full" onClick={() => setSucesso(null)}>OK</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <NovaTransportadoraDialog
        open={novaEmpresa}
        onOpenChange={setNovaEmpresa}
        onCreated={(e) => { setEmpresas((p) => [...p, e]); setForm((f) => ({ ...f, transportadora_id: e.id })); }}
      />

      <NfeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onDetected={(chave) => {
          setForm((f) => ({ ...f, nfe_chave: chave }));
          toast.success("NF-e lida com sucesso");
        }}
      />

      <div className="space-y-4">
        <CVPageHeader icon={LogIn} title="Registrar Entrada" subtitle="Entrada de veículos de transportadoras" />

        <Card className="max-w-4xl mx-auto shadow-sm">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between gap-2 overflow-x-auto">
              {STEPS.map((label, i) => {
                const active = i === step;
                const done = i < step;
                return (
                  <div key={label} className="flex items-center gap-2 shrink-0">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 ${
                      active ? "border-primary bg-primary text-primary-foreground"
                        : done ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                        : "border-muted-foreground/30 text-muted-foreground"
                    }`}>
                      {done ? <CheckCircle className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className={`text-xs sm:text-sm hidden sm:inline ${active ? "font-semibold" : "text-muted-foreground"}`}>{label}</span>
                    {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                );
              })}
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 min-h-[340px] space-y-4">
            {step === 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-primary" /><h3 className="font-semibold">O veículo veio para quê?</h3></div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {OPERACOES.map((op) => {
                    const active = form.tipo_operacao === op.value;
                    const Icon = op.value === "entrega" ? PackageCheck : PackageOpen;
                    return (
                      <button key={op.value} type="button"
                        onClick={() => setForm({ ...form, tipo_operacao: op.value as any })}
                        className={`text-left p-5 rounded-lg border-2 transition-all hover:shadow-md ${active ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <Icon className={`h-6 w-6 ${active ? "text-primary" : "text-muted-foreground"}`} />
                          {active && <CheckCircle className="h-5 w-5 text-primary" />}
                        </div>
                        <p className="font-semibold">{op.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{op.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                  <div className="flex items-center gap-2"><Truck className="h-5 w-5 text-primary" /><h3 className="font-semibold">Pesquise ou cadastre o veículo</h3></div>
                  <Button size="sm" variant="outline" onClick={() => setNovoVeiculo({ ...novoVeiculo, open: true })}>
                    <Plus className="h-4 w-4 mr-1" />Novo veículo
                  </Button>
                </div>

                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Buscar placa..." value={buscaV} onChange={(e) => setBuscaV(maskPlaca(e.target.value))} maxLength={8} />
                </div>


                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {veiculosFiltrados.map((v) => {
                    const active = form.veiculo_id === v.id;
                    const dentro = dentroVeiculoIds.has(v.id);
                    return (
                      <button key={v.id} type="button" disabled={dentro}
                        onClick={() => setForm({ ...form, veiculo_id: v.id })}
                        className={`text-left p-4 rounded-lg border-2 transition-all ${
                          dentro ? "opacity-50 cursor-not-allowed border-border"
                            : active ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card hover:shadow-md"
                        }`}>
                        <div className="flex items-center justify-between mb-2">
                          <Truck className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                          {active && <CheckCircle className="h-5 w-5 text-primary" />}
                        </div>
                        <Badge variant="outline" className="font-mono text-xs">{maskPlaca(v.placa)}</Badge>
                        <p className="text-sm mt-1 truncate">{v.tipo_veiculo || "—"}</p>
                        {dentro && <p className="text-[11px] text-amber-600 mt-1">Já está dentro</p>}
                      </button>
                    );
                  })}
                  {veiculosFiltrados.length === 0 && <p className="text-sm text-muted-foreground">Nenhum veículo encontrado. Use "Novo veículo".</p>}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                  <div className="flex items-center gap-2"><User className="h-5 w-5 text-primary" /><h3 className="font-semibold">Pesquise ou cadastre o motorista</h3></div>
                  <Button size="sm" variant="outline" onClick={() => setNovoMotorista({ ...novoMotorista, open: true })}>
                    <Plus className="h-4 w-4 mr-1" />Novo motorista
                  </Button>
                </div>
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Buscar nome, CPF ou WhatsApp..." value={buscaM} onChange={(e) => setBuscaM(e.target.value)} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {motoristasFiltrados.map((m) => {
                    const active = form.motorista_id === m.id;
                    return (
                      <button key={m.id} type="button" onClick={() => setForm({ ...form, motorista_id: m.id })}
                        className={`text-left p-4 rounded-lg border-2 transition-all hover:shadow-md ${active ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <User className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                          {active && <CheckCircle className="h-5 w-5 text-primary" />}
                        </div>
                        <p className="font-semibold truncate">{m.nome}</p>
                        {m.cpf && <p className="text-xs text-muted-foreground">CPF {m.cpf}</p>}
                        {m.whatsapp && <p className="text-xs text-muted-foreground">{maskWhatsapp(m.whatsapp)}</p>}
                      </button>
                    );
                  })}
                  {motoristasFiltrados.length === 0 && <p className="text-sm text-muted-foreground">Nenhum motorista encontrado. Use "Novo motorista".</p>}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                {entrega && (
                  <>
                    <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /><h3 className="font-semibold">Nota fiscal e setor a avisar</h3></div>
                    <div className="rounded-lg border p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                        <div className="flex-1">
                          <Label>Chave da NF-e</Label>
                          <Input value={form.nfe_chave} onChange={(e) => setForm({ ...form, nfe_chave: e.target.value.replace(/\D/g, "").slice(0, 44) })}
                            placeholder="Leia o QR Code / código de barras (opcional)" inputMode="numeric" />
                        </div>
                        <Button onClick={() => setScannerOpen(true)}><ScanLine className="h-4 w-4 mr-1" />Ler NF-e</Button>
                      </div>
                      {nfeInfo && (
                        <div className="grid gap-2 sm:grid-cols-2 text-xs bg-muted/40 rounded p-3">
                          <p><span className="text-muted-foreground">Número/Série: </span><b>{nfeInfo.numero}/{nfeInfo.serie}</b></p>
                          <p><span className="text-muted-foreground">Emitente: </span><b>{nfeInfo.cnpj_emitente}</b></p>
                          <p><span className="text-muted-foreground">UF: </span><b>{nfeInfo.uf}</b></p>
                          <p><span className="text-muted-foreground">Emissão: </span><b>{nfeInfo.emissao}</b></p>
                          <p className="sm:col-span-2 font-mono break-all text-[10px]">{formatarChave(nfeInfo.chave)}</p>
                        </div>
                      )}
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                        <div className="flex-1">
                          <Label>Setor a ser avisado *</Label>
                          <Select value={form.setor_id} onValueChange={(v) => setForm({ ...form, setor_id: v })}>
                            <SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
                            <SelectContent>
                              {setores.map((s) => {
                                const nums = s.numeros?.length ? s.numeros.map((n) => maskWhatsapp(n.numero)).join(", ") : (s.whatsapp ? maskWhatsapp(s.whatsapp) : "");
                                return <SelectItem key={s.id} value={s.id}>{s.nome}{nums ? ` — ${nums}` : ""}</SelectItem>;
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div><Label>Observações da entrada</Label><Textarea rows={4} value={form.entrada_obs} onChange={(e) => setForm({ ...form, entrada_obs: e.target.value })} /></div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2"><Camera className="h-5 w-5 text-primary" /><h3 className="font-semibold">Fotos da entrada</h3></div>
                <p className="text-xs text-muted-foreground">Registro fotográfico simples — sem comparação ou validação de avarias.</p>
                <CVPhotoCapture angles={TRANSP_ANGLES} stage="entry" value={photos} onChange={setPhotos} aiCompare={false} />
              </div>
            )}
          </CardContent>

          <div className="flex justify-between gap-2 border-t p-4">
            <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
              <ChevronLeft className="h-4 w-4 mr-1" />Voltar
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={goNext}>Avançar<ChevronRight className="h-4 w-4 ml-1" /></Button>
            ) : (
              <Button onClick={salvar} disabled={busy}>{busy ? "Salvando..." : "Finalizar entrada"}</Button>
            )}
          </div>
        </Card>
      </div>

      {/* Novo veículo */}
      <Dialog open={novoVeiculo.open} onOpenChange={(o) => setNovoVeiculo({ ...novoVeiculo, open: o })}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo veículo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Placa *</Label><Input value={novoVeiculo.placa} onChange={(e) => setNovoVeiculo({ ...novoVeiculo, placa: maskPlaca(e.target.value) })} maxLength={8} /></div>

            <div>
              <Label>Tipo *</Label>
              <Select value={novoVeiculo.tipo_veiculo} onValueChange={(v) => setNovoVeiculo({ ...novoVeiculo, tipo_veiculo: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{TIPOS_VEICULO_TRANSP.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoVeiculo({ ...novoVeiculo, open: false })}>Cancelar</Button>
            <Button onClick={criarVeiculo}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Novo motorista */}
      <Dialog open={novoMotorista.open} onOpenChange={(o) => setNovoMotorista({ ...novoMotorista, open: o })}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo motorista</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={novoMotorista.nome} onChange={(e) => setNovoMotorista({ ...novoMotorista, nome: e.target.value.toUpperCase() })} /></div>
            <div><Label>CPF *</Label><Input value={maskCpf(novoMotorista.cpf)} onChange={(e) => setNovoMotorista({ ...novoMotorista, cpf: e.target.value.replace(/\D/g, "").slice(0, 11) })} inputMode="numeric" placeholder="000.000.000-00" /></div>
            <div><Label>WhatsApp / celular *</Label><Input value={novoMotorista.whatsapp} onChange={(e) => setNovoMotorista({ ...novoMotorista, whatsapp: maskWhatsapp(e.target.value) })} placeholder="(11) 90000-0000" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoMotorista({ ...novoMotorista, open: false })}>Cancelar</Button>
            <Button onClick={criarMotorista}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
