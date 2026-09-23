import { Archive, ChevronLeft, ChevronRight, FileText, Inbox, Mail, RefreshCw, Send, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EmailPanel } from "@/components/email/EmailPanel";
import { ComposeEmailDialog } from "@/components/email/ComposeEmailDialog";

interface AtendimentoEmailPanelProps {
  contato: { nome: string; email: string } | null;
  emails: any[];
  selectedEmailId: string | null;
  selectedEmailData: any;
  emailFolder: string;
  onFolderChange: (folder: string) => void;
  onEmailSelect: (id: string, data: any) => void;
  onEmailClose: () => void;
  onRefresh: () => void;
  composing: boolean;
  onCompose: () => void;
  onComposeClose: () => void;
  onSend: (email: { to: string; subject: string; body: string; attachments?: any[] }) => Promise<void>;
  composeMode: "compose" | "reply" | "forward";
  composeDefaults: { to: string; subject: string; body: string };
  estabelecimentoId: string;
  onReply: (email: any) => void;
  onForward: (email: any) => void;
  onToggleDetails?: () => void;
  detailsOpen?: boolean;
  toolsSlot?: React.ReactNode;
  onOpenConsultaEstoque?: () => void;
  pendingAppendText?: string | null;
  onPendingAppendConsumed?: () => void;
}

const pastas = [
  { id: "inbox", label: "Entrada", icon: Inbox },
  { id: "starred", label: "Favoritos", icon: Star },
  { id: "sent", label: "Enviados", icon: Send },
  { id: "drafts", label: "Rascunhos", icon: FileText },
  { id: "archive", label: "Arquivo", icon: Archive },
  { id: "trash", label: "Lixeira", icon: Trash2 },
];

export function AtendimentoEmailPanel({
  contato,
  emails,
  selectedEmailId,
  selectedEmailData,
  emailFolder,
  onFolderChange,
  onEmailSelect,
  onEmailClose,
  onRefresh,
  composing,
  onCompose,
  onComposeClose,
  onSend,
  composeMode,
  composeDefaults,
  estabelecimentoId,
  onReply,
  onForward,
  onToggleDetails,
  detailsOpen,
  toolsSlot,
  onOpenConsultaEstoque,
  pendingAppendText,
  onPendingAppendConsumed,
}: AtendimentoEmailPanelProps) {
  if (!contato) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20 p-6 text-center">
        <div>
          <Mail className="mx-auto mb-4 h-14 w-14 text-muted-foreground/30" />
          <p className="font-medium text-foreground">Selecione um contato</p>
          <p className="mt-1 text-sm text-muted-foreground">As mensagens e a escrita do e-mail aparecerão aqui.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-background">
      <div className="flex-shrink-0 border-b border-border/50 bg-card px-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-2 min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{contato.nome}</p>
            <p className="truncate text-xs text-muted-foreground">{contato.email}</p>
          </div>
          <Button size="sm" onClick={onCompose} className="h-9 gap-2">
            <Mail className="h-4 w-4" />
            Novo e-mail
          </Button>
          <Button variant="ghost" size="icon" onClick={onRefresh} className="h-9 w-9" title="Atualizar e-mails">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {onToggleDetails && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleDetails}
              className="h-9 w-9"
              title={detailsOpen ? "Ocultar detalhes" : "Mostrar detalhes"}
            >
              {detailsOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          )}
        </div>
        <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
          {pastas.map((pasta) => {
            const Icone = pasta.icon;
            return (
              <Button
                key={pasta.id}
                variant="ghost"
                size="sm"
                onClick={() => onFolderChange(pasta.id)}
                className={cn(
                  "h-8 flex-shrink-0 gap-1.5 px-2.5 text-xs",
                  emailFolder === pasta.id && "bg-primary/10 text-primary",
                )}
              >
                <Icone className="h-3.5 w-3.5" />
                {pasta.label}
              </Button>
            );
          })}
        </div>
      </div>

      {composing ? (
        <ComposeEmailDialog
          embedded
          open
          onOpenChange={(open) => !open && onComposeClose()}
          onSend={onSend}
          mode={composeMode}
          defaultTo={composeDefaults.to || contato.email}
          defaultSubject={composeDefaults.subject}
          defaultBody={composeDefaults.body}
          estabelecimentoId={estabelecimentoId}
          onOpenConsultaEstoque={onOpenConsultaEstoque}
          pendingAppendText={pendingAppendText}
          onPendingAppendConsumed={onPendingAppendConsumed}
        />
      ) : (
        <EmailPanel
          emails={emails}
          selectedEmailId={selectedEmailId}
          selectedEmailData={selectedEmailData}
          emailFolder={emailFolder}
          onFolderChange={onFolderChange}
          onEmailSelect={onEmailSelect}
          onEmailClose={onEmailClose}
          onComposeClick={onCompose}
          onRefresh={onRefresh}
          onToggleDetails={onToggleDetails}
          showDetailsToggle={!!selectedEmailId}
          onReply={onReply}
          onForward={onForward}
          toolsSlot={toolsSlot}
          hideToolbar
        />
      )}
    </div>
  );
}