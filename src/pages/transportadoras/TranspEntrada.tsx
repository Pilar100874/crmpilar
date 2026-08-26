import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LogIn, Truck, User, FileText, CheckCircle, ChevronRight, Camera, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { CVPageHeader } from "@/pages/controle-veiculos/CVPageHeader";
import { CVPhotoCapture, type CapturedPhoto } from "@/components/cv/CVPhotoCapture";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import {
  TRANSP_ANGLES, TIPOS_VEICULO_TRANSP, listarTransportadoras, maskPlaca, maskWhatsapp,
  nomeTransportadora, type TranspEmpresa, type TranspMotorista, type TranspVeiculo,
} from "@/lib/transportadoras/dados";

const STEPS = ["Transportadora", "Veículo", "Motorista", "Detalhes", "Fotos"] as const;

export default function TranspEntrada() {
  const [empresas, setEmpresas] = useState<TranspEmpresa[]>([]);
  const [veiculos, setVeiculos] = useState<TranspVeiculo[]>([]);
  const [motoristas, setMotoristas] = useState<TranspMotorista[]>([]);
  const [dentroVeiculoIds, setDentroVeiculoIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [buscaV, setBuscaV] = useState("");
  const [buscaM, setBuscaM] = useState("");
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [sucesso, setSucesso] = useState<any>(null);

  const [form, setForm] = useState({
    transportadora_id: "",
    veiculo_id: "",
    motorista_id: "",
    ajudante_nome: "",
    documento: "",
    motivo: "",
    entrada_obs: "",
  });

  const [novoVeiculo, setNovoVeiculo] = useState<{ open: boolean; placa: string; descricao: string; tipo_veiculo: string }>({
    open: false, placa: "", descricao: "", tipo_veiculo: "",
  });
  const [novoMotorista, setNovoMotorista] = useState({ open: false, nome: "", cpf: "", cnh: "", whatsapp: "" });

  const load = async () => {
    setLoading(true);
    const [emp, v, m, mov] = await Promise.all([
      listarTransportadoras(),
      supabase.from("transp_veiculos").select("*").eq("ativo", true).order("placa"),
      supabase.from("transp_motoristas").select("*").eq("ativo", true).order("nome"),
      supabase.from("transp_movimentos").select("veiculo_id").eq("status", "dentro"),
    ]);
    setEmpresas(emp);
    setVeiculos((v.data ?? []) as any);
    setMotoristas((m.data ?? []) as any);
    setDentroVeiculoIds(new Set(((mov.data ?? []) as any[]).map((x) => x.veiculo_id).filter(Boolean)));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const veiculosFiltrados = useMemo(() => veiculos.filter((v) =>
    (!form.transportadora_id || v.transportadora_id === form.transportadora_id) &&
    (!buscaV || `${v.placa} ${v.descricao ?? ""}`.toLowerCase().includes(buscaV.toLowerCase()))
  ), [veiculos, form.transportadora_id, buscaV]);

  const motoristasFiltrados = useMemo(() => motoristas.filter((m) =>
    (!form.transportadora_id || m.transportadora_id === form.transportadora_id) &&
    (!buscaM || `${m.nome} ${m.cpf ?? ""}`.toLowerCase().includes(buscaM.toLowerCase()))
  ), [motoristas, form.transportadora_id, buscaM]);

  const veiculoSel = veiculos.find((v) => v.id === form.veiculo_id);
  const motoristaSel = motoristas.find((m) => m.id === form.motorista_id);
  const empresaSel = empresas.find((e) => e.id === form.transportadora_id);

  const canNext = () => {
    if (step === 0) return !!form.transportadora_id;
    if (step === 1) return !!form.veiculo_id;
    if (step === 2) return !!form.motorista_id;
    return true;
  };
  const goNext = () => {
    if (!canNext()) return toast.error("Complete os campos obrigatórios");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const criarVeiculo = async () => {
    const placa = maskPlaca(novoVeiculo.placa);
    if (!placa) return toast.error("Placa obrigatória");
    const estId = await getEstabelecimentoId();
    if (!estId) return toast.error("Estabelecimento não encontrado");
    const { data, error } = await supabase.from("transp_veiculos").insert({
      estabelecimento_id: estId,
      transportadora_id: form.transportadora_id || null,
      placa,
      descricao: novoVeiculo.descricao.toUpperCase() || null,
      tipo_veiculo: novoVeiculo.tipo_veiculo || null,
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
    const estId = await getEstabelecimentoId();
    if (!estId) return toast.error("Estabelecimento não encontrado");
    const { data, error } = await supabase.from("transp_motoristas").insert({
      estabelecimento_id: estId,
      transportadora_id: form.transportadora_id || null,
      nome: novoMotorista.nome.trim().toUpperCase(),
      cpf: novoMotorista.cpf || null,
      cnh: novoMotorista.cnh || null,
      whatsapp: novoMotorista.whatsapp.replace(/\D/g, "") || null,
      ativo: true,
    } as any).select().single();
    if (error || !data) return toast.error(error?.message ?? "Erro ao criar motorista");
    setMotoristas((p) => [...p, data as any]);
    setForm((f) => ({ ...f, motorista_id: (data as any).id }));
    setNovoMotorista({ open: false, nome: "", cpf: "", cnh: "", whatsapp: "" });
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
      transportadora_id: form.transportadora_id || null,
      veiculo_id: form.veiculo_id || null,
      motorista_id: form.motorista_id || null,
      placa: veiculoSel?.placa ?? null,
      motorista_nome: motoristaSel?.nome ?? null,
      ajudante_nome: form.ajudante_nome.toUpperCase() || null,
      documento: form.documento.toUpperCase() || null,
      motivo: form.motivo.toUpperCase() || null,
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
      transportadora: nomeTransportadora(empresaSel),
      placa: veiculoSel?.placa,
      motorista: motoristaSel?.nome,
      hora: entrada.toLocaleString("pt-BR"),
      fotos: photos.length,
    });
    toast.success("Entrada registrada!");
    setForm({ transportadora_id: "", veiculo_id: "", motorista_id: "", ajudante_nome: "", documento: "", motivo: "", entrada_obs: "" });
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
              <div className="p-3 bg-muted/50 rounded"><p className="text-xs text-muted-foreground">Transportadora</p><p className="font-semibold">{sucesso.transportadora}</p></div>
              <div className="p-3 bg-muted/50 rounded"><p className="text-xs text-muted-foreground">Veículo</p><p className="font-semibold font-mono">{sucesso.placa}</p></div>
              <div className="p-3 bg-muted/50 rounded"><p className="text-xs text-muted-foreground">Motorista</p><p className="font-semibold">{sucesso.motorista}</p></div>
              <div className="p-3 bg-muted/50 rounded"><p className="text-xs text-muted-foreground">Data/Hora</p><p className="font-semibold">{sucesso.hora}</p></div>
              <div className="p-3 bg-muted/50 rounded"><p className="text-xs text-muted-foreground">Fotos</p><p className="font-semibold">{sucesso.fotos}</p></div>
              <Button className="w-full" onClick={() => setSucesso(null)}>OK</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                <div className="flex items-center gap-2"><Truck className="h-5 w-5 text-primary" /><h3 className="font-semibold">Selecione a transportadora</h3></div>
                {empresas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma transportadora cadastrada. Cadastre em Listas → Transportadoras.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {empresas.map((e) => {
                      const active = form.transportadora_id === e.id;
                      return (
                        <button key={e.id} type="button"
                          onClick={() => setForm({ ...form, transportadora_id: e.id, veiculo_id: "", motorista_id: "" })}
                          className={`text-left p-4 rounded-lg border-2 transition-all hover:shadow-md ${active ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card"}`}>
                          <div className="flex items-center justify-between mb-2">
                            <Truck className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                            {active && <CheckCircle className="h-5 w-5 text-primary" />}
                          </div>
                          <p className="font-semibold truncate">{nomeTransportadora(e)}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                  <div className="flex items-center gap-2"><Truck className="h-5 w-5 text-primary" /><h3 className="font-semibold">Selecione o veículo</h3></div>
                  <Button size="sm" variant="outline" onClick={() => setNovoVeiculo({ ...novoVeiculo, open: true })}>
                    <Plus className="h-4 w-4 mr-1" />Novo veículo
                  </Button>
                </div>
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Buscar placa..." value={buscaV} onChange={(e) => setBuscaV(e.target.value)} />
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
                            : active ? "border-primary bg-primary/5 shadow-md hover:shadow-md" : "border-border bg-card hover:shadow-md"
                        }`}>
                        <div className="flex items-center justify-between mb-2">
                          <Truck className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                          {active && <CheckCircle className="h-5 w-5 text-primary" />}
                        </div>
                        <Badge variant="outline" className="font-mono text-xs">{v.placa}</Badge>
                        <p className="text-sm mt-1 truncate">{v.descricao || v.tipo_veiculo || "—"}</p>
                        {dentro && <p className="text-[11px] text-amber-600 mt-1">Já está dentro</p>}
                      </button>
                    );
                  })}
                  {veiculosFiltrados.length === 0 && <p className="text-sm text-muted-foreground">Nenhum veículo. Use "Novo veículo".</p>}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                  <div className="flex items-center gap-2"><User className="h-5 w-5 text-primary" /><h3 className="font-semibold">Selecione o motorista</h3></div>
                  <Button size="sm" variant="outline" onClick={() => setNovoMotorista({ ...novoMotorista, open: true })}>
                    <Plus className="h-4 w-4 mr-1" />Novo motorista
                  </Button>
                </div>
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Buscar nome ou CPF..." value={buscaM} onChange={(e) => setBuscaM(e.target.value)} />
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
                        <p className="text-xs text-muted-foreground mt-1">CNH: {m.cnh || "—"}</p>
                        <p className="text-xs text-muted-foreground">{m.whatsapp ? maskWhatsapp(m.whatsapp) : "—"}</p>
                      </button>
                    );
                  })}
                  {motoristasFiltrados.length === 0 && <p className="text-sm text-muted-foreground">Nenhum motorista. Use "Novo motorista".</p>}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 max-w-xl">
                <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /><h3 className="font-semibold">Detalhes da entrada</h3></div>
                <div className="p-3 bg-muted/50 rounded text-sm space-y-1">
                  <p><strong>Transportadora:</strong> {nomeTransportadora(empresaSel)}</p>
                  <p><strong>Veículo:</strong> {veiculoSel?.placa} — {veiculoSel?.descricao || "—"}</p>
                  <p><strong>Motorista:</strong> {motoristaSel?.nome}</p>
                </div>

                <div>
                  <Label>Tipo de operação</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {([
                      { v: "entrega", label: "Entrega", Icon: PackageCheck },
                      { v: "coleta", label: "Coleta", Icon: PackageOpen },
                    ] as const).map(({ v, label, Icon }) => {
                      const active = form.tipo_operacao === v;
                      return (
                        <button key={v} type="button"
                          onClick={() => setForm({ ...form, tipo_operacao: v, ...(v === "coleta" ? { nfe_chave: "" } : {}) })}
                          className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 text-sm font-medium transition-all ${
                            active ? "border-primary bg-primary/5" : "border-border bg-card hover:shadow-sm"
                          }`}>
                          <Icon className="h-4 w-4" />{label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {form.tipo_operacao === "entrega" && (
                  <div className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="flex items-center gap-2"><ScanLine className="h-4 w-4 text-primary" />Nota fiscal (NF-e)</Label>
                      <Button size="sm" variant="outline" onClick={() => setScannerOpen(true)}>
                        <ScanLine className="h-4 w-4 mr-1" />Ler código
                      </Button>
                    </div>
                    {nfeInfo ? (
                      <div className="text-xs space-y-0.5">
                        <p className="font-medium">NF-e nº {nfeInfo.numero} · série {nfeInfo.serie}</p>
                        <p className="text-muted-foreground">Emitente {nfeInfo.cnpj_emitente} · UF {nfeInfo.uf} · emissão {nfeInfo.emissao}</p>
                        <p className="font-mono text-muted-foreground break-all">{formatarChave(nfeInfo.chave)}</p>
                        {!chaveValida(nfeInfo.chave) && <p className="text-amber-600">Atenção: dígito verificador não confere.</p>}
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => setForm({ ...form, nfe_chave: "" })}>Remover</Button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Leia o código de barras ou QR Code da DANFE para capturar automaticamente os dados fiscais da nota.
                      </p>
                    )}
                  </div>
                )}

                <div><Label>Ajudante (opcional)</Label><Input value={form.ajudante_nome} onChange={(e) => setForm({ ...form, ajudante_nome: e.target.value.toUpperCase() })} /></div>
                <div><Label>Documento / Pedido</Label><Input value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value.toUpperCase() })} /></div>
                <div><Label>Motivo / Observação da visita</Label><Input value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value.toUpperCase() })} /></div>
                <div><Label>Observações</Label><Textarea rows={3} value={form.entrada_obs} onChange={(e) => setForm({ ...form, entrada_obs: e.target.value })} /></div>
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

          <div className="flex items-center justify-between gap-2 border-t p-4">
            <Button variant="outline" onClick={() => setStep((s) => Math.max(s - 1, 0))} disabled={step === 0}>Voltar</Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={goNext}>Avançar</Button>
            ) : (
              <Button onClick={salvar} disabled={busy}>{busy ? "Salvando..." : "Confirmar entrada"}</Button>
            )}
          </div>
        </Card>
      </div>

      <Dialog open={novoVeiculo.open} onOpenChange={(o) => setNovoVeiculo({ ...novoVeiculo, open: o })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo veículo da transportadora</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Placa</Label><Input value={novoVeiculo.placa} onChange={(e) => setNovoVeiculo({ ...novoVeiculo, placa: maskPlaca(e.target.value) })} /></div>
            <div><Label>Descrição</Label><Input value={novoVeiculo.descricao} onChange={(e) => setNovoVeiculo({ ...novoVeiculo, descricao: e.target.value.toUpperCase() })} /></div>
            <div>
              <Label>Tipo</Label>
              <Select value={novoVeiculo.tipo_veiculo} onValueChange={(v) => setNovoVeiculo({ ...novoVeiculo, tipo_veiculo: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {TIPOS_VEICULO_TRANSP.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoVeiculo({ ...novoVeiculo, open: false })}>Cancelar</Button>
            <Button onClick={criarVeiculo}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={novoMotorista.open} onOpenChange={(o) => setNovoMotorista({ ...novoMotorista, open: o })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo motorista da transportadora</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={novoMotorista.nome} onChange={(e) => setNovoMotorista({ ...novoMotorista, nome: e.target.value.toUpperCase() })} /></div>
            <div><Label>CPF</Label><Input value={novoMotorista.cpf} onChange={(e) => setNovoMotorista({ ...novoMotorista, cpf: e.target.value })} /></div>
            <div><Label>CNH</Label><Input value={novoMotorista.cnh} onChange={(e) => setNovoMotorista({ ...novoMotorista, cnh: e.target.value })} /></div>
            <div><Label>WhatsApp</Label><Input value={maskWhatsapp(novoMotorista.whatsapp)} onChange={(e) => setNovoMotorista({ ...novoMotorista, whatsapp: e.target.value })} placeholder="(11) 90000-0000" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoMotorista({ ...novoMotorista, open: false })}>Cancelar</Button>
            <Button onClick={criarMotorista}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NfeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onDetected={(chave) => setForm((f) => ({ ...f, nfe_chave: chave }))}
      />

    </>
  );
}
