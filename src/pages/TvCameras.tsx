// TV: mosaico 4x4 (16 câmeras) sem espaçamento, rotacionando a cada 10s
// entre os grupos de 16 quando houver mais câmeras no sistema.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CameraLiveTile } from "@/components/cameras/CameraLiveTile";
import { Loader2, Camera as CameraIcon } from "lucide-react";

const PAGE_SIZE = 16;
const ROTATE_MS = 10_000;

export default function TvCameras() {
  const [cams, setCams] = useState<any[] | null>(null);
  const [pageIdx, setPageIdx] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("cv_cameras")
        .select("id,nome,filial_id,ativo")
        .eq("ativo", true)
        .order("nome");
      setCams(data ?? []);
    })();
  }, []);

  const pages = useMemo(() => {
    const list = cams ?? [];
    const chunks: any[][] = [];
    for (let i = 0; i < list.length; i += PAGE_SIZE) chunks.push(list.slice(i, i + PAGE_SIZE));
    return chunks.length ? chunks : [[]];
  }, [cams]);

  useEffect(() => {
    if (pages.length <= 1) return;
    const t = setInterval(() => setPageIdx((i) => (i + 1) % pages.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [pages.length]);

  useEffect(() => {
    if (pageIdx >= pages.length) setPageIdx(0);
  }, [pages.length, pageIdx]);

  if (cams === null) {
    return (
      <div className="fixed inset-0 bg-black text-white flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando câmeras...
      </div>
    );
  }
  if (cams.length === 0) {
    return (
      <div className="fixed inset-0 bg-black text-white/70 flex flex-col items-center justify-center gap-2">
        <CameraIcon className="h-10 w-10 opacity-40" />
        <p className="text-sm">Nenhuma câmera ativa cadastrada</p>
      </div>
    );
  }

  const current = pages[pageIdx] ?? [];
  // Preenche até 16 slots para manter a grade 4x4 constante
  const slots = Array.from({ length: PAGE_SIZE }, (_, i) => current[i] ?? null);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <div className="w-full h-full grid grid-cols-4 grid-rows-4 gap-0">
        {slots.map((c, i) =>
          c ? (
            <div key={`${pageIdx}-${c.id}`} className="w-full h-full overflow-hidden">
              <CameraLiveTile
                cameraId={c.id}
                cameraNome={c.nome}
                filialId={c.filial_id ?? null}
                startDelayMs={Math.min(i, 8) * 400}
                className="w-full h-full rounded-none border-0"
              />
            </div>
          ) : (
            <div key={`empty-${pageIdx}-${i}`} className="w-full h-full bg-black" />
          )
        )}
      </div>
      {pages.length > 1 && (
        <div className="absolute bottom-2 right-3 text-[11px] text-white/70 bg-black/50 px-2 py-0.5 rounded">
          {pageIdx + 1}/{pages.length} · rotaciona a cada 10s
        </div>
      )}
    </div>
  );
}
