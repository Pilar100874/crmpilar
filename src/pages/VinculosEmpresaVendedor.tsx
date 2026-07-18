import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Search, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface Empresa {
  id: string;
  nome_fantasia: string | null;
  nome: string | null;
  cnpj: string | null;
}

interface Vendedor {
  id: string;
  nome_fantasia: string | null;
  nome: string | null;
}

export default function VinculosEmpresaVendedor() {
  const [currentStep, setCurrentStep] = useState(1);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string>("");
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [vinculosExistentes, setVinculosExistentes] = useState<Array<{ empresa_id: string; vendedor_id: string | null }>>([]);

  const [selectedEmpresas, setSelectedEmpresas] = useState<string[]>([]);
  const [selectedVendedores, setSelectedVendedores] = useState<string[]>([]);
  const [substituirExistentes, setSubstituirExistentes] = useState(false);
  const [searchEmp, setSearchEmp] = useState("");
  const [searchVend, setSearchVend] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    (async () => {
      const id = await getEstabelecimentoId();
      setEstabelecimentoId(id);
    })();
  }, []);

  useEffect(() => {
    if (estabelecimentoId) loadData();
  }, [estabelecimentoId]);

  const loadData = async () => {
    try {
      const { data: empresasData } = await supabase
        .from("empresas")
        .select("id, nome_fantasia, nome, cnpj, tipo_cliente")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("nome_fantasia");
      const empresasFiltradas = (empresasData || []).filter(
        (e: any) => e.tipo_cliente !== "vendedor" && e.tipo_cliente !== "transportadora"
      );
      setEmpresas(empresasFiltradas);

      const { data: vendedoresData } = await supabase
        .from("empresas")
        .select("id, nome_fantasia, nome")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("tipo_cliente", "vendedor")
        .order("nome_fantasia");
      setVendedores(vendedoresData || []);

      const { data: vinculosData } = await supabase
        .from("empresa_vinculos")
        .select("empresa_id, vendedor_id")
        .eq("estabelecimento_id", estabelecimentoId)
        .not("vendedor_id", "is", null);
      setVinculosExistentes(vinculosData || []);
    } catch (error: any) {
      toast.error("Erro ao carregar dados", { description: error.message });
    }
  };

  const empresasFiltradas = empresas.filter((e) => {
    const q = searchEmp.toLowerCase();
    return !q || (e.nome_fantasia || "").toLowerCase().includes(q) || (e.nome || "").toLowerCase().includes(q) || (e.cnpj || "").includes(q);
  });
  const vendedoresFiltrados = vendedores.filter((v) => {
    const q = searchVend.toLowerCase();
    return !q || (v.nome_fantasia || "").toLowerCase().includes(q) || (v.nome || "").toLowerCase().includes(q);
  });

  const canGoNext = () => {
    if (currentStep === 1) return selectedEmpresas.length > 0;
    if (currentStep === 2) return selectedVendedores.length > 0;
    return true;
  };

  const handleProcess = async () => {
    setIsProcessing(true);
    setProcessedCount(0);
    setErrors([]);
    setCompleted(false);
    const errosTemp: string[] = [];

    for (let i = 0; i < selectedEmpresas.length; i++) {
      const empresaId = selectedEmpresas[i];
      try {
        if (substituirExistentes) {
          await supabase.from("empresa_vinculos").delete().eq("empresa_id", empresaId).not("vendedor_id", "is", null);
        }
        const existentes = vinculosExistentes.filter((v) => v.empresa_id === empresaId).map((v) => v.vendedor_id);
        const paraInserir = selectedVendedores
          .filter((vid) => substituirExistentes || !existentes.includes(vid))
          .map((vid) => ({
            empresa_id: empresaId,
            vendedor_id: vid,
            usuario_id: null,
            segmento_id: null,
            estabelecimento_id: estabelecimentoId,
          }));
        if (paraInserir.length > 0) {
          const { error } = await supabase.from("empresa_vinculos").insert(paraInserir);
          if (error) throw error;
        }
      } catch (error: any) {
        const emp = empresas.find((e) => e.id === empresaId);
        errosTemp.push(`Erro em ${emp?.nome_fantasia || emp?.nome || empresaId}: ${error.message}`);
      }
      setProcessedCount(i + 1);
      await new Promise((r) => setTimeout(r, 80));
    }

    setErrors(errosTemp);
    setIsProcessing(false);
    setCompleted(true);
    if (errosTemp.length === 0) toast.success("Processamento concluído!");
    else toast.error("Concluído com erros");
    await loadData();
  };

  const handleReset = () => {
    setCurrentStep(1);
    setSelectedEmpresas([]);
    setSelectedVendedores([]);
    setSubstituirExistentes(false);
    setProcessedCount(0);
    setErrors([]);
    setCompleted(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Vínculo Empresas X Vendedor</h1>
        <p className="text-muted-foreground mt-2">Assistente para vincular empresas a vendedores em lote</p>
      </div>

      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
              currentStep === step ? "bg-primary text-primary-foreground"
                : currentStep > step ? "bg-green-500 text-white" : "bg-secondary text-muted-foreground"}`}>{step}</div>
            {step < 4 && <div className={`w-12 h-1 ${currentStep > step ? "bg-green-500" : "bg-secondary"}`} />}
          </div>
        ))}
      </div>

      {currentStep === 1 && (
        <Card><CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">1. Selecione as empresas</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar empresa..." value={searchEmp} onChange={(e) => setSearchEmp(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={empresasFiltradas.length > 0 && empresasFiltradas.every((e) => selectedEmpresas.includes(e.id))}
              onCheckedChange={(checked) => {
                if (checked) setSelectedEmpresas([...new Set([...selectedEmpresas, ...empresasFiltradas.map((e) => e.id)])]);
                else setSelectedEmpresas(selectedEmpresas.filter((id) => !empresasFiltradas.some((e) => e.id === id)));
              }}
            />
            <span>Selecionar todas ({empresasFiltradas.length})</span>
            <span className="ml-auto text-muted-foreground">{selectedEmpresas.length} selecionadas</span>
          </div>
          <div className="border rounded-lg max-h-[400px] overflow-y-auto divide-y">
            {empresasFiltradas.map((e) => (
              <div key={e.id} className="p-3 flex items-center gap-3 hover:bg-accent/50">
                <Checkbox
                  checked={selectedEmpresas.includes(e.id)}
                  onCheckedChange={(checked) => {
                    if (checked) setSelectedEmpresas([...selectedEmpresas, e.id]);
                    else setSelectedEmpresas(selectedEmpresas.filter((id) => id !== e.id));
                  }}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{e.nome_fantasia || e.nome}</p>
                  <p className="text-xs text-muted-foreground">{e.cnpj}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {currentStep === 2 && (
        <Card><CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">2. Selecione os vendedores</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar vendedor..." value={searchVend} onChange={(e) => setSearchVend(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Checkbox checked={substituirExistentes} onCheckedChange={(c) => setSubstituirExistentes(!!c)} />
            <span>Substituir vendedores já vinculados nas empresas selecionadas</span>
          </div>
          <div className="border rounded-lg max-h-[400px] overflow-y-auto divide-y">
            {vendedoresFiltrados.map((v) => (
              <div key={v.id} className="p-3 flex items-center gap-3 hover:bg-accent/50">
                <Checkbox
                  checked={selectedVendedores.includes(v.id)}
                  onCheckedChange={(checked) => {
                    if (checked) setSelectedVendedores([...selectedVendedores, v.id]);
                    else setSelectedVendedores(selectedVendedores.filter((id) => id !== v.id));
                  }}
                />
                <p className="text-sm font-medium flex-1">{v.nome_fantasia || v.nome}</p>
              </div>
            ))}
            {vendedoresFiltrados.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhum vendedor cadastrado. Cadastre em Listas → Vendedores.
              </div>
            )}
          </div>
        </CardContent></Card>
      )}

      {currentStep === 3 && (
        <Card><CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">3. Confirmação</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold mb-2">Empresas ({selectedEmpresas.length})</h4>
              <div className="border rounded-lg p-3 max-h-[300px] overflow-y-auto space-y-1">
                {selectedEmpresas.map((id) => {
                  const e = empresas.find((x) => x.id === id);
                  return <p key={id} className="text-sm">{e?.nome_fantasia || e?.nome}</p>;
                })}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">Vendedores ({selectedVendedores.length})</h4>
              <div className="border rounded-lg p-3 max-h-[300px] overflow-y-auto space-y-1">
                {selectedVendedores.map((id) => {
                  const v = vendedores.find((x) => x.id === id);
                  return <p key={id} className="text-sm">{v?.nome_fantasia || v?.nome}</p>;
                })}
              </div>
            </div>
          </div>
          {substituirExistentes && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              ⚠ Vendedores já vinculados nas empresas selecionadas serão substituídos.
            </p>
          )}
        </CardContent></Card>
      )}

      {currentStep === 4 && (
        <Card><CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">4. Processamento</h3>
          <div className="flex items-center gap-3">
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : completed && errors.length === 0 ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : completed ? <XCircle className="w-5 h-5 text-destructive" /> : null}
            <p className="text-sm">{processedCount} / {selectedEmpresas.length} empresas processadas</p>
          </div>
          {errors.length > 0 && (
            <div className="border rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-1 bg-destructive/5">
              {errors.map((err, i) => <p key={i} className="text-xs text-destructive">{err}</p>)}
            </div>
          )}
        </CardContent></Card>
      )}

      <div className="flex items-center justify-between pt-6 border-t">
        <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)} disabled={currentStep === 1 || (currentStep === 4 && isProcessing)}>
          <ChevronLeft className="h-4 w-4 mr-2" />Voltar
        </Button>
        <div className="flex gap-2">
          {currentStep === 4 && completed && <Button variant="outline" onClick={handleReset}>Nova Operação</Button>}
          {currentStep < 3 && (
            <Button onClick={() => setCurrentStep(currentStep + 1)} disabled={!canGoNext()}>
              Próximo<ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          {currentStep === 3 && (
            <Button onClick={() => { setCurrentStep(4); handleProcess(); }}>
              Processar<ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
