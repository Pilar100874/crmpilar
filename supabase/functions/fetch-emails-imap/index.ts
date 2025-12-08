import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple IMAP client using raw sockets
async function fetchEmailsViaIMAP(
  host: string,
  port: number,
  email: string,
  password: string,
  folder: string,
  limit: number
): Promise<any[]> {
  const conn = await Deno.connectTls({ hostname: host, port });
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let tagCounter = 1;
  const getTag = () => `A${tagCounter++}`;

  const readResponse = async (): Promise<string> => {
    const buffer = new Uint8Array(65536);
    let result = "";
    let attempts = 0;
    
    while (attempts < 10) {
      const n = await conn.read(buffer);
      if (n === null) break;
      result += decoder.decode(buffer.subarray(0, n));
      if (result.includes("OK") || result.includes("NO") || result.includes("BAD")) {
        break;
      }
      attempts++;
    }
    return result;
  };

  const sendCommand = async (command: string): Promise<string> => {
    const tag = getTag();
    await conn.write(encoder.encode(`${tag} ${command}\r\n`));
    return await readResponse();
  };

  try {
    // Read greeting
    await readResponse();

    // Login
    const loginRes = await sendCommand(`LOGIN "${email}" "${password}"`);
    if (loginRes.includes("NO") || loginRes.includes("BAD")) {
      throw new Error("Falha no login IMAP. Verifique email e senha.");
    }

    // Select folder
    const selectRes = await sendCommand(`SELECT "${folder}"`);
    const existsMatch = selectRes.match(/(\d+) EXISTS/);
    const totalEmails = existsMatch ? parseInt(existsMatch[1]) : 0;

    if (totalEmails === 0) {
      await sendCommand("LOGOUT");
      conn.close();
      return [];
    }

    // Fetch emails (last N)
    const startSeq = Math.max(1, totalEmails - limit + 1);
    const fetchRes = await sendCommand(
      `FETCH ${startSeq}:${totalEmails} (FLAGS ENVELOPE BODY.PEEK[TEXT]<0.2000>)`
    );

    const emails: any[] = [];
    
    // Parse FETCH responses (simplified parsing)
    const fetchLines = fetchRes.split(/\* \d+ FETCH/);
    
    for (const fetchData of fetchLines) {
      if (!fetchData.trim()) continue;

      // Extract envelope
      const envelopeMatch = fetchData.match(/ENVELOPE \(([^)]+(?:\([^)]*\))*[^)]*)\)/);
      if (!envelopeMatch) continue;

      const envelope = envelopeMatch[1];
      
      // Parse date
      const dateMatch = envelope.match(/"([^"]+)"/);
      const date = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString();

      // Parse subject (second quoted string after date)
      const quotedStrings = envelope.match(/"([^"]*)"/g) || [];
      const subject = quotedStrings[1]?.replace(/"/g, "") || "(Sem assunto)";

      // Parse from address
      const fromMatch = fetchData.match(/\(\((?:NIL|"[^"]*") (?:NIL|"[^"]*") "([^"]*)" "([^"]*)"\)\)/);
      const fromName = fromMatch ? fromMatch[1] : "";
      const fromDomain = fromMatch ? fromMatch[2] : "";
      const fromEmail = fromName && fromDomain ? `${fromName}@${fromDomain}` : "desconhecido";

      // Check flags
      const flagsMatch = fetchData.match(/FLAGS \(([^)]*)\)/);
      const flags = flagsMatch ? flagsMatch[1] : "";
      const read = flags.includes("\\Seen");
      const starred = flags.includes("\\Flagged");

      // Extract body preview
      const bodyMatch = fetchData.match(/BODY\[TEXT\]<0> \{(\d+)\}\r\n([\s\S]*?)(?=\)|\* \d+)/);
      const body = bodyMatch ? bodyMatch[2].substring(0, 500) : "";

      emails.push({
        subject: decodeEmailSubject(subject),
        from_email: fromEmail,
        from_address: fromEmail,
        to_email: email,
        date,
        read,
        starred,
        body: body.trim(),
      });
    }

    // Logout
    await sendCommand("LOGOUT");
    conn.close();

    return emails.reverse(); // Newest first
  } catch (error) {
    try { conn.close(); } catch {}
    throw error;
  }
}

// Decode MIME encoded words
function decodeEmailSubject(subject: string): string {
  if (!subject) return "(Sem assunto)";
  
  // Decode =?UTF-8?Q?...?= or =?UTF-8?B?...?=
  return subject.replace(/=\?([^?]+)\?([BQ])\?([^?]+)\?=/gi, (match, charset, encoding, text) => {
    try {
      if (encoding.toUpperCase() === 'B') {
        return atob(text);
      } else {
        return text.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (_m: string, hex: string) => 
          String.fromCharCode(parseInt(hex, 16))
        );
      }
    } catch {
      return text;
    }
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Get user email config
    const { data: usuario, error: userError } = await supabaseClient
      .from("usuarios")
      .select("email, pop, porta_pop, senha_email")
      .eq("auth_user_id", user.id)
      .single();

    if (userError || !usuario) {
      throw new Error("Configuração de email não encontrada");
    }

    if (!usuario.pop || !usuario.senha_email) {
      throw new Error("Configure o servidor IMAP e senha do email nas configurações do usuário");
    }

    const { folder = "INBOX", limit = 30 } = await req.json().catch(() => ({}));

    console.log(`Connecting to IMAP: ${usuario.pop}:${usuario.porta_pop}`);

    const emails = await fetchEmailsViaIMAP(
      usuario.pop,
      usuario.porta_pop || 993,
      usuario.email,
      usuario.senha_email,
      folder,
      limit
    );

    console.log(`Fetched ${emails.length} emails`);

    return new Response(JSON.stringify({ emails }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error fetching emails:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
