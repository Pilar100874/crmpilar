/**
 * Agenda de contatos do celular.
 *
 * No APK (Capacitor) usa o plugin nativo de contatos; no navegador usa a
 * API de seleção de contatos quando disponível.
 */
export interface ContatoCelular {
  id: string;
  nome: string;
  numero: string;
}

type PluginContatos = {
  requestPermissions?: () => Promise<{ contacts?: string }>;
  getContacts: (opcoes: unknown) => Promise<{ contacts: Array<Record<string, unknown>> }>;
};

function pluginNativo(): PluginContatos | null {
  const cap = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown> } }).Capacitor;
  const p = cap?.Plugins?.Contacts as PluginContatos | undefined;
  return p && typeof p.getContacts === "function" ? p : null;
}

export function agendaDisponivel(): boolean {
  return !!pluginNativo() || "contacts" in navigator;
}

function normalizar(numero: string) {
  return numero.replace(/[^\d+*#]/g, "");
}

/** Lê todos os contatos do aparelho (APK). Lança erro se a permissão for negada. */
export async function lerAgendaCelular(): Promise<ContatoCelular[]> {
  const plugin = pluginNativo();
  if (plugin) {
    const permissao = await plugin.requestPermissions?.();
    if (permissao?.contacts && permissao.contacts !== "granted") {
      throw new Error("Permissão de acesso aos contatos negada no aparelho.");
    }
    const { contacts } = await plugin.getContacts({ projection: { name: true, phones: true } });
    const lista: ContatoCelular[] = [];
    contacts.forEach((c, i) => {
      const nome =
        ((c.name as { display?: string } | undefined)?.display ?? "").trim() || "Sem nome";
      const telefones = (c.phones as Array<{ number?: string }> | undefined) ?? [];
      telefones.forEach((t, j) => {
        const numero = normalizar(t.number ?? "");
        if (numero) lista.push({ id: `${String(c.contactId ?? i)}-${j}`, nome, numero });
      });
    });
    return lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }

  const seletor = (navigator as unknown as {
    contacts?: { select: (props: string[], opts?: { multiple?: boolean }) => Promise<Array<{ name?: string[]; tel?: string[] }>> };
  }).contacts;
  if (!seletor) throw new Error("Este aparelho não permite ler a agenda por aqui.");
  const escolhidos = await seletor.select(["name", "tel"], { multiple: true });
  return escolhidos.flatMap((c, i) =>
    (c.tel ?? []).map((t, j) => ({
      id: `${i}-${j}`,
      nome: c.name?.[0] ?? "Sem nome",
      numero: normalizar(t),
    })),
  );
}
