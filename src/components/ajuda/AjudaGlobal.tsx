import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { HelpCircle, Loader2, Send, Sparkles, X, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { buscarAjuda, ehAcao, rotuloCanonico, textoOficial, type AjudaCampo } from "@/lib/ajuda/catalogoCampos";

interface CampoInfo { rotulo: string; secao?: string; dica?: string; placeholder?: string; tipo?: string; opcoes?: string; vizinhos?: string }
interface Msg { papel: "user" | "ia"; texto: string }

const SEL_CAMPO = "input,textarea,select,[role=switch],[role=combobox],[role=checkbox],[role=radio],[role=slider],label";
const limpo = (s?: string | null) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, 200);

function rotuloDe(el: HTMLElement): string {
  if (el.tagName === "LABEL") return limpo(el.textContent);
  const aria = el.getAttribute("aria-label"); if (aria) return limpo(aria);
  const lb = el.getAttribute("aria-labelledby"); if (lb) { const t = document.getElementById(lb)?.textContent; if (t) return limpo(t); }
  if (el.id) { const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l?.textContent) return limpo(l.textContent); }
  const pai = el.closest("label"); if (pai?.textContent) return limpo(pai.textContent);
  let p: HTMLElement | null = el.parentElement;
  for (let i = 0; p && i < 4; i++, p = p.parentElement) {
    const l = p.querySelector("label"); if (l?.textContent && p.querySelectorAll(SEL_CAMPO).length <= 4) return limpo(l.textContent);
  }
  return limpo(el.getAttribute("placeholder") || el.getAttribute("name") || el.textContent);
}

const SEL_ELEMENTO = "[data-ajuda],.react-flow__node,[role=tab],[role=menuitem],[role=option],[role=row],button,a[href],th,h1,h2,h3,h4,[role=dialog] [class*=CardTitle]";

/** Tipo do elemento em linguagem do usuário, para a IA e o título do painel. */
function tipoDe(el: HTMLElement): string {
  if (el.closest(".react-flow__node")) return "bloco do workflow";
  const role = el.getAttribute("role"), tag = el.tagName;
  if (role === "tab") return "aba"; if (role === "menuitem") return "item de menu"; if (role === "option") return "opção de lista";
  if (role === "switch" || el.getAttribute("type") === "checkbox" || role === "checkbox") return "chave liga/desliga";
  if (role === "combobox" || tag === "SELECT") return "lista de escolha";
  if (tag === "BUTTON") return "botão"; if (tag === "A") return "link do menu"; if (tag === "TH") return "coluna de tabela";
  if (/^H[1-4]$/.test(tag)) return "título de seção"; if (role === "row") return "linha de tabela";
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "LABEL") return "campo";
  return "elemento da tela";
}

function extrair(alvo: HTMLElement): CampoInfo | null {
  const marcado = alvo.closest<HTMLElement>("[data-ajuda]");
  const el = marcado ?? alvo.closest<HTMLElement>(SEL_CAMPO) ?? alvo.closest<HTMLElement>(SEL_ELEMENTO)
    ?? (limpo(alvo.textContent) ? alvo : null);
  if (!el) return null;
  const tipo = tipoDe(el);
  const no = el.closest<HTMLElement>(".react-flow__node");
  const rotulo = limpo(marcado?.getAttribute("data-ajuda")) || (no ? limpo(no.querySelector("[class*=font-semibold],[class*=font-medium],strong")?.textContent || no.textContent).slice(0, 80)
    : rotuloDe(el) || limpo(el.getAttribute("title")));
  if (!rotulo) return null;
  const canon = rotuloCanonico(rotulo);
  const grupo = el.closest("[class*=card], section, fieldset, form, [role=dialog], [role=tabpanel]");
  const dlg = el.closest("[role=dialog]")?.querySelector("h2,[class*=DialogTitle]")?.textContent;
  const titulo = dlg || grupo?.querySelector("h1,h2,h3,h4,legend,[class*=CardTitle],[class*=font-semibold]")?.textContent;
  const bloco = el.parentElement?.parentElement;
  const dica = no ? limpo(no.textContent) : el.getAttribute("title") || bloco?.querySelector("p,[class*=muted-foreground]")?.textContent;
  const vizinhos = grupo ? Array.from(grupo.querySelectorAll("label,button,[role=tab]")).map((l) => limpo(l.textContent)).filter((t) => t && t !== rotulo && t.length < 40).slice(0, 12).join(", ") : "";
  const opcoes = el.tagName === "SELECT" ? Array.from((el as HTMLSelectElement).options).map((o) => o.text).join(", ") : "";
  return { rotulo: canon, secao: limpo(titulo) || undefined, dica: limpo(dica) !== rotulo ? limpo(dica) || undefined : undefined,
    placeholder: limpo(el.getAttribute("placeholder")) || undefined, tipo, opcoes: opcoes || undefined, vizinhos: vizinhos || undefined };
}

export function AjudaGlobal() {
  const { pathname } = useLocation();
  const [modo, setModo] = useState(false);
  const [campo, setCampo] = useState<CampoInfo | null>(null);
  const [oficial, setOficial] = useState<AjudaCampo | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [pergunta, setPergunta] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const fimRef = useRef<HTMLDivElement>(null);

  const perguntar = useCallback(async (c: CampoInfo, of: AjudaCampo | null, hist: Msg[], texto?: string) => {
    setCarregando(true); setErro("");
    const { data, error } = await supabase.functions.invoke("ajuda-campo", {
      body: { campo: c, tela: `${document.title} | ${document.querySelector("main h1, h1")?.textContent?.trim() ?? ""}`, rota: pathname, oficial: textoOficial(of, c.tipo), historico: hist, pergunta: texto },
    });
    setCarregando(false);
    const msg = (data as { error?: string } | null)?.error ?? (error ? "Não consegui falar com a IA agora." : "");
    if (msg) { setErro(msg); return; }
    setMsgs([...hist, ...(texto ? [{ papel: "user" as const, texto }] : []), { papel: "ia", texto: (data as { resposta: string }).resposta }]);
  }, [pathname]);

  const abrir = useCallback((c: CampoInfo) => {
    const of = buscarAjuda(c.rotulo, pathname);
    setCampo(c); setOficial(of); setMsgs([]); setPergunta(""); setErro(""); setModo(false);
    if (!of) void perguntar(c, null, []);
  }, [pathname, perguntar]);

  useEffect(() => {
    const clique = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!(modo || e.altKey) || t.closest("[data-ajuda-global]")) return;
      const c = extrair(t); if (!c) return;
      e.preventDefault(); e.stopPropagation(); abrir(c);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "F1" && e.shiftKey) { e.preventDefault(); setModo((m) => !m); }
      else if (e.key === "Escape") setModo(false);
    };
    document.addEventListener("click", clique, true);
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("click", clique, true); document.removeEventListener("keydown", tecla); };
  }, [modo, abrir]);

  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, carregando]);

  const enviar = () => { const t = pergunta.trim(); if (!t || !campo || carregando) return; setPergunta(""); void perguntar(campo, oficial, msgs, t); };

  return createPortal(
    <div data-ajuda-global>
      {modo && <style>{`input,textarea,select,[role=switch],[role=combobox],[role=checkbox],label{outline:2px dashed hsl(var(--primary)/.6)!important;outline-offset:2px}*{cursor:help!important}`}</style>}
      {modo && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[2147483647] flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm shadow-lg max-w-[90vw]">
          <HelpCircle className="h-4 w-4 shrink-0" /> <span>Clique em qualquer campo, botão, bloco, aba ou menu</span>
          <button aria-label="Sair do modo ajuda" onClick={() => setModo(false)} className="ml-1 rounded-full p-0.5 hover:bg-primary-foreground/20"><X className="h-4 w-4" /></button>
        </div>
      )}
      <Button size="icon" variant={modo ? "default" : "outline"} aria-label="Ajuda: o que é este campo?"
        title="Ajuda: clique aqui e depois no campo (atalho: Shift+F1 ou Alt+clique no campo)"
        onClick={() => setModo((m) => !m)} className="fixed bottom-4 left-4 z-[2147483645] h-10 w-10 rounded-full shadow-lg">
        <HelpCircle className="h-5 w-5" />
      </Button>
      <Sheet open={!!campo} onOpenChange={(o) => !o && setCampo(null)}>
        <SheetContent data-ajuda-global overlayClassName="z-[2147483646]" className="z-[2147483647] w-full sm:max-w-md flex flex-col gap-3 overflow-hidden">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 pr-6"><HelpCircle className="h-5 w-5 text-primary shrink-0" /><span className="break-words">{campo?.rotulo}</span></SheetTitle>
            <SheetDescription className="break-words">{campo?.tipo && <span className="capitalize">{campo.tipo} · </span>}{oficial?.tela ?? campo?.secao ?? document.title}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-3 pr-1">
            {oficial && (
              <div className="rounded-lg border bg-muted/40 p-3 space-y-2 text-sm">
                <div className="flex items-center gap-1.5 text-xs font-medium text-primary"><BookOpen className="h-3.5 w-3.5" /> Explicação oficial</div>
                <p><strong>Para que serve:</strong> {oficial.paraQue}</p>
                {oficial.seVazio && !ehAcao(campo?.tipo) && <p><strong>Se ficar vazio:</strong> {oficial.seVazio}</p>}
                {oficial.exemplo && <p><strong>Exemplo:</strong> {oficial.exemplo}</p>}
              </div>
            )}
            {!oficial && msgs.length === 0 && !carregando && !erro && <p className="text-sm text-muted-foreground">Sem explicação cadastrada.</p>}
            {msgs.map((m, i) => (
              <div key={i} className={`rounded-lg p-3 text-sm whitespace-pre-wrap break-words ${m.papel === "ia" ? "bg-primary/10" : "bg-muted ml-8"}`}>
                {m.papel === "ia" && <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-1"><Sparkles className="h-3.5 w-3.5" /> IA</div>}
                {m.texto}
              </div>
            ))}
            {carregando && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Pensando…</div>}
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            <div ref={fimRef} />
          </div>
          <div className="space-y-2 border-t pt-3">
            <Textarea value={pergunta} onChange={(e) => setPergunta(e.target.value)} rows={2} placeholder="Pergunte à IA sobre isto…"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }} />
            <Button className="w-full" onClick={enviar} disabled={carregando || !pergunta.trim()}><Send className="h-4 w-4 mr-2" /> Perguntar à IA</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>,
    document.body,
  );
}
