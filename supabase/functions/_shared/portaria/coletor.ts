// Ponte para dispositivos que só existem na rede local (IP interno).
// O CRM não alcança 192.168.x.x: o comando vira um "job" na fila e o
// Coletor Pilar (instalado na rede do cliente) executa e devolve o resultado.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface ResultadoJob {
  ok: boolean;
  mensagem?: string;
  dados?: unknown;
}

export async function enfileirarJob(
  admin: SupabaseClient,
  entrada: {
    device_id: string;
    access_point_id?: string | null;
    comando: string;
    parametros?: Record<string, unknown>;
    solicitado_por?: string | null;
  },
): Promise<string | null> {
  const { data, error } = await admin
    .from("port_device_jobs")
    .insert({
      device_id: entrada.device_id,
      access_point_id: entrada.access_point_id ?? null,
      comando: entrada.comando,
      parametros: entrada.parametros ?? {},
      solicitado_por: entrada.solicitado_por ?? null,
    })
    .select("id")
    .maybeSingle();
  if (error) return null;
  return (data?.id as string) ?? null;
}

/** Aguarda o Coletor executar o job (padrão: 15s). */
export async function aguardarJob(
  admin: SupabaseClient,
  jobId: string,
  timeoutMs = 15000,
): Promise<ResultadoJob> {
  const limite = Date.now() + timeoutMs;
  while (Date.now() < limite) {
    await new Promise((r) => setTimeout(r, 600));
    const { data } = await admin
      .from("port_device_jobs")
      .select("status, resultado, erro")
      .eq("id", jobId)
      .maybeSingle();
    if (!data) continue;
    if (data.status === "concluido") {
      const res = (data.resultado ?? {}) as Record<string, unknown>;
      return { ok: true, mensagem: (res.mensagem as string) ?? "Comando executado pelo Coletor.", dados: res.dados };
    }
    if (data.status === "erro") {
      return { ok: false, mensagem: data.erro || "O Coletor não conseguiu executar o comando." };
    }
  }
  await admin
    .from("port_device_jobs")
    .update({ status: "erro", erro: "Tempo esgotado aguardando o Coletor." })
    .eq("id", jobId)
    .in("status", ["pendente", "executando"]);
  return {
    ok: false,
    mensagem: "O Coletor local não respondeu. Verifique se o Coletor Pilar está aberto na rede do dispositivo.",
  };
}

/** Executa via Coletor: enfileira e aguarda. */
export async function executarViaColetor(
  admin: SupabaseClient,
  entrada: Parameters<typeof enfileirarJob>[1],
  timeoutMs?: number,
): Promise<ResultadoJob> {
  const jobId = await enfileirarJob(admin, entrada);
  if (!jobId) return { ok: false, mensagem: "Não foi possível enfileirar o comando para o Coletor." };
  return await aguardarJob(admin, jobId, timeoutMs);
}
