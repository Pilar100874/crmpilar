import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, Search, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface Vendedor {
  id: string;
  nome_fantasia: string | null;
  nome: string | null;
  cnpj: string | null;
}

interface Usuario {
  id: string;
  nome: string;
  email: string | null;
}

export default function VinculosVendedorUsuario() {
  const [currentStep, setCurrentStep] = useState(1);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string>("");
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [vinculosExistentes, setVinculosExistentes] = useState<
    Array<{ vendedor_id: string | null; usuario_id: string | null }>
  >([]);

  const [selectedVendedores, setSelectedVendedores] = useState<string[]>([]);
  const [selectedUsuarios, setSelectedUsuarios] = useState<string[]>([]);
  const [substituirExistentes, setSubstituirExistentes] = useState(false);
  const [searchVend, setSearchVend] = useState("");
  const [searchUser, setSearchUser] = useState("");

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
      const { data: vendedoresData } = await supabase
        .from("empresas")
        .select("id, nome_fantasia, nome, cnpj")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("tipo_cliente", "vendedor")
        .order("nome_fantasia");
      setVendedores(vendedoresData || []);

      const { data: usuariosData } = await supabase
        .from("usuarios")
        .select("id, nome, email")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("tipo", "gerente")
        .order("nome");
      setUsuarios(usuariosData || []);

      const { data: vinculosData } = await supabase
        .from("empresa_vinculos")
        .select("vendedor_id, usuario_id")
        .eq("estabelecimento_id", estabelecimentoId)
        .not("vendedor_id", "is", null)
        .not("usuario_id", "is", null);
      setVinculosExistentes(vinculosData || []);
    } catch (error: any) {
      toast.error("Erro ao carregar dados", { description: error.message });
    }
  };

  const vendedoresFiltrados = vendedores.filter((v) => {
    const q = searchVend.toLowerCase();
    return (
      !q ||
      (v.nome_fantasia || "").toLowerCase().includes(q) ||
      (v.nome || "").toLowerCase().includes(q) ||
      (v.cnpj || "").includes(q)
    );
  });
  const usuariosFiltrados = usuarios.filter((u) => {
    const q = searchUser.toLowerCase();
    return !q || (u.nome || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
  });

  const canGoNext = () => {
    if (currentStep === 1) return selectedVendedores.length > 0;
    if (currentStep === 2) return selectedUsuarios.length > 0;
    return true;
  };

  const handleProcess = async () => {
    setIsProcessing(true);
    setProcessedCount(0);
    setErrors([]);
    setCompleted(false);
    const errosTemp: string[] = [];

    for (let i = 0; i < selectedVendedores.length; i++) {
      const vendedorId = selectedVendedores[i];
      try {
        if (substituirExistentes) {
          await supabase
            .from("empresa_vinculos")
            .delete()
            .eq("vendedor_id", vendedorId)
            .not("usuario_id", "is", null);
        }
        const existentes = vinculosExistentes
          .filter((v) => v.vendedor_id === vendedorId)
          .map((v) => v.usuario_id);
        const paraInserir = selectedUsuarios
          .filter((uid) => substituirExistentes || !existentes.includes(uid))
          .map((uid) => ({
            empresa_id: vendedorId,
            vendedor_id: vendedorId,
            usuario_id: uid,
            segmento_id: null,
            transportadora_id: null,
            estabelecimento_id: estabelecimentoId,
          }));
        if (paraInserir.length > 0) {
          const { error } = await supabase.from("empresa_vinculos").insert(paraInserir);
          if (error) throw error;
        }
      } catch (error: any) {
        const v = vendedores.find((x) => x.id === vendedorId);
        errosTemp.push(`Erro em ${v?.nome_fantasia || v?.nome || vendedorId}: ${error.message}`);
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
    setSelectedVendedores([]);
    setSelectedUsuarios([]);
    setSubstituirExistentes(false);
    setProcessedCount(0);
    setErrors([]);
    setCompleted(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Vínculo Vendedor X Gerente</h1>
        <p className="text-muted-foreground mt-2">
          Assistente para vincular vendedores a gerentes do sistema em lote
        </p>
      </div>

      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                currentStep === step
                  ? "bg-primary text-primary-foreground"
                  : currentStep > step
                  ? "bg-green-500 text-white"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {step}
            </div>
            {step < 4 && (
              <div className={`w-12 h-1 ${currentStep > step ? "bg-green-500" : "bg-secondary"}`} />
            )}
          </div>
        ))}
      </div>

      {currentStep === 1 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">1. Selecione os vendedores</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar vendedor..."
                value={searchVend}
                onChange={(e) => setSearchVend(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={
                  vendedoresFiltrados.length > 0 &&
                  vendedoresFiltrados.every((v) => selectedVendedores.includes(v.id))
                }
                onCheckedChange={(checked) => {
                  if (checked)
                    setSelectedVendedores([
                      ...new Set([...selectedVendedores, ...vendedoresFiltrados.map((v) => v.id)]),
                    ]);
                  else
                    setSelectedVendedores(
                      selectedVendedores.filter((id) => !vendedoresFiltrados.some((v) => v.id === id))
                    );
                }}
              />
              <span>Selecionar todos ({vendedoresFiltrados.length})</span>
              <span className="ml-auto text-muted-foreground">
                {selectedVendedores.length} selecionados
              </span>
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
                  <div className="flex-1">
                    <p className="text-sm font-medium">{v.nome_fantasia || v.nome}</p>
                    <p className="text-xs text-muted-foreground">{v.cnpj}</p>
                  </div>
                </div>
              ))}
              {vendedoresFiltrados.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Nenhum vendedor cadastrado. Cadastre em Listas → Vendedores.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">2. Selecione os gerentes</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar gerente..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={substituirExistentes}
                onCheckedChange={(c) => setSubstituirExistentes(!!c)}
              />
              <span>Substituir gerentes já vinculados nos vendedores selecionados</span>
            </div>
            <div className="border rounded-lg max-h-[400px] overflow-y-auto divide-y">
              {usuariosFiltrados.map((u) => (
                <div key={u.id} className="p-3 flex items-center gap-3 hover:bg-accent/50">
                  <Checkbox
                    checked={selectedUsuarios.includes(u.id)}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedUsuarios([...selectedUsuarios, u.id]);
                      else setSelectedUsuarios(selectedUsuarios.filter((id) => id !== u.id));
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{u.nome}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">3. Confirmação</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">
                  Vendedores ({selectedVendedores.length})
                </h4>
                <div className="border rounded-lg p-3 max-h-[300px] overflow-y-auto space-y-1">
                  {selectedVendedores.map((id) => {
                    const v = vendedores.find((x) => x.id === id);
                    return (
                      <p key={id} className="text-sm">
                        {v?.nome_fantasia || v?.nome}
                      </p>
                    );
                  })}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Gerentes ({selectedUsuarios.length})</h4>
                <div className="border rounded-lg p-3 max-h-[300px] overflow-y-auto space-y-1">
                  {selectedUsuarios.map((id) => {
                    const u = usuarios.find((x) => x.id === id);
                    return (
                      <p key={id} className="text-sm">
                        {u?.nome}
                      </p>
                    );
                  })}
                </div>
              </div>
            </div>
            {substituirExistentes && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                ⚠ Gerentes já vinculados nos vendedores selecionados serão substituídos.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {currentStep === 4 && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">4. Processamento</h3>
            <div className="flex items-center gap-3">
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : completed && errors.length === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : completed ? (
                <XCircle className="w-5 h-5 text-destructive" />
              ) : null}
              <p className="text-sm">
                {processedCount} / {selectedVendedores.length} vendedores processados
              </p>
            </div>
            {errors.length > 0 && (
              <div className="border rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-1 bg-destructive/5">
                {errors.map((err, i) => (
                  <p key={i} className="text-xs text-destructive">
                    {err}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(currentStep - 1)}
          disabled={currentStep === 1 || (currentStep === 4 && isProcessing)}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex gap-2">
          {currentStep === 4 && completed && (
            <Button variant="outline" onClick={handleReset}>
              Nova Operação
            </Button>
          )}
          {currentStep < 3 && (
            <Button onClick={() => setCurrentStep(currentStep + 1)} disabled={!canGoNext()}>
              Próximo
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          {currentStep === 3 && (
            <Button
              onClick={() => {
                setCurrentStep(4);
                handleProcess();
              }}
            >
              Processar
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
