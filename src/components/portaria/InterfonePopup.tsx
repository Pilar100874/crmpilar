import { useCallback, useEffect, useRef, useState } from "react";
import { BellRing, DoorOpen, Loader2, Mic, MicOff, PhoneOff, RefreshCw, Video, VideoOff, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { abrirAcesso } from "@/lib/portaria/api";
import { atenderToque, type InterfoneConfig } from "@/lib/portaria/interfone";
import { useAudioInterfone } from "@/lib/portaria/audioInterfone";


interface PontoAcesso {
  id: string;
  nome: string;
  tipo: string;
}

interface CameraExtra {
  id: string;
  nome: string;
}

interface Props {
  aberto: boolean;
  onFechar: () => void;
  config: InterfoneConfig;
  unidadeId: string | null;
  toqueId?: string | null;
}

const INTERVALO_MS = 2000;

export default function InterfonePopup({ aberto, onFechar, config, unidadeId, toqueId }: Props) {
  const [imagemIdface, setImagemIdface] = useState<string | null>(null);
  const [erroIdface, setErroIdface] = useState<string | null>(null);
  const [carregandoIdface, setCarregandoIdface] = useState(false);
  const [pontos, setPontos] = useState<PontoAcesso[]>([]);
  const [cameras, setCameras] = useState<CameraExtra[]>([]);
  const [imagens, setImagens] = useState<Record<string, string>>({});
  const [acionando, setAcionando] = useState<string | null>(null);
  const [urlDispositivo, setUrlDispositivo] = useState<string | null>(null);
  const capturando = useRef(false);
  const {
    status: statusAudio,
    erro: erroAudio,
    mudo,
    conectar,
    desconectar,
    alternarMudo,
    meuVideo,
    meuVivaVoz,
    remotoVideoOk,
    remotoVivaVozOk,
    videoAtivo,
    vivaVozAtiva,
    videoRemoto,
    alternarVideo,
    alternarVivaVoz,
  } = useAudioInterfone(unidadeId);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (videoRef.current && videoRemoto) {
      videoRef.current.srcObject = videoRemoto;
      void videoRef.current.play().catch(() => undefined);
    }
  }, [videoRemoto]);

  // Pontos de acesso, câmeras extras e endereço local do interfone
  useEffect(() => {
    if (!aberto) return;
    let ativo = true;
    (async () => {
      let qp = supabase
        .from("port_access_points")
        .select("id, nome, tipo")
        .eq("ativo", true)
        .order("ordem");
      if (unidadeId) qp = qp.or(`unidade_id.eq.${unidadeId},unidade_id.is.null`);
      const promessas: Promise<unknown>[] = [Promise.resolve(qp)];
      const ids = config.cameras_extras ?? [];
      const qc: Promise<unknown> = ids.length
        ? Promise.resolve(supabase.from("cv_cameras").select("id, nome").in("id", ids).eq("ativo", true).order("nome"))
        : Promise.resolve({ data: [] as CameraExtra[] });
      const qd: Promise<unknown> = config.device_id
        ? Promise.resolve(supabase.from("port_devices").select("ip, porta, endpoint").eq("id", config.device_id).maybeSingle())
        : Promise.resolve({ data: null });

      const [{ data: aps }, { data: cams }, { data: dev }] = (await Promise.all([
        promessas[0],
        qc,
        qd,
      ])) as [{ data: PontoAcesso[] }, { data: CameraExtra[] }, { data: { ip?: string; porta?: number; endpoint?: string } | null }];
      if (!ativo) return;
      setPontos(aps ?? []);
      setCameras(cams ?? []);
      if (dev) {
        const base = dev.endpoint
          ? (dev.endpoint.startsWith("http") ? dev.endpoint : `http://${dev.endpoint}`)
          : dev.ip
            ? `http://${dev.ip}${dev.porta && dev.porta !== 80 ? `:${dev.porta}` : ""}/`
            : null;
        setUrlDispositivo(base);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [aberto, config.cameras_extras, config.device_id, unidadeId]);

  const capturarIdface = useCallback(async () => {
    if (!config.device_id || capturando.current) return;
    capturando.current = true;
    setCarregandoIdface(true);
    try {
      const { data, error } = await supabase.functions.invoke("portaria-dispositivo", {
        body: { acao: "capturar_camera", device_id: config.device_id },
      });
      if (error) throw error;
      const r = data as { ok?: boolean; mensagem?: string; dados?: { imagem_base64?: string; content_type?: string } } | null;
      if (!r?.ok || !r.dados?.imagem_base64) throw new Error(r?.mensagem || "O interfone não retornou imagem.");
      const tipo = r.dados.content_type?.startsWith("image/") ? r.dados.content_type : "image/jpeg";
      setImagemIdface(`data:${tipo};base64,${r.dados.imagem_base64}`);
      setErroIdface(null);
    } catch (e) {
      setErroIdface((e as Error).message || "Não foi possível abrir a câmera do interfone.");
    } finally {
      capturando.current = false;
      setCarregandoIdface(false);
    }
  }, [config.device_id]);

  const capturarExtra = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("cv-camera-snapshot", { body: { camera_id: id } });
      if (error) throw error;
      const url = (data as { signed_url?: string } | null)?.signed_url;
      if (url) setImagens((atual) => ({ ...atual, [id]: url }));
    } catch {
      /* câmera indisponível: mantém a última imagem */
    }
  }, []);

  // Atualização ao vivo enquanto o popup está aberto
  useEffect(() => {
    if (!aberto) return;
    void capturarIdface();
    const t = setInterval(() => void capturarIdface(), INTERVALO_MS);
    return () => clearInterval(t);
  }, [aberto, capturarIdface]);

  useEffect(() => {
    if (!aberto || cameras.length === 0) return;
    const atualizar = () => cameras.forEach((c) => void capturarExtra(c.id));
    atualizar();
    const t = setInterval(atualizar, 4000);
    return () => clearInterval(t);
  }, [aberto, cameras, capturarExtra]);

  const abrir = async (ponto: PontoAcesso) => {
    setAcionando(ponto.id);
    const r = await abrirAcesso(ponto.id);
    setAcionando(null);
    if (r.ok) {
      toast.success(`${ponto.nome}: ${r.mensagem}`);
      if (toqueId) void atenderToque(toqueId, `Aberto: ${ponto.nome}`);
    } else {
      toast.error(r.mensagem);
    }
  };

  const falar = () => {
    if (statusAudio === "conectado" || statusAudio === "conectando") {
      desconectar();
      return;
    }
    void conectar();
  };

  const encerrar = () => {
    desconectar();
    if (toqueId) void atenderToque(toqueId, "Encerrado sem abrir");
    onFechar();
  };

  return (
    <Dialog open={aberto} onOpenChange={(v) => (!v ? encerrar() : undefined)}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-screen max-w-none gap-3 overflow-y-auto rounded-none border-0 bg-[#0D1626] p-4 text-white sm:h-auto sm:max-h-[92vh] sm:w-auto sm:max-w-4xl sm:rounded-2xl sm:border" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary animate-pulse" />
            Campainha do interfone
            <Badge variant="outline">{new Date().toLocaleTimeString("pt-BR")}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 lg:grid-cols-[1.4fr,1fr]">
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
            {imagemIdface ? (
              <img src={imagemIdface} alt="Câmera do interfone" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground p-4 text-center">
                {carregandoIdface ? <Loader2 className="h-6 w-6 animate-spin" /> : null}
                <p className="text-sm">{erroIdface ?? "Conectando à câmera do interfone..."}</p>
              </div>
            )}
            {videoAtivo && videoRemoto && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="absolute bottom-2 left-2 w-28 rounded-xl border border-white/20 bg-black object-cover shadow-lg"
              />
            )}
            <Button
              size="icon"
              variant="secondary"
              className="absolute right-2 top-2 h-8 w-8"
              onClick={() => void capturarIdface()}
              aria-label="Atualizar imagem do interfone"
            >
              <RefreshCw className={`h-4 w-4 ${carregandoIdface ? "animate-spin" : ""}`} />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 content-start">
            {cameras.map((c) => (
              <div key={c.id} className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
                {imagens[c.id] ? (
                  <img src={imagens[c.id]} alt={`Câmera ${c.nome}`} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
                    Carregando...
                  </div>
                )}
                <span className="absolute bottom-1 left-1 rounded bg-background/80 px-1 text-[10px] font-medium">
                  {c.nome}
                </span>
              </div>
            ))}
            {cameras.length === 0 && (
              <p className="col-span-2 text-xs text-muted-foreground">
                Selecione câmeras adicionais nas Configurações do interfone para vê-las aqui.
              </p>
            )}
          </div>
        </div>

        {erroAudio && <p className="text-xs text-destructive">{erroAudio}</p>}

        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {pontos.map((p) => (
            <Button
              key={p.id}
              className="h-12 flex-1 min-w-0 basis-[45%] px-3 text-sm font-semibold"
              disabled={acionando === p.id}
              onClick={() => void abrir(p)}
            >
              {acionando === p.id ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin mr-2" />
              ) : (
                <DoorOpen className="h-5 w-5 shrink-0 mr-2" />
              )}
              <span className="truncate">Abrir {p.nome}</span>
            </Button>
          ))}
          <Button
            variant={statusAudio === "conectado" ? "default" : "secondary"}
            className="h-12"
            onClick={falar}
          >
            {statusAudio === "conectando" ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Mic className="h-4 w-4 mr-2" />
            )}
            {statusAudio === "conectado" ? "Encerrar conversa" : statusAudio === "conectando" ? "Chamando..." : "Falar"}
          </Button>
          {statusAudio === "conectado" && (
            <Button variant="outline" className="h-12" onClick={alternarMudo}>
              {mudo ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
              {mudo ? "Microfone mudo" : "Mudo"}
            </Button>
          )}
          {statusAudio === "conectado" && (
            <Button
              variant={videoAtivo ? "default" : "outline"}
              className={`h-12 ${videoAtivo ? "!bg-orange-500 text-white hover:!bg-orange-600" : ""}`}
              onClick={alternarVideo}
              title={
                videoAtivo
                  ? "Vídeo ativo nas duas pontas"
                  : meuVideo && !remotoVideoOk
                    ? "Você permitiu — aguardando a outra ponta permitir o vídeo"
                    : "Permitir vídeo (só ativa se a outra ponta também permitir)"
              }
            >
              {videoAtivo ? <Video className="h-4 w-4 mr-2" /> : <VideoOff className="h-4 w-4 mr-2" />}
              {videoAtivo ? "Vídeo ativo" : meuVideo && !remotoVideoOk ? "Aguardando..." : "Vídeo"}
            </Button>
          )}
          {statusAudio === "conectado" && (
            <Button
              variant={vivaVozAtiva ? "default" : "outline"}
              className={`h-12 ${vivaVozAtiva ? "!bg-orange-500 text-white hover:!bg-orange-600" : ""}`}
              onClick={alternarVivaVoz}
              title={
                vivaVozAtiva
                  ? "Viva-voz ativo nas duas pontas"
                  : meuVivaVoz && !remotoVivaVozOk
                    ? "Você permitiu — aguardando a outra ponta permitir o viva-voz"
                    : "Permitir viva-voz (só ativa se a outra ponta também permitir)"
              }
            >
              {vivaVozAtiva ? <Volume2 className="h-4 w-4 mr-2" /> : <VolumeX className="h-4 w-4 mr-2" />}
              {vivaVozAtiva ? "Viva-voz ativo" : meuVivaVoz && !remotoVivaVozOk ? "Aguardando..." : "Viva-voz"}
            </Button>
          )}
          <Button
            variant="ghost"
            className="h-12 w-full rounded-xl border border-white/15 bg-white/5 text-white hover:bg-white/10"
            onClick={encerrar}
          >
            <PhoneOff className="h-4 w-4 mr-2" /> Fechar interfone
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
