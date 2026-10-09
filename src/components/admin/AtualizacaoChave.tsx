import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { enviarComando, getEstabelecimentoId, getUsuarioId } from "@/services/tvSignage/tvSignageService";

/** Manifestos públicos das versões mais novas — a mesma fonte usada na tela de downloads. */
const MANIFESTOS: Record<string, string> = {
  remotas: "/apps/android-tv-signage-latest.json",
  sms: "/coletor/sms-version.json",
  hub: "/coletor/hub-version.json",
  automacao: "/apps/pilar-automacao-latest.json",
  coletor: "/coletor/version.json",
};

/** Compara versões no formato x.y.z. Retorna true quando a é menor que b. */
const menorQue = (a?: string | null, b?: string | null) => {
  if (!a || !b) return false;
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
};

interface Aparelho {
  id: string;
  nome: string;
  versao: string | null;
  statusComando?: string | null;
}

/**
 * Bloco de atualização remota de UMA chave: encontra o aparelho que usa essa chave
 * e mostra a versão instalada com um botão para atualizar só ele.
 */
export default function AtualizacaoChave({
  appSlug,
  chave,
  dispositivoId,
}: {
  appSlug: string;
  chave: string;
  dispositivoId?: string | null;
}) {
  const [aparelho, setAparelho] = useState<Aparelho | null>(null);
  const [disponivel, setDisponivel] = useState<string>("");
  const [url, setUrl] = useState<string>("");
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const caminho = MANIFESTOS[appSlug];
      if (caminho) {
        try {
          const resp = await fetch(caminho, { cache: "no-store" });
          if (resp.ok) {
            const json = await resp.json();
            setDisponivel(json.versionName || json.version || "");
            setUrl(json.url || json.downloadUrl || "");
          }
        } catch {
          /* sem manifesto publicado */
        }
      }

      let encontrado: Aparelho | null = null;
      if (appSlug === "coletor") {
        const { data } = await supabase
          .from("coletor_dispositivos")
          .select("id,hostname,versao,comando_status")
          .eq("device_key", chave)
          .maybeSingle();
        if (data) {
          encontrado = {
            id: data.id,
            nome: data.hostname || "Computador",
            versao: data.versao,
            statusComando: data.comando_status,
          };
        }
      } else if (appSlug === "remotas") {
        const { data } = await supabase
          .from("tv_devices")
          .select("id,nome,versao_app")
          .eq("codigo", chave)
          .maybeSingle();
        if (data) {
          encontrado = { id: data.id, nome: data.nome || "Tela", versao: data.versao_app };
        }
      } else if (dispositivoId) {
        const { data } = await supabase
          .from("sms_devices")
          .select("id,nome,versao_app")
          .eq("id", dispositivoId)
          .maybeSingle();
        if (data) {
          encontrado = { id: data.id, nome: data.nome || "Aparelho", versao: data.versao_app };
        }
      }
      setAparelho(encontrado);
    } finally {
      setCarregando(false);
    }
  }, [appSlug, chave, dispositivoId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const atualizar = async () => {
    if (!aparelho) return;
    if (!disponivel || !url) return toast.error("Nenhuma versão publicada para este aplicativo");
    setEnviando(true);
    try {
      if (appSlug === "coletor") {
        const { error } = await supabase
          .from("coletor_dispositivos")
          .update({
            comando: "atualizar_versao",
            comando_solicitado_em: new Date().toISOString(),
            comando_status: "pendente",
            comando_resultado: null,
          })
          .eq("id", aparelho.id);
        if (error) throw error;
      } else if (appSlug === "remotas") {
        const { error } = await enviarComando(aparelho.id, "atualizar_versao", { forcar: true, versao: disponivel });
        if (error) throw error;
      } else {
        const estabelecimentoId = await getEstabelecimentoId();
        const usuarioId = await getUsuarioId();
        if (!estabelecimentoId) throw new Error("Empresa do usuário não encontrada");
        const { error } = await supabase.from("app_update_commands" as any).insert({
          estabelecimento_id: estabelecimentoId,
          device_id: aparelho.id,
          app: appSlug,
          versao_alvo: disponivel,
          arquivo_url: url,
          criado_por: usuarioId,
        });
        if (error) throw error;
      }
      toast.success(`Atualização enviada para ${aparelho.nome}`);
      await carregar();
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível enviar a atualização");
    } finally {
      setEnviando(false);
    }
  };

  if (carregando) return <p className="text-xs text-muted-foreground">Verificando aparelho…</p>;

  if (!aparelho) {
    return (
      <p className="text-xs text-muted-foreground">
        Nenhum aparelho usando esta chave até agora — a atualização aparece aqui depois da primeira ativação.
      </p>
    );
  }

  const atrasado = menorQue(aparelho.versao, disponivel);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{aparelho.nome}</p>
        <p className="text-xs text-muted-foreground">
          Instalada: {aparelho.versao || "desconhecida"} · Disponível: {disponivel || "—"}
        </p>
      </div>
      <Badge variant={atrasado ? "destructive" : "secondary"}>
        {atrasado ? "Desatualizado" : "Atualizado"}
      </Badge>
      {aparelho.statusComando && aparelho.statusComando !== "concluido" && (
        <Badge variant="outline">{aparelho.statusComando}</Badge>
      )}
      <Button size="sm" variant="outline" onClick={atualizar} disabled={enviando || !atrasado}>
        <Send className="mr-1.5 h-3.5 w-3.5" /> {enviando ? "Enviando…" : "Atualizar"}
      </Button>
    </div>
  );
}
