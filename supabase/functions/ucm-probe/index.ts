import { createClient } from "npm:@supabase/supabase-js@2";
import { md5 } from "npm:js-md5@0.8.3";
import { clienteUcmTls } from "../_shared/ucmTls.ts";

Deno.serve(async () => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: c } = await supabase.from("ucm_config").select("ucm_host, ucm_user, ucm_password").limit(1).maybeSingle();
  const url = `https://${c!.ucm_host.includes(":") ? c!.ucm_host : c!.ucm_host + ":8089"}/api`;
  const call = async (body: Record<string, unknown>) => {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ request: body }), ...clienteUcmTls() } as RequestInit);
    return await r.json();
  };
  const ch = await call({ action: "challenge", user: c!.ucm_user, version: "1.0" });
  const login = await call({ action: "login", user: c!.ucm_user, token: md5(String(ch.response.challenge) + c!.ucm_password) });
  const cookie = login.response.cookie;
  const testes: Record<string, unknown> = {};
  for (const a of ["callbackDial","cticall","dialNumber","clickToCall","originate","makeCall","dial","cti_dial"]) {
    testes[a] = await call({ action: a, cookie, caller: "1014", callee: "999611194", phonenumber: "999611194", extension: "1014" });
  }
  return new Response(JSON.stringify(testes, null, 2), { headers: { "Content-Type": "application/json" } });
});
