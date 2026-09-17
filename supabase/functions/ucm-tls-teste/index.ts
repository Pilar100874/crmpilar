import { clienteUcmTls } from "../_shared/ucmTls.ts";

Deno.serve(async () => {
  const opcoes = clienteUcmTls();
  const temCliente = Boolean((opcoes as { client?: unknown }).client);
  let resultado = "";
  try {
    const r = await fetch("https://apps.pilar.com.br:8089/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request: { action: "challenge", user: "teste", version: "1.0" } }),
      ...opcoes,
    } as RequestInit);
    resultado = `HTTP ${r.status}`;
  } catch (e) {
    resultado = e instanceof Error ? e.message : String(e);
  }
  return new Response(JSON.stringify({ temCliente, resultado }), { headers: { "Content-Type": "application/json" } });
});
