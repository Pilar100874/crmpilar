import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { extrairTags, extrairWikiLinks, normalizarTitulo } from "@/lib/notas/wikilinks";

export type EntidadeNota = "empresa" | "contato" | "kb_artigo" | null;

export interface Nota {
  id: string;
  estabelecimento_id: string | null;
  titulo: string;
  conteudo: string;
  tags: string[];
  entidade_tipo: EntidadeNota;
  entidade_id: string | null;
  favorito: boolean;
  autor_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotaLink {
  id: string;
  origem_id: string;
  destino_titulo: string;
  destino_id: string | null;
}

const db = supabase as any;

interface UseNotasOptions {
  entidadeTipo?: Exclude<EntidadeNota, null>;
  entidadeId?: string | null;
}

export function useNotas(options: UseNotasOptions = {}) {
  const { entidadeTipo, entidadeId } = options;
  const [notas, setNotas] = useState<Nota[]>([]);
  const [links, setLinks] = useState<NotaLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const estabId = await getEstabelecimentoId();
      setEstabelecimentoId(estabId);

      let query = db.from("notas").select("*").order("updated_at", { ascending: false });
      if (estabId) query = query.eq("estabelecimento_id", estabId);
      if (entidadeTipo) query = query.eq("entidade_tipo", entidadeTipo);
      if (entidadeId) query = query.eq("entidade_id", entidadeId);

      const { data, error } = await query;
      if (error) throw error;
      setNotas((data || []) as Nota[]);

      const { data: linkData } = await db.from("nota_links").select("*");
      setLinks((linkData || []) as NotaLink[]);
    } catch (e) {
      console.error("Erro ao carregar notas:", e);
    } finally {
      setLoading(false);
    }
  }, [entidadeTipo, entidadeId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  /** Recria os wiki-links de uma nota resolvendo destinos existentes. */
  const sincronizarLinks = useCallback(async (notaId: string, conteudo: string) => {
    const alvos = extrairWikiLinks(conteudo);
    await db.from("nota_links").delete().eq("origem_id", notaId);
    if (alvos.length === 0) return;

    const { data: existentes } = await db.from("notas").select("id,titulo");
    const mapa = new Map<string, string>(
      ((existentes || []) as { id: string; titulo: string }[]).map((n) => [normalizarTitulo(n.titulo), n.id])
    );

    const rows = alvos.map((titulo) => ({
      origem_id: notaId,
      destino_titulo: titulo,
      destino_id: mapa.get(normalizarTitulo(titulo)) || null,
    }));
    await db.from("nota_links").insert(rows);
  }, []);

  const salvarNota = useCallback(
    async (nota: Partial<Nota> & { titulo: string; conteudo: string }) => {
      const estabId = estabelecimentoId ?? (await getEstabelecimentoId());
      const { data: userData } = await supabase.auth.getUser();

      const tagsAuto = extrairTags(nota.conteudo);
      const tags = Array.from(new Set([...(nota.tags || []), ...tagsAuto]));

      const payload = {
        titulo: nota.titulo.trim(),
        conteudo: nota.conteudo,
        tags,
        entidade_tipo: nota.entidade_tipo ?? entidadeTipo ?? null,
        entidade_id: nota.entidade_id ?? entidadeId ?? null,
        favorito: nota.favorito ?? false,
        estabelecimento_id: estabId,
        autor_id: userData?.user?.id ?? null,
      };

      let notaId = nota.id;
      if (notaId) {
        const { error } = await db.from("notas").update(payload).eq("id", notaId);
        if (error) throw error;
      } else {
        const { data, error } = await db.from("notas").insert(payload).select("id").single();
        if (error) throw error;
        notaId = data.id as string;
      }

      await sincronizarLinks(notaId!, nota.conteudo);
      // resolve links pendentes que apontam para esta nota
      await db
        .from("nota_links")
        .update({ destino_id: notaId })
        .is("destino_id", null)
        .ilike("destino_titulo", payload.titulo);

      await carregar();
      return notaId!;
    },
    [estabelecimentoId, entidadeTipo, entidadeId, sincronizarLinks, carregar]
  );

  const excluirNota = useCallback(
    async (id: string) => {
      const { error } = await db.from("notas").delete().eq("id", id);
      if (error) throw error;
      await carregar();
    },
    [carregar]
  );

  const alternarFavorito = useCallback(
    async (nota: Nota) => {
      await db.from("notas").update({ favorito: !nota.favorito }).eq("id", nota.id);
      await carregar();
    },
    [carregar]
  );

  /** Notas que mencionam a nota informada (backlinks). */
  const backlinksDe = useCallback(
    (nota: Nota | null): Nota[] => {
      if (!nota) return [];
      const alvo = normalizarTitulo(nota.titulo);
      const origens = links
        .filter((l) => l.destino_id === nota.id || normalizarTitulo(l.destino_titulo) === alvo)
        .map((l) => l.origem_id);
      return notas.filter((n) => origens.includes(n.id) && n.id !== nota.id);
    },
    [links, notas]
  );

  /** Links de saída (inclusive não resolvidos). */
  const saidasDe = useCallback(
    (nota: Nota | null) => {
      if (!nota) return [] as { titulo: string; nota: Nota | null }[];
      return links
        .filter((l) => l.origem_id === nota.id)
        .map((l) => ({
          titulo: l.destino_titulo,
          nota: notas.find((n) => normalizarTitulo(n.titulo) === normalizarTitulo(l.destino_titulo)) || null,
        }));
    },
    [links, notas]
  );

  return {
    notas,
    links,
    loading,
    carregar,
    salvarNota,
    excluirNota,
    alternarFavorito,
    backlinksDe,
    saidasDe,
  };
}
