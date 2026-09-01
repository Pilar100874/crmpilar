import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Building2, DoorOpen, ExternalLink, Loader2, RefreshCw, Video, VideoOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUnidadeAtual } from "@/lib/unidadeAtual";
import { abrirAcesso } from "@/lib/portaria/api";
import { useInterfoneConfig } from "@/lib/portaria/interfone";
import InterfoneTile from "@/components/portaria/InterfoneTile";

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
  const { config } = useInterfoneConfig(unidadeId);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [pontos, setPontos] = useState<PontoAcesso[]>([]);
  const [idfaces, setIdfaces] = useState<DispositivoIdface[]>([]);
  const [idfaceId, setIdfaceId] = useState<string>("");
  const [imagens, setImagens] = useState<Record<string, string>>({});
  const [erros, setErros] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState<Record<string, boolean>>({});
  const [imagemIdface, setImagemIdface] = useState<string | null>(null);
  const [erroIdface, setErroIdface] = useState<string | null>(null);
  const [carregandoIdface, setCarregandoIdface] = useState(false);
  const [acionando, setAcionando] = useState<string | null>(null);
  const [aoVivo, setAoVivo] = useState(true);
  const [intervaloMs, setIntervaloMs] = useState<number>(2000);
  const [expandido, setExpandido] = useState<string | null>(null);
  const capturaIdfaceEmAndamento = useRef(false);

  // Câmeras, pontos de acesso e iDFaces da unidade atual
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
      setCameras((cams ?? []) as Camera[]);
      setPontos((aps ?? []) as PontoAcesso[]);
      const listaDev = (devs ?? []) as DispositivoIdface[];
      setIdfaces(listaDev);
      setIdfaceId((atual) => atual || listaDev[0]?.id || "");
    })();
    return () => {
      ativo = false;
    };
  }, [unidadeId]);

  // Câmeras marcadas para abrir junto com o interfone
  const camerasSelecionadas = useMemo(() => {
    const ids = config?.cameras_extras ?? [];
    return cameras.filter((c) => ids.includes(c.id));
  }, [cameras, config?.cameras_extras]);

  useEffect(() => {
    if (config?.device_id) setIdfaceId(config.device_id);
  }, [config?.device_id]);

  const idfaceUrl = useMemo(() => {
    const d = idfaces.find((x) => x.id === idfaceId);
    if (!d) return null;
    if (d.endpoint) return d.endpoint.startsWith("http") ? d.endpoint : `http://${d.endpoint}`;
    if (!d.ip) return null;
    const porta = d.porta && d.porta !== 80 ? `:${d.porta}` : "";
    return `http://${d.ip}${porta}/`;
  }, [idfaces, idfaceId]);

  const capturar = useCallback(async (id: string) => {
    if (!id) return;
    setCarregando((s) => ({ ...s, [id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("cv-camera-snapshot", { body: { camera_id: id } });
      if (error) throw error;
      const url = (data as { signed_url?: string; error?: string } | null)?.signed_url;
      if (!url) throw new Error((data as { error?: string } | null)?.error || "Câmera não respondeu.");
      setImagens((s) => ({ ...s, [id]: url }));
      setErros((s) => ({ ...s, [id]: "" }));
    } catch (e) {
      setErros((s) => ({ ...s, [id]: (e as Error).message || "Falha na câmera." }));
    } finally {
      setCarregando((s) => ({ ...s, [id]: false }));
    }
  }, []);

  const capturarIdface = useCallback(async (id: string) => {
    if (!id || capturaIdfaceEmAndamento.current) return;
    capturaIdfaceEmAndamento.current = true;
    setCarregandoIdface(true);
    try {
      const { data, error } = await supabase.functions.invoke("portaria-dispositivo", {
        body: { acao: "capturar_camera", device_id: id },
      });
      if (error) throw error;
      const resposta = data as {
        ok?: boolean;
        mensagem?: string;
        dados?: { imagem_base64?: string; content_type?: string };
      } | null;
      if (!resposta?.ok || !resposta.dados?.imagem_base64) {
        throw new Error(resposta?.mensagem || "O iDFace não retornou uma imagem.");
      }
      const tipo = resposta.dados.content_type?.startsWith("image/") ? resposta.dados.content_type : "image/jpeg";
      setImagemIdface(`data:${tipo};base64,${resposta.dados.imagem_base64}`);
      setErroIdface(null);
    } catch (e) {
      setErroIdface((e as Error).message || "Não foi possível abrir a câmera do interfone.");
    } finally {
      capturaIdfaceEmAndamento.current = false;
      setCarregandoIdface(false);
    }
  }, []);

  // Loop do interfone
  useEffect(() => {
    if (!idfaceId) return;
    setImagemIdface(null);
    void capturarIdface(idfaceId);
    if (!aoVivo) return;
    const t = setInterval(() => void capturarIdface(idfaceId), intervaloMs);
    return () => clearInterval(t);
  }, [aoVivo, capturarIdface, idfaceId, intervaloMs]);

  // Loop das câmeras selecionadas
  useEffect(() => {
    const ids = camerasSelecionadas.map((c) => c.id);
    if (!ids.length) return;
    ids.forEach((id) => void capturar(id));
    if (!aoVivo) return;
    const t = setInterval(() => ids.forEach((id) => void capturar(id)), intervaloMs);
    return () => clearInterval(t);
  }, [aoVivo, camerasSelecionadas, capturar, intervaloMs]);

  const atualizarTudo = () => {
    if (idfaceId) void capturarIdface(idfaceId);
    camerasSelecionadas.forEach((c) => void capturar(c.id));
  };

  const abrir = async (ponto: PontoAcesso) => {
    setAcionando(ponto.id);
    const r = await abrirAcesso(ponto.id);
    setAcionando(null);
    if (r.ok) {
      toast.success(`${ponto.nome}: ${r.mensagem}`);
      atualizarTudo();
    } else {
      toast.error(r.mensagem);
    }
  };

  const botoes = (
    <>
      {pontos.map((p) => (
        <Button
          key={p.id}
          size="sm"
          className="shadow-lg"
          disabled={acionando === p.id}
          onClick={() => void abrir(p)}
        >
          {acionando === p.id ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <DoorOpen className="mr-2 h-4 w-4" />
          )}
          {p.nome}
        </Button>
      ))}
    </>
  );

  const tileExpandido = useMemo(() => {
    if (!expandido) return null;
    if (expandido === "idface") {
      return { titulo: "Interfone", imagem: imagemIdface, carregando: carregandoIdface, erro: erroIdface };
    }
    const cam = camerasSelecionadas.find((c) => c.id === expandido);
    return cam
      ? {
          titulo: cam.nome,
          imagem: imagens[cam.id] ?? null,
          carregando: !!carregando[cam.id],
          erro: erros[cam.id] || null,
        }
      : null;
  }, [expandido, imagemIdface, carregandoIdface, erroIdface, camerasSelecionadas, imagens, carregando, erros]);

  return (
    <div className="space-y-4">
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

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
        <Select value={idfaceId} onValueChange={setIdfaceId}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder={idfaces.length ? "Selecione o interfone" : "Nenhum iDFace nesta unidade"} />
          </SelectTrigger>
          <SelectContent>
            {idfaces.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={atualizarTudo}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
        <Button variant={aoVivo ? "secondary" : "default"} size="sm" onClick={() => setAoVivo((v) => !v)}>
          {aoVivo ? <VideoOff className="mr-2 h-4 w-4" /> : <Video className="mr-2 h-4 w-4" />}
          {aoVivo ? "Pausar" : "Ao vivo"}
        </Button>
        <Select value={String(intervaloMs)} onValueChange={(v) => setIntervaloMs(Number(v))}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPCOES_FPS.map((o) => (
              <SelectItem key={o.ms} value={String(o.ms)}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {idfaceUrl && (
          <Button variant="ghost" size="sm" onClick={() => window.open(idfaceUrl, "_blank", "noopener")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Painel do iDFace
          </Button>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <InterfoneTile
            titulo="Interfone"
            destaque
            imagem={imagemIdface}
            carregando={carregandoIdface}
            erro={idfaces.length ? erroIdface : "Nenhum iDFace cadastrado nesta unidade."}
            onExpandir={() => setExpandido("idface")}
          >
            {botoes}
          </InterfoneTile>
        </div>

        {camerasSelecionadas.map((c) => (
          <InterfoneTile
            key={c.id}
            titulo={c.nome}
            imagem={imagens[c.id] ?? null}
            carregando={!!carregando[c.id]}
            erro={erros[c.id] || null}
            onExpandir={() => setExpandido(c.id)}
          >
            {botoes}
          </InterfoneTile>
        ))}
      </div>

      {camerasSelecionadas.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhuma câmera marcada para abrir junto com o interfone. Selecione as câmeras em Portaria → Configurações →
          Interfone.
        </p>
      )}
      {pontos.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum ponto de acesso configurado nesta unidade — os botões de portão/porta aparecem sobre as imagens depois
          do cadastro em Portaria → Configurações.
        </p>
      )}

      <Dialog open={!!expandido} onOpenChange={(v) => !v && setExpandido(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{tileExpandido?.titulo ?? "Imagem"}</DialogTitle>
          </DialogHeader>
          {tileExpandido && (
            <InterfoneTile
              titulo={tileExpandido.titulo}
              imagem={tileExpandido.imagem}
              carregando={tileExpandido.carregando}
              erro={tileExpandido.erro}
            >
              {botoes}
            </InterfoneTile>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
