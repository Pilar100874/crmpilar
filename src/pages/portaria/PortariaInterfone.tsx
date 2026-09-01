import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Building2, DoorOpen, ExternalLink, Loader2, MonitorSmartphone, RefreshCw, Video, VideoOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUnidadeAtual } from "@/lib/unidadeAtual";
import { abrirAcesso } from "@/lib/portaria/api";

interface Camera {
  id: string;
  nome: string;
  filial_id: string | null;
}

interface PontoAcesso {
  id: string;
  nome: string;
  tipo: string;
  confirmar_abertura: boolean;
}

interface DispositivoIdface {
  id: string;
  nome: string;
  ip: string | null;
  porta: number | null;
  endpoint: string | null;
}

const OPCOES_FPS = [
  { label: "Rápido (1s)", ms: 1000 },
  { label: "Normal (2s)", ms: 2000 },
  { label: "Econômico (6s)", ms: 6000 },
];

export default function PortariaInterfone() {
  const { unidadeId, unidadeNome } = useUnidadeAtual();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [cameraId, setCameraId] = useState<string>("");
  const [imagem, setImagem] = useState<string | null>(null);
  const [carregandoImagem, setCarregandoImagem] = useState(false);
  const [erroImagem, setErroImagem] = useState<string | null>(null);
  const [pontos, setPontos] = useState<PontoAcesso[]>([]);
  const [acionando, setAcionando] = useState<string | null>(null);
  const [aoVivo, setAoVivo] = useState(true);
  const [idfaces, setIdfaces] = useState<DispositivoIdface[]>([]);
  const [idfaceId, setIdfaceId] = useState<string>("");
  const [intervaloMs, setIntervaloMs] = useState<number>(2000);
  const cameraRef = useRef<string>("");


  useEffect(() => {
    cameraRef.current = cameraId;
  }, [cameraId]);

  // Câmeras e pontos de acesso da unidade atual
  useEffect(() => {
    let ativo = true;
    (async () => {
      let qc = supabase.from("cv_cameras").select("id, nome, filial_id").eq("ativo", true).order("nome");
      if (unidadeId) qc = qc.or(`filial_id.eq.${unidadeId},filial_id.is.null`);
      let qp = supabase
        .from("port_access_points")
        .select("id, nome, tipo, confirmar_abertura")
        .eq("ativo", true)
        .order("ordem");
      if (unidadeId) qp = qp.or(`unidade_id.eq.${unidadeId},unidade_id.is.null`);

      let qd = supabase
        .from("port_devices")
        .select("id, nome, ip, porta, endpoint")
        .eq("tipo", "idface")
        .eq("habilitado", true)
        .order("nome");
      if (unidadeId) qd = qd.or(`unidade_id.eq.${unidadeId},unidade_id.is.null`);

      const [{ data: cams }, { data: aps }, { data: devs }] = await Promise.all([qc, qp, qd]);
      if (!ativo) return;
      const lista = (cams ?? []) as Camera[];
      setCameras(lista);
      setPontos((aps ?? []) as PontoAcesso[]);
      setCameraId((atual) => atual || lista[0]?.id || "");
      const listaDev = (devs ?? []) as DispositivoIdface[];
      setIdfaces(listaDev);
      setIdfaceId((atual) => atual || listaDev[0]?.id || "");
    })();
    return () => {
      ativo = false;
    };
  }, [unidadeId]);

  const idfaceUrl = useMemo(() => {
    const d = idfaces.find((x) => x.id === idfaceId);
    if (!d) return null;
    if (d.endpoint) return d.endpoint.startsWith("http") ? d.endpoint : `http://${d.endpoint}`;
    if (!d.ip) return null;
    const porta = d.porta && d.porta !== 80 ? `:${d.porta}` : "";
    return `http://${d.ip}${porta}/`;
  }, [idfaces, idfaceId]);

  // Navegador bloqueia conteúdo HTTP dentro de página HTTPS (mixed content):
  // nesse caso o iframe fica em branco, então mostramos o atalho para nova aba.
  const bloqueadoMixedContent = useMemo(
    () => typeof window !== "undefined" && window.location.protocol === "https:" && !!idfaceUrl && idfaceUrl.startsWith("http://"),
    [idfaceUrl],
  );




  const capturar = useCallback(async (id: string, manual = false) => {
    if (!id) return;
    setCarregandoImagem(true);
    try {
      const { data, error } = await supabase.functions.invoke("cv-camera-snapshot", {
        body: { camera_id: id },
      });
      if (error) throw error;
      const url = (data as { signed_url?: string; error?: string } | null)?.signed_url;
      if (!url) throw new Error((data as { error?: string } | null)?.error || "Câmera não respondeu.");
      if (cameraRef.current !== id) return;
      setImagem(url);
      setErroImagem(null);
      if (manual) toast.success("Imagem atualizada");
    } catch (e) {
      const msg = (e as Error).message || "Não foi possível obter a imagem da câmera.";
      setErroImagem(msg);
      if (manual) toast.error(msg);
    } finally {
      setCarregandoImagem(false);
    }
  }, []);

  // Atualização periódica (modo ao vivo)
  useEffect(() => {
    if (!cameraId) return;
    setImagem(null);
    setErroImagem(null);
    void capturar(cameraId);
    if (!aoVivo) return;
    const t = setInterval(() => void capturar(cameraId), INTERVALO_SNAPSHOT_MS);
    return () => clearInterval(t);
  }, [cameraId, aoVivo, capturar]);

  const abrir = async (ponto: PontoAcesso) => {
    setAcionando(ponto.id);
    const r = await abrirAcesso(ponto.id);
    setAcionando(null);
    if (r.ok) {
      toast.success(`${ponto.nome}: ${r.mensagem}`);
      void capturar(cameraId);
    } else {
      toast.error(r.mensagem);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-bold">Interfone</h2>
        {unidadeNome && (
          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-sm font-semibold text-primary">
            <Building2 className="h-4 w-4" />
            {unidadeNome}
          </span>
        )}
        <Badge variant={aoVivo ? "default" : "secondary"}>{aoVivo ? "Ao vivo" : "Pausado"}</Badge>
      </div>

      <Tabs defaultValue="idface" className="space-y-4">
        <TabsList>
          <TabsTrigger value="idface">Interfone iDFace</TabsTrigger>
          <TabsTrigger value="camera">Câmera + acionamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="idface" className="space-y-3">
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b p-3">
              <Select value={idfaceId} onValueChange={setIdfaceId}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder={idfaces.length ? "Selecione o iDFace" : "Nenhum iDFace nesta unidade"} />
                </SelectTrigger>
                <SelectContent>
                  {idfaces.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                disabled={!idfaceUrl}
                onClick={() => idfaceUrl && window.open(idfaceUrl, "_blank", "noopener")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir em nova aba
              </Button>
              {idfaceUrl && <span className="text-xs text-muted-foreground">{idfaceUrl}</span>}
            </div>

            {idfaceUrl ? (
              <iframe
                title="Interface do interfone iDFace"
                src={idfaceUrl}
                className="w-full h-[70vh] bg-background"
              />
            ) : (
              <div className="h-[40vh] flex flex-col items-center justify-center gap-2 text-muted-foreground text-center p-6">
                <MonitorSmartphone className="h-10 w-10" />
                <p className="text-sm">
                  Nenhum dispositivo iDFace com IP cadastrado nesta unidade. Configure em Portaria → Dispositivos.
                </p>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            A interface do iDFace é servida pelo próprio equipamento na rede local ({idfaceUrl ?? "IP não informado"}).
            Se ela não carregar aqui dentro (o equipamento pode bloquear exibição em quadro, ou o CRM estar em HTTPS),
            use o botão “Abrir em nova aba”.
          </p>
        </TabsContent>

        <TabsContent value="camera">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="rounded-xl border bg-card overflow-hidden">

          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <Select value={cameraId} onValueChange={setCameraId}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder={cameras.length ? "Selecione a câmera" : "Nenhuma câmera na unidade"} />
              </SelectTrigger>
              <SelectContent>
                {cameras.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => void capturar(cameraId, true)} disabled={!cameraId || carregandoImagem}>
              {carregandoImagem ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Atualizar
            </Button>
            <Button variant={aoVivo ? "secondary" : "default"} size="sm" onClick={() => setAoVivo((v) => !v)}>
              {aoVivo ? <VideoOff className="h-4 w-4 mr-2" /> : <Video className="h-4 w-4 mr-2" />}
              {aoVivo ? "Pausar" : "Ao vivo"}
            </Button>
          </div>

          <div className="aspect-video bg-muted flex items-center justify-center relative">
            {imagem ? (
              <img src={imagem} alt="Imagem da câmera do interfone" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground p-6 text-center">
                {carregandoImagem ? <Loader2 className="h-10 w-10 animate-spin" /> : <Video className="h-10 w-10" />}
                <p className="text-sm">
                  {!cameras.length
                    ? "Nenhuma câmera cadastrada para esta unidade."
                    : erroImagem || (carregandoImagem ? "Capturando imagem..." : "Sem imagem")}
                </p>
              </div>
            )}
            {imagem && carregandoImagem && (
              <span className="absolute top-2 right-2 rounded-full bg-background/80 p-1.5">
                <Loader2 className="h-4 w-4 animate-spin" />
              </span>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h3 className="font-semibold">Acionamentos</h3>
          {pontos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum ponto de acesso configurado para esta unidade. Cadastre em Portaria → Configurações.
            </p>
          ) : (
            <div className="grid gap-2">
              {pontos.map((p) => (
                <Button
                  key={p.id}
                  className="h-12 justify-start"
                  variant="secondary"
                  disabled={acionando === p.id}
                  onClick={() => void abrir(p)}
                >
                  {acionando === p.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <DoorOpen className="h-4 w-4 mr-2" />
                  )}
                  {p.nome}
                </Button>
              ))}
            </div>
          )}
          {erroImagem && (
            <p className="text-xs text-muted-foreground">
              Falha na imagem: {erroImagem}
            </p>
          )}
        </div>
      </div>
        </TabsContent>
      </Tabs>
    </div>

  );
}
