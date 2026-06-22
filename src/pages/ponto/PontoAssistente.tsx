import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles, ShieldAlert, Loader2, Mic, MicOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

export default function PontoAssistente() {
  const { empresaId } = usePontoEmpresa();
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: "Olá! Sou o Assistente RH do Controle de Ponto. Pergunte sobre horas extras, faltas, alertas, banco de horas, padrões suspeitos, etc." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [auditando, setAuditando] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const toggleVoz = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return toast.error("Reconhecimento de voz indisponível neste navegador");
    if (ouvindo) { recognitionRef.current?.stop(); setOuvindo(false); return; }
    const rec = new SR();
    rec.lang = "pt-BR"; rec.continuous = false; rec.interimResults = false;
    rec.onresult = (e: any) => {
      const txt = e.results[0]?.[0]?.transcript || "";
      setInput((curr) => (curr ? curr + " " : "") + txt);
    };
    rec.onend = () => setOuvindo(false);
    rec.onerror = () => setOuvindo(false);
    rec.start(); recognitionRef.current = rec; setOuvindo(true);
  };


  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const enviar = async () => {
    const txt = input.trim();
    if (!txt || loading) return;
    setInput("");
    const novos: Msg[] = [...msgs, { role: "user", content: txt }, { role: "assistant", content: "" }];
    setMsgs(novos);
    setLoading(true);
    try {
      const url = `https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/ponto-assistente-rh`;
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({
          empresa_id: empresaId,
          messages: novos.filter(m => m.content).map(m => ({ role: m.role, content: m.content })),
        }),
      });
      if (!resp.ok || !resp.body) {
        const e = await resp.text();
        throw new Error(e || `HTTP ${resp.status}`);
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const j = JSON.parse(data);
            const delta = j.choices?.[0]?.delta?.content || "";
            if (delta) {
              acc += delta;
              setMsgs(curr => {
                const copy = [...curr];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch {}
        }
      }
    } catch (e: any) {
      toast.error(e.message);
      setMsgs(curr => curr.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const rodarAuditoria = async () => {
    if (!empresaId) return;
    setAuditando(true);
    try {
      const { data, error } = await supabase.functions.invoke("ponto-ia-auditoria", {
        body: { empresa_id: empresaId },
      });
      if (error) throw error;
      toast.success(`${data?.novos_alertas ?? 0} novo(s) padrão(ões) suspeito(s) detectado(s) em ${data?.analisados ?? 0} funcionário(s)`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAuditando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Assistente RH
          </h2>
          <p className="text-sm text-muted-foreground">Chat com IA + auditoria automática antifraude</p>
        </div>
        <Button onClick={rodarAuditoria} disabled={auditando} size="sm" variant="outline">
          {auditando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
          Rodar auditoria IA
        </Button>
      </div>

      <Card className="flex flex-col h-[70vh] sm:h-[75vh]">
        <CardContent className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3" ref={scrollRef as any}>
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                {m.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>*]:my-1">
                    <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
        <div className="border-t p-2 sm:p-3 flex gap-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
            placeholder="Ex: Quantas horas extras este mês? Quais funcionários têm mais alertas?"
            className="min-h-[44px] max-h-32 resize-none"
            disabled={loading}
          />
          <Button onClick={toggleVoz} variant={ouvindo ? "default" : "outline"} size="icon" className="h-11 w-11 shrink-0">
            {ouvindo ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button onClick={enviar} disabled={loading || !input.trim()} size="icon" className="h-11 w-11 shrink-0">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </Card>
    </div>
  );
}
