// Tela do Interfone: apenas a câmera do interfone, as câmeras adicionais
// selecionadas na configuração e os botões de acionamento sobrepostos.
import { useCallback, useEffect, useRef, useState } from "react";
import { Building2, DoorOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InterfoneTile } from "@/components/portaria/InterfoneTile";
import { useUnidadeAtual } from "@/lib/unidadeAtual";
import { useInterfoneConfig } from "@/lib/portaria/interfone";
import { abrirAcesso } from "@/lib/portaria/api";

interface Camera {
  id: string;
  nome: string;
}

interface PontoAcesso {
  id: string;
  nome: string;
}

const INTERVALO_MS = 2000;

export default function PortariaInterfone() {
  const { unidadeId, unidadeNome } = useUnidadeAtual();
  const { config } = useInterfoneConfig(unidadeId);

  const [cameras, setCameras] = useState<Camera[]>([]);
  const [pontos, setPontos] = useState<PontoAcesso[]>([]);
  const [idface, setIdface] = useState<{ id: string; nome: string } | null>(null);

  const [imagens, setImagens] = useState<Record<string, string>>({});
  const [erros, setErros] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState<Record<string, boolean>>({});
  const [acionando, setAcionando] = useState<string | null>(null);
  const emAndamento = useRef<Record<string, boolean>>({});

  const extras = config?.cameras_extras ?? [];
  const chaveExtras = extras.join(",");

  // Dispositivo iDFace do interfone e pontos de acesso da unidade
  useEffect(() => {
    let ativo = true;
    (async () => {
      let qd = supabase
        .from("port_devices")
        .select("id, nome")
        .eq("tipo", "idface")
        .eq("habilitado", true)
        .order("nome");
      if (unidadeId) qd = qd.or(`unidade_id.eq.${unidadeId},unidade_id.is.null`);

      let qp = supabase.from("port_access_points").select("id, nome").eq("ativo", true).order("ordem");
      if (unidadeId) qp = qp.or(`unidade_id.eq.${unidadeId},unidade_id.is.null`);

      const [{ data: devs }, { data: aps }] = await Promise.all([qd, qp]);
      if (!ativo) return;
      const lista = (devs ?? []) as { id: string; nome: string }[];
      setIdface(lista.find((d) => d.id === config?.device_id) ?? lista[0] ?? null);
      setPontos((aps ?? []) as PontoAcesso[]);
    })();
    return () => {
      ativo = false;
    };
  }, [unidadeId, config?.device_id]);

  // Câmeras adicionais selecionadas nas configurações
  useEffect(() => {
    let ativo = true;
    (async () => {
      if (!extras.length) {
        setCameras([]);
        return;
      }
      const { data } = await supabase.from("cv_cameras").select("id, nome").in("id", extras).eq("ativo", true).order("nome");
      if (ativo) setCameras((data ?? []) as Camera[]);
    })();
    return () => {
      ativo = false;
    };
  }, [chaveExtras]);

  const marcar = (id: string, valor: boolean) => setCarregando((a) => ({ ...a, [id]: valor }));

  const capturarCamera = useCallback(async (id: string) => {
    if (emAndamento.current[`cam-${id}`]) return;
    emAndamento.current[`cam-${id}`] = true;
    marcar(id, true);
    try {
      const { data, error } = await supabase.functions.invoke("cv-camera-snapshot", { body: { camera_id: id } });
      if (error) throw error;
      const url = (data as { signed_url?: string; error?: string } | null)?.signed_url;
      if (!url) throw new Error((data as { error?: string } | null)?.error || "Câmera não respondeu.");
      setImagens((a) => ({ ...a, [id]: url }));
      setErros((a) => ({ ...a, [id]: "" }));
    } catch (e) {
      setErros((a) => ({ ...a, [id]: (e as Error).message || "Falha na imagem." }));
    } finally {
      emAndamento.current[`cam-${id}`] = false;
      marcar(id, false);
    }
  }, []);

  const capturarIdface = useCallback(async (id: string) => {
    if (emAndamento.current[`idf-${id}`]) return;
    emAndamento.current[`idf-${id}`] = true;
    marcar(id, true);
    try {
      const { data, error } = await supabase.functions.invoke("portaria-dispositivo", {
        body: { acao: "capturar_camera", device_id: id },
      });
      if (error) throw error;
      const r = data as { ok?: boolean; mensagem?: string; dados?: { imagem_base64?: string; content_type?: string } } | null;
      if (!r?.ok || !r.dados?.imagem_base64) throw new Error(r?.mensagem || "O interfone não retornou imagem.");
      const tipo = r.dados.content_type?.startsWith("image/") ? r.dados.content_type : "image/jpeg";
      setImagens((a) => ({ ...a, [id]: `data:${tipo};base64,${r.dados!.imagem_base64}` }));
      setErros((a) => ({ ...a, [id]: "" }));
    } catch (e) {
      setErros((a) => ({ ...a, [id]: (e as Error).message || "Falha na imagem do interfone." }));
    } finally {
      emAndamento.current[`idf-${id}`] = false;
      marcar(id, false);
    }
  }, []);

  useEffect(() => {
    if (!idface) return;
    void capturarIdface(idface.id);
    const t = setInterval(() => void capturarIdface(idface.id), INTERVALO_MS);
    return () => clearInterval(t);
  }, [idface, capturarIdface]);

  useEffect(() => {
    if (!cameras.length) return;
    cameras.forEach((c) => void capturarCamera(c.id));
    const t = setInterval(() => cameras.forEach((c) => void capturarCamera(c.id)), INTERVALO_MS * 2);
    return () => clearInterval(t);
  }, [cameras, capturarCamera]);

  const abrir = async (ponto: PontoAcesso) => {
    setAcionando(ponto.id);
    const r = await abrirAcesso(ponto.id);
    setAcionando(null);
    r.ok ? toast.success(`${ponto.nome}: ${r.mensagem}`) : toast.error(r.mensagem);
  };

  const botoes = (
    <>
      {pontos.map((p) => (
        <Button key={p.id} size="sm" className="h-9" disabled={acionando === p.id} onClick={() => void abrir(p)}>
          {acionando === p.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <DoorOpen className="h-4 w-4 mr-2" />}
          {p.nome}
        </Button>
      ))}
    </>
  );

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
        <Badge>Ao vivo</Badge>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {idface && (
          <InterfoneTile
            titulo={idface.nome}
            destaque
            imagem={imagens[idface.id] ?? null}
            carregando={carregando[idface.id]}
            erro={erros[idface.id] || null}
            acoes={pontos.length ? botoes : null}
            className="lg:col-span-2"
          />
        )}

        {cameras.map((c) => (
          <InterfoneTile
            key={c.id}
            titulo={c.nome}
            imagem={imagens[c.id] ?? null}
            carregando={carregando[c.id]}
            erro={erros[c.id] || null}
            acoes={pontos.length ? botoes : null}
          />
        ))}
      </div>

      {!idface && !cameras.length && (
        <p className="text-sm text-muted-foreground">
          Nenhum interfone ou câmera configurada para esta unidade. Configure em Portaria → Configurações.
        </p>
      )}
    </div>
  );
}
