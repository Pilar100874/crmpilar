import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type OAuthResult = { data: any; error: { message?: string } | null };

type OAuthServerApi = {
  getAuthorizationDetails?: (authorizationId: string) => Promise<OAuthResult>;
  approveAuthorization?: (authorizationId: string, options?: { skipBrowserRedirect?: boolean }) => Promise<OAuthResult>;
  denyAuthorization?: (authorizationId: string, options?: { skipBrowserRedirect?: boolean }) => Promise<OAuthResult>;
};

const getOAuthApi = () => (supabase.auth as typeof supabase.auth & { oauth?: OAuthServerApi }).oauth;

async function callOAuth(
  path: string,
  token: string,
  method: "GET" | "POST" = "GET",
  body?: Record<string, unknown>,
): Promise<OAuthResult> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/oauth/authorizations/${path}`, {
    method,
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (!res.ok) {
    return { data: null, error: { message: data?.msg || data?.error_description || data?.error || `HTTP ${res.status}` } };
  }
  return { data, error: null };
}

async function getAuthorizationDetails(authorizationId: string): Promise<OAuthResult> {
  const oauth = getOAuthApi();
  if (oauth?.getAuthorizationDetails) {
    return oauth.getAuthorizationDetails(authorizationId);
  }

  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) return { data: null, error: { message: "Sessão não encontrada." } };
  return callOAuth(authorizationId, token, "GET");
}

async function submitAuthorization(authorizationId: string, approve: boolean): Promise<OAuthResult> {
  const oauth = getOAuthApi();
  const sdkMethod = approve ? oauth?.approveAuthorization : oauth?.denyAuthorization;
  if (sdkMethod) {
    return sdkMethod(authorizationId, { skipBrowserRedirect: true });
  }

  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) return { data: null, error: { message: "Sessão não encontrada." } };
  return callOAuth(`${authorizationId}/consent`, token, "POST", { action: approve ? "approve" : "deny" });
}

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Parâmetro authorization_id ausente.");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/login?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message || "Falha ao carregar autorização.");
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = await submitAuthorization(authorizationId, approve);
    if (error) {
      setBusy(false);
      return setError(error.message || "Falha ao processar decisão.");
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("O servidor de autorização não retornou URL de redirecionamento.");
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md w-full">
          <CardHeader><CardTitle>Não foi possível carregar</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{error}</p></CardContent>
        </Card>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const clientName = details.client?.name ?? details.client?.client_name ?? "Aplicativo externo";
  const redirectUri = details.client?.redirect_uris?.[0] ?? details.redirect_uri;
  const scopes: string[] = details.scopes ?? details.requested_scopes ?? [];

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle>Conectar {clientName} ao Pilar</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            <strong>{clientName}</strong> poderá usar as ferramentas do Pilar como você,
            respeitando suas permissões e os dados do seu estabelecimento.
          </p>
          {redirectUri && (
            <p className="text-xs text-muted-foreground break-all">
              Redirecionamento: {redirectUri}
            </p>
          )}
          {scopes.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <div className="font-medium mb-1">Permissões solicitadas:</div>
              <ul className="list-disc pl-5">
                {scopes.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Isso não substitui as regras de acesso do sistema — todas as políticas do Pilar continuam valendo.
          </p>
          <div className="flex gap-2 pt-2">
            <Button onClick={() => decide(true)} disabled={busy} className="flex-1">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aprovar"}
            </Button>
            <Button onClick={() => decide(false)} disabled={busy} variant="outline" className="flex-1">
              Recusar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
