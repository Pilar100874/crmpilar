import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { CalendarCheck, FileText, History, Mail, MapPin, MessageCircle, Paperclip, Phone, Send, UserRoundCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast-config";
import type { AtendimentoV2Canal, AtendimentoV2FilaItem, AtendimentoV2Mensagem } from "@/types/atendimento-v2";

const canais: Array<{ id: AtendimentoV2Canal; label: string; icon: typeof MessageCircle }> = [
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "telefone", label: "Telefone", icon: Phone },
  { id: "email", label: "E-mail", icon: Mail },
  { id: "visita", label: "Visita", icon: MapPin },
];

interface Props {
  item: AtendimentoV2FilaItem | null;
  canal: AtendimentoV2Canal;
  mensagens: AtendimentoV2Mensagem[];
  enviando: boolean;
  onCanalChange: (canal: AtendimentoV2Canal) => void;
  onEnviar: (texto: string) => Promise<void>;
  onCadastro: () => void;
  onFinalizar: () => void;
  onHistorico: () => void;
}

export function PainelConversaV2({ item, canal, mensagens, enviando, onCanalChange, onEnviar, onCadastro, onFinalizar, onHistorico }: Props) {
  const chaveRascunho = item?.contatoId ? `atendimento_v2_rascunho_${item.contatoId}_${canal}` : "";
  const [texto, setTexto] = useState("");
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTexto(chaveRascunho ? localStorage.getItem(chaveRascunho) || "" : "");
  }, [chaveRascunho]);

  useEffect(() => {
    if (chaveRascunho) localStorage.setItem(chaveRascunho, texto);
  }, [chaveRascunho, texto]);

  useEffect(() => fimRef.current?.scrollIntoView({ block: "nearest" }), [mensagens]);

  if (!item) {
    return (
      <div className="flex h-full min-h-96 flex-col items-center justify-center bg-background px-6 text-center">
        <MessageCircle className="mb-4 h-12 w-12 text-muted-foreground/30" />
        <p className="font-semibold text-foreground">Selecione um contato da fila</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">O atendimento, histórico e próxima ação aparecerão aqui.</p>
      </div>
    );
  }

  const disponibilidade = {
    whatsapp: !!item.contato?.telefone,
    telefone: !!item.contato?.tel,
    email: !!item.contato?.email,
    visita: true,
  };
  const empresa = item.empresa;
  const semDado = !disponibilidade[canal];

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="shrink-0 border-b border-border bg-card px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
            {item.nome.split(/\s+/).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-foreground">{item.nome}</h2>
            <p className="truncate text-sm text-muted-foreground">{empresa || "Sem empresa vinculada"}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onCadastro} className="h-11 gap-2">
            <UserRoundCog className="h-4 w-4" />
            <span className="hidden sm:inline">Cadastro</span>
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {canais.map(({ id, label, icon: Icone }) => (
            <Button
              key={id}
              variant={canal === id ? "default" : "outline"}
              onClick={() => onCanalChange(id)}
              className="h-11 gap-2"
            >
              <Icone className="h-4 w-4" /> {label}
            </Button>
          ))}
        </div>
      </header>

      <div className="flex items-center border-b border-border bg-card px-4">
        <Button variant="ghost" className="h-11 rounded-none border-b-2 border-primary px-3 text-primary">Atendimento</Button>
        <Button variant="ghost" className="h-11 gap-2 rounded-none px-3" onClick={onHistorico}><History className="h-4 w-4" />Histórico</Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30 p-4">
        {semDado ? (
          <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center text-center">
            <UserRoundCog className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-semibold text-foreground">Dado necessário não cadastrado</p>
            <p className="mt-1 text-sm text-muted-foreground">Adicione {canal === "email" ? "um e-mail" : "um telefone"} para usar este canal.</p>
            <Button className="mt-4" onClick={onCadastro}>Abrir cadastro</Button>
          </div>
        ) : canal === "whatsapp" ? (
          <div className="mx-auto max-w-3xl space-y-3">
            {mensagens.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma mensagem nesta conversa.</p>
            ) : mensagens.map((mensagem) => (
              <div key={mensagem.id} className={cn("flex", mensagem.sender === "agent" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[82%] rounded-lg border px-3 py-2 shadow-sm", mensagem.sender === "agent" ? "border-primary/20 bg-primary/10" : "border-border bg-card")}>
                  <p className="whitespace-pre-wrap break-words text-sm text-foreground">{mensagem.text}</p>
                  {mensagem.attachments?.map((anexo) => (
                    <a key={anexo} href={anexo} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 text-xs text-primary hover:underline">
                      <FileText className="h-4 w-4" /> Abrir anexo
                    </a>
                  ))}
                  <span className="mt-1 block text-right text-[10px] text-muted-foreground">{format(new Date(mensagem.created_at), "HH:mm")}</span>
                </div>
              </div>
            ))}
            <div ref={fimRef} />
          </div>
        ) : (
          <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center text-center">
            {canal === "telefone" && <Phone className="mb-3 h-10 w-10 text-primary" />}
            {canal === "email" && <Mail className="mb-3 h-10 w-10 text-primary" />}
            {canal === "visita" && <MapPin className="mb-3 h-10 w-10 text-primary" />}
            <p className="font-semibold text-foreground">{canais.find((itemCanal) => itemCanal.id === canal)?.label}</p>
            <p className="mt-1 text-sm text-muted-foreground">Os recursos existentes deste canal serão usados sem alterar suas integrações.</p>
          </div>
        )}
      </div>

      {canal === "whatsapp" && !semDado && (
        <div className="shrink-0 border-t border-border bg-card p-3">
          <div className="flex items-end gap-2">
            <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" title="Anexos"><Paperclip className="h-4 w-4" /></Button>
            <Textarea
              value={texto}
              onChange={(event) => setTexto(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (texto.trim()) void onEnviar(texto.trim()).then(() => setTexto(""));
                }
              }}
              rows={1}
              placeholder="Responder por WhatsApp..."
              className="min-h-11 resize-none"
            />
            <Button
              size="icon"
              className="h-11 w-11 shrink-0"
              disabled={!texto.trim() || enviando || !item.conversa}
              onClick={() => void onEnviar(texto.trim()).then(() => setTexto("")).catch(() => toast.error("Não foi possível enviar a mensagem"))}
              title="Enviar mensagem"
            ><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      <div className="shrink-0 border-t border-border bg-card p-3">
        <Button variant="outline" className="h-11 w-full gap-2 border-primary text-primary hover:bg-primary/10" onClick={onFinalizar} disabled={!item.contatoId}>
          <CalendarCheck className="h-4 w-4" /> Finalizar atendimento
        </Button>
      </div>
    </div>
  );
}